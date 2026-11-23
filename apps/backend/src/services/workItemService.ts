import { and, eq, inArray, isNull, type SQL } from "drizzle-orm";
import type {
  ProjectWorkItemsQuery,
  ProjectWorkItemsResponse,
  WorkItem,
  WorkItemsQuery,
  WorkSourceModule,
} from "@myapp/shared";
import { compareByStatusOngoingFirst, matchesWorkStatus, resolveAssignee } from "@myapp/shared";
import { db } from "../db/client";
import {
  activities,
  kanoRequestSpecs,
  kanoRequests,
  ostOpportunities,
  ostSolutions,
  projects,
  raidItems,
  raidMitigatingActions,
  subprojects,
  usmPersonas,
  usmStepFeatures,
  usmSteps,
  users,
} from "../db/schema";
import { env } from "../env";
import { localDate } from "./dateBuckets";
import { classifySchedule } from "./workItemRollups";
import { scopeCondition, type ProjectScope } from "./visibilityService";

/**
 * The one work-item selector behind Home and Workload.
 * A parent that has nested steps is represented by its steps (never both), so nothing is double counted.
 * Steps without their own date or person inherit the parent's. Parents without completion timestamps
 * (OST solutions) use updated_at as the completion instant once they are in a finished state.
 */
export type LoadedWork = {
  items: WorkItem[];
  today: string;
  timeZone: string;
  projectNames: Map<string, string>;
};

type Raw = {
  id: string;
  sourceModule: WorkSourceModule;
  itemKind: "activity" | "step";
  title: string;
  parentTitle: string | null;
  /** Source-module parent record id, see workItemSchema.parentId. */
  parentId?: string | null;
  projectId: string;
  subprojectId?: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  isCompleted: boolean;
  completedAt: Date | null;
  pmApproval?: "PENDING" | "APPROVED";
  sprintKey?: string | null;
};

const finishedOr = (done: boolean, at: Date | null, fallback: Date): Date | null =>
  done ? (at ?? fallback) : null;

export async function loadWorkItems(
  query: WorkItemsQuery = {},
  scope: ProjectScope = null,
  now: Date = new Date(),
  opts: { includeArchived?: boolean; onlyApproved?: boolean } = {},
): Promise<LoadedWork> {
  const timeZone = env.APP_TIMEZONE;
  const today = localDate(now, timeZone);
  // Archived projects drop out of the dashboards, but their own detail page still lists its (read-only) work.
  const live = opts.includeArchived ? undefined : isNull(projects.archivedAt);
  const projectFilter = (col: Parameters<typeof scopeCondition>[0]): SQL[] => {
    const f: SQL[] = [];
    const s = scopeCondition(col, scope);
    if (s) f.push(s);
    if (query.projectId) f.push(eq(col, query.projectId));
    return f;
  };
  // Only activities belong to a subproject, so a subproject filter leaves module items out.
  const moduleItemsWanted = !query.subprojectId;

  const actRows = await db
    .select({
      a: activities,
      subCode: subprojects.code,
      subName: subprojects.name,
    })
    .from(activities)
    .innerJoin(projects, eq(projects.id, activities.projectId))
    .leftJoin(subprojects, eq(subprojects.id, activities.subprojectId))
    .where(
      and(
        live,
        ...projectFilter(activities.projectId),
        query.subprojectId ? eq(activities.subprojectId, query.subprojectId) : undefined,
      ),
    );

  const raws: Raw[] = actRows.map(({ a, subCode, subName }) => ({
    id: a.id,
    sourceModule: "project",
    itemKind: "activity",
    title: a.title,
    parentTitle: subCode ? `${subCode} ${subName ?? ""}`.trim() : null,
    projectId: a.projectId,
    subprojectId: a.subprojectId,
    assigneeId: a.assigneeId,
    dueDate: a.dueDate,
    isCompleted: a.status === "done",
    completedAt: a.status === "done" ? a.completedAt : null,
    pmApproval: a.pmApproval,
  }));

  if (moduleItemsWanted) {
    const [solutions, usmFeatures, requests, specs, raids, mitigations] = await Promise.all([
      db
        .select({ s: ostSolutions, oppTitle: ostOpportunities.title })
        .from(ostSolutions)
        .innerJoin(projects, eq(projects.id, ostSolutions.projectId))
        .leftJoin(ostOpportunities, eq(ostOpportunities.id, ostSolutions.opportunityId))
        .where(and(live, ...projectFilter(ostSolutions.projectId))),
      // User Story Mapping v2: every step feature is a work item (the persona and step are context only).
      db
        .select({ f: usmStepFeatures, stepTitle: usmSteps.title, personaName: usmPersonas.name })
        .from(usmStepFeatures)
        .innerJoin(usmSteps, eq(usmSteps.id, usmStepFeatures.stepId))
        .innerJoin(usmPersonas, eq(usmPersonas.id, usmSteps.personaId))
        .innerJoin(projects, eq(projects.id, usmStepFeatures.projectId))
        .where(and(live, ...projectFilter(usmStepFeatures.projectId))),
      db
        .select({ r: kanoRequests })
        .from(kanoRequests)
        .innerJoin(projects, eq(projects.id, kanoRequests.projectId))
        .where(and(live, ...projectFilter(kanoRequests.projectId))),
      db
        .select({ s: kanoRequestSpecs })
        .from(kanoRequestSpecs)
        .innerJoin(kanoRequests, eq(kanoRequests.id, kanoRequestSpecs.kanoRequestId))
        .innerJoin(projects, eq(projects.id, kanoRequests.projectId))
        .where(and(live, ...projectFilter(kanoRequests.projectId))),
      db
        .select({ r: raidItems })
        .from(raidItems)
        .innerJoin(projects, eq(projects.id, raidItems.projectId))
        .where(and(live, ...projectFilter(raidItems.projectId))),
      db
        .select({ m: raidMitigatingActions })
        .from(raidMitigatingActions)
        .innerJoin(raidItems, eq(raidItems.id, raidMitigatingActions.raidItemId))
        .innerJoin(projects, eq(projects.id, raidItems.projectId))
        .where(and(live, ...projectFilter(raidItems.projectId))),
    ]);

    for (const { s, oppTitle } of solutions) {
      const done = s.validationStatus === "validated" || s.validationStatus === "invalidated";
      raws.push({
        id: s.id,
        sourceModule: "ost",
        itemKind: "activity",
        title: `${s.code} ${s.title}`,
        parentTitle: oppTitle ?? null,
        parentId: s.opportunityId,
        projectId: s.projectId,
        assigneeId: s.ownerId,
        dueDate: s.targetDate,
        isCompleted: done,
        completedAt: finishedOr(done, null, s.updatedAt),
        pmApproval: s.pmApproval,
        sprintKey: s.sprintKey,
      });
    }

    for (const { f, stepTitle, personaName } of usmFeatures) {
      raws.push({
        id: f.id,
        sourceModule: "user_story",
        itemKind: "step",
        title: f.title,
        parentTitle: `${personaName} › ${stepTitle}`,
        parentId: f.stepId,
        projectId: f.projectId,
        assigneeId: f.responsibleId,
        dueDate: f.targetDate,
        isCompleted: f.isCompleted,
        completedAt: f.completedAt,
        pmApproval: f.pmApproval,
        sprintKey: f.sprintKey,
      });
    }

    const reqById = new Map(requests.map(({ r }) => [r.id, r]));
    const reqsWithSpecs = new Set(specs.map(({ s }) => s.kanoRequestId));
    for (const { r } of requests) {
      if (reqsWithSpecs.has(r.id)) continue;
      raws.push({
        id: r.id,
        sourceModule: "kano",
        itemKind: "activity",
        title: `${r.code} ${r.revisionRequest}`,
        parentTitle: null,
        projectId: r.projectId,
        assigneeId: r.responsibleId,
        dueDate: r.targetDate,
        // A request with no specs has no completion state of its own.
        isCompleted: false,
        completedAt: null,
      });
    }
    for (const { s } of specs) {
      const parent = reqById.get(s.kanoRequestId);
      if (!parent) continue;
      raws.push({
        id: s.id,
        sourceModule: "kano",
        itemKind: "step",
        title: s.label,
        parentTitle: `${parent.code} ${parent.revisionRequest}`,
        parentId: parent.id,
        projectId: parent.projectId,
        assigneeId: s.responsibleId ?? parent.responsibleId,
        dueDate: s.targetDate ?? parent.targetDate,
        isCompleted: s.isCompleted,
        completedAt: s.completedAt,
        pmApproval: s.pmApproval,
        sprintKey: s.sprintKey,
      });
    }

    const raidById = new Map(raids.map(({ r }) => [r.id, r]));
    const raidsWithSteps = new Set(mitigations.map(({ m }) => m.raidItemId));
    for (const { r } of raids) {
      if (raidsWithSteps.has(r.id)) continue;
      const done = r.status === "closed";
      raws.push({
        id: r.id,
        sourceModule: "raid",
        itemKind: "activity",
        title: `${r.code} ${r.description}`,
        parentTitle: null,
        projectId: r.projectId,
        assigneeId: r.ownerId,
        // RAID items no longer carry a date of their own; only their mitigating actions have sprints.
        dueDate: null,
        isCompleted: done,
        completedAt: finishedOr(done, r.closedAt, r.updatedAt),
      });
    }
    for (const { m } of mitigations) {
      const parent = raidById.get(m.raidItemId);
      if (!parent) continue;
      raws.push({
        id: m.id,
        sourceModule: "raid",
        itemKind: "step",
        title: m.description,
        parentTitle: `${parent.code} ${parent.description}`,
        parentId: parent.id,
        projectId: parent.projectId,
        assigneeId: m.responsibleId ?? parent.ownerId,
        dueDate: m.targetDate,
        isCompleted: m.isCompleted,
        completedAt: m.completedAt,
        pmApproval: m.pmApproval,
        sprintKey: m.sprintKey,
      });
    }
  }

  const projectIds = [...new Set(raws.map((r) => r.projectId))];
  const [userRows, projectRows] = await Promise.all([
    db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users),
    projectIds.length
      ? db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(inArray(projects.id, projectIds))
      : Promise.resolve([]),
  ]);

  const items: WorkItem[] = raws
    .map((r) => {
      const resolved = resolveAssignee(r.assigneeId, userRows);
      const assigneeId = resolved ? resolved.id : null;
      const assigneeName = resolved ? resolved.fullName : null;
      return {
        id: r.id,
        sourceModule: r.sourceModule,
        itemKind: r.itemKind,
        title: r.title,
        parentTitle: r.parentTitle,
        parentId: r.parentId ?? null,
        projectId: r.projectId,
        subprojectId: r.subprojectId ?? null,
        assigneeId,
        assigneeName,
        dueDate: r.dueDate,
        isCompleted: r.isCompleted,
        completedAt: r.completedAt ? r.completedAt.toISOString() : null,
        scheduleStatus: classifySchedule(r, today, timeZone),
        pmApproval: r.pmApproval ?? "PENDING",
        sprintKey: r.sprintKey ?? null,
      };
    })
    .filter((i) => !query.assigneeId || i.assigneeId === query.assigneeId)
    .filter((i) => !opts.onlyApproved || i.pmApproval === "APPROVED");

  return {
    items,
    today,
    timeZone,
    projectNames: new Map(projectRows.map((p) => [p.id, p.name])),
  };
}

/**
 * One project's work for its detail page, from the same loader as Home and Workload so the three never disagree.
 * No sprint, subproject or release is needed: Kano, OST, USM and RAID items have none of them. Open items come first,
 * soonest due first, then finished items.
 */
export async function listProjectWorkItems(
  projectId: string,
  q: ProjectWorkItemsQuery = {},
  scope: ProjectScope = null,
  now: Date = new Date(),
): Promise<ProjectWorkItemsResponse> {
  const loaded = await loadWorkItems({ projectId, assigneeId: q.assigneeId }, scope, now, {
    includeArchived: true,
    onlyApproved: true,
  });
  const items = loaded.items
    .filter((i) => !q.module || i.sourceModule === q.module)
    .filter((i) => !q.status || matchesWorkStatus(i, q.status))
    .sort(compareByStatusOngoingFirst);
  return { items, today: loaded.today };
}

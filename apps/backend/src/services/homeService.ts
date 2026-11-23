import {
  and,
  asc,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  ne,
  or,
  type SQL,
  count,
} from "drizzle-orm";
import { compareByStatusOngoingFirst, type HomeResponse, type HomeRow } from "@myapp/shared";
import { db } from "../db/client";
import { activities, projects, refSprints, releases, subprojects, users } from "../db/schema";
import { waitingOnDependency } from "./governanceService";
import { scopeCondition, type ProjectScope } from "./visibilityService";
import { env } from "../env";
import { loadWorkItems } from "./workItemService";
import { summarize } from "./workItemRollups";
import type { Actor } from "../permissions";
import { rowToDto } from "./activityService";
import { addDays, bucketFor, diffDays, homeRanges, localDate } from "./dateBuckets";

export type HomeQuery = {
  assigneeId?: string;
  subprojectId?: string;
  now?: Date;
  timeZone?: string;
};

/** Home never returns more than this many candidate rows; `truncated` tells the client when the cap was hit. */
export const HOME_ROW_LIMIT = 1000;

/**
 * The one candidate query behind Home, returned unexecuted so EXPLAIN tooling can run exactly what the app runs.
 * Open items due up to the horizon (with a bounded overdue lookback) plus items completed around this week.
 */
export function homeCandidatesQuery(
  actor: Pick<Actor, "id" | "role">,
  query: Pick<HomeQuery, "assigneeId" | "subprojectId">,
  r: ReturnType<typeof homeRanges>,
  scope: ProjectScope = null,
) {
  // Done items count only if completed this week. Convert the local week to a generous UTC window, then bucket exactly.
  const windowStart = new Date(`${addDays(r.weekStart, -1)}T00:00:00Z`);
  const windowEnd = new Date(`${addDays(r.weekEnd, 2)}T00:00:00Z`);

  const filters: SQL[] = [
    isNull(projects.archivedAt),
    isNotNull(activities.dueDate),
    eq(activities.pmApproval, "APPROVED"),
  ];
  const inScope = scopeCondition(activities.projectId, scope);
  if (inScope) filters.push(inScope);
  if (actor.role === "team_member") filters.push(eq(activities.assigneeId, actor.id));
  else {
    if (query.assigneeId) filters.push(eq(activities.assigneeId, query.assigneeId));
    if (query.subprojectId) filters.push(eq(activities.subprojectId, query.subprojectId));
  }
  // No overdue lookback or future horizon: every dated open item lands in a bucket (overdue pins to This
  // Week, beyond this month goes to Later), so the lists agree with the summary. HOME_ROW_LIMIT bounds it.
  const candidate = or(
    ne(activities.status, "done"),
    and(
      eq(activities.status, "done"),
      gte(activities.completedAt, windowStart),
      lte(activities.completedAt, windowEnd),
    ),
  );
  if (candidate) filters.push(candidate);

  return db
    .select({
      a: activities,
      subCode: subprojects.code,
      subName: subprojects.name,
      assigneeName: users.fullName,
    })
    .from(activities)
    .innerJoin(projects, eq(projects.id, activities.projectId))
    .leftJoin(subprojects, eq(subprojects.id, activities.subprojectId))
    .leftJoin(users, eq(users.id, activities.assigneeId))
    .where(and(...filters))
    .orderBy(asc(activities.dueDate), asc(activities.id))
    .limit(HOME_ROW_LIMIT);
}

/**
 * Home read model for the signed-in user. Team members see their own activities; a PM sees all,
 * optionally filtered by assignee or subproject. One candidate query, bucketed in memory.
 */
export async function getHome(
  actor: Actor,
  query: HomeQuery = {},
  scope: ProjectScope = null,
): Promise<HomeResponse> {
  const timeZone = query.timeZone ?? env.APP_TIMEZONE;
  const now = query.now ?? new Date();
  const today = localDate(now, timeZone);
  const r = homeRanges(today);

  const assigneeFilter = actor.role === "team_member" ? actor.id : query.assigneeId;

  const [rows, loaded, upcomingReleases, [sprint], [wipRow]] = await Promise.all([
    homeCandidatesQuery(actor, query, r, scope),
    loadWorkItems(
      {
        assigneeId: assigneeFilter,
        subprojectId: query.subprojectId,
      },
      scope,
      now,
      { onlyApproved: true },
    ),
    db
      .select({ id: releases.id, name: releases.name, targetDate: releases.targetDate })
      .from(releases)
      .innerJoin(projects, eq(projects.id, releases.projectId))
      .where(
        and(
          isNull(projects.archivedAt),
          scopeCondition(releases.projectId, scope),
          eq(releases.status, "planned"),
          gte(releases.targetDate, today),
          lte(releases.targetDate, r.monthEnd),
        ),
      )
      .orderBy(asc(releases.targetDate), asc(releases.name))
      .then((list) =>
        list.flatMap((x) => (x.targetDate ? [{ ...x, targetDate: x.targetDate }] : [])),
      ),
    // The sprint containing today (Asia/Manila), from the canonical ref.sprints table.
    db
      .select({
        sprintKey: refSprints.sprintKey,
        sprintNumber: refSprints.sprintNumber,
        label: refSprints.label,
        startDate: refSprints.startDate,
        deadline: refSprints.deadline,
      })
      .from(refSprints)
      .where(and(lte(refSprints.startDate, today), gte(refSprints.deadline, today)))
      .limit(1),
    db
      .select({ n: count() })
      .from(activities)
      .where(
        and(
          eq(activities.assigneeId, actor.id),
          inArray(activities.status, ["in_progress"]),
          eq(activities.pmApproval, "APPROVED"),
        ),
      ),
  ]);

  const result: HomeResponse = {
    timezone: timeZone,
    activeSprint: null,
    wip: { inProgress: wipRow?.n ?? 0 },
    carryOver: null,
    thisWeek: [],
    nextWeek: [],
    thisMonth: [],
    later: [],
    upcomingReleases,
    moduleItems: { thisWeek: [], nextWeek: [], thisMonth: [], later: [] },
    summary: summarize(loaded.items),
    sprintSummary: summarize([]),
    truncated: rows.length >= HOME_ROW_LIMIT,
  };

  const waiting = await waitingOnDependency(
    db,
    rows.map((row) => row.a.id),
  );

  for (const row of rows) {
    const completedDate = row.a.completedAt ? localDate(row.a.completedAt, timeZone) : null;
    const bucket = bucketFor({ dueDate: row.a.dueDate, status: row.a.status, completedDate }, r);
    if (!bucket) continue;
    const dto = rowToDto(row.a, row.subCode, row.subName, row.assigneeName, waiting.has(row.a.id));
    const open = row.a.status !== "done";
    const item: HomeRow = {
      ...dto,
      isOverdue: open && row.a.dueDate !== null && row.a.dueDate < today,
      // Next Week proactively surfaces work that is blocked or waiting on another activity.
      atRisk: open && (row.a.isBlocked || dto.waitingOnDependency),
    };
    result[bucket].push(item);
  }

  for (const item of loaded.items) {
    if (item.sourceModule === "project") continue;
    const bucket = bucketFor(
      {
        dueDate: item.dueDate,
        status: item.isCompleted ? "done" : "open",
        completedDate: item.completedAt ? localDate(new Date(item.completedAt), timeZone) : null,
      },
      r,
    );
    if (bucket) result.moduleItems[bucket].push(item);
  }

  for (const key of ["thisWeek", "nextWeek", "thisMonth", "later"] as const) {
    result[key].sort(compareByStatusOngoingFirst);
    result.moduleItems[key].sort(compareByStatusOngoingFirst);
  }

  if (sprint) {
    result.activeSprint = {
      id: sprint.sprintKey,
      sprintKey: sprint.sprintKey,
      sprintNumber: sprint.sprintNumber,
      name: sprint.label,
      goal: null,
      startDate: sprint.startDate,
      endDate: sprint.deadline,
      daysLeft: Math.max(0, diffDays(sprint.deadline, today)),
    };
    // Keys are zero-padded `YYYY-Snn`, so string order is sprint order.
    result.carryOver = {
      count: loaded.items.filter(
        (i) =>
          !i.isCompleted &&
          (i.sprintKey
            ? i.sprintKey < sprint.sprintKey
            : i.dueDate !== null && i.dueDate < sprint.startDate),
      ).length,
    };
    // Items tagged with this sprint; untagged items (project activities) count when their due date falls inside it.
    result.sprintSummary = summarize(
      loaded.items.filter((i) =>
        i.sprintKey
          ? i.sprintKey === sprint.sprintKey
          : i.dueDate !== null && i.dueDate >= sprint.startDate && i.dueDate <= sprint.deadline,
      ),
    );
  }

  return result;
}

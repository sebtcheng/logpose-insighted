import { and, asc, eq, ne } from "drizzle-orm";
import { sql, type SQL } from "drizzle-orm";
import { resolveStoredSprint, type WorkloadResponse, type WorkloadRow, type WorkloadSprintMetrics } from "@myapp/shared";
import { db } from "../db/client";
import { activities, subprojects } from "../db/schema";
import { env } from "../env";
import { bucketFor, homeRanges, localDate } from "./dateBuckets";
import { loadWorkItems } from "./workItemService";
import { memberRollups } from "./workItemRollups";
import { scopeCondition, scopeSql, type ProjectScope } from "./visibilityService";

type Row = {
  user_id: string;
  full_name: string;
  owned_projects: number;
  member_projects: number;
};

/**
 * Active people visible in scope, ordered alphabetically. Counts come from the shared work-item selector in
 * getWorkload, so Workload reconciles with Home. It never ranks people or computes an output score.
 */
export function workloadSql(scope: ProjectScope = null): SQL {
  return sql`
    SELECT u.id AS user_id, u.full_name,
      COALESCE(o.n, 0)::int AS owned_projects,
      COALESCE(m.n, 0)::int AS member_projects
    FROM users u
    LEFT JOIN (SELECT owner_id, count(*)::int AS n FROM projects GROUP BY owner_id) o ON o.owner_id = u.id
    LEFT JOIN (
      SELECT user_id, count(DISTINCT project_id)::int AS n FROM project_members GROUP BY user_id
    ) m ON m.user_id = u.id
    WHERE u.is_active
      AND (${sql.raw(scope === null ? "true" : "false")} OR u.id IN (
        SELECT pm.user_id FROM project_members pm WHERE ${scopeSql(sql`pm.project_id`, scope)}
        UNION SELECT po.owner_id FROM projects po WHERE ${scopeSql(sql`po.id`, scope)}))
    ORDER BY u.full_name, u.id`;
}

export async function getWorkload(
  opts: { now?: Date; scope?: ProjectScope } = {},
): Promise<WorkloadResponse> {
  const r = homeRanges(localDate(opts.now ?? new Date(), env.APP_TIMEZONE));
  const res = await db.execute<Row>(workloadSql(opts.scope ?? null));
  const people = res.rows.map((x) => ({
    id: x.user_id,
    fullName: x.full_name,
    owned: Number(x.owned_projects),
    member: Number(x.member_projects),
  }));
  // Counts cover every visible project and module, exactly like Home, so the two reconcile.
  const loaded = await loadWorkItems({}, opts.scope ?? null, opts.now ?? new Date(), {
    onlyApproved: true,
  });
  const members = memberRollups(loaded.items, people).map((m) => ({
    ...m,
    items: m.items.slice(0, 300),
  }));

  const computeSprintMetrics = (userId: string | null): WorkloadSprintMetrics => {
    let currentSprintCompleted = 0;
    let currentSprintTotal = 0;
    let sprintBacklog = 0;
    let upcomingSprintsTotal = 0;
    let completedTasksTotal = 0;

    for (const i of loaded.items) {
      if (i.assigneeId !== userId) continue;
      if (i.isCompleted) completedTasksTotal += 1;
      const sprintEnd = resolveStoredSprint(i.sprintKey, i.dueDate)?.endDate ?? i.dueDate;
      if (sprintEnd !== null && sprintEnd >= r.weekStart && sprintEnd <= r.weekEnd) {
        currentSprintTotal += 1;
        if (i.isCompleted) currentSprintCompleted += 1;
      } else if (sprintEnd !== null && sprintEnd > r.weekEnd) {
        upcomingSprintsTotal += 1;
      } else if (!i.isCompleted) {
        sprintBacklog += 1;
      }
    }

    return {
      currentSprintCompleted,
      currentSprintTotal,
      sprintBacklog,
      upcomingSprintsTotal,
      completedTasksTotal,
    };
  };

  const items: WorkloadRow[] = people.map((p) => ({
    userId: p.id,
    fullName: p.fullName,
    ownedProjectsCount: p.owned,
    teamMemberProjectsCount: p.member,
    dueThisWeek: loaded.items.filter(
      (i) =>
        i.assigneeId === p.id &&
        !i.isCompleted &&
        i.dueDate &&
        bucketFor({ dueDate: i.dueDate, status: "open", completedDate: null }, r) === "thisWeek",
    ).length,
    ...computeSprintMetrics(p.id),
  }));

  return {
    items,
    members,
    unassigned: computeSprintMetrics(null),
    projectNames: Object.fromEntries(loaded.projectNames),
  };
}

/** A person's open items grouped by subproject, for the expandable row. Nothing here scores output. */
export async function getPersonItems(userId: string, scope: ProjectScope = null) {
  const rows = await db
    .select({
      id: activities.id,
      title: activities.title,
      status: activities.status,
      priority: activities.priority,
      dueDate: activities.dueDate,
      isBlocked: activities.isBlocked,
      subprojectId: activities.subprojectId,
      subprojectCode: subprojects.code,
      subprojectName: subprojects.name,
    })
    .from(activities)
    .leftJoin(subprojects, eq(subprojects.id, activities.subprojectId))
    .where(
      and(
        eq(activities.assigneeId, userId),
        ne(activities.status, "done"),
        eq(activities.pmApproval, "APPROVED"),
        scopeCondition(activities.projectId, scope),
      ),
    )
    .orderBy(asc(subprojects.code), asc(activities.dueDate), asc(activities.id))
    .limit(500);
  const groups = new Map<
    string,
    { subprojectId: string | null; code: string | null; name: string | null; items: typeof rows }
  >();
  for (const row of rows) {
    const key = row.subprojectId ?? "none";
    const group = groups.get(key) ?? {
      subprojectId: row.subprojectId,
      code: row.subprojectCode,
      name: row.subprojectName,
      items: [],
    };
    group.items.push(row);
    groups.set(key, group);
  }
  return { groups: [...groups.values()] };
}

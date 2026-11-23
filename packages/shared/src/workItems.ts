import { z } from "zod";
import { pmApprovalSchema } from "./enums";

/**
 * Unified work items: one normalised shape for activities and nested action steps from Projects, OST,
 * Kano, User Story Mapping and RAID. Home and Workload both read this, so their counts agree.
 */
export const WORK_SOURCE_MODULES = ["project", "ost", "kano", "user_story", "raid"] as const;
export const workSourceModuleSchema = z.enum(WORK_SOURCE_MODULES);
export type WorkSourceModule = z.infer<typeof workSourceModuleSchema>;

export const WORK_ITEM_KINDS = ["activity", "step"] as const;
export const SCHEDULE_STATUSES = [
  "completed_on_time",
  "completed_delayed",
  "completed",
  "ongoing_on_time",
  "delayed",
  "no_due_date",
] as const;
export const scheduleStatusSchema = z.enum(SCHEDULE_STATUSES);
export type ScheduleStatus = z.infer<typeof scheduleStatusSchema>;

export const workItemSchema = z.object({
  id: z.string(),
  sourceModule: workSourceModuleSchema,
  /** "activity" is a parent record; "step" is an action step, revision spec or mitigating action. */
  itemKind: z.enum(WORK_ITEM_KINDS),
  title: z.string(),
  parentTitle: z.string().nullable(),
  /**
   * The record needed to toggle completion in the source module: the Kano request of a spec, the RAID item of a
   * mitigating action, the story step of a USM feature, the opportunity of an OST solution. Null for projects.
   */
  parentId: z.string().nullable().optional(),
  projectId: z.string(),
  subprojectId: z.string().nullable(),
  assigneeId: z.string().nullable(),
  assigneeName: z.string().nullable(),
  dueDate: z.string().nullable(),
  isCompleted: z.boolean(),
  completedAt: z.string().nullable(),
  scheduleStatus: scheduleStatusSchema,
  /** ref.sprints key the item is tagged with; null for untagged or project activities. */
  sprintKey: z.string().nullable().optional(),
  /** PM sign-off; missing on legacy data means PENDING. Completion is only allowed when APPROVED. */
  pmApproval: pmApprovalSchema.optional(),
});
export type WorkItem = z.infer<typeof workItemSchema>;

/**
 * Counts that mean the same thing on every page.
 * ongoing: open, due today or later. delayed: open and overdue, or completed after the due date.
 * onTime: open and not overdue (with a date), or completed on or before the due date.
 * unscheduled: open with no due date. completed counts every finished item.
 */
export type WorkSummary = {
  total: number;
  completed: number;
  incomplete: number;
  /** completed / total, 0 to 100, one decimal. */
  completionRate: number;
  ongoing: number;
  onTime: number;
  delayed: number;
  unscheduled: number;
};

export type WorkBreakdownRow = WorkSummary & { key: string; label: string };

export type WorkMemberRollup = WorkSummary & {
  userId: string | null;
  fullName: string;
  /** Open items only. */
  active: number;
  byModule: Record<WorkSourceModule, number>;
  items: WorkItem[];
};

export const workItemsQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  subprojectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
});
export type WorkItemsQuery = z.infer<typeof workItemsQuerySchema>;

export const SOURCE_MODULE_LABELS: Record<WorkSourceModule, string> = {
  project: "Projects",
  ost: "OST",
  kano: "Kano",
  user_story: "User Story Map",
  raid: "RAID",
};

export type PersonCandidate = {
  id: string;
  fullName: string;
  email?: string | null;
};

/**
 * Deterministic assignee resolution helper:
 * Matches every work item assignee to a team member whether the source record stores
 * userId (exact id match takes precedence), full name, first/display name, or email (trimmed, case-insensitive).
 * Returns null for empty, null, or truly unmatched assignees so callers can route them to Unassigned.
 */
export function resolveAssignee<T extends PersonCandidate>(
  raw: string | null | undefined,
  people: T[],
): T | null {
  if (!raw) return null;
  const c = raw.trim();
  if (!c) return null;
  const cLower = c.toLowerCase();

  // 1. Exact ID match (case-insensitive string match)
  const byId = people.find((p) => p.id.toLowerCase() === cLower);
  if (byId) return byId;

  // 2. Full name match (case-insensitive)
  const byFullName = people.find((p) => p.fullName.trim().toLowerCase() === cLower);
  if (byFullName) return byFullName;

  // 3. Email match (case-insensitive)
  const byEmail = people.find((p) => p.email && p.email.trim().toLowerCase() === cLower);
  if (byEmail) return byEmail;

  // 4. First name or email username match (case-insensitive)
  const byFirst = people.find((p) => {
    const first = p.fullName.trim().split(/\s+/)[0]?.toLowerCase();
    const emailUser = p.email ? p.email.split("@")[0]?.toLowerCase() : undefined;
    return (first && first === cLower) || (emailUser && emailUser === cLower);
  });
  if (byFirst) return byFirst;

  return null;
}

/**
 * Project detail list: every action of one project across Projects, OST, Kano, User Story Map and RAID.
 * Status filters use the same definitions as WorkSummary: ongoing (open, due today or later), on_time (open and
 * not overdue, or finished on time), delayed (overdue, or finished late), completed, no_due_date.
 */
export const WORK_STATUS_FILTERS = [
  "ongoing",
  "on_time",
  "delayed",
  "completed",
  "no_due_date",
] as const;
export const workStatusFilterSchema = z.enum(WORK_STATUS_FILTERS);
export type WorkStatusFilter = z.infer<typeof workStatusFilterSchema>;

export const WORK_STATUS_LABELS: Record<WorkStatusFilter, string> = {
  ongoing: "Ongoing",
  on_time: "On time",
  delayed: "Delayed",
  completed: "Completed",
  no_due_date: "No due date",
};

export const projectWorkItemsQuerySchema = z.object({
  module: workSourceModuleSchema.optional(),
  status: workStatusFilterSchema.optional(),
  assigneeId: z.string().uuid().optional(),
});
export type ProjectWorkItemsQuery = z.infer<typeof projectWorkItemsQuerySchema>;
export type ProjectWorkItemsResponse = { items: WorkItem[]; today: string };

export function matchesWorkStatus(
  item: Pick<WorkItem, "isCompleted" | "scheduleStatus">,
  status: WorkStatusFilter,
): boolean {
  switch (status) {
    case "ongoing":
      return item.scheduleStatus === "ongoing_on_time";
    case "on_time":
      return (
        item.scheduleStatus === "ongoing_on_time" || item.scheduleStatus === "completed_on_time"
      );
    case "delayed":
      return item.scheduleStatus === "delayed" || item.scheduleStatus === "completed_delayed";
    case "completed":
      return item.isCompleted;
    case "no_due_date":
      return item.scheduleStatus === "no_due_date";
  }
}

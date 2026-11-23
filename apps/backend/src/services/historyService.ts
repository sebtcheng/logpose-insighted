import { resolveStoredSprint, type SprintInfo } from "@myapp/shared";
import type { Actor } from "../permissions";
import type { ProjectScope } from "./visibilityService";
import { loadWorkItems } from "./workItemService";

export type HistoryQuery = {
  projectId?: string;
  assigneeId?: string;
  startDate?: string;
  endDate?: string;
};

export type HistoryTaskItem = {
  id: string;
  title: string;
  status: string;
  dueDate: string | null;
  pmApproval: string;
  assigneeName: string | null;
};

export type SprintHistoryItem = {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  planned: number;
  completed: number;
  delayed: number;
  pmApproved: number;
  completionRate: number;
  tasks: HistoryTaskItem[];
};

export type HistoryResponse = {
  summary: {
    totalCompletedSprints: number;
    overallCompletionRate: number;
    avgOnTimeRate: number;
    avgDelayedRate: number;
  };
  sprints: SprintHistoryItem[];
};

export async function getSprintHistory(
  actor: Actor,
  query: HistoryQuery = {},
  scope: ProjectScope = null,
): Promise<HistoryResponse> {
  const loaded = await loadWorkItems(
    {
      projectId: query.projectId,
      assigneeId: actor.role === "team_member" ? actor.id : query.assigneeId,
    },
    scope,
  );
  const { today } = loaded;

  const grouped = new Map<string, { info: SprintInfo; tasks: HistoryTaskItem[]; completed: number; delayed: number; pmApproved: number }>();

  for (const item of loaded.items) {
    const info = resolveStoredSprint(item.sprintKey, item.dueDate);
    if (!info) continue;
    if (query.startDate && info.endDate < query.startDate) continue;
    if (query.endDate && info.startDate > query.endDate) continue;

    const bucket = grouped.get(info.key) ?? {
      info,
      tasks: [],
      completed: 0,
      delayed: 0,
      pmApproved: 0,
    };
    bucket.tasks.push({
      id: item.id,
      title: item.title,
      status: item.isCompleted ? "done" : item.scheduleStatus,
      dueDate: item.dueDate,
      pmApproval: item.pmApproval ?? "PENDING",
      assigneeName: item.assigneeName,
    });
    if (item.isCompleted) bucket.completed += 1;
    if (item.scheduleStatus === "delayed" || item.scheduleStatus === "completed_delayed") {
      bucket.delayed += 1;
    }
    if (item.pmApproval === "APPROVED") bucket.pmApproved += 1;
    grouped.set(info.key, bucket);
  }

  const series: SprintHistoryItem[] = [...grouped.values()]
    .sort((a, b) => a.info.endDate.localeCompare(b.info.endDate))
    .map(({ info, tasks, completed, delayed, pmApproved }) => {
      const planned = tasks.length;
      const completionRate = planned > 0 ? Math.round((completed / planned) * 100) : 0;
      const status =
        info.endDate < today ? "completed" : info.startDate <= today ? "active" : "upcoming";
      return {
        id: info.key,
        name: `Sprint ${info.number} (${info.year})`,
        startDate: info.startDate,
        endDate: info.endDate,
        status,
        planned,
        completed,
        delayed,
        pmApproved,
        completionRate,
        tasks,
      };
    });

  const completedSprints = series.filter((s) => s.status === "completed");
  const totalPlanned = series.reduce((acc, s) => acc + s.planned, 0);
  const totalCompleted = series.reduce((acc, s) => acc + s.completed, 0);
  const totalDelayed = series.reduce((acc, s) => acc + s.delayed, 0);
  const overallCompletionRate =
    totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;
  const avgDelayedRate = totalPlanned > 0 ? Math.round((totalDelayed / totalPlanned) * 100) : 0;
  const avgOnTimeRate = totalPlanned > 0 ? Math.max(0, 100 - avgDelayedRate) : 0;

  return {
    summary: {
      totalCompletedSprints: completedSprints.length,
      overallCompletionRate,
      avgOnTimeRate,
      avgDelayedRate,
    },
    sprints: series,
  };
}

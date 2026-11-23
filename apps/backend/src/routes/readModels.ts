import { Router } from "express";
import { z } from "zod";
import { projectWorkItemsQuerySchema, searchQuerySchema } from "@myapp/shared";
import { actorOf, asyncHandler, idParam, parse } from "../middleware";
import { getSprintHistory } from "../services/historyService";
import { search } from "../services/searchService";
import { getVisibleProjectIds } from "../services/visibilityService";
import { getPersonItems, getWorkload } from "../services/workloadService";
import { listProjectWorkItems } from "../services/workItemService";

/** Phase 3 read models. Mounted under /api after requireAuth; everything here is read-only and project-scoped. */
export const readModels = Router();

readModels.get(
  "/workload",
  asyncHandler(async (req, res) => {
    // Workload is deliberately org-wide for every signed-in role: everyone sees the full roster and each person's
    // cross-project, cross-module counts. Project scoping still applies to every other read and to all writes.
    res.json(await getWorkload({ scope: null }));
  }),
);

readModels.get(
  "/workload/:id/items",
  asyncHandler(async (req, res) => {
    res.json(await getPersonItems(idParam(req), null));
  }),
);

/** Every action of one project across Projects, OST, Kano, User Story Map and RAID (scopeGuard checks :id). */
readModels.get(
  "/projects/:id/work-items",
  asyncHandler(async (req, res) => {
    const q = parse(projectWorkItemsQuerySchema, req.query);
    res.json(await listProjectWorkItems(idParam(req), q, await getVisibleProjectIds(actorOf(res))));
  }),
);

readModels.get(
  "/search",
  asyncHandler(async (req, res) => {
    const { q, limit } = parse(searchQuerySchema, req.query);
    res.json(await search(q, limit, await getVisibleProjectIds(actorOf(res))));
  }),
);

const historyQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

readModels.get(
  "/history",
  asyncHandler(async (req, res) => {
    const q = parse(historyQuerySchema, req.query);
    const actor = actorOf(res);
    res.json(await getSprintHistory(actor, q, await getVisibleProjectIds(actor)));
  }),
);

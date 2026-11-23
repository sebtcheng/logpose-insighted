import { Router } from "express";
import {
  convertSolutionSchema,
  createJourneyStepSchema,
  createOpportunitySchema,
  createOutcomeSchema,
  createSolutionSchema,
  updateOpportunitySchema,
  updateOutcomeSchema,
  updateSolutionSchema,
  createKanoSchema,
  kanoListQuerySchema,
  toggleKanoSpecSchema,
  updateKanoSchema,
  createPersonaSchema,
  createRaidSchema,
  createStorySchema,
  raidListQuerySchema,
  toggleMitigatingActionSchema,
  storyMapQuerySchema,
  toggleStoryActionStepSchema,
  updateJourneyStepSchema,
  updatePersonaSchema,
  updateRaidSchema,
  updateStorySchema,
  createUsmFeatureSchema,
  createUsmPersonaSchema,
  createUsmStepSchema,
  reorderUsmStepsSchema,
  updateUsmFeatureSchema,
  updateUsmPersonaSchema,
  updateUsmStepSchema,
  usmProjectQuerySchema,
  usmStepsQuerySchema,
} from "@myapp/shared";
import { forbidden } from "../errors";
import { can } from "../permissions";
import { actorOf, asyncHandler, idParam, parse, requireAction } from "../middleware";
import * as usm from "../services/usmService";
import * as kano from "../services/kanoService";
import * as ost from "../services/ostService";
import * as raid from "../services/raidService";
import * as stories from "../services/storyService";
import { getVisibleProjectIds } from "../services/visibilityService";

/** Module routes (RAID, Story Map, Kano, OST). Mounted under /api after requireAuth. */
export const modules = Router();

// ---- RAID log
modules.get(
  "/raid",
  asyncHandler(async (req, res) => {
    const q = parse(raidListQuerySchema, req.query);
    res.json({
      items: await raid.listRaid(undefined, {
        itemType: q.itemType,
        status: q.status,
        ownerId: q.ownerId,
        openOnly: q.openOnly === "true",
        scope: await getVisibleProjectIds(actorOf(res)),
      }),
    });
  }),
);
modules.get(
  "/projects/:id/raid",
  asyncHandler(async (req, res) => {
    const q = parse(raidListQuerySchema, req.query);
    res.json({
      items: await raid.listRaid(idParam(req), {
        itemType: q.itemType,
        status: q.status,
        ownerId: q.ownerId,
        openOnly: q.openOnly === "true",
      }),
    });
  }),
);
modules.post(
  "/projects/:id/raid",
  requireAction("raid.create"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await raid.createRaid(actorOf(res), idParam(req), parse(createRaidSchema, req.body)));
  }),
);
modules.patch(
  "/raid/:id",
  requireAction("raid.edit"),
  asyncHandler(async (req, res) => {
    res.json(await raid.updateRaid(idParam(req), parse(updateRaidSchema, req.body)));
  }),
);
modules.patch(
  "/raid/:id/mitigating-actions/:actionId",
  requireAction("raid.edit"),
  asyncHandler(async (req, res) => {
    const { isCompleted } = parse(toggleMitigatingActionSchema, req.body);
    res.json(
      await raid.setMitigatingActionCompleted(idParam(req), idParam(req, "actionId"), isCompleted),
    );
  }),
);
modules.delete(
  "/raid/:id",
  requireAction("raid.manage"),
  asyncHandler(async (req, res) => {
    await raid.deleteRaid(idParam(req));
    res.status(204).end();
  }),
);

// ---- User Story Mapping (project scoped; scopeGuard covers :id routes and ?projectId)
modules.get(
  "/story-map",
  asyncHandler(async (req, res) => {
    const { projectId } = parse(storyMapQuerySchema, req.query);
    res.json(
      await stories.getStoryMap({ projectId, scope: await getVisibleProjectIds(actorOf(res)) }),
    );
  }),
);
modules.post(
  "/projects/:id/personas",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await stories.createPersona(
          actorOf(res),
          idParam(req),
          parse(createPersonaSchema, req.body),
        ),
      );
  }),
);
modules.patch(
  "/personas/:id",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    res.json(await stories.updatePersona(idParam(req), parse(updatePersonaSchema, req.body)));
  }),
);
modules.delete(
  "/personas/:id",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    await stories.deletePersona(idParam(req));
    res.status(204).end();
  }),
);
modules.post(
  "/projects/:id/journey-steps",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await stories.createStep(
          actorOf(res),
          idParam(req),
          parse(createJourneyStepSchema, req.body),
        ),
      );
  }),
);
modules.patch(
  "/journey-steps/:id",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    res.json(await stories.updateStep(idParam(req), parse(updateJourneyStepSchema, req.body)));
  }),
);
modules.delete(
  "/journey-steps/:id",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    await stories.deleteStep(idParam(req));
    res.status(204).end();
  }),
);
modules.post(
  "/stories",
  requireAction("story.create"),
  asyncHandler(async (req, res) => {
    // The body's projectId is checked against the caller's visible projects in the service.
    res
      .status(201)
      .json(await stories.createStoryFor(actorOf(res), parse(createStorySchema, req.body)));
  }),
);
modules.patch(
  "/stories/:id",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    res.json(
      await stories.updateStory(actorOf(res), idParam(req), parse(updateStorySchema, req.body)),
    );
  }),
);
modules.delete(
  "/stories/:id",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    await stories.deleteStory(idParam(req));
    res.status(204).end();
  }),
);
modules.patch(
  "/stories/:id/action-steps/:stepId",
  requireAction("checklist_check.write"),
  asyncHandler(async (req, res) => {
    const { isCompleted } = parse(toggleStoryActionStepSchema, req.body);
    res.json(await stories.toggleActionStep(idParam(req), idParam(req, "stepId"), isCompleted));
  }),
);

// ---- User Story Mapping v2: users (personas) -> ordered step cards -> step feature checklist.
// The legacy routes above stay registered but the UI no longer uses them.
modules.get(
  "/story-map/personas",
  asyncHandler(async (req, res) => {
    const { projectId } = parse(usmProjectQuerySchema, req.query);
    res.json({
      items: await usm.listPersonas(projectId, await getVisibleProjectIds(actorOf(res))),
    });
  }),
);
modules.post(
  "/story-map/personas",
  requireAction("usm.edit"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await usm.createPersona(actorOf(res), parse(createUsmPersonaSchema, req.body)));
  }),
);
modules.patch(
  "/story-map/personas/:id",
  requireAction("usm.edit"),
  asyncHandler(async (req, res) => {
    res.json(await usm.updatePersona(idParam(req), parse(updateUsmPersonaSchema, req.body)));
  }),
);
modules.delete(
  "/story-map/personas/:id",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    await usm.deletePersona(idParam(req));
    res.status(204).end();
  }),
);
modules.get(
  "/story-map/steps",
  asyncHandler(async (req, res) => {
    const q = parse(usmStepsQuerySchema, req.query);
    res.json({
      items: await usm.listSteps(
        q.projectId,
        q.personaId,
        await getVisibleProjectIds(actorOf(res)),
      ),
    });
  }),
);
modules.post(
  "/story-map/steps",
  requireAction("usm.edit"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await usm.createStep(actorOf(res), parse(createUsmStepSchema, req.body)));
  }),
);
modules.patch(
  "/story-map/steps/reorder",
  requireAction("usm.edit"),
  asyncHandler(async (req, res) => {
    res.json({ items: await usm.reorderSteps(parse(reorderUsmStepsSchema, req.body)) });
  }),
);
modules.patch(
  "/story-map/steps/:id",
  requireAction("usm.edit"),
  asyncHandler(async (req, res) => {
    res.json(await usm.updateStep(idParam(req), parse(updateUsmStepSchema, req.body)));
  }),
);
modules.delete(
  "/story-map/steps/:id",
  asyncHandler(async (req, res) => {
    await usm.deleteStep(idParam(req));
    res.status(204).end();
  }),
);
modules.post(
  "/story-map/features",
  requireAction("usm.edit"),
  asyncHandler(async (req, res) => {
    // projectId in the body must equal the step's project; the service rejects a mismatch with 422.
    res.status(201).json(await usm.createFeature(parse(createUsmFeatureSchema, req.body)));
  }),
);
modules.patch(
  "/story-map/features/:id",
  requireAction("checklist_check.write"),
  asyncHandler(async (req, res) => {
    const patch = parse(updateUsmFeatureSchema, req.body);
    // Anyone who can edit User Story Mapping may change a feature; ticking is open to every member.
    const onlyTick = Object.keys(patch).every((k) => k === "isCompleted");
    if (!onlyTick && !can(actorOf(res), "usm.edit")) throw forbidden();
    res.json(await usm.updateFeature(idParam(req), patch));
  }),
);
modules.delete(
  "/story-map/features/:id",
  requireAction("story.manage"),
  asyncHandler(async (req, res) => {
    await usm.deleteFeature(idParam(req));
    res.status(204).end();
  }),
);

// ---- Kano Request Tracker
modules.get(
  "/kano",
  asyncHandler(async (req, res) => {
    const q = parse(kanoListQuerySchema, req.query);
    res.json({
      items: await kano.listKano(undefined, {
        kanoCategory: q.kanoCategory,
        unevaluated: q.unevaluated === "true",
        sort: q.sort,
        scope: await getVisibleProjectIds(actorOf(res)),
      }),
    });
  }),
);
modules.get(
  "/projects/:id/kano",
  asyncHandler(async (req, res) => {
    const q = parse(kanoListQuerySchema, req.query);
    res.json({
      items: await kano.listKano(idParam(req), {
        kanoCategory: q.kanoCategory,
        unevaluated: q.unevaluated === "true",
        sort: q.sort,
      }),
    });
  }),
);
modules.post(
  "/projects/:id/kano",
  requireAction("kano.create"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await kano.createKano(actorOf(res), idParam(req), parse(createKanoSchema, req.body)));
  }),
);
modules.patch(
  "/kano/:id",
  requireAction("kano.edit"),
  asyncHandler(async (req, res) => {
    const patch = parse(updateKanoSchema, req.body);
    // Evaluating (categorising) a request stays with the PM.
    if (patch.kanoCategory !== undefined && !can(actorOf(res), "kano.manage")) throw forbidden();
    res.json(await kano.updateKano(idParam(req), patch));
  }),
);
modules.patch(
  "/kano/:id/specs/:specId",
  requireAction("kano.edit"),
  asyncHandler(async (req, res) => {
    const { isCompleted } = parse(toggleKanoSpecSchema, req.body);
    res.json(await kano.setKanoSpecCompleted(idParam(req), idParam(req, "specId"), isCompleted));
  }),
);
modules.delete(
  "/kano/:id",
  requireAction("kano.manage"),
  asyncHandler(async (req, res) => {
    await kano.deleteKano(idParam(req));
    res.status(204).end();
  }),
);

// ---- Opportunity Solution Tree
modules.get(
  "/projects/:id/ost",
  asyncHandler(async (req, res) => {
    res.json(await ost.getTree(idParam(req)));
  }),
);
modules.get(
  "/ost",
  asyncHandler(async (_req, res) => {
    res.json(await ost.getTree(undefined, await getVisibleProjectIds(actorOf(res))));
  }),
);
modules.post(
  "/projects/:id/ost/outcomes",
  requireAction("ost.edit"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await ost.createOutcome(actorOf(res), idParam(req), parse(createOutcomeSchema, req.body)),
      );
  }),
);
modules.patch(
  "/ost/outcomes/:id",
  requireAction("ost.edit"),
  asyncHandler(async (req, res) => {
    res.json(await ost.updateOutcome(idParam(req), parse(updateOutcomeSchema, req.body)));
  }),
);
modules.delete(
  "/ost/outcomes/:id",
  requireAction("ost.manage"),
  asyncHandler(async (req, res) => {
    await ost.deleteOutcome(idParam(req));
    res.status(204).end();
  }),
);
modules.post(
  "/ost/outcomes/:id/opportunities",
  requireAction("ost.edit"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await ost.createOpportunity(
          actorOf(res),
          idParam(req),
          parse(createOpportunitySchema, req.body),
        ),
      );
  }),
);
modules.patch(
  "/ost/opportunities/:id",
  requireAction("ost.edit"),
  asyncHandler(async (req, res) => {
    res.json(
      await ost.updateOpportunity(
        actorOf(res),
        idParam(req),
        parse(updateOpportunitySchema, req.body),
      ),
    );
  }),
);
modules.delete(
  "/ost/opportunities/:id",
  requireAction("ost.manage"),
  asyncHandler(async (req, res) => {
    await ost.deleteOpportunity(idParam(req));
    res.status(204).end();
  }),
);
modules.post(
  "/ost/opportunities/:id/solutions",
  requireAction("ost.edit"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await ost.createSolution(actorOf(res), idParam(req), parse(createSolutionSchema, req.body)),
      );
  }),
);
modules.patch(
  "/ost/solutions/:id",
  requireAction("ost.edit"),
  asyncHandler(async (req, res) => {
    const patch = parse(updateSolutionSchema, req.body);
    res.json(await ost.updateSolution(idParam(req), patch));
  }),
);
modules.delete(
  "/ost/solutions/:id",
  requireAction("ost.manage"),
  asyncHandler(async (req, res) => {
    await ost.deleteSolution(idParam(req));
    res.status(204).end();
  }),
);
modules.post(
  "/ost/solutions/:id/convert",
  requireAction("ost.manage"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(
        await ost.convertSolution(
          actorOf(res),
          idParam(req),
          parse(convertSolutionSchema, req.body),
        ),
      );
  }),
);

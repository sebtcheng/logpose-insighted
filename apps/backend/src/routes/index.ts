import { Router } from "express";
import {
  activityListQuerySchema,
  createActivitySchema,
  createCommentSchema,
  createProjectSchema,
  createSprintSchema,
  refSprintsQuerySchema,
  createSubprojectSchema,
  createTagSchema,
  createUserSchema,
  homeQuerySchema,
  loginSchema,
  startSimulationSchema,
  updateActivitySchema,
  updateProjectSchema,
  updateSprintSchema,
  updateSubprojectSchema,
  updateUserSchema,
} from "@myapp/shared";
import type { Response } from "express";
import { z } from "zod";
import { env } from "../env";
import { badRequest, conflict, forbidden, unauthorized } from "../errors";
import { logger } from "../logger";
import { listRefSprints } from "../services/refSprintService";
import { can } from "../permissions";
import {
  actorOf,
  asyncHandler,
  idParam,
  parse,
  realActorOf,
  requireAction,
  requireAuth,
} from "../middleware";
import {
  SIMULATION_COOKIE,
  findSimulationTarget,
  listSimulationCandidates,
  signSimulation,
} from "../services/simulation";
import * as activityService from "../services/activityService";
import * as queries from "../services/activityQueries";
import * as authService from "../services/authService";
import { getHome } from "../services/homeService";
import { scopeGuard } from "../scopeGuard";
import { getVisibleProjectIds } from "../services/visibilityService";
import { adminLog } from "./adminLog";
import { workItems } from "./workItems";
import { governance } from "./governance";
import { modules } from "./modules";
import { readModels } from "./readModels";
import * as projects from "../services/projectService";
import * as userService from "../services/userService";

export const api = Router();

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
});

// ---- auth (public except me/logout)
api.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const { email, password } = parse(loginSchema, req.body);
    const session = await authService.login(email, password);
    if (!session) throw unauthorized("Email or password is incorrect");
    res.cookie(authService.SESSION_COOKIE, session.token, {
      ...cookieOptions(),
      maxAge: env.SESSION_TTL_HOURS * 3_600_000,
    });
    res.json({ user: session.user });
  }),
);

api.post(
  "/auth/logout",
  asyncHandler(async (req, res) => {
    const token: unknown = (req.cookies as Record<string, unknown> | undefined)?.[
      authService.SESSION_COOKIE
    ];
    if (typeof token === "string") await authService.logout(token);
    res.clearCookie(authService.SESSION_COOKIE, cookieOptions());
    res.status(204).end();
  }),
);

api.get("/auth/me", requireAuth, (_req, res) => {
  const { id, email, fullName, role } = actorOf(res);
  const real = realActorOf(res);
  const isSimulating = real.id !== id;
  res.json({
    user: { id, email, fullName, role },
    isSimulating,
    realUser: isSimulating
      ? { id: real.id, email: real.email, fullName: real.fullName, role: real.role }
      : null,
  });
});

// ---- PM "view as team member". Authorised against the REAL actor, never the simulated one.
const requireRealPm = (res: Response): void => {
  if (realActorOf(res).role !== "pm") throw forbidden("Only a project manager can simulate a user");
};

api.get(
  "/auth/simulation/candidates",
  requireAuth,
  asyncHandler(async (_req, res) => {
    requireRealPm(res);
    res.json({ items: await listSimulationCandidates(realActorOf(res).id) });
  }),
);

api.post(
  "/auth/simulation",
  requireAuth,
  asyncHandler(async (req, res) => {
    requireRealPm(res);
    const real = realActorOf(res);
    if (actorOf(res).id !== real.id) throw conflict("Exit the current simulation first");
    const { userId } = parse(startSimulationSchema, req.body);
    const target = await findSimulationTarget(userId);
    if (!target || target.id === real.id) throw badRequest("That user cannot be simulated");
    res.cookie(SIMULATION_COOKIE, signSimulation(res.locals.sessionToken as string, target.id), {
      ...cookieOptions(),
      maxAge: env.SESSION_TTL_HOURS * 3_600_000,
    });
    logger.info(
      { requestId: res.locals.requestId, actorUserId: real.id, targetUserId: target.id },
      "simulation started",
    );
    res.json({ ok: true });
  }),
);

api.post("/auth/simulation/exit", requireAuth, (_req, res) => {
  requireRealPm(res);
  const real = realActorOf(res);
  const target = actorOf(res);
  res.clearCookie(SIMULATION_COOKIE, cookieOptions());
  logger.info(
    { requestId: res.locals.requestId, actorUserId: real.id, targetUserId: target.id },
    "simulation ended",
  );
  res.status(204).end();
});

// Everything below needs a signed-in user.
api.use(requireAuth);
// Team members only reach records of projects they own or belong to (PMs are unrestricted).
api.use(scopeGuard);

// ---- users
api.get(
  "/users",
  asyncHandler(async (_req, res) => {
    res.json({ items: await userService.listUsers() });
  }),
);
api.post(
  "/users",
  requireAction("user.manage"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await userService.createUser(parse(createUserSchema, req.body)));
  }),
);
api.patch(
  "/users/:id",
  requireAction("user.manage"),
  asyncHandler(async (req, res) => {
    res.json(
      await userService.updateUser(
        idParam(req),
        parse(updateUserSchema, req.body),
        actorOf(res).id,
      ),
    );
  }),
);
api.delete(
  "/users/:id",
  requireAction("user.manage"),
  asyncHandler(async (req, res) => {
    await userService.deleteUser(idParam(req), actorOf(res).id);
    res.status(204).end();
  }),
);

// ---- projects, subprojects, sprints
api.get(
  "/projects",
  asyncHandler(async (req, res) => {
    const q = parse(
      z.object({
        withSubprojects: z.enum(["true", "false"]).optional(),
        includeArchived: z.enum(["true", "false"]).optional(),
      }),
      req.query,
    );
    const scope = await getVisibleProjectIds(actorOf(res));
    res.json({
      items:
        q.withSubprojects === "true"
          ? await projects.listProjectsWithSubprojects(q.includeArchived === "true", scope)
          : await projects.listProjects(scope),
    });
  }),
);
api.post(
  "/projects",
  requireAction("project.create"),
  asyncHandler(async (req, res) => {
    const actor = actorOf(res);
    res.status(201).json(
      await projects.createProject(actor.id, parse(createProjectSchema, req.body), {
        // A non-PM only sees projects they own or belong to, so they always end up a member of their own.
        ensureCreatorMember: actor.role !== "pm",
      }),
    );
  }),
);
api.get(
  "/projects/:id",
  asyncHandler(async (req, res) => {
    res.json(await projects.getProject(idParam(req)));
  }),
);
api.patch(
  "/projects/:id",
  requireAction("project.edit"),
  asyncHandler(async (req, res) => {
    const patch = parse(updateProjectSchema, req.body);
    // Archiving or restoring a project stays with the PM.
    if (patch.archived !== undefined && !can(actorOf(res), "project.write")) throw forbidden();
    res.json(await projects.updateProject(idParam(req), patch));
  }),
);

api.delete(
  "/projects/:id",
  requireAction("project.write"),
  asyncHandler(async (req, res) => {
    await projects.deleteProject(idParam(req));
    res.status(204).end();
  }),
);
api.delete(
  "/subprojects/:id",
  requireAction("subproject.write"),
  asyncHandler(async (req, res) => {
    await projects.deleteSubproject(idParam(req));
    res.status(204).end();
  }),
);

api.get(
  "/projects/:id/subprojects",
  asyncHandler(async (req, res) => {
    const includeArchived = parse(
      z.object({ includeArchived: z.enum(["true", "false"]).optional() }),
      req.query,
    );
    res.json({
      items: await projects.listSubprojects(
        idParam(req),
        includeArchived.includeArchived === "true",
      ),
    });
  }),
);
api.post(
  "/projects/:id/subprojects",
  requireAction("subproject.write"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await projects.createSubproject(idParam(req), parse(createSubprojectSchema, req.body)));
  }),
);
api.patch(
  "/subprojects/:id",
  requireAction("subproject.write"),
  asyncHandler(async (req, res) => {
    res.json(
      await projects.updateSubproject(idParam(req), parse(updateSubprojectSchema, req.body)),
    );
  }),
);

api.get(
  "/ref/sprints",
  asyncHandler(async (req, res) => {
    res.json({ items: await listRefSprints(parse(refSprintsQuerySchema, req.query)) });
  }),
);
api.get(
  "/projects/:id/sprints",
  asyncHandler(async (req, res) => {
    res.json({ items: await projects.listSprints(idParam(req)) });
  }),
);
api.post(
  "/projects/:id/sprints",
  requireAction("sprint.write"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await projects.createSprint(idParam(req), parse(createSprintSchema, req.body)));
  }),
);
api.patch(
  "/sprints/:id",
  requireAction("sprint.write"),
  asyncHandler(async (req, res) => {
    res.json(await projects.updateSprint(idParam(req), parse(updateSprintSchema, req.body)));
  }),
);

// ---- activities
api.get(
  "/activities",
  asyncHandler(async (req, res) => {
    res.json(
      await queries.listActivities(
        parse(activityListQuerySchema, req.query),
        await getVisibleProjectIds(actorOf(res)),
      ),
    );
  }),
);
api.post(
  "/projects/:id/activities",
  requireAction("activity.create"),
  asyncHandler(async (req, res) => {
    const result = await activityService.create(
      { actor: actorOf(res) },
      idParam(req),
      parse(createActivitySchema, req.body),
    );
    res.status(201).json(result);
  }),
);
api.get(
  "/activities/:id",
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const [activity, tags] = await Promise.all([
      queries.getActivity(id),
      queries.tagsForActivity(id),
    ]);
    res.json({ activity, tags });
  }),
);
// Role and ownership rules for this endpoint live in activityService via the permission map.
api.patch(
  "/activities/:id",
  asyncHandler(async (req, res) => {
    res.json(
      await activityService.update(
        { actor: actorOf(res) },
        idParam(req),
        parse(updateActivitySchema, req.body),
      ),
    );
  }),
);
api.delete(
  "/activities/:id",
  requireAction("activity.delete"),
  asyncHandler(async (req, res) => {
    await activityService.remove({ actor: actorOf(res) }, idParam(req));
    res.status(204).end();
  }),
);
api.get(
  "/activities/:id/events",
  asyncHandler(async (req, res) => {
    res.json({ items: await queries.listEvents(idParam(req)) });
  }),
);
api.get(
  "/activities/:id/comments",
  asyncHandler(async (req, res) => {
    res.json({ items: await queries.listComments(idParam(req)) });
  }),
);
api.post(
  "/activities/:id/comments",
  requireAction("comment.create"),
  asyncHandler(async (req, res) => {
    const { body } = parse(createCommentSchema, req.body);
    res.status(201).json(await queries.addComment(idParam(req), actorOf(res).id, body));
  }),
);

// ---- tags
api.get(
  "/tags",
  asyncHandler(async (_req, res) => {
    res.json({ items: await queries.listTags() });
  }),
);
api.post(
  "/tags",
  requireAction("tag.manage"),
  asyncHandler(async (req, res) => {
    const { name, colorCode } = parse(createTagSchema, req.body);
    res.status(201).json(await queries.createTag(name, colorCode));
  }),
);

// ---- Phase 2: releases, capacity, dependencies, checklists, gate overrides
api.use(governance);

// ---- Phase 3: workload, search
api.use(readModels);
api.use(adminLog);
api.use(workItems);

// ---- Phases 5 to 8: RAID, Story Map, Kano, OST
api.use(modules);

// ---- home read model
api.get(
  "/home",
  asyncHandler(async (req, res) => {
    const q = parse(homeQuerySchema, req.query);
    res.json(await getHome(actorOf(res), q, await getVisibleProjectIds(actorOf(res))));
  }),
);

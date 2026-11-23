import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { OstTreeDto, StoryMapDto } from "@myapp/shared";
import { createApp } from "../app";
import { approveAll, createFixture, type Fixture } from "../test/helpers";

type Agent = ReturnType<typeof request.agent>;
type Id = { id: string };
type ErrorBody = { error: { code: string } };
const json = <T>(res: { body: unknown }): T => res.body as T;

const app = createApp();
let f: Fixture;
let pm: Agent;
let member: Agent;
let anon: Agent;
let outcomeId: string;
let oppId: string;

async function loginAs(email: string) {
  const agent = request.agent(app);
  expect((await agent.post("/api/auth/login").send({ email, password: f.password })).status).toBe(
    200,
  );
  return agent;
}

beforeAll(async () => {
  f = await createFixture();
  pm = await loginAs(f.pm.email);
  member = await loginAs(f.m1.email);
  anon = request.agent(app);
  outcomeId = json<Id>(
    await pm.post(`/api/projects/${f.project.id}/ost/outcomes`).send({
      title: "Reduce dropouts by 20%",
      projectId: f.project.id,
    }),
  ).id;
  oppId = json<Id>(
    await pm
      .post(`/api/ost/outcomes/${outcomeId}/opportunities`)
      .send({ title: "Students feel lost" }),
  ).id;
});
afterAll(async () => {
  await f.cleanup();
});

const newSolution = async (title = "Onboarding checklist") =>
  json<{ id: string; code: string; validationStatus: string }>(
    await pm.post(`/api/ost/opportunities/${oppId}/solutions`).send({ title }),
  );
const allTree = async () => json<OstTreeDto>(await pm.get("/api/ost"));
const tree = async () => json<OstTreeDto>(await pm.get(`/api/projects/${f.project.id}/ost`));

describe("OST API", () => {
  it("requires sign in and lets team members create outcomes and solutions", async () => {
    expect((await anon.get(`/api/projects/${f.project.id}/ost`)).status).toBe(401);
    expect(
      (await member.post(`/api/projects/${f.project.id}/ost/outcomes`).send({ title: "x" })).status,
    ).toBe(201);
    expect(
      (await member.post(`/api/ost/opportunities/${oppId}/solutions`).send({ title: "x" })).status,
    ).toBe(201);
  });

  it("lists a newly created outcome straight away, per project and across all projects", async () => {
    const made = await pm
      .post(`/api/projects/${f.project.id}/ost/outcomes`)
      .send({ title: "Fresh outcome", projectId: f.project.id });
    expect(made.status).toBe(201);
    const id = json<{ id: string }>(made).id;
    expect((await tree()).outcomes.some((o) => o.id === id)).toBe(true);
    expect((await allTree()).outcomes.some((o) => o.id === id)).toBe(true);
    expect((await anon.get("/api/ost")).status).toBe(401);
  });

  it("returns the tree with the project and solution codes", async () => {
    const sol = await newSolution();
    expect(sol.code).toMatch(/^OST-\d{2,}$/);
    expect(sol.validationStatus).toBe("planned");
    const t = await tree();
    const o = t.outcomes.find((x) => x.id === outcomeId);
    expect(o?.projectId).toBe(f.project.id);
    expect(o?.projectName).toBeTruthy();
    expect(t.solutions.some((s) => s.id === sol.id)).toBe(true);
  });

  it("allows only one targeted opportunity per outcome", async () => {
    const other = json<Id>(
      await pm
        .post(`/api/ost/outcomes/${outcomeId}/opportunities`)
        .send({ title: "Too many portals" }),
    );
    await pm.patch(`/api/ost/opportunities/${oppId}`).send({ isTargeted: true });
    await pm.patch(`/api/ost/opportunities/${other.id}`).send({ isTargeted: true });
    const t = await tree();
    const targeted = t.opportunities.filter((o) => o.outcomeId === outcomeId && o.isTargeted);
    expect(targeted.map((o) => o.id)).toEqual([other.id]);
  });

  it("has a flat Outcome > Opportunity > Solution tree with no nesting or assumptions", async () => {
    const sol = await newSolution("Flat");
    const t = (await tree()) as unknown as Record<string, unknown>;
    expect(Object.keys(t).sort()).toEqual(["opportunities", "outcomes", "solutions"]);
    const opp = (t.opportunities as Array<Record<string, unknown>>).find((o) => o.id === oppId);
    expect(opp).toBeDefined();
    expect("parentOpportunityId" in (opp ?? {})).toBe(false);
    // The removed endpoints and fields are gone.
    expect(
      (await pm.post(`/api/ost/solutions/${sol.id}/assumptions`).send({ statement: "x" })).status,
    ).toBe(404);
    const out2 = json<Id>(
      await pm.post(`/api/projects/${f.project.id}/ost/outcomes`).send({ title: "Second outcome" }),
    );
    const child = json<Id>(
      await pm
        .post(`/api/ost/outcomes/${out2.id}/opportunities`)
        .send({ title: "Top level", parentOpportunityId: oppId }),
    );
    const again = (await tree()).opportunities.find((o) => o.id === child.id);
    expect(again?.outcomeId).toBe(out2.id);
  });

  it("saves a solution target date and owner from a single-solution edit, and clears them", async () => {
    const sol = json<Id>(
      await pm.post(`/api/ost/opportunities/${oppId}/solutions`).send({ title: "Dated edit" }),
    );
    const saved = await pm
      .patch(`/api/ost/solutions/${sol.id}`)
      .send({ title: "Dated edit", ownerId: f.m1.id, targetDate: "2026-12-09" });
    expect(saved.status).toBe(200);
    const read = async () =>
      (await tree()).solutions.find((s) => s.id === sol.id) as unknown as Record<string, unknown>;
    expect(await read()).toMatchObject({ targetDate: "2026-12-09", ownerId: f.m1.id });
    await pm.patch(`/api/ost/solutions/${sol.id}`).send({ ownerId: null, targetDate: null });
    expect(await read()).toMatchObject({ targetDate: null, ownerId: null });
  });

  it("saves a requirement with a checklist of solutions, assignees and dates, and syncs edits", async () => {
    const created = json<Id>(
      await pm.post(`/api/ost/outcomes/${outcomeId}/opportunities`).send({
        title: "Needs a checklist",
        solutions: [
          { title: "Draft the spec", completed: false, ownerId: f.m1.id, targetDate: "2026-12-01" },
          { title: "Review it", completed: false },
        ],
      }),
    );
    const mine = async () => {
      const t = await tree();
      return t.solutions.filter((s) => s.opportunityId === created.id);
    };
    const first = await mine();
    expect(first.map((s) => [s.title, s.validationStatus, s.ownerName, s.targetDate])).toEqual([
      ["Draft the spec", "planned", f.m1.fullName, "2026-12-01"],
      ["Review it", "planned", null, null],
    ]);
    const [a, b] = first;
    await approveAll(f.project.id);
    // Edit one, untick another, add a third and drop nothing; then remove one by omission.
    const res = await pm.patch(`/api/ost/opportunities/${created.id}`).send({
      solutions: [
        {
          id: a?.id,
          title: "Draft the spec v2",
          completed: false,
          ownerId: f.pm.id,
          targetDate: "2026-12-05",
        },
        { title: "Ship it", completed: false, targetDate: "2026-12-20" },
      ],
    });
    expect(res.status).toBe(200);
    const next = await mine();
    expect(next.map((s) => [s.title, s.validationStatus, s.ownerName, s.targetDate])).toEqual([
      ["Draft the spec v2", "planned", f.pm.fullName, "2026-12-05"],
      ["Ship it", "planned", null, "2026-12-20"],
    ]);
    expect(next.some((s) => s.id === b?.id)).toBe(false);
    // Omitting `solutions` leaves the checklist alone.
    await pm.patch(`/api/ost/opportunities/${created.id}`).send({ title: "Renamed" });
    expect(await mine()).toHaveLength(2);
  });

  it("rejects bad checklist input and no longer carries evidence or notes", async () => {
    const url = `/api/ost/outcomes/${outcomeId}/opportunities`;
    expect((await pm.post(url).send({ title: "x", solutions: [{ title: " " }] })).status).toBe(400);
    expect(
      (await pm.post(url).send({ title: "x", solutions: [{ title: "a", targetDate: "1/2/2026" }] }))
        .status,
    ).toBe(400);
    expect(
      (await pm.post(url).send({ title: "x", solutions: [{ title: "a", ownerId: "nope" }] }))
        .status,
    ).toBe(400);
    expect(
      (
        await pm.post(url).send({
          title: "x",
          solutions: [{ title: "a", ownerId: "00000000-0000-4000-8000-000000000000" }],
        })
      ).status,
    ).toBe(422);
    const t = await tree();
    const opp = t.opportunities.find((o) => o.id === oppId) as unknown as Record<string, unknown>;
    expect(opp).not.toHaveProperty("evidence");
    expect(opp).not.toHaveProperty("description");
  });

  it("lets any authenticated role mark an approved solution validated, which drives the convert gate", async () => {
    const sol = await newSolution("Marked");
    const pending = await pm
      .patch(`/api/ost/solutions/${sol.id}`)
      .send({ validationStatus: "validated" });
    expect(pending.status).toBe(403);
    await approveAll(f.project.id);
    const memberOk = await member
      .patch(`/api/ost/solutions/${sol.id}`)
      .send({ validationStatus: "validated" });
    expect(memberOk.status).toBe(200);
    expect((await tree()).solutions.find((s) => s.id === sol.id)?.validationStatus).toBe(
      "validated",
    );
    const pmOk = await pm
      .patch(`/api/ost/solutions/${sol.id}`)
      .send({ validationStatus: "planned" });
    expect(pmOk.status).toBe(200);
    await pm.patch(`/api/ost/solutions/${sol.id}`).send({ validationStatus: "validated" });
  });

  it("blocks converting an unvalidated solution, allows a logged PM override", async () => {
    const sol = await newSolution("Gate");
    const blocked = await pm.post(`/api/ost/solutions/${sol.id}/convert`).send({});
    expect(blocked.status).toBe(422);
    expect(json<ErrorBody>(blocked).error.code).toBe("validation_incomplete");

    const ok = await pm
      .post(`/api/ost/solutions/${sol.id}/convert`)
      .send({ overrideReason: "Pilot already running" });
    expect(ok.status).toBe(201);
    const log = json<{ items: Array<{ gate: string; entityType: string }> }>(
      await pm.get(`/api/gate-overrides?entityType=solution&entityId=${sol.id}`),
    );
    expect(log.items).toHaveLength(1);
    expect(log.items[0]?.gate).toBe("validation");

    expect((await pm.post(`/api/ost/solutions/${sol.id}/convert`).send({})).status).toBe(409);
  });

  it("converts a validated solution into a backlog story and links it", async () => {
    const sol = await newSolution("Validated one");
    await approveAll(f.project.id);
    await pm.patch(`/api/ost/solutions/${sol.id}`).send({ validationStatus: "validated" });
    const res = await pm.post(`/api/ost/solutions/${sol.id}/convert`).send({});
    expect(res.status).toBe(201);
    const { storyId, storyCode } = json<{ storyId: string; storyCode: string }>(res);
    expect(storyCode).toMatch(/^USM-/);
    const map = json<StoryMapDto>(await pm.get(`/api/story-map?projectId=${f.project.id}`));
    expect(map.stories.find((s) => s.id === storyId)?.story).toBe("Validated one");
    expect((await tree()).solutions.find((s) => s.id === sol.id)?.convertedStoryCode).toBe(
      storyCode,
    );
    // A member cannot override or convert.
    expect((await member.post(`/api/ost/solutions/${sol.id}/convert`).send({})).status).toBe(403);
  });

  it("creates the story in the solution's own project", async () => {
    const sol = await newSolution("Same project");
    const res = await pm
      .post(`/api/ost/solutions/${sol.id}/convert`)
      .send({ overrideReason: "test" });
    expect(res.status).toBe(201);
    const { storyId } = json<{ storyId: string }>(res);
    const map = json<StoryMapDto>(await pm.get(`/api/story-map?projectId=${f.project.id}`));
    expect(map.stories.find((s) => s.id === storyId)?.projectId).toBe(f.project.id);
  });
});

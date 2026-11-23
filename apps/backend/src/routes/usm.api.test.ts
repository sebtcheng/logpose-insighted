import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { UsmFeatureDto, UsmPersonaDto, UsmStepDto } from "@myapp/shared";
import { createApp } from "../app";
import { loadWorkItems } from "../services/workItemService";
import { approveAll, createFixture, type Fixture } from "../test/helpers";

type Agent = ReturnType<typeof request.agent>;
const json = <T>(res: { body: unknown }): T => res.body as T;
const DUE = "2026-12-15";
const BASE = "/api/story-map";

const app = createApp();
let f: Fixture;
let pm: Agent;
let member: Agent;

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
});
afterAll(async () => {
  await f.cleanup();
});

const persona = async (name: string, projectId = f.project.id) =>
  json<UsmPersonaDto>(await pm.post(`${BASE}/personas`).send({ projectId, name }));
const step = async (personaId: string, title: string, extra: Record<string, unknown> = {}) =>
  json<UsmStepDto>(
    await pm.post(`${BASE}/steps`).send({ projectId: f.project.id, personaId, title, ...extra }),
  );
const titles = async (personaId: string) =>
  json<{ items: UsmStepDto[] }>(
    await pm.get(`${BASE}/steps`).query({ projectId: f.project.id, personaId }),
  ).items.map((s) => s.title);

describe("USM personas", () => {
  it("allows several users per project and lists them in order", async () => {
    await persona("Teacher");
    await persona("Parent");
    const res = await pm.get(`${BASE}/personas`).query({ projectId: f.project.id });
    expect(res.status).toBe(200);
    expect(json<{ items: UsmPersonaDto[] }>(res).items.map((p) => p.name)).toEqual([
      "Teacher",
      "Parent",
    ]);
  });
  it("rejects a duplicate user name in the same project", async () => {
    await persona("Dup");
    const res = await pm.post(`${BASE}/personas`).send({ projectId: f.project.id, name: "dup" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
  it("lets a team member add users to their own project, but only the PM delete them", async () => {
    const res = await member
      .post(`${BASE}/personas`)
      .send({ projectId: f.project.id, name: "By member" });
    expect(res.status).toBe(201);
    expect((await member.delete(`${BASE}/personas/${json<UsmPersonaDto>(res).id}`)).status).toBe(
      403,
    );
  });
  it("lists every visible project's users with project names when projectId is omitted or all", async () => {
    await pm.post(`${BASE}/personas`).send({ projectId: f.otherProject.id, name: "Elsewhere" });
    for (const q of [{}, { projectId: "all" }, { projectId: "" }]) {
      const items = json<{ items: UsmPersonaDto[] }>(
        await pm.get(`${BASE}/personas`).query(q),
      ).items;
      const projectIds = new Set(items.map((p) => p.projectId));
      expect(
        projectIds.has(f.project.id) && projectIds.has(f.otherProject.id),
        JSON.stringify(q),
      ).toBe(true);
      expect(items.every((p) => typeof p.projectName === "string")).toBe(true);
    }
    // A team member only gets their own project's users, and creation still needs a project.
    const mine = json<{ items: UsmPersonaDto[] }>(
      await member.get(`${BASE}/personas`).query({ projectId: "all" }),
    ).items;
    expect(mine.every((p) => p.projectId !== f.otherProject.id)).toBe(true);
    expect((await pm.post(`${BASE}/personas`).send({ projectId: "all", name: "x" })).status).toBe(
      400,
    );
    expect((await pm.post(`${BASE}/personas`).send({ name: "x" })).status).toBe(400);
  });
});

describe("USM steps", () => {
  it("appends, inserts mid-flow and keeps a dense order", async () => {
    const p = await persona("Flow");
    await step(p.id, "A");
    await step(p.id, "B");
    await step(p.id, "C");
    await step(p.id, "Mid", { insertAtIndex: 1 });
    await step(p.id, "First", { insertAtIndex: 0 });
    expect(await titles(p.id)).toEqual(["First", "A", "Mid", "B", "C"]);
    const orders = json<{ items: UsmStepDto[] }>(
      await pm.get(`${BASE}/steps`).query({ projectId: f.project.id, personaId: p.id }),
    ).items.map((s) => s.sortOrder);
    expect(orders).toEqual([0, 1, 2, 3, 4]);
  });
  it("reorders atomically and rejects a partial or foreign id list", async () => {
    const p = await persona("Reorder");
    const a = await step(p.id, "A");
    const b = await step(p.id, "B");
    const c = await step(p.id, "C");
    const ok = await pm
      .patch(`${BASE}/steps/reorder`)
      .send({ projectId: f.project.id, personaId: p.id, stepIds: [c.id, a.id, b.id] });
    expect(ok.status).toBe(200);
    expect(await titles(p.id)).toEqual(["C", "A", "B"]);
    const partial = await pm
      .patch(`${BASE}/steps/reorder`)
      .send({ projectId: f.project.id, personaId: p.id, stepIds: [a.id, b.id] });
    expect(partial.status).toBe(422);
    const other = await persona("Other");
    const foreign = await step(other.id, "X");
    const bad = await pm
      .patch(`${BASE}/steps/reorder`)
      .send({ projectId: f.project.id, personaId: p.id, stepIds: [a.id, b.id, foreign.id] });
    expect(bad.status).toBe(422);
    expect(await titles(p.id)).toEqual(["C", "A", "B"]);
  });
  it("blocks deleting a step with features (409) and lets any authenticated role delete an empty step", async () => {
    const p = await persona("Delete");
    const a = await step(p.id, "A");
    const b = await step(p.id, "B");
    const feat = json<UsmFeatureDto>(
      await pm.post(`${BASE}/features`).send({ projectId: f.project.id, stepId: a.id, title: "F" }),
    );
    // Non-empty step cannot be deleted by PM or member (409 Conflict, no cascade)
    expect((await pm.delete(`${BASE}/steps/${a.id}`)).status).toBe(409);
    expect((await member.delete(`${BASE}/steps/${a.id}`)).status).toBe(409);
    expect((await pm.patch(`${BASE}/features/${feat.id}`).send({ title: "F" })).status).toBe(200);

    // Unauthenticated request returns 401
    expect((await request(app).delete(`${BASE}/steps/${a.id}`)).status).toBe(401);

    // Once features are removed, any authenticated role (e.g. member) can delete the empty step
    expect((await pm.delete(`${BASE}/features/${feat.id}`)).status).toBe(204);
    expect((await member.delete(`${BASE}/steps/${a.id}`)).status).toBe(204);
    const left = json<{ items: UsmStepDto[] }>(
      await pm.get(`${BASE}/steps`).query({ projectId: f.project.id, personaId: p.id }),
    ).items;
    expect(left.map((s) => [s.id, s.sortOrder])).toEqual([[b.id, 0]]);
  });
});

describe("USM step features", () => {
  it("rejects a project that does not match the step's project", async () => {
    const p = await persona("Mismatch");
    const s = await step(p.id, "S");
    const res = await pm
      .post(`${BASE}/features`)
      .send({ projectId: f.otherProject.id, stepId: s.id, title: "F" });
    expect(res.status).toBe(422);
  });
  it("persists person, date and completion, setting and clearing completed_at", async () => {
    const p = await persona("Feat");
    const s = await step(p.id, "S");
    const created = json<UsmFeatureDto>(
      await pm.post(`${BASE}/features`).send({
        projectId: f.project.id,
        stepId: s.id,
        title: "Sign-in form",
        responsibleId: f.m1.id,
        targetDate: DUE,
      }),
    );
    expect(created).toMatchObject({
      responsibleId: f.m1.id,
      targetDate: DUE,
      isCompleted: false,
      completedAt: null,
    });
    // Completion is refused until a PM approves the feature.
    const refused = await pm.patch(`${BASE}/features/${created.id}`).send({ isCompleted: true });
    expect(refused.status).toBe(403);
    expect(json<{ error: { code: string } }>(refused).error.code).toBe("pm_approval_required");
    await approveAll(f.project.id);
    const done = json<UsmFeatureDto>(
      await pm.patch(`${BASE}/features/${created.id}`).send({ isCompleted: true }),
    );
    expect(done.isCompleted).toBe(true);
    expect(done.completedAt).not.toBeNull();
    const undone = json<UsmFeatureDto>(
      await pm.patch(`${BASE}/features/${created.id}`).send({ isCompleted: false }),
    );
    expect(undone.completedAt).toBeNull();
    const withFeatures = json<{ items: UsmStepDto[] }>(
      await pm.get(`${BASE}/steps`).query({ projectId: f.project.id, personaId: p.id }),
    ).items[0];
    expect(withFeatures?.features).toHaveLength(1);
  });
  it("lets a team member tick (once approved) and edit", async () => {
    const p = await persona("Member");
    const s = await step(p.id, "S");
    const feat = json<UsmFeatureDto>(
      await pm.post(`${BASE}/features`).send({ projectId: f.project.id, stepId: s.id, title: "F" }),
    );
    await approveAll(f.project.id);
    expect(
      (await member.patch(`${BASE}/features/${feat.id}`).send({ isCompleted: true })).status,
    ).toBe(200);
    expect((await member.patch(`${BASE}/features/${feat.id}`).send({ title: "Z" })).status).toBe(
      200,
    );
  });
  it("feeds Home and Workload through the shared work-item selector", async () => {
    const p = await persona("Rollup");
    const s = await step(p.id, "S");
    const mk = async (title: string, extra: Record<string, unknown>) =>
      json<UsmFeatureDto>(
        await pm
          .post(`${BASE}/features`)
          .send({ projectId: f.project.id, stepId: s.id, title, responsibleId: f.m1.id, ...extra }),
      );
    await mk("Late", { targetDate: "2000-01-01" });
    const fin = await mk("Finished", { targetDate: DUE });
    await approveAll(f.project.id);
    await pm.patch(`${BASE}/features/${fin.id}`).send({ isCompleted: true });
    const { items } = await loadWorkItems({ projectId: f.project.id });
    const usm = items.filter(
      (i) => i.sourceModule === "user_story" && i.parentTitle?.startsWith("Rollup"),
    );
    expect(usm.map((i) => i.title).sort()).toEqual(["Finished", "Late"]);
    expect(usm.every((i) => i.assigneeId === f.m1.id && i.parentTitle === "Rollup › S")).toBe(true);
    expect(usm.find((i) => i.title === "Late")?.scheduleStatus).toBe("delayed");
    expect(usm.find((i) => i.title === "Finished")?.isCompleted).toBe(true);
  });
});

describe("USM add user (persona) contract", () => {
  it("creates from projectId and name alone: 201, trimmed, with a per-project sort order", async () => {
    const a = await pm
      .post(`${BASE}/personas`)
      .send({ projectId: f.project.id, name: "  First  " });
    expect(a.status).toBe(201);
    expect(json<UsmPersonaDto>(a)).toMatchObject({ name: "First", projectId: f.project.id });
    const b = await pm.post(`${BASE}/personas`).send({ projectId: f.project.id, name: "Second" });
    expect(json<UsmPersonaDto>(b).sortOrder).toBe(json<UsmPersonaDto>(a).sortOrder + 1);
    const other = await pm
      .post(`${BASE}/personas`)
      .send({ projectId: f.otherProject.id, name: "X" });
    // Numbered within its own project (an earlier test may already have added one there), not continuing project A.
    expect(json<UsmPersonaDto>(other).sortOrder).toBeLessThan(json<UsmPersonaDto>(b).sortOrder + 1);
  });
  it("answers bad input with a structured error, never an empty body", async () => {
    for (const body of [
      { projectId: f.project.id, name: "   " },
      { projectId: f.project.id },
      { name: "No project" },
      { projectId: "not-a-uuid", name: "Bad id" },
    ]) {
      const res = await pm.post(`${BASE}/personas`).send(body);
      expect(res.status, JSON.stringify(body)).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      expect(json<{ error: { code: string; message: string } }>(res).error.message).toBeTruthy();
    }
  });
  it("tells the caller when the name is a duplicate", async () => {
    await pm.post(`${BASE}/personas`).send({ projectId: f.project.id, name: "Twin" });
    const res = await pm.post(`${BASE}/personas`).send({ projectId: f.project.id, name: "twin" });
    expect(res.status).toBe(409);
    expect(json<{ error: { message: string } }>(res).error.message).toBeTruthy();
  });
});

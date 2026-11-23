import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type {
  OstTreeDto,
  UsmFeatureDto,
  UsmPersonaDto,
  UsmStepDto,
  AdminLogResponse,
} from "@myapp/shared";
import { createApp } from "../app";
import { createFixture, type Fixture } from "../test/helpers";

type Agent = ReturnType<typeof request.agent>;
const json = <T>(res: { body: unknown }): T => res.body as T;

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

describe("Team member: User Story Mapping add and edit", () => {
  const BASE = "/api/story-map";
  let persona: UsmPersonaDto;
  let step: UsmStepDto;
  let feature: UsmFeatureDto;

  it("creates personas, steps and features, which start PENDING", async () => {
    const p = await member
      .post(`${BASE}/personas`)
      .send({ projectId: f.project.id, name: "Member user" });
    expect(p.status).toBe(201);
    persona = json<UsmPersonaDto>(p);
    const s = await member
      .post(`${BASE}/steps`)
      .send({ projectId: f.project.id, personaId: persona.id, title: "First step" });
    expect(s.status).toBe(201);
    step = json<UsmStepDto>(s);
    const ft = await member
      .post(`${BASE}/features`)
      .send({ projectId: f.project.id, stepId: step.id, title: "Feature", pmApproval: "APPROVED" });
    expect(ft.status).toBe(201);
    feature = json<UsmFeatureDto>(ft);
    // pmApproval in the body is ignored: a new item is always PENDING.
    expect(feature.pmApproval).toBe("PENDING");
  });

  it("edits personas, steps, step order and feature details", async () => {
    expect(
      (await member.patch(`${BASE}/personas/${persona.id}`).send({ name: "Renamed" })).status,
    ).toBe(200);
    expect(
      (await member.patch(`${BASE}/steps/${step.id}`).send({ title: "Renamed step" })).status,
    ).toBe(200);
    const second = json<UsmStepDto>(
      await member
        .post(`${BASE}/steps`)
        .send({
          projectId: f.project.id,
          personaId: persona.id,
          title: "Inserted",
          insertAtIndex: 0,
        }),
    );
    expect(
      (
        await member.patch(`${BASE}/steps/reorder`).send({
          projectId: f.project.id,
          personaId: persona.id,
          stepIds: [step.id, second.id],
        })
      ).status,
    ).toBe(200);
    const edited = await member.patch(`${BASE}/features/${feature.id}`).send({
      title: "Feature renamed",
      responsibleId: f.m1.id,
      sprintKey: "2026-S50",
    });
    expect(edited.status).toBe(200);
    expect(json<UsmFeatureDto>(edited)).toMatchObject({
      title: "Feature renamed",
      targetDate: "2026-12-13",
    });
  });

  it("cannot change pmApproval or complete a PENDING feature", async () => {
    const res = await member
      .patch(`${BASE}/features/${feature.id}`)
      .send({ pmApproval: "APPROVED", title: "Still pending" });
    expect(res.status).toBe(200);
    expect(json<UsmFeatureDto>(res).pmApproval).toBe("PENDING");
    const done = await member.patch(`${BASE}/features/${feature.id}`).send({ isCompleted: true });
    expect(done.status).toBe(403);
    expect(json<{ error: { code: string } }>(done).error.code).toBe("pm_approval_required");
  });

  it("still cannot delete, and cannot reach another project", async () => {
    expect((await member.delete(`${BASE}/features/${feature.id}`)).status).toBe(403);
    expect((await member.delete(`${BASE}/steps/${step.id}`)).status).toBe(403);
    expect((await member.delete(`${BASE}/personas/${persona.id}`)).status).toBe(403);
    const other = await member
      .post(`${BASE}/personas`)
      .send({ projectId: f.otherProject.id, name: "Sneaky" });
    expect(other.status).toBe(404);
  });
});

describe("Team member: OST add and edit", () => {
  let outcomeId: string;
  let oppId: string;
  let solId: string;
  const tree = async () => json<OstTreeDto>(await pm.get(`/api/projects/${f.project.id}/ost`));

  it("creates an outcome, a requirement and solutions", async () => {
    const o = await member
      .post(`/api/projects/${f.project.id}/ost/outcomes`)
      .send({ title: "Member outcome" });
    expect(o.status).toBe(201);
    outcomeId = json<{ id: string }>(o).id;
    const r = await member.post(`/api/ost/outcomes/${outcomeId}/opportunities`).send({
      title: "Member requirement",
      solutions: [{ title: "Step one", sprintKey: "2026-S50" }],
    });
    expect(r.status).toBe(201);
    oppId = json<{ id: string }>(r).id;
    const sol = (await tree()).solutions.find((s) => s.opportunityId === oppId)!;
    solId = sol.id;
    expect(sol).toMatchObject({ pmApproval: "PENDING", targetDate: "2026-12-13" });
    const more = await member
      .post(`/api/ost/opportunities/${oppId}/solutions`)
      .send({ title: "Step two", pmApproval: "APPROVED" });
    expect(more.status).toBe(201);
  });

  it("edits outcomes, requirements and solutions", async () => {
    expect(
      (await member.patch(`/api/ost/outcomes/${outcomeId}`).send({ title: "Renamed outcome" }))
        .status,
    ).toBe(200);
    expect(
      (await member.patch(`/api/ost/opportunities/${oppId}`).send({ title: "Renamed req" })).status,
    ).toBe(200);
    expect(
      (await member.patch(`/api/ost/solutions/${solId}`).send({ title: "Renamed sol" })).status,
    ).toBe(200);
    const sols = (await tree()).solutions.filter((s) => s.opportunityId === oppId);
    expect(sols.map((s) => s.pmApproval)).toEqual(["PENDING", "PENDING"]);
  });

  it("cannot complete a PENDING solution, delete or convert", async () => {
    expect(
      (await member.patch(`/api/ost/solutions/${solId}`).send({ validationStatus: "validated" }))
        .status,
    ).toBe(403);
    const created = await member.post(`/api/ost/outcomes/${outcomeId}/opportunities`).send({
      title: "Pre-completed",
      solutions: [{ title: "Done already", completed: true }],
    });
    expect(created.status).toBe(403);
    expect((await member.delete(`/api/ost/solutions/${solId}`)).status).toBe(403);
    expect((await member.delete(`/api/ost/outcomes/${outcomeId}`)).status).toBe(403);
    expect((await member.post(`/api/ost/solutions/${solId}/convert`).send({})).status).toBe(403);
  });

  it("cannot create under another project", async () => {
    const res = await member
      .post(`/api/projects/${f.otherProject.id}/ost/outcomes`)
      .send({ title: "Sneaky" });
    expect(res.status).toBe(404);
  });
});

describe("Admin Log stays Project Manager only", () => {
  it("answers 403 to a team member on every endpoint and 200 to a PM", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    expect((await member.get("/api/admin-log")).status).toBe(403);
    expect((await member.patch(`/api/admin-log/items/ost/${id}`).send({ title: "x" })).status).toBe(
      403,
    );
    expect(
      (
        await member
          .patch(`/api/admin-log/items/ost/${id}/approval`)
          .send({ pmApproval: "APPROVED" })
      ).status,
    ).toBe(403);
    const ok = await pm.get("/api/admin-log");
    expect(ok.status).toBe(200);
    expect(json<AdminLogResponse>(ok).projects).toBeInstanceOf(Array);
  });
});

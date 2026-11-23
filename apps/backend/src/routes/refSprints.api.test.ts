import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  manilaToday,
  type HomeResponse,
  type RefSprintDto,
  type UsmFeatureDto,
} from "@myapp/shared";
import { createApp } from "../app";
import { approveAll, createFixture, type Fixture } from "../test/helpers";

const json = <T>(res: { body: unknown }): T => res.body as T;
const BASE = "/api/story-map";
const app = createApp();
let f: Fixture;
let pm: ReturnType<typeof request.agent>;

beforeAll(async () => {
  f = await createFixture();
  pm = request.agent(app);
  expect(
    (await pm.post("/api/auth/login").send({ email: f.pm.email, password: f.password })).status,
  ).toBe(200);
});
afterAll(async () => {
  await f.cleanup();
});

async function currentSprint(): Promise<RefSprintDto> {
  const { items } = json<{ items: RefSprintDto[] }>(await pm.get("/api/ref/sprints"));
  const cur = items.find((s) => s.isCurrent);
  expect(cur).toBeDefined();
  return cur!;
}

describe("GET /api/ref/sprints", () => {
  it("serves seeded Monday-Sunday sprints and flags the one containing today (Asia/Manila)", async () => {
    const cur = await currentSprint();
    const today = manilaToday();
    expect(cur.startDate <= today && today <= cur.deadline).toBe(true);
    expect(cur.sprintKey).toBe(`${cur.year}-S${String(cur.sprintNumber).padStart(2, "0")}`);
    expect(new Date(`${cur.deadline}T00:00:00Z`).getUTCDay()).toBe(0);
    expect(new Date(`${cur.startDate}T00:00:00Z`).getUTCDay()).toBe(1);
  });
});

describe("sprint tagging against ref.sprints", () => {
  it("persists a valid key, syncs target_date to its deadline, and rejects an unknown key", async () => {
    const cur = await currentSprint();
    const persona = json<{ id: string }>(
      await pm.post(`${BASE}/personas`).send({ projectId: f.project.id, name: "Ref" }),
    );
    const step = json<{ id: string }>(
      await pm
        .post(`${BASE}/steps`)
        .send({ projectId: f.project.id, personaId: persona.id, title: "S" }),
    );
    const ok = await pm.post(`${BASE}/features`).send({
      projectId: f.project.id,
      stepId: step.id,
      title: "Tagged",
      responsibleId: f.m1.id,
      sprintKey: cur.sprintKey,
    });
    expect(ok.status).toBe(201);
    expect(json<UsmFeatureDto>(ok)).toMatchObject({
      sprintKey: cur.sprintKey,
      targetDate: cur.deadline,
    });
    const bad = await pm.post(`${BASE}/features`).send({
      projectId: f.project.id,
      stepId: step.id,
      title: "Bad",
      sprintKey: "2026-S99",
    });
    expect([400, 422]).toContain(bad.status);
  });
});

describe("GET /api/home active sprint", () => {
  it("resolves the current ref.sprints row and counts work tagged with it", async () => {
    const cur = await currentSprint();
    await approveAll(f.project.id);
    const home = json<HomeResponse>(await pm.get("/api/home"));
    expect(home.activeSprint).toMatchObject({
      sprintKey: cur.sprintKey,
      sprintNumber: cur.sprintNumber,
      endDate: cur.deadline,
    });
    expect(home.sprintSummary.total).toBeGreaterThan(0);
  });
});

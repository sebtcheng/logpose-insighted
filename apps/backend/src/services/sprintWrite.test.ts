import { describe, expect, it } from "vitest";
import { sprintColumns, sprintColumnsOrUndefined } from "./sprintWrite";

describe("sprintWrite", () => {
  it("derives the Sunday end date from a sprint key, overriding a stale date", () => {
    expect(sprintColumns({ sprintKey: "2026-S48", targetDate: "2026-01-01" })).toEqual({
      sprintKey: "2026-S48",
      targetDate: "2026-11-29",
    });
  });

  it("clears both on null and keeps a legacy date when no sprint is sent", () => {
    expect(sprintColumns({ sprintKey: null })).toEqual({ sprintKey: null, targetDate: null });
    expect(sprintColumns({ targetDate: "2026-11-18" })).toEqual({
      sprintKey: null,
      targetDate: "2026-11-18",
    });
    expect(sprintColumns({})).toEqual({ sprintKey: null, targetDate: null });
    expect(sprintColumnsOrUndefined({})).toBeUndefined();
  });

  it("rejects unknown and past sprints with a 422", () => {
    expect(() => sprintColumns({ sprintKey: "2026-S99" })).toThrow(/Unknown sprint/);
    expect(() => sprintColumns({ sprintKey: "2025-S48" })).toThrow(/Past sprint/);
  });
});

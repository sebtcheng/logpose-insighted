import { describe, expect, it } from "vitest";
import { addDays, bucketFor, homeRanges, localDate, monthBounds, weekStart } from "./dateBuckets";

describe("week and month boundaries", () => {
  it("starts the week on Monday", () => {
    expect(weekStart("2026-11-18")).toBe("2026-11-16"); // Wednesday
    expect(weekStart("2026-11-16")).toBe("2026-11-16"); // Monday itself
    expect(weekStart("2026-11-22")).toBe("2026-11-16"); // Sunday belongs to the previous Monday
  });
  it("finds month bounds including leap February", () => {
    expect(monthBounds("2028-02-10")).toEqual({ start: "2028-02-01", end: "2028-02-29" });
    expect(monthBounds("2026-12-31").end).toBe("2026-12-31");
  });
  it("adds days across month boundaries", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("converts an instant to the Manila calendar date", () => {
    expect(localDate(new Date("2026-11-17T17:00:00Z"), "Asia/Manila")).toBe("2026-11-18");
  });
});

describe("home bucketing", () => {
  const r = homeRanges("2026-11-18"); // week 16-22 Nov, next week 23-29 Nov, month ends 30 Nov
  const open = (dueDate: string | null) => ({
    dueDate,
    status: "in_progress",
    completedDate: null,
  });

  it("hides items with no due date", () => {
    expect(bucketFor(open(null), r)).toBeNull();
  });
  it("buckets open items by due date", () => {
    expect(bucketFor(open("2026-11-16"), r)).toBe("thisWeek");
    expect(bucketFor(open("2026-11-22"), r)).toBe("thisWeek");
    expect(bucketFor(open("2026-11-23"), r)).toBe("nextWeek");
    expect(bucketFor(open("2026-11-29"), r)).toBe("nextWeek");
    expect(bucketFor(open("2026-11-30"), r)).toBe("thisMonth");
    expect(bucketFor(open("2026-12-01"), r)).toBe("thisMonth");
    expect(bucketFor(open("2027-03-15"), r)).toBe("thisMonth");
  });
  it("never drops a dated open item and still hides undated ones", () => {
    for (const d of ["2025-01-01", "2026-11-02", "2026-11-18", "2026-12-31"])
      expect(bucketFor(open(d), r)).not.toBeNull();
    expect(bucketFor(open(null), r)).toBeNull();
  });
  it("keeps overdue open work in This Week", () => {
    expect(bucketFor(open("2026-11-02"), r)).toBe("thisWeek");
  });
  it("puts later-this-month items in This Month when next week spills into the next month", () => {
    const late = homeRanges("2026-11-26"); // week 23-29 Nov, next week 30 Nov - 6 Dec
    expect(late.monthEnd).toBe("2026-11-30");
    expect(bucketFor(open("2026-11-30"), late)).toBe("nextWeek");
    expect(bucketFor(open("2026-12-03"), late)).toBe("nextWeek");
  });
  it("shows done items only when completed this week", () => {
    const done = (completedDate: string | null) => ({
      dueDate: "2026-11-17",
      status: "done",
      completedDate,
    });
    expect(bucketFor(done("2026-11-17"), r)).toBe("thisWeek");
    expect(bucketFor(done("2026-11-15"), r)).toBeNull(); // Sunday before Monday
    expect(bucketFor(done("2026-11-23"), r)).toBeNull();
    expect(bucketFor(done(null), r)).toBeNull();
  });
});

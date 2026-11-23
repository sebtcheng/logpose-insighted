import { and, asc, gte, lte } from "drizzle-orm";
import { manilaToday, type RefSprintDto } from "@myapp/shared";
import { db } from "../db/client";
import { refSprints } from "../db/schema";

const DAY_MS = 86_400_000;
const addDays = (date: string, days: number): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);

/** Default selectable window: current sprint (today) through 26 weeks ahead. Past sprints are excluded. */
export const REF_SPRINT_DEFAULT_PAST_DAYS = 0;
export const REF_SPRINT_DEFAULT_AHEAD_DAYS = 26 * 7;

/** ref.sprints rows overlapping [from, to] (defaults above), oldest first, each flagged when it contains today in Manila. */
export async function listRefSprints(
  q: { from?: string; to?: string } = {},
  now: Date = new Date(),
): Promise<RefSprintDto[]> {
  const today = manilaToday(now);
  const from = q.from ?? addDays(today, -REF_SPRINT_DEFAULT_PAST_DAYS);
  const to = q.to ?? addDays(today, REF_SPRINT_DEFAULT_AHEAD_DAYS);
  const rows = await db
    .select()
    .from(refSprints)
    .where(and(gte(refSprints.deadline, from), lte(refSprints.startDate, to)))
    .orderBy(asc(refSprints.startDate));
  return rows.map((r) => ({
    sprintKey: r.sprintKey,
    year: r.year,
    sprintNumber: r.sprintNumber,
    startDate: r.startDate,
    deadline: r.deadline,
    label: r.label,
    isCurrent: r.startDate <= today && today <= r.deadline,
  }));
}

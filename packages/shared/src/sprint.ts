import { z } from "zod";

/**
 * Weekly sprints, Monday-Sunday, every sprint ends on a Sunday (calendar dates in Asia/Manila).
 * Sprint N of year Y is the N-th Sunday that falls in year Y, so numbering is deterministic and
 * `Sprint 1` always ends on the first Sunday of the year. The Sunday end date is the canonical identity;
 * the key `YYYY-Snn` is its stable string form and is what the API and DB store next to `targetDate`.
 */
export const SPRINT_TIME_ZONE = "Asia/Manila";
export const SPRINT_DEFAULT_WEEKS_AHEAD = 26;

export const sprintKeySchema = z.string().regex(/^\d{4}-S\d{2}$/, "Expected sprint key YYYY-Snn");

export type SprintInfo = {
  /** `YYYY-Snn`, e.g. 2026-S47. */
  key: string;
  /** 1-based index of the Sunday within its year. */
  number: number;
  /** Year of the Sunday end date. */
  year: number;
  /** Sunday, `YYYY-MM-DD`. */
  endDate: string;
  /** Monday, `YYYY-MM-DD`. */
  startDate: string;
};

export type SprintOption = SprintInfo & { label: string };

const DAY_MS = 86_400_000;
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function toUtcMs(date: string): number {
  const m = ISO_DATE.exec(date);
  if (!m) throw new Error(`Invalid date: ${date}`);
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (toIso(ms) !== date) throw new Error(`Invalid date: ${date}`);
  return ms;
}

function toIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Today's calendar date in Asia/Manila, never shifted by the host's UTC offset. */
export function manilaToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: SPRINT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** The Sunday on or after `date` (the end of the sprint that contains it). */
export function sprintEndDateFor(date: string): string {
  const ms = toUtcMs(date);
  const dow = new Date(ms).getUTCDay(); // 0 = Sunday
  return toIso(ms + ((7 - dow) % 7) * DAY_MS);
}

function firstSundayOfYear(year: number): number {
  const jan1 = Date.UTC(year, 0, 1);
  return jan1 + ((7 - new Date(jan1).getUTCDay()) % 7) * DAY_MS;
}

function infoFromSunday(endDate: string): SprintInfo {
  const ms = toUtcMs(endDate);
  const year = new Date(ms).getUTCFullYear();
  const number = Math.round((ms - firstSundayOfYear(year)) / (7 * DAY_MS)) + 1;
  return {
    key: `${year}-S${String(number).padStart(2, "0")}`,
    number,
    year,
    endDate,
    startDate: toIso(ms - 6 * DAY_MS),
  };
}

/** Sprint containing a (possibly mid-week, legacy) date: the one ending on the Sunday on or after it. */
export function sprintForDate(date: string): SprintInfo {
  return infoFromSunday(sprintEndDateFor(date));
}

/** Resolves `YYYY-Snn` to its sprint, or null when malformed or the year has no such Sunday. */
export function sprintFromKey(key: string): SprintInfo | null {
  const m = /^(\d{4})-S(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const number = Number(m[2]);
  if (number < 1) return null;
  const info = infoFromSunday(toIso(firstSundayOfYear(year) + (number - 1) * 7 * DAY_MS));
  return info.year === year ? info : null;
}

/** Canonical Sunday end date (`YYYY-MM-DD`) for a sprint key, or null when invalid. */
export function sprintEndDateFromKey(key: string): string | null {
  return sprintFromKey(key)?.endDate ?? null;
}

/** `Sprint 47 — Ends Sun, Nov 22, 2026` */
export function formatSprintLabel(info: Pick<SprintInfo, "number" | "endDate">): string {
  const d = new Date(toUtcMs(info.endDate));
  const text = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
  // "Sun, Nov 22, 2026"
  return `Sprint ${info.number} — Ends ${text}`;
}

function withLabel(info: SprintInfo): SprintOption {
  return { ...info, label: formatSprintLabel(info) };
}

/** Sprint + label for a stored record: prefers the key, falls back to the legacy date. Null when neither is set. */
export function resolveStoredSprint(
  sprintKey: string | null | undefined,
  targetDate: string | null | undefined,
): SprintOption | null {
  const fromKey = sprintKey ? sprintFromKey(sprintKey) : null;
  if (fromKey) return withLabel(fromKey);
  if (targetDate) return withLabel(sprintForDate(targetDate));
  return null;
}

const isoDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const refSprintsQuerySchema = z.object({ from: isoDay.optional(), to: isoDay.optional() });

/** A row of ref.sprints as served by GET /ref/sprints. */
export type RefSprintDto = {
  sprintKey: string;
  year: number;
  sprintNumber: number;
  startDate: string;
  deadline: string;
  label: string;
  /** Contains today in Asia/Manila. */
  isCurrent: boolean;
};

/** `Sprint 48 — Ends Sun, Nov 29, 2026`, built from a ref.sprints row. */
export const formatRefSprintLabel = (s: Pick<RefSprintDto, "sprintNumber" | "deadline">): string =>
  formatSprintLabel({ number: s.sprintNumber, endDate: s.deadline });

/** Sprint fields every action DTO carries next to `targetDate`. */
export type SprintFields = { sprintKey: string | null; sprintLabel: string | null };

export function sprintFieldsFor(
  sprintKey: string | null | undefined,
  targetDate: string | null | undefined,
): SprintFields {
  const s = resolveStoredSprint(sprintKey, targetDate);
  return { sprintKey: s?.key ?? null, sprintLabel: s?.label ?? null };
}

/**
 * Selectable sprints: the current sprint (Manila) through `weeksAhead` weeks ahead, plus any past sprint already
 * assigned to a record (`keep`: sprint keys or legacy dates) so editing old items never drops the selection.
 * Sorted by end date, de-duplicated.
 */
export function listSprintOptions(
  opts: {
    today?: string;
    weeksAhead?: number;
    keep?: ReadonlyArray<string | null | undefined>;
  } = {},
): SprintOption[] {
  const today = opts.today ?? manilaToday();
  const weeksAhead = opts.weeksAhead ?? SPRINT_DEFAULT_WEEKS_AHEAD;
  const byKey = new Map<string, SprintInfo>();
  const currentEnd = toUtcMs(sprintEndDateFor(today));
  for (let i = 0; i <= weeksAhead; i++) {
    const info = infoFromSunday(toIso(currentEnd + i * 7 * DAY_MS));
    byKey.set(info.key, info);
  }
  for (const k of opts.keep ?? []) {
    if (!k) continue;
    const info = ISO_DATE.test(k) ? sprintForDate(k) : sprintFromKey(k);
    if (info) byKey.set(info.key, info);
  }
  return [...byKey.values()].sort((a, b) => a.endDate.localeCompare(b.endDate)).map(withLabel);
}

/**
 * Server-side write rule. A sprint key wins: it is validated and the date column is set to its Sunday end date.
 * `null` clears both. With no key, a legacy `targetDate` is kept as sent (sprintKey stays as stored).
 * Returns undefined for a field that was not part of the input.
 */
export function resolveSprintWrite(input: {
  sprintKey?: string | null;
  targetDate?: string | null;
}): { sprintKey: string | null; targetDate: string | null } | { error: string } | undefined {
  if (input.sprintKey === undefined) {
    if (input.targetDate === undefined) return undefined;
    return { sprintKey: null, targetDate: input.targetDate };
  }
  if (input.sprintKey === null) return { sprintKey: null, targetDate: null };
  const info = sprintFromKey(input.sprintKey);
  if (!info) return { error: `Unknown sprint ${input.sprintKey}` };
  return { sprintKey: info.key, targetDate: info.endDate };
}

/** Pure calendar helpers on YYYY-MM-DD strings. Weeks start on Monday. */

const MS_PER_DAY = 86_400_000;

const toUtc = (ymd: string): number => {
  const [y, m, d] = ymd.split("-").map(Number) as [number, number, number];
  return Date.UTC(y, m - 1, d);
};
const fromUtc = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

export const addDays = (ymd: string, days: number): string =>
  fromUtc(toUtc(ymd) + days * MS_PER_DAY);
export const diffDays = (a: string, b: string): number =>
  Math.round((toUtc(a) - toUtc(b)) / MS_PER_DAY);

/** Monday of the week containing `ymd`. */
export function weekStart(ymd: string): string {
  const dow = new Date(toUtc(ymd)).getUTCDay(); // 0 = Sunday
  const sinceMonday = (dow + 6) % 7;
  return addDays(ymd, -sinceMonday);
}

export function monthBounds(ymd: string): { start: string; end: string } {
  const [y, m] = ymd.split("-").map(Number) as [number, number];
  const start = fromUtc(Date.UTC(y, m - 1, 1));
  const end = fromUtc(Date.UTC(y, m, 0));
  return { start, end };
}

/** Calendar date of an instant in a given IANA timezone (default Asia/Manila). */
export function localDate(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export type HomeBucket = "thisWeek" | "nextWeek" | "thisMonth" | "later";

export type HomeRanges = {
  today: string;
  weekStart: string;
  weekEnd: string;
  nextWeekStart: string;
  nextWeekEnd: string;
  monthEnd: string;
};

export function homeRanges(today: string): HomeRanges {
  const ws = weekStart(today);
  return {
    today,
    weekStart: ws,
    weekEnd: addDays(ws, 6),
    nextWeekStart: addDays(ws, 7),
    nextWeekEnd: addDays(ws, 13),
    monthEnd: monthBounds(today).end,
  };
}

/**
 * Which Home bucket an item falls in, or null if it should not appear.
 * - No due date: never shown.
 * - Open and overdue: pinned to This Week so late work stays visible.
 * - Done: shown only when completed this week, in the bucket of its due date (This Week if the due date is elsewhere).
 * - This Month: remaining items due later this month, after next week.
 * - Later: open items due after this month, so no dated open item is ever dropped.
 */
export function bucketFor(
  item: { dueDate: string | null; status: string; completedDate: string | null },
  r: HomeRanges,
): HomeBucket | null {
  if (!item.dueDate) return null;
  const due = item.dueDate;
  if (item.status === "done") {
    if (!item.completedDate || item.completedDate < r.weekStart || item.completedDate > r.weekEnd)
      return null;
    if (due >= r.nextWeekStart && due <= r.nextWeekEnd) return "nextWeek";
    if (due > r.nextWeekEnd) return "thisMonth";
    return "thisWeek";
  }
  if (due <= r.weekEnd) return "thisWeek";
  if (due <= r.nextWeekEnd) return "nextWeek";
  return "thisMonth";
}

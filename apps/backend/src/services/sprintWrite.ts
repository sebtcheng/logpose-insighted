import { manilaToday, resolveSprintWrite } from "@myapp/shared";
import { unprocessable } from "../errors";

type Cols = { sprintKey: string | null; targetDate: string | null };

/**
 * Server-side sprint rule shared by USM, OST, Kano and RAID action rows. A sprint key is validated and the
 * existing target_date column is set to its Sunday end date, so client and server never drift (Home, Workload and
 * Insights keep bucketing on target_date). Returns undefined when the input says nothing about the deadline.
 * Rejects past sprints (deadline before today in Asia/Manila) so tasks are never tagged to last year.
 */
export function sprintColumnsOrUndefined(input: {
  sprintKey?: string | null;
  targetDate?: string | null;
}): Cols | undefined {
  const r = resolveSprintWrite(input);
  if (r && "error" in r) throw unprocessable(r.error);
  if (r?.sprintKey && r.targetDate && r.targetDate < manilaToday()) {
    throw unprocessable(`Past sprint ${r.sprintKey} (${r.targetDate}) cannot be selected`);
  }
  return r;
}

/** Same, for full-replace writes where an omitted deadline means no deadline. */
export function sprintColumns(input: {
  sprintKey?: string | null;
  targetDate?: string | null;
}): Cols {
  return sprintColumnsOrUndefined(input) ?? { sprintKey: null, targetDate: null };
}

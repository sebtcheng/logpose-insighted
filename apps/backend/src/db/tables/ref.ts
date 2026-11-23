import { date, index, integer, pgSchema, text, unique } from "drizzle-orm/pg-core";
import { createdAt, updatedAt } from "./columns";

/** Reference data shared by every module. Lives in its own Postgres schema, `ref`. */
export const refSchema = pgSchema("ref");

/**
 * Canonical weekly sprints, Monday-Sunday in Asia/Manila. Sprint N of year Y is the N-th Sunday ending in year Y
 * (same rule as `sprintFromKey` in @myapp/shared). Task tables point at `sprint_key`; their target_date is the deadline.
 */
export const refSprints = refSchema.table(
  "sprints",
  {
    sprintKey: text("sprint_key").primaryKey(),
    year: integer("year").notNull(),
    sprintNumber: integer("sprint_number").notNull(),
    startDate: date("start_date", { mode: "string" }).notNull(),
    deadline: date("deadline", { mode: "string" }).notNull(),
    label: text("label").notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    unique("ref_sprints_year_number_uq").on(t.year, t.sprintNumber),
    index("ref_sprints_dates_idx").on(t.startDate, t.deadline),
  ],
);

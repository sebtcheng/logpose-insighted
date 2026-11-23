import { refSprints } from "./ref";
import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { moduleBase, users } from "./core";
import { validationStatus } from "./enums";
import { userStories } from "./stories";

/** Opportunity Solution Tree. */

// ---- Opportunity Solution Tree
export const ostOutcomes = pgTable(
  "ost_outcomes",
  {
    ...moduleBase(),
    title: text("title").notNull(),
    description: text("description"),
  },
  (t) => [
    index("ost_outcomes_project_id_idx").on(t.projectId),
    index("ost_outcomes_created_by_idx").on(t.createdById),
    check("ost_outcomes_title_not_empty", sql`char_length(btrim(${t.title})) > 0`),
  ],
);

export const ostOpportunities = pgTable(
  "ost_opportunities",
  {
    ...moduleBase(),
    outcomeId: uuid("outcome_id")
      .notNull()
      .references(() => ostOutcomes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    isTargeted: boolean("is_targeted").notNull().default(false),
  },
  (t) => [
    index("ost_opportunities_project_id_idx").on(t.projectId),
    index("ost_opportunities_outcome_id_idx").on(t.outcomeId),
    index("ost_opportunities_created_by_idx").on(t.createdById),
    uniqueIndex("ost_opportunities_one_targeted_per_outcome")
      .on(t.outcomeId)
      .where(sql`${t.isTargeted}`),
    check("ost_opportunities_title_not_empty", sql`char_length(btrim(${t.title})) > 0`),
  ],
);

export const ostSolutions = pgTable(
  "ost_solutions",
  {
    ...moduleBase(),
    opportunityId: uuid("opportunity_id")
      .notNull()
      .references(() => ostOpportunities.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    code: text("code")
      .notNull()
      .generatedAlwaysAs(
        sql`'OST-' || repeat('0', greatest(2 - length(seq::text), 0)) || seq::text`,
      ),
    title: text("title").notNull(),
    // The solution is the action: planned until the PM marks it validated.
    validationStatus: validationStatus("validation_status").notNull().default("planned"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    targetDate: date("target_date", { mode: "string" }),
    // Weekly sprint (`YYYY-Snn`); target_date is kept equal to its Sunday end date. Null for legacy rows.
    sprintKey: text("sprint_key").references(() => refSprints.sprintKey, {
      onUpdate: "cascade",
      onDelete: "set null",
    }),
    pmApproval: text("pm_approval").$type<"PENDING" | "APPROVED">().notNull().default("PENDING"),
    convertedStoryId: uuid("converted_story_id").references((): AnyPgColumn => userStories.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    unique("ost_solutions_project_seq_uq").on(t.projectId, t.seq),
    index("ost_solutions_project_id_idx").on(t.projectId),
    index("ost_solutions_opportunity_idx").on(t.opportunityId),
    index("ost_solutions_owner_idx").on(t.ownerId),
    index("ost_solutions_converted_story_idx").on(t.convertedStoryId),
    index("ost_solutions_created_by_idx").on(t.createdById),
    check("ost_solutions_seq_positive", sql`${t.seq} > 0`),
    check("ost_solutions_title_not_empty", sql`char_length(btrim(${t.title})) > 0`),
  ],
);

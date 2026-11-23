import { refSprints } from "./ref";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, pk, updatedAt } from "./columns";
import { moduleBase, projects, users } from "./core";

/** User Story Mapping v2: persona -> ordered steps -> feature checklist. */

// ---- User Story Mapping v2: Project -> persona -> ordered steps -> feature checklist.
// The legacy personas / journey_steps / user_stories / releases tables stay in place, unused by this flow.
export const usmPersonas = pgTable(
  "usm_personas",
  {
    ...moduleBase(),
    name: text("name").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("usm_personas_project_sort_idx").on(t.projectId, t.sortOrder),
    uniqueIndex("usm_personas_project_name_lower_uq").on(t.projectId, sql`lower(${t.name})`),
    unique("usm_personas_id_project_uq").on(t.id, t.projectId),
    check("usm_personas_name_not_empty", sql`char_length(btrim(${t.name})) > 0`),
  ],
);

export const usmSteps = pgTable(
  "usm_steps",
  {
    ...moduleBase(),
    personaId: uuid("persona_id")
      .notNull()
      .references(() => usmPersonas.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [
    index("usm_steps_project_idx").on(t.projectId),
    index("usm_steps_persona_idx").on(t.personaId),
    index("usm_steps_project_persona_sort_idx").on(t.projectId, t.personaId, t.sortOrder),
    unique("usm_steps_id_project_uq").on(t.id, t.projectId),
    check("usm_steps_title_not_empty", sql`char_length(btrim(${t.title})) > 0`),
  ],
);

export const usmStepFeatures = pgTable(
  "usm_step_features",
  {
    id: pk(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    stepId: uuid("step_id")
      .notNull()
      .references(() => usmSteps.id, { onDelete: "restrict" }),
    title: text("title").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Same shapes as kano_request_specs.responsible_id / target_date.
    responsibleId: uuid("responsible_id").references(() => users.id, { onDelete: "set null" }),
    targetDate: date("target_date", { mode: "string" }),
    // Weekly sprint (`YYYY-Snn`); target_date is kept equal to its Sunday end date. Null for legacy rows.
    sprintKey: text("sprint_key").references(() => refSprints.sprintKey, {
      onUpdate: "cascade",
      onDelete: "set null",
    }),
    pmApproval: text("pm_approval").$type<"PENDING" | "APPROVED">().notNull().default("PENDING"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("usm_step_features_project_idx").on(t.projectId),
    index("usm_step_features_step_sort_idx").on(t.stepId, t.sortOrder),
    index("usm_step_features_responsible_idx").on(t.responsibleId),
    // The feature's project must equal its step's project (enforced by a composite FK in the migration).
    check("usm_step_features_title_not_empty", sql`char_length(btrim(${t.title})) > 0`),
    check(
      "usm_step_features_completed_at_matches",
      sql`${t.isCompleted} = (${t.completedAt} IS NOT NULL)`,
    ),
  ],
);

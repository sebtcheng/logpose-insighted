import { refSprints } from "./ref";
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, pk, updatedAt } from "./columns";
import { moduleBase, users } from "./core";
import { raidStatus, raidType } from "./enums";

/** RAID log. */

// ---- RAID Log
export const raidItems = pgTable(
  "raid_items",
  {
    ...moduleBase(),
    seq: integer("seq").notNull(),
    code: text("code")
      .notNull()
      .generatedAlwaysAs(
        sql`'RAID-' || repeat('0', greatest(2 - length(seq::text), 0)) || seq::text`,
      ),
    itemType: raidType("item_type").notNull(),
    description: text("description").notNull(),
    impact: smallint("impact").notNull(),
    likelihood: smallint("likelihood"),
    // impact * likelihood; null while likelihood is unknown.
    severityScore: smallint("severity_score").generatedAlwaysAs(sql`impact * likelihood`),
    mitigatingAction: text("mitigating_action"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    raisedById: uuid("raised_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: raidStatus("status").notNull().default("open"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
  },
  (t) => [
    unique("raid_items_project_seq_uq").on(t.projectId, t.seq),
    index("raid_items_project_id_idx").on(t.projectId),
    index("raid_items_owner_idx").on(t.ownerId),
    index("raid_items_raised_by_idx").on(t.raisedById),
    index("raid_items_created_by_idx").on(t.createdById),
    index("raid_items_type_status_idx").on(t.itemType, t.status),
    check("raid_items_seq_positive", sql`${t.seq} > 0`),
    check("raid_items_description_not_empty", sql`char_length(btrim(${t.description})) > 0`),
    check("raid_items_impact_range", sql`${t.impact} BETWEEN 1 AND 3`),
    check(
      "raid_items_likelihood_range",
      sql`${t.likelihood} IS NULL OR ${t.likelihood} BETWEEN 1 AND 3`,
    ),
  ],
);

// One-to-many checklist of mitigating actions. Replaces raid_items.mitigating_action, which stays
// in place (deprecated, no longer written) until a later contract migration drops it.
export const raidMitigatingActions = pgTable(
  "raid_mitigating_actions",
  {
    id: pk(),
    raidItemId: uuid("raid_item_id")
      .notNull()
      .references(() => raidItems.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    // Nullable in the DB so rows created before this column existed stay valid; the API requires it on write.
    targetDate: date("target_date", { mode: "string" }),
    // Weekly sprint (`YYYY-Snn`); target_date is kept equal to its Sunday end date. Null for legacy rows.
    sprintKey: text("sprint_key").references(() => refSprints.sprintKey, {
      onUpdate: "cascade",
      onDelete: "set null",
    }),
    pmApproval: text("pm_approval").$type<"PENDING" | "APPROVED">().notNull().default("PENDING"),
    // Staff responsible. Nullable like raid_items.owner_id (set null on user delete); the API requires it on write.
    responsibleId: uuid("responsible_id").references(() => users.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("raid_mitigating_actions_raid_item_idx").on(t.raidItemId, t.sortOrder),
    index("raid_mitigating_actions_responsible_idx").on(t.responsibleId),
    check(
      "raid_mitigating_actions_description_not_empty",
      sql`char_length(btrim(${t.description})) > 0`,
    ),
    check(
      "raid_mitigating_actions_completed_at_matches",
      sql`${t.isCompleted} = (${t.completedAt} IS NOT NULL)`,
    ),
  ],
);

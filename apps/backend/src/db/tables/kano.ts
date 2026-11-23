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
  uuid,
} from "drizzle-orm/pg-core";
import { createdAt, pk, updatedAt } from "./columns";
import { moduleBase, users } from "./core";
import { kanoCategory } from "./enums";

/** Kano Request Tracker. */

// ---- Kano Request Tracker
export const kanoRequests = pgTable(
  "kano_requests",
  {
    ...moduleBase(),
    seq: integer("seq").notNull(),
    code: text("code")
      .notNull()
      .generatedAlwaysAs(
        sql`'REQ-' || repeat('0', greatest(3 - length(seq::text), 0)) || seq::text`,
      ),
    revisionRequest: text("revision_request").notNull(),
    kanoCategory: kanoCategory("kano_category"),
    targetDate: date("target_date", { mode: "string" }),
    // Person responsible; same shape as raid_items.owner_id.
    responsibleId: uuid("responsible_id").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [
    unique("kano_requests_project_seq_uq").on(t.projectId, t.seq),
    index("kano_requests_project_id_idx").on(t.projectId),
    index("kano_requests_category_idx").on(t.kanoCategory),
    index("kano_requests_responsible_idx").on(t.responsibleId),
    index("kano_requests_created_by_idx").on(t.createdById),
    check("kano_requests_seq_positive", sql`${t.seq} > 0`),
    check(
      "kano_requests_revision_request_not_empty",
      sql`char_length(btrim(${t.revisionRequest})) > 0`,
    ),
  ],
);

// One-to-many checklist of revision specs. A request is complete only when every spec is done.
export const kanoRequestSpecs = pgTable(
  "kano_request_specs",
  {
    id: pk(),
    kanoRequestId: uuid("kano_request_id")
      .notNull()
      .references(() => kanoRequests.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    sortOrder: integer("sort_order").notNull().default(0),
    // Per-spec tagging. Same shapes as kano_requests.target_date / responsible_id (the request-level date is deprecated).
    targetDate: date("target_date", { mode: "string" }),
    // Weekly sprint (`YYYY-Snn`); target_date is kept equal to its Sunday end date. Null for legacy rows.
    sprintKey: text("sprint_key").references(() => refSprints.sprintKey, {
      onUpdate: "cascade",
      onDelete: "set null",
    }),
    pmApproval: text("pm_approval").$type<"PENDING" | "APPROVED">().notNull().default("PENDING"),
    responsibleId: uuid("responsible_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("kano_request_specs_request_idx").on(t.kanoRequestId, t.sortOrder),
    index("kano_request_specs_responsible_idx").on(t.responsibleId),
    check("kano_request_specs_label_not_empty", sql`char_length(btrim(${t.label})) > 0`),
    check(
      "kano_request_specs_completed_at_matches",
      sql`${t.isCompleted} = (${t.completedAt} IS NOT NULL)`,
    ),
  ],
);

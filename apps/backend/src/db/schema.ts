/*
 * Source of truth for the database. Drizzle cannot express the composite
 * same-project foreign keys with column-list ON DELETE SET NULL, the updated_at
 * triggers or the uuidv7() fallback; those live in the hand-written migration
 * next to the generated one (see apps/backend/README.md).
 */

/*
 * Tables are split by domain under ./tables; this file is the single entry point that drizzle-kit
 * (drizzle.config.ts) and the app import, so `import { activities } from "../db/schema"` keeps working.
 */
export * from "./tables/enums";
export * from "./tables/core";
export * from "./tables/activities";
export * from "./tables/planning";
export * from "./tables/ost";
export * from "./tables/stories";
export * from "./tables/usm";
export * from "./tables/kano";
export * from "./tables/raid";
export * from "./tables/ref";

-- Change usm_step_features.step_id FK from ON DELETE CASCADE to ON DELETE RESTRICT.
-- Idempotent: safe to re-run without modifying or deleting any existing step or action records.
ALTER TABLE "usm_step_features" DROP CONSTRAINT IF EXISTS "usm_step_features_step_id_usm_steps_id_fk";--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'usm_step_features_step_id_usm_steps_id_fk'
  ) THEN
    ALTER TABLE "usm_step_features"
      ADD CONSTRAINT "usm_step_features_step_id_usm_steps_id_fk"
      FOREIGN KEY ("step_id") REFERENCES "public"."usm_steps"("id")
      ON DELETE restrict ON UPDATE no action;
  END IF;
END $$;

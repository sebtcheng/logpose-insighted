-- Rollback for 0038_ref_sprints.sql. Run in one transaction. Not applied automatically.
-- Task rows and their sprint_key / target_date values are kept; only the constraints, indexes and ref.sprints go.
BEGIN;
ALTER TABLE usm_step_features DROP CONSTRAINT IF EXISTS usm_step_features_sprint_key_sprints_sprint_key_fk;
ALTER TABLE ost_solutions DROP CONSTRAINT IF EXISTS ost_solutions_sprint_key_sprints_sprint_key_fk;
ALTER TABLE kano_request_specs DROP CONSTRAINT IF EXISTS kano_request_specs_sprint_key_sprints_sprint_key_fk;
ALTER TABLE raid_mitigating_actions DROP CONSTRAINT IF EXISTS raid_mitigating_actions_sprint_key_sprints_sprint_key_fk;
DROP INDEX IF EXISTS usm_step_features_sprint_key_idx, ost_solutions_sprint_key_idx, kano_request_specs_sprint_key_idx, raid_mitigating_actions_sprint_key_idx;
DROP TABLE IF EXISTS ref.sprints;
DROP SCHEMA IF EXISTS ref;
-- Remove the drizzle journal row so the migration can be re-applied:
DELETE FROM drizzle.__drizzle_migrations WHERE created_at = 1795237437158;
COMMIT;
-- Note: sprint_key values the backfill filled in (previously NULL) stay tagged; that is intended and loses nothing.

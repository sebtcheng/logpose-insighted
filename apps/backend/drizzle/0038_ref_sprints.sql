-- Canonical weekly sprints (Monday-Sunday, Asia/Manila) in the `ref` schema, and a foreign key from every
-- sprint-tagged task table. Idempotent and non-destructive: nothing is dropped, no task row is deleted, and
-- target_date is never rewritten. The legacy "sprints" table is untouched.
CREATE SCHEMA IF NOT EXISTS ref;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS ref.sprints (
  sprint_key text PRIMARY KEY,
  year integer NOT NULL,
  sprint_number integer NOT NULL,
  start_date date NOT NULL,
  deadline date NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ref_sprints_year_number_uq UNIQUE (year, sprint_number)
);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ref_sprints_dates_idx ON ref.sprints (start_date, deadline);--> statement-breakpoint
-- Sprint N of year Y = the N-th Sunday that ends in year Y (matches sprintFromKey in @myapp/shared). 2020-2032.
INSERT INTO ref.sprints (sprint_key, year, sprint_number, start_date, deadline, label)
SELECT
  s.yr || '-S' || lpad(s.n::text, 2, '0'),
  s.yr,
  s.n,
  (s.sunday - 6),
  s.sunday,
  'Sprint ' || s.n
FROM (
  SELECT
    d::date AS sunday,
    extract(year FROM d)::int AS yr,
    (row_number() OVER (PARTITION BY extract(year FROM d) ORDER BY d))::int AS n
  FROM generate_series('2020-01-01'::date, '2032-12-31'::date, interval '1 day') AS d
  WHERE extract(dow FROM d) = 0
) s
ON CONFLICT (sprint_key) DO NOTHING;--> statement-breakpoint
-- Backfill: a task with a deadline but no (or an unknown) sprint key is tagged with the sprint containing its date.
UPDATE usm_step_features t SET sprint_key = r.sprint_key FROM ref.sprints r
  WHERE t.target_date IS NOT NULL AND t.target_date BETWEEN r.start_date AND r.deadline
    AND (t.sprint_key IS NULL OR NOT EXISTS (SELECT 1 FROM ref.sprints x WHERE x.sprint_key = t.sprint_key));--> statement-breakpoint
UPDATE ost_solutions t SET sprint_key = r.sprint_key FROM ref.sprints r
  WHERE t.target_date IS NOT NULL AND t.target_date BETWEEN r.start_date AND r.deadline
    AND (t.sprint_key IS NULL OR NOT EXISTS (SELECT 1 FROM ref.sprints x WHERE x.sprint_key = t.sprint_key));--> statement-breakpoint
UPDATE kano_request_specs t SET sprint_key = r.sprint_key FROM ref.sprints r
  WHERE t.target_date IS NOT NULL AND t.target_date BETWEEN r.start_date AND r.deadline
    AND (t.sprint_key IS NULL OR NOT EXISTS (SELECT 1 FROM ref.sprints x WHERE x.sprint_key = t.sprint_key));--> statement-breakpoint
UPDATE raid_mitigating_actions t SET sprint_key = r.sprint_key FROM ref.sprints r
  WHERE t.target_date IS NOT NULL AND t.target_date BETWEEN r.start_date AND r.deadline
    AND (t.sprint_key IS NULL OR NOT EXISTS (SELECT 1 FROM ref.sprints x WHERE x.sprint_key = t.sprint_key));--> statement-breakpoint
-- A key that still matches no sprint (malformed, no date to recover it from) is cleared so the foreign key can be added.
UPDATE usm_step_features SET sprint_key = NULL WHERE sprint_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ref.sprints x WHERE x.sprint_key = usm_step_features.sprint_key);--> statement-breakpoint
UPDATE ost_solutions SET sprint_key = NULL WHERE sprint_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ref.sprints x WHERE x.sprint_key = ost_solutions.sprint_key);--> statement-breakpoint
UPDATE kano_request_specs SET sprint_key = NULL WHERE sprint_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ref.sprints x WHERE x.sprint_key = kano_request_specs.sprint_key);--> statement-breakpoint
UPDATE raid_mitigating_actions SET sprint_key = NULL WHERE sprint_key IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ref.sprints x WHERE x.sprint_key = raid_mitigating_actions.sprint_key);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS usm_step_features_sprint_key_idx ON usm_step_features (sprint_key);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS ost_solutions_sprint_key_idx ON ost_solutions (sprint_key);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS kano_request_specs_sprint_key_idx ON kano_request_specs (sprint_key);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS raid_mitigating_actions_sprint_key_idx ON raid_mitigating_actions (sprint_key);--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usm_step_features_sprint_key_sprints_sprint_key_fk') THEN
    ALTER TABLE usm_step_features ADD CONSTRAINT usm_step_features_sprint_key_sprints_sprint_key_fk
      FOREIGN KEY (sprint_key) REFERENCES ref.sprints (sprint_key) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ost_solutions_sprint_key_sprints_sprint_key_fk') THEN
    ALTER TABLE ost_solutions ADD CONSTRAINT ost_solutions_sprint_key_sprints_sprint_key_fk
      FOREIGN KEY (sprint_key) REFERENCES ref.sprints (sprint_key) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'kano_request_specs_sprint_key_sprints_sprint_key_fk') THEN
    ALTER TABLE kano_request_specs ADD CONSTRAINT kano_request_specs_sprint_key_sprints_sprint_key_fk
      FOREIGN KEY (sprint_key) REFERENCES ref.sprints (sprint_key) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'raid_mitigating_actions_sprint_key_sprints_sprint_key_fk') THEN
    ALTER TABLE raid_mitigating_actions ADD CONSTRAINT raid_mitigating_actions_sprint_key_sprints_sprint_key_fk
      FOREIGN KEY (sprint_key) REFERENCES ref.sprints (sprint_key) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END $$;

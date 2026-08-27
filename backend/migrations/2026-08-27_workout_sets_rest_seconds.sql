-- Rest time per set
--
-- `Base.metadata.create_all` in main.py creates missing tables but never adds a
-- column to a table that already exists, so this has to be run by hand against
-- Supabase before deploying
--
-- Configured rest lives in the JSONB on `workout_sessions.exercises` and
-- `workout_templates.exercises`, which need no migration:
--   exercises[].rest_by_type  {"working": 90, "W": 30, "D": 10, "F": 120}
--   exercises[].sets[].rest_seconds  overrides the above for one set
--
-- Only the normalized table needs a real column

ALTER TABLE workout_sets
    ADD COLUMN IF NOT EXISTS rest_seconds INTEGER;

-- Backfill history with the app defaults for each set type
--
-- Sessions logged before this feature existed have no configured rest, so the
-- default is the best available answer. Any session saved from now on is
-- rewritten by `sync_workout_sets` with its own resolved values
UPDATE workout_sets
SET rest_seconds = CASE COALESCE(set_type, 'working')
    WHEN 'W' THEN 30
    WHEN 'D' THEN 10
    WHEN 'F' THEN 120
    ELSE 90
END
WHERE rest_seconds IS NULL;

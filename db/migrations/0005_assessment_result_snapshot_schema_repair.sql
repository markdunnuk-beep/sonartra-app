-- Production repair: ensure persisted assessment result snapshot tables exist.
-- Safe to run in environments where 0003 was missed or only partially applied.

BEGIN;

CREATE TABLE IF NOT EXISTS assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id),
  version_key VARCHAR(100) NOT NULL,
  scoring_model_key VARCHAR(100) NOT NULL,
  snapshot_version INTEGER NOT NULL DEFAULT 1,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  result_payload JSONB,
  response_quality_payload JSONB,
  completed_at TIMESTAMPTZ,
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assessment_results
  ADD COLUMN IF NOT EXISTS assessment_id UUID,
  ADD COLUMN IF NOT EXISTS assessment_version_id UUID,
  ADD COLUMN IF NOT EXISTS version_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS scoring_model_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS snapshot_version INTEGER,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS result_payload JSONB,
  ADD COLUMN IF NOT EXISTS response_quality_payload JSONB,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

ALTER TABLE assessment_results
  ALTER COLUMN assessment_id SET NOT NULL,
  ALTER COLUMN assessment_version_id SET NOT NULL,
  ALTER COLUMN version_key SET NOT NULL,
  ALTER COLUMN scoring_model_key SET NOT NULL,
  ALTER COLUMN snapshot_version SET NOT NULL,
  ALTER COLUMN snapshot_version SET DEFAULT 1,
  ALTER COLUMN status SET NOT NULL,
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW(),
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_results_assessment_id_fkey'
      AND conrelid = 'assessment_results'::regclass
  ) THEN
    ALTER TABLE assessment_results
      ADD CONSTRAINT assessment_results_assessment_id_fkey
      FOREIGN KEY (assessment_id) REFERENCES assessments(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_results_assessment_version_id_fkey'
      AND conrelid = 'assessment_results'::regclass
  ) THEN
    ALTER TABLE assessment_results
      ADD CONSTRAINT assessment_results_assessment_version_id_fkey
      FOREIGN KEY (assessment_version_id) REFERENCES assessment_versions(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_results_status_valid'
      AND conrelid = 'assessment_results'::regclass
  ) THEN
    ALTER TABLE assessment_results
      ADD CONSTRAINT assessment_results_status_valid
      CHECK (status IN ('pending', 'complete', 'failed'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_results_snapshot_version_positive'
      AND conrelid = 'assessment_results'::regclass
  ) THEN
    ALTER TABLE assessment_results
      ADD CONSTRAINT assessment_results_snapshot_version_positive
      CHECK (snapshot_version > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment_id
  ON assessment_results(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_assessment_version_id
  ON assessment_results(assessment_version_id);
CREATE INDEX IF NOT EXISTS idx_assessment_results_status
  ON assessment_results(status);

DROP TRIGGER IF EXISTS assessment_results_set_updated_at ON assessment_results;
CREATE TRIGGER assessment_results_set_updated_at
BEFORE UPDATE ON assessment_results
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessment_result_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_result_id UUID NOT NULL REFERENCES assessment_results(id) ON DELETE CASCADE,
  layer_key VARCHAR(100) NOT NULL,
  signal_key VARCHAR(150) NOT NULL,
  raw_total NUMERIC(12,4) NOT NULL,
  max_possible NUMERIC(12,4) NOT NULL,
  normalised_score NUMERIC(8,6) NOT NULL,
  relative_share NUMERIC(8,6) NOT NULL,
  rank_in_layer INTEGER,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_secondary BOOLEAN NOT NULL DEFAULT FALSE,
  percentile_placeholder NUMERIC(8,4),
  confidence_flag VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE assessment_result_signals
  ADD COLUMN IF NOT EXISTS assessment_result_id UUID,
  ADD COLUMN IF NOT EXISTS layer_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS signal_key VARCHAR(150),
  ADD COLUMN IF NOT EXISTS raw_total NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS max_possible NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS normalised_score NUMERIC(8,6),
  ADD COLUMN IF NOT EXISTS relative_share NUMERIC(8,6),
  ADD COLUMN IF NOT EXISTS rank_in_layer INTEGER,
  ADD COLUMN IF NOT EXISTS is_primary BOOLEAN,
  ADD COLUMN IF NOT EXISTS is_secondary BOOLEAN,
  ADD COLUMN IF NOT EXISTS percentile_placeholder NUMERIC(8,4),
  ADD COLUMN IF NOT EXISTS confidence_flag VARCHAR(100),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ;

ALTER TABLE assessment_result_signals
  ALTER COLUMN assessment_result_id SET NOT NULL,
  ALTER COLUMN layer_key SET NOT NULL,
  ALTER COLUMN signal_key SET NOT NULL,
  ALTER COLUMN raw_total SET NOT NULL,
  ALTER COLUMN max_possible SET NOT NULL,
  ALTER COLUMN normalised_score SET NOT NULL,
  ALTER COLUMN relative_share SET NOT NULL,
  ALTER COLUMN is_primary SET NOT NULL,
  ALTER COLUMN is_primary SET DEFAULT FALSE,
  ALTER COLUMN is_secondary SET NOT NULL,
  ALTER COLUMN is_secondary SET DEFAULT FALSE,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_result_signals_assessment_result_id_fkey'
      AND conrelid = 'assessment_result_signals'::regclass
  ) THEN
    ALTER TABLE assessment_result_signals
      ADD CONSTRAINT assessment_result_signals_assessment_result_id_fkey
      FOREIGN KEY (assessment_result_id) REFERENCES assessment_results(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_result_signals_max_possible_non_negative'
      AND conrelid = 'assessment_result_signals'::regclass
  ) THEN
    ALTER TABLE assessment_result_signals
      ADD CONSTRAINT assessment_result_signals_max_possible_non_negative
      CHECK (max_possible >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_result_signals_normalised_score_range'
      AND conrelid = 'assessment_result_signals'::regclass
  ) THEN
    ALTER TABLE assessment_result_signals
      ADD CONSTRAINT assessment_result_signals_normalised_score_range
      CHECK (normalised_score >= 0 AND normalised_score <= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_result_signals_relative_share_range'
      AND conrelid = 'assessment_result_signals'::regclass
  ) THEN
    ALTER TABLE assessment_result_signals
      ADD CONSTRAINT assessment_result_signals_relative_share_range
      CHECK (relative_share >= 0 AND relative_share <= 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_assessment_result_signals_assessment_result_id
  ON assessment_result_signals(assessment_result_id);
CREATE INDEX IF NOT EXISTS idx_assessment_result_signals_layer_key
  ON assessment_result_signals(layer_key);
CREATE INDEX IF NOT EXISTS idx_assessment_result_signals_signal_key
  ON assessment_result_signals(signal_key);

COMMIT;

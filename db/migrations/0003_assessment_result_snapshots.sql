-- Block 3A Iteration 1: persisted assessment result snapshot foundation.

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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_results_status_valid CHECK (status IN ('pending', 'complete', 'failed')),
  CONSTRAINT assessment_results_snapshot_version_positive CHECK (snapshot_version > 0)
);

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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_result_signals_max_possible_non_negative CHECK (max_possible >= 0),
  CONSTRAINT assessment_result_signals_normalised_score_range CHECK (normalised_score >= 0 AND normalised_score <= 1),
  CONSTRAINT assessment_result_signals_relative_share_range CHECK (relative_share >= 0 AND relative_share <= 1)
);

CREATE INDEX IF NOT EXISTS idx_assessment_result_signals_assessment_result_id
  ON assessment_result_signals(assessment_result_id);
CREATE INDEX IF NOT EXISTS idx_assessment_result_signals_layer_key
  ON assessment_result_signals(layer_key);
CREATE INDEX IF NOT EXISTS idx_assessment_result_signals_signal_key
  ON assessment_result_signals(signal_key);

COMMIT;

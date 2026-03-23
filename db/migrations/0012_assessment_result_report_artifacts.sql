BEGIN;

ALTER TABLE assessment_results
  ADD COLUMN IF NOT EXISTS report_artifact_json JSONB;

COMMIT;

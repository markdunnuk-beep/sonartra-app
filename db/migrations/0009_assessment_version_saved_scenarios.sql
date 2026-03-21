BEGIN;

ALTER TABLE assessment_versions
  ADD COLUMN IF NOT EXISTS latest_regression_suite_snapshot_json JSONB;

CREATE TABLE IF NOT EXISTS assessment_version_saved_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scenario_payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  source_version_id UUID REFERENCES assessment_versions(id) ON DELETE SET NULL,
  source_scenario_id UUID REFERENCES assessment_version_saved_scenarios(id) ON DELETE SET NULL,
  provenance_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  updated_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

DROP TRIGGER IF EXISTS assessment_version_saved_scenarios_set_updated_at ON assessment_version_saved_scenarios;
CREATE TRIGGER assessment_version_saved_scenarios_set_updated_at
BEFORE UPDATE ON assessment_version_saved_scenarios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_assessment_version_saved_scenarios_version_id
  ON assessment_version_saved_scenarios(assessment_version_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_versions_latest_regression_suite_snapshot
  ON assessment_versions USING gin(latest_regression_suite_snapshot_json);

COMMIT;

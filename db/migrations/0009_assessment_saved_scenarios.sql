BEGIN;

CREATE TABLE IF NOT EXISTS assessment_saved_scenarios (
  id UUID PRIMARY KEY,
  assessment_definition_id UUID NOT NULL REFERENCES assessment_definitions(id) ON DELETE CASCADE,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  scenario_type TEXT NOT NULL DEFAULT 'custom' CHECK (scenario_type IN ('baseline', 'edge_case', 'regression', 'stress', 'custom')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  locale TEXT,
  sample_response_payload JSONB NOT NULL,
  created_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  updated_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_saved_scenarios_version_name_unique UNIQUE (assessment_version_id, name)
);

CREATE INDEX IF NOT EXISTS idx_assessment_saved_scenarios_version_status
  ON assessment_saved_scenarios(assessment_version_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_saved_scenarios_definition_id
  ON assessment_saved_scenarios(assessment_definition_id);

DROP TRIGGER IF EXISTS assessment_saved_scenarios_set_updated_at ON assessment_saved_scenarios;
CREATE TRIGGER assessment_saved_scenarios_set_updated_at
BEFORE UPDATE ON assessment_saved_scenarios
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;

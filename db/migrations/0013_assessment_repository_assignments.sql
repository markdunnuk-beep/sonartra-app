BEGIN;

CREATE TABLE IF NOT EXISTS assessment_repository_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_definition_id UUID NOT NULL REFERENCES assessment_definitions(id) ON DELETE CASCADE,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE RESTRICT,
  target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  latest_result_id UUID REFERENCES assessment_results(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'assigned'
    CHECK (status IN ('assigned', 'in_progress', 'completed_processing', 'results_ready', 'failed', 'cancelled')),
  failure_message TEXT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  results_ready_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_repository_assignments_definition_user
  ON assessment_repository_assignments(assessment_definition_id, target_user_id, assigned_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_repository_assignments_status
  ON assessment_repository_assignments(status, assigned_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_repository_assignments_active_unique
  ON assessment_repository_assignments(assessment_definition_id, target_user_id)
  WHERE status IN ('assigned', 'in_progress', 'completed_processing');

DROP TRIGGER IF EXISTS assessment_repository_assignments_set_updated_at ON assessment_repository_assignments;
CREATE TRIGGER assessment_repository_assignments_set_updated_at
BEFORE UPDATE ON assessment_repository_assignments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;

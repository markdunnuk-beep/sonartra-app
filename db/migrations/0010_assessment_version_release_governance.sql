BEGIN;

ALTER TABLE assessment_versions
  ADD COLUMN IF NOT EXISTS publish_readiness_status TEXT NOT NULL DEFAULT 'not_ready' CHECK (publish_readiness_status IN ('not_ready', 'ready_with_warnings', 'ready')),
  ADD COLUMN IF NOT EXISTS readiness_check_summary_json JSONB,
  ADD COLUMN IF NOT EXISTS last_readiness_evaluated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sign_off_status TEXT NOT NULL DEFAULT 'unsigned' CHECK (sign_off_status IN ('unsigned', 'signed_off')),
  ADD COLUMN IF NOT EXISTS sign_off_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sign_off_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sign_off_material_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS release_notes TEXT,
  ADD COLUMN IF NOT EXISTS material_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE assessment_versions
SET publish_readiness_status = CASE
  WHEN package_status = 'valid' THEN 'ready'
  WHEN package_status = 'valid_with_warnings' THEN 'ready_with_warnings'
  ELSE 'not_ready'
END
WHERE publish_readiness_status IS NULL
   OR publish_readiness_status NOT IN ('not_ready', 'ready_with_warnings', 'ready');

UPDATE assessment_versions
SET sign_off_status = 'unsigned'
WHERE sign_off_status IS NULL
   OR sign_off_status NOT IN ('unsigned', 'signed_off');

UPDATE assessment_versions
SET material_updated_at = COALESCE(package_imported_at, updated_at, created_at, NOW())
WHERE material_updated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_assessment_versions_publish_readiness_status
  ON assessment_versions(publish_readiness_status);

CREATE INDEX IF NOT EXISTS idx_assessment_versions_sign_off_status
  ON assessment_versions(sign_off_status);

COMMIT;

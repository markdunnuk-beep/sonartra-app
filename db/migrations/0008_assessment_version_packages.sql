BEGIN;

ALTER TABLE assessment_versions
  ADD COLUMN IF NOT EXISTS package_raw_payload JSONB,
  ADD COLUMN IF NOT EXISTS package_schema_version TEXT,
  ADD COLUMN IF NOT EXISTS package_status TEXT NOT NULL DEFAULT 'missing'
    CHECK (package_status IN ('missing', 'valid', 'valid_with_warnings', 'invalid')),
  ADD COLUMN IF NOT EXISTS package_source_type TEXT,
  ADD COLUMN IF NOT EXISTS package_source_filename TEXT,
  ADD COLUMN IF NOT EXISTS package_imported_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS package_imported_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_validation_report_json JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE assessment_versions
SET package_status = CASE
  WHEN definition_payload IS NOT NULL
       AND COALESCE(validation_status, '') IN ('valid', 'validated')
    THEN 'valid'
  WHEN definition_payload IS NOT NULL
    THEN 'valid'
  ELSE 'missing'
END
WHERE package_status IS NULL
   OR package_status NOT IN ('missing', 'valid', 'valid_with_warnings', 'invalid');

CREATE INDEX IF NOT EXISTS idx_assessment_versions_package_status
  ON assessment_versions(package_status);

COMMIT;

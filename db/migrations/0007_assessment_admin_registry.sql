BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE access_audit_events
  ALTER COLUMN identity_id DROP NOT NULL;

ALTER TABLE access_audit_events
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS entity_label TEXT,
  ADD COLUMN IF NOT EXISTS entity_secondary TEXT;

CREATE INDEX IF NOT EXISTS idx_access_audit_events_entity_type_id
  ON access_audit_events(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS assessment_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'draft' CHECK (lifecycle_status IN ('draft', 'published', 'archived')),
  current_published_version_id UUID,
  settings_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  import_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  updated_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS assessment_definitions_set_updated_at ON assessment_definitions;
CREATE TRIGGER assessment_definitions_set_updated_at
BEFORE UPDATE ON assessment_definitions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

ALTER TABLE assessment_versions
  ADD COLUMN IF NOT EXISTS assessment_definition_id UUID REFERENCES assessment_definitions(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS version_label TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_status TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT,
  ADD COLUMN IF NOT EXISTS created_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_by_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS definition_payload JSONB,
  ADD COLUMN IF NOT EXISTS import_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS validation_status TEXT;

ALTER TABLE assessment_versions
  ALTER COLUMN lifecycle_status SET DEFAULT 'draft',
  ALTER COLUMN source_type SET DEFAULT 'manual';

UPDATE assessment_versions
SET lifecycle_status = CASE WHEN is_active THEN 'published' ELSE 'archived' END
WHERE lifecycle_status IS NULL;

UPDATE assessment_versions
SET source_type = COALESCE(NULLIF(source_type, ''), 'manual')
WHERE source_type IS NULL OR source_type = '';

UPDATE assessment_versions
SET version_label = COALESCE(
  NULLIF(version_label, ''),
  NULLIF(substring(key FROM 'v([0-9]+(?:\.[0-9]+)*)$'), ''),
  '1.0.0'
)
WHERE version_label IS NULL OR version_label = '';

WITH orphaned_versions AS (
  SELECT
    av.id,
    av.key,
    av.name,
    av.description,
    av.created_at,
    av.updated_at,
    av.lifecycle_status,
    lower(regexp_replace(av.key, '[^a-zA-Z0-9]+', '-', 'g')) AS slug_candidate
  FROM assessment_versions av
  WHERE av.assessment_definition_id IS NULL
), inserted AS (
  INSERT INTO assessment_definitions (
    id,
    key,
    slug,
    name,
    category,
    description,
    lifecycle_status,
    current_published_version_id,
    created_at,
    updated_at
  )
  SELECT
    gen_random_uuid(),
    ov.key,
    trim(both '-' from ov.slug_candidate),
    ov.name,
    'behavioural_intelligence',
    ov.description,
    CASE WHEN ov.lifecycle_status = 'published' THEN 'published' ELSE 'draft' END,
    CASE WHEN ov.lifecycle_status = 'published' THEN ov.id ELSE NULL END,
    ov.created_at,
    ov.updated_at
  FROM orphaned_versions ov
  ON CONFLICT (key) DO NOTHING
  RETURNING id, key
)
UPDATE assessment_versions av
SET assessment_definition_id = ad.id
FROM assessment_definitions ad
WHERE av.assessment_definition_id IS NULL
  AND ad.key = av.key;

ALTER TABLE assessment_versions
  ALTER COLUMN assessment_definition_id SET NOT NULL,
  ALTER COLUMN version_label SET NOT NULL,
  ALTER COLUMN lifecycle_status SET NOT NULL,
  ALTER COLUMN source_type SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_versions_definition_version_label_unique
  ON assessment_versions(assessment_definition_id, version_label);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_versions_single_published_per_definition
  ON assessment_versions(assessment_definition_id)
  WHERE lifecycle_status = 'published';

CREATE INDEX IF NOT EXISTS idx_assessment_versions_definition_id
  ON assessment_versions(assessment_definition_id);

CREATE INDEX IF NOT EXISTS idx_assessment_definitions_lifecycle_status
  ON assessment_definitions(lifecycle_status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assessment_definitions_current_published_version_id_fkey'
      AND conrelid = 'assessment_definitions'::regclass
  ) THEN
    ALTER TABLE assessment_definitions
      ADD CONSTRAINT assessment_definitions_current_published_version_id_fkey
      FOREIGN KEY (current_published_version_id) REFERENCES assessment_versions(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;

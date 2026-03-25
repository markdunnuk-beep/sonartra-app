BEGIN;

CREATE TABLE IF NOT EXISTS assessment_runtime_versions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL UNIQUE REFERENCES assessment_versions(id) ON DELETE CASCADE,
  assessment_definition_id UUID NOT NULL REFERENCES assessment_definitions(id) ON DELETE CASCADE,
  version_label TEXT,
  version_key TEXT,
  runtime_contract_version TEXT NOT NULL DEFAULT 'v2',
  source_package_schema_version TEXT,
  publish_status TEXT NOT NULL DEFAULT 'materialized' CHECK (publish_status IN ('materialized', 'failed', 'stale')),
  materialization_status TEXT NOT NULL DEFAULT 'complete' CHECK (materialization_status IN ('pending', 'complete', 'failed')),
  compiled_metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  compiled_scoring_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  compiled_normalization_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  compiled_output_config_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  signal_registry_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_runtime_versions_v2_definition
  ON assessment_runtime_versions_v2(assessment_definition_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_runtime_versions_v2_version
  ON assessment_runtime_versions_v2(assessment_version_id);

DROP TRIGGER IF EXISTS assessment_runtime_versions_v2_set_updated_at ON assessment_runtime_versions_v2;
CREATE TRIGGER assessment_runtime_versions_v2_set_updated_at
BEFORE UPDATE ON assessment_runtime_versions_v2
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessment_runtime_question_sets_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_version_id UUID NOT NULL REFERENCES assessment_runtime_versions_v2(id) ON DELETE CASCADE,
  question_set_id TEXT NOT NULL,
  title TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (runtime_version_id, question_set_id),
  UNIQUE (runtime_version_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_assessment_runtime_question_sets_v2_runtime
  ON assessment_runtime_question_sets_v2(runtime_version_id, display_order);

DROP TRIGGER IF EXISTS assessment_runtime_question_sets_v2_set_updated_at ON assessment_runtime_question_sets_v2;
CREATE TRIGGER assessment_runtime_question_sets_v2_set_updated_at
BEFORE UPDATE ON assessment_runtime_question_sets_v2
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessment_runtime_questions_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_version_id UUID NOT NULL REFERENCES assessment_runtime_versions_v2(id) ON DELETE CASCADE,
  question_id TEXT NOT NULL,
  question_set_id TEXT NOT NULL,
  text TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (runtime_version_id, question_id),
  UNIQUE (runtime_version_id, question_set_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_assessment_runtime_questions_v2_runtime
  ON assessment_runtime_questions_v2(runtime_version_id, display_order);

CREATE INDEX IF NOT EXISTS idx_assessment_runtime_questions_v2_set
  ON assessment_runtime_questions_v2(runtime_version_id, question_set_id, display_order);

DROP TRIGGER IF EXISTS assessment_runtime_questions_v2_set_updated_at ON assessment_runtime_questions_v2;
CREATE TRIGGER assessment_runtime_questions_v2_set_updated_at
BEFORE UPDATE ON assessment_runtime_questions_v2
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessment_runtime_options_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_version_id UUID NOT NULL REFERENCES assessment_runtime_versions_v2(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  text TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (runtime_version_id, option_id),
  UNIQUE (runtime_version_id, question_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_assessment_runtime_options_v2_runtime
  ON assessment_runtime_options_v2(runtime_version_id, question_id, display_order);

DROP TRIGGER IF EXISTS assessment_runtime_options_v2_set_updated_at ON assessment_runtime_options_v2;
CREATE TRIGGER assessment_runtime_options_v2_set_updated_at
BEFORE UPDATE ON assessment_runtime_options_v2
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessment_runtime_option_signal_mappings_v2 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runtime_version_id UUID NOT NULL REFERENCES assessment_runtime_versions_v2(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  signal_key TEXT NOT NULL,
  domain TEXT,
  weight NUMERIC(12, 6) NOT NULL,
  mapping_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (runtime_version_id, option_id, mapping_order)
);

CREATE INDEX IF NOT EXISTS idx_assessment_runtime_option_signal_mappings_v2_runtime
  ON assessment_runtime_option_signal_mappings_v2(runtime_version_id, question_id, option_id, mapping_order);

CREATE UNIQUE INDEX IF NOT EXISTS idx_assessment_runtime_option_signal_mappings_v2_unique_signal
  ON assessment_runtime_option_signal_mappings_v2(runtime_version_id, option_id, signal_key, COALESCE(domain, ''));

DROP TRIGGER IF EXISTS assessment_runtime_option_signal_mappings_v2_set_updated_at ON assessment_runtime_option_signal_mappings_v2;
CREATE TRIGGER assessment_runtime_option_signal_mappings_v2_set_updated_at
BEFORE UPDATE ON assessment_runtime_option_signal_mappings_v2
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

COMMIT;

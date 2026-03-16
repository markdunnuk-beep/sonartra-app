CREATE TABLE IF NOT EXISTS assessment_question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id) ON DELETE CASCADE,
  key VARCHAR NOT NULL UNIQUE,
  name VARCHAR NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assessment_question_sets_assessment_version_id
  ON assessment_question_sets(assessment_version_id);

DROP TRIGGER IF EXISTS assessment_question_sets_set_updated_at ON assessment_question_sets;
CREATE TRIGGER assessment_question_sets_set_updated_at
BEFORE UPDATE ON assessment_question_sets
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessment_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_set_id UUID NOT NULL REFERENCES assessment_question_sets(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_key VARCHAR NOT NULL,
  prompt TEXT NOT NULL,
  section_key VARCHAR NOT NULL,
  section_name VARCHAR,
  reverse_scored BOOLEAN NOT NULL DEFAULT FALSE,
  question_weight_default NUMERIC(8,4) NOT NULL DEFAULT 1,
  scoring_family VARCHAR,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_questions_question_set_number_unique UNIQUE (question_set_id, question_number),
  CONSTRAINT assessment_questions_question_set_key_unique UNIQUE (question_set_id, question_key),
  CONSTRAINT assessment_questions_question_number_positive CHECK (question_number >= 1)
);

CREATE INDEX IF NOT EXISTS idx_assessment_questions_question_set_id
  ON assessment_questions(question_set_id);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_section_key
  ON assessment_questions(section_key);

DROP TRIGGER IF EXISTS assessment_questions_set_updated_at ON assessment_questions;
CREATE TRIGGER assessment_questions_set_updated_at
BEFORE UPDATE ON assessment_questions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessment_question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  option_key VARCHAR NOT NULL,
  option_text VARCHAR NOT NULL,
  display_order INTEGER NOT NULL,
  numeric_value INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_question_options_question_option_key_unique UNIQUE (question_id, option_key),
  CONSTRAINT assessment_question_options_question_display_order_unique UNIQUE (question_id, display_order),
  CONSTRAINT assessment_question_options_display_order_positive CHECK (display_order >= 1)
);

DROP TRIGGER IF EXISTS assessment_question_options_set_updated_at ON assessment_question_options;
CREATE TRIGGER assessment_question_options_set_updated_at
BEFORE UPDATE ON assessment_question_options
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS assessment_option_signal_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_option_id UUID NOT NULL REFERENCES assessment_question_options(id) ON DELETE CASCADE,
  signal_code VARCHAR NOT NULL,
  signal_weight NUMERIC(10,4) NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_option_signal_mappings_option_signal_unique UNIQUE (question_option_id, signal_code)
);

CREATE INDEX IF NOT EXISTS idx_assessment_option_signal_mappings_question_option_id
  ON assessment_option_signal_mappings(question_option_id);
CREATE INDEX IF NOT EXISTS idx_assessment_option_signal_mappings_signal_code
  ON assessment_option_signal_mappings(signal_code);

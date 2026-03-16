-- Block 1: Sonartra assessment data architecture and persistence foundation.
-- Compatible with Supabase Postgres.

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_auth_id VARCHAR(255),
  email VARCHAR(320) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  account_type VARCHAR(50) NOT NULL DEFAULT 'individual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_unique UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  plan_tier VARCHAR(100),
  seat_band VARCHAR(100),
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organisations_slug_unique UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS organisation_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'member',
  member_status VARCHAR(50) NOT NULL DEFAULT 'active',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT organisation_members_org_user_unique UNIQUE (organisation_id, user_id)
);

CREATE TABLE IF NOT EXISTS assessment_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  total_questions INTEGER NOT NULL DEFAULT 80,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_versions_key_unique UNIQUE (key),
  CONSTRAINT assessment_versions_total_questions_positive CHECK (total_questions > 0)
);

CREATE TABLE IF NOT EXISTS assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  assessment_version_id UUID NOT NULL REFERENCES assessment_versions(id),
  status VARCHAR(50) NOT NULL DEFAULT 'not_started',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ,
  progress_count INTEGER NOT NULL DEFAULT 0,
  progress_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  current_question_index INTEGER NOT NULL DEFAULT 0,
  scoring_status VARCHAR(50) NOT NULL DEFAULT 'not_scored',
  source VARCHAR(100) NOT NULL DEFAULT 'direct',
  metadata_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessments_status_valid CHECK (status IN ('not_started', 'in_progress', 'completed', 'abandoned')),
  CONSTRAINT assessments_scoring_status_valid CHECK (scoring_status IN ('not_scored', 'pending', 'scored', 'failed')),
  CONSTRAINT assessments_progress_count_non_negative CHECK (progress_count >= 0),
  CONSTRAINT assessments_progress_percent_range CHECK (progress_percent >= 0 AND progress_percent <= 100),
  CONSTRAINT assessments_current_question_index_non_negative CHECK (current_question_index >= 0)
);

CREATE TABLE IF NOT EXISTS assessment_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  response_value INTEGER NOT NULL,
  response_time_ms INTEGER,
  is_changed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assessment_responses_assessment_question_unique UNIQUE (assessment_id, question_id),
  CONSTRAINT assessment_responses_question_id_range CHECK (question_id BETWEEN 1 AND 80),
  CONSTRAINT assessment_responses_response_value_range CHECK (response_value BETWEEN 1 AND 4),
  CONSTRAINT assessment_responses_response_time_non_negative CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
);

CREATE TABLE IF NOT EXISTS assessment_score_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  scoring_version VARCHAR(100) NOT NULL,
  dominant_style VARCHAR(100),
  secondary_style VARCHAR(100),
  raw_scores_json JSONB,
  derived_metrics_json JSONB,
  interpretation_json JSONB,
  scored_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_external_auth_id ON users(external_auth_id);

CREATE INDEX IF NOT EXISTS idx_organisation_members_user_id ON organisation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organisation_members_organisation_id ON organisation_members(organisation_id);

CREATE INDEX IF NOT EXISTS idx_assessments_user_id ON assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_assessments_organisation_id ON assessments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_assessments_version_id ON assessments(assessment_version_id);
CREATE INDEX IF NOT EXISTS idx_assessments_status ON assessments(status);

CREATE INDEX IF NOT EXISTS idx_assessment_responses_assessment_id ON assessment_responses(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_responses_question_id ON assessment_responses(question_id);

CREATE INDEX IF NOT EXISTS idx_assessment_score_snapshots_assessment_id
  ON assessment_score_snapshots(assessment_id);

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS organisations_set_updated_at ON organisations;
CREATE TRIGGER organisations_set_updated_at
BEFORE UPDATE ON organisations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS organisation_members_set_updated_at ON organisation_members;
CREATE TRIGGER organisation_members_set_updated_at
BEFORE UPDATE ON organisation_members
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS assessment_versions_set_updated_at ON assessment_versions;
CREATE TRIGGER assessment_versions_set_updated_at
BEFORE UPDATE ON assessment_versions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS assessments_set_updated_at ON assessments;
CREATE TRIGGER assessments_set_updated_at
BEFORE UPDATE ON assessments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS assessment_responses_set_updated_at ON assessment_responses;
CREATE TRIGGER assessment_responses_set_updated_at
BEFORE UPDATE ON assessment_responses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS assessment_score_snapshots_set_updated_at ON assessment_score_snapshots;
CREATE TRIGGER assessment_score_snapshots_set_updated_at
BEFORE UPDATE ON assessment_score_snapshots
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO assessment_versions (key, name, total_questions, is_active)
VALUES ('wplp80-v1', 'WPLP-80 Sonartra Signals', 80, TRUE)
ON CONFLICT (key)
DO UPDATE SET
  name = EXCLUDED.name,
  total_questions = EXCLUDED.total_questions,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

COMMIT;

BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE organisations
  ADD COLUMN IF NOT EXISTS country TEXT;

CREATE TABLE IF NOT EXISTS admin_identities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  identity_type TEXT NOT NULL CHECK (identity_type IN ('internal', 'organisation')),
  auth_provider TEXT,
  auth_subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'suspended', 'invited')),
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  scope_type TEXT NOT NULL CHECK (scope_type IN ('internal', 'organisation')),
  description TEXT
);

CREATE TABLE IF NOT EXISTS admin_identity_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES admin_identities(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE RESTRICT,
  organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organisation_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES admin_identities(id) ON DELETE CASCADE,
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  membership_role TEXT NOT NULL,
  membership_status TEXT NOT NULL CHECK (membership_status IN ('active', 'inactive', 'invited', 'suspended')),
  joined_at TIMESTAMPTZ,
  invited_at TIMESTAMPTZ,
  last_activity_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS access_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id UUID NOT NULL REFERENCES admin_identities(id) ON DELETE CASCADE,
  organisation_id UUID REFERENCES organisations(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  event_summary TEXT NOT NULL,
  actor_name TEXT,
  actor_identity_id UUID REFERENCES admin_identities(id) ON DELETE SET NULL,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_identity_roles_identity_role_internal_unique
  ON admin_identity_roles(identity_id, role_id)
  WHERE organisation_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_identity_roles_identity_role_org_unique
  ON admin_identity_roles(identity_id, role_id, organisation_id)
  WHERE organisation_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_organisation_memberships_identity_org_unique
  ON organisation_memberships(identity_id, organisation_id);

CREATE INDEX IF NOT EXISTS idx_admin_identities_identity_type ON admin_identities(identity_type);
CREATE INDEX IF NOT EXISTS idx_admin_identities_status ON admin_identities(status);
CREATE INDEX IF NOT EXISTS idx_admin_identities_last_activity_at ON admin_identities(last_activity_at);

CREATE INDEX IF NOT EXISTS idx_admin_identity_roles_identity_id ON admin_identity_roles(identity_id);
CREATE INDEX IF NOT EXISTS idx_admin_identity_roles_role_id ON admin_identity_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_identity_roles_organisation_id ON admin_identity_roles(organisation_id);

CREATE INDEX IF NOT EXISTS idx_organisation_memberships_identity_id ON organisation_memberships(identity_id);
CREATE INDEX IF NOT EXISTS idx_organisation_memberships_organisation_id ON organisation_memberships(organisation_id);

CREATE INDEX IF NOT EXISTS idx_access_audit_events_identity_id ON access_audit_events(identity_id);
CREATE INDEX IF NOT EXISTS idx_access_audit_events_happened_at_desc ON access_audit_events(happened_at DESC);

INSERT INTO admin_roles (id, key, label, scope_type, description)
VALUES
  ('11111111-1111-4111-8111-111111111111', 'super_admin', 'Super admin', 'internal', 'Global platform authority across tenancy, releases, and operator governance.'),
  ('11111111-1111-4111-8111-111111111112', 'platform_admin', 'Platform admin', 'internal', 'Platform-wide operator oversight and tenant administration.'),
  ('11111111-1111-4111-8111-111111111113', 'assessment_admin', 'Assessment admin', 'internal', 'Assessment registry, validation, and publish readiness operator.'),
  ('11111111-1111-4111-8111-111111111114', 'customer_success_admin', 'Customer success admin', 'internal', 'Customer health, adoption, and tenant access oversight.'),
  ('11111111-1111-4111-8111-111111111115', 'support_admin', 'Support admin', 'internal', 'Support-led tenant and audit visibility.'),
  ('11111111-1111-4111-8111-111111111116', 'owner', 'Owner', 'organisation', 'Organisation owner with highest tenant access scope.'),
  ('11111111-1111-4111-8111-111111111117', 'admin', 'Admin', 'organisation', 'Organisation administrator.'),
  ('11111111-1111-4111-8111-111111111118', 'manager', 'Manager', 'organisation', 'Organisation manager.'),
  ('11111111-1111-4111-8111-111111111119', 'analyst', 'Analyst', 'organisation', 'Organisation analyst.')
ON CONFLICT (key)
DO UPDATE SET
  label = EXCLUDED.label,
  scope_type = EXCLUDED.scope_type,
  description = EXCLUDED.description;

COMMIT;

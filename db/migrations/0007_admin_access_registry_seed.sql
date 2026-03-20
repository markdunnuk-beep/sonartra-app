BEGIN;

INSERT INTO organisations (id, name, slug, country, status)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Northstar Logistics', 'northstar-logistics', 'United Kingdom', 'active'),
  ('20000000-0000-4000-8000-000000000002', 'Aurora Health Group', 'aurora-health-group', 'United States', 'active'),
  ('20000000-0000-4000-8000-000000000003', 'VectorForge Industrial', 'vectorforge-industrial', 'Germany', 'suspended')
ON CONFLICT (slug)
DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO admin_identities (id, email, full_name, identity_type, auth_provider, auth_subject, status, last_activity_at, created_at)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'rina.patel@sonartra.com', 'Rina Patel', 'internal', 'clerk', 'clerk_rina', 'active', '2026-03-20T07:18:00Z', '2025-07-02T08:00:00Z'),
  ('30000000-0000-4000-8000-000000000002', 'noah.chen@sonartra.com', 'Noah Chen', 'internal', 'clerk', 'clerk_noah', 'active', '2026-03-19T21:40:00Z', '2025-09-11T09:30:00Z'),
  ('30000000-0000-4000-8000-000000000003', 'jules.adeyemi@sonartra.com', 'Jules Adeyemi', 'internal', 'clerk', 'clerk_jules', 'active', '2026-03-20T05:52:00Z', '2025-10-03T10:15:00Z'),
  ('30000000-0000-4000-8000-000000000004', 'ella.wright@sonartra.com', 'Ella Wright', 'internal', 'clerk', 'clerk_ella', 'suspended', '2026-03-11T13:12:00Z', '2025-08-18T11:45:00Z'),
  ('30000000-0000-4000-8000-000000000005', 'alex.mercer@northstarlogistics.com', 'Alex Mercer', 'organisation', 'clerk', 'clerk_alex', 'active', '2026-03-19T15:20:00Z', '2025-11-06T08:30:00Z'),
  ('30000000-0000-4000-8000-000000000006', 'bianca.ng@aurorahealthgroup.com', 'Bianca Ng', 'organisation', 'clerk', 'clerk_bianca', 'active', '2026-03-20T04:10:00Z', '2025-12-02T12:00:00Z'),
  ('30000000-0000-4000-8000-000000000007', 'isaac.reyes@vectorforge.io', 'Isaac Reyes', 'organisation', NULL, NULL, 'invited', NULL, '2026-03-14T16:05:00Z'),
  ('30000000-0000-4000-8000-000000000008', 'maya.holt@vectorforge.io', 'Maya Holt', 'organisation', 'clerk', 'clerk_maya', 'inactive', '2026-01-09T10:10:00Z', '2025-07-17T07:45:00Z')
ON CONFLICT (email)
DO UPDATE SET
  full_name = EXCLUDED.full_name,
  identity_type = EXCLUDED.identity_type,
  auth_provider = EXCLUDED.auth_provider,
  auth_subject = EXCLUDED.auth_subject,
  status = EXCLUDED.status,
  last_activity_at = EXCLUDED.last_activity_at,
  created_at = EXCLUDED.created_at;

INSERT INTO admin_identity_roles (id, identity_id, role_id, organisation_id, assigned_at)
VALUES
  ('40000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', NULL, '2025-07-02T08:00:00Z'),
  ('40000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000002', '11111111-1111-4111-8111-111111111113', NULL, '2025-09-11T09:30:00Z'),
  ('40000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111114', NULL, '2025-10-03T10:15:00Z'),
  ('40000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000004', '11111111-1111-4111-8111-111111111115', NULL, '2025-08-18T11:45:00Z'),
  ('40000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111116', '20000000-0000-4000-8000-000000000001', '2025-11-06T08:45:00Z'),
  ('40000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111117', '20000000-0000-4000-8000-000000000002', '2026-02-02T11:15:00Z'),
  ('40000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000006', '11111111-1111-4111-8111-111111111119', '20000000-0000-4000-8000-000000000001', '2026-03-03T10:00:00Z'),
  ('40000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111118', '20000000-0000-4000-8000-000000000003', '2026-03-14T16:05:00Z'),
  ('40000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000008', '11111111-1111-4111-8111-111111111117', '20000000-0000-4000-8000-000000000003', '2025-07-22T09:10:00Z')
ON CONFLICT DO NOTHING;

INSERT INTO organisation_memberships (id, identity_id, organisation_id, membership_role, membership_status, joined_at, invited_at, last_activity_at)
VALUES
  ('50000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'owner', 'active', '2025-11-06T08:45:00Z', '2025-11-01T09:00:00Z', '2026-03-19T15:20:00Z'),
  ('50000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'admin', 'active', '2026-02-02T11:15:00Z', '2026-01-25T13:00:00Z', '2026-03-20T04:10:00Z'),
  ('50000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'analyst', 'active', '2026-03-03T10:00:00Z', '2026-03-01T09:30:00Z', '2026-03-18T17:25:00Z'),
  ('50000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'manager', 'invited', NULL, '2026-03-14T16:05:00Z', NULL),
  ('50000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 'admin', 'inactive', '2025-07-22T09:10:00Z', '2025-07-18T12:00:00Z', '2026-01-09T10:10:00Z')
ON CONFLICT (identity_id, organisation_id)
DO UPDATE SET
  membership_role = EXCLUDED.membership_role,
  membership_status = EXCLUDED.membership_status,
  joined_at = EXCLUDED.joined_at,
  invited_at = EXCLUDED.invited_at,
  last_activity_at = EXCLUDED.last_activity_at;

INSERT INTO access_audit_events (id, identity_id, organisation_id, event_type, event_summary, actor_name, actor_identity_id, happened_at, metadata)
VALUES
  ('60000000-0000-4000-8000-000000000001', '30000000-0000-4000-8000-000000000004', NULL, 'internal_review_opened', 'Suspended pending internal review of support access posture.', 'Rina Patel', '30000000-0000-4000-8000-000000000001', '2026-03-12T09:00:00Z', '{"case":"ella-review"}'),
  ('60000000-0000-4000-8000-000000000002', '30000000-0000-4000-8000-000000000004', NULL, 'access_suspended', 'Support admin access suspended after escalation review.', 'Rina Patel', '30000000-0000-4000-8000-000000000001', '2026-03-11T13:12:00Z', '{"reason":"internal_review"}'),
  ('60000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', NULL, 'privileged_access_confirmed', 'Quarterly privileged access review confirmed super admin scope remains required.', 'System', NULL, '2026-03-20T07:18:00Z', '{"review_window":"q1-2026"}'),
  ('60000000-0000-4000-8000-000000000004', '30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000001', 'sign_in', 'Signed in and reviewed Northstar adoption controls.', 'Alex Mercer', '30000000-0000-4000-8000-000000000005', '2026-03-19T15:20:00Z', '{"channel":"email_magic_link"}'),
  ('60000000-0000-4000-8000-000000000005', '30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'multi_org_access_detected', 'Cross-organisation membership detected across Aurora and Northstar.', 'Jules Adeyemi', '30000000-0000-4000-8000-000000000003', '2026-03-20T04:12:00Z', '{"organisation_count":2}'),
  ('60000000-0000-4000-8000-000000000006', '30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000001', 'adoption_checkpoint', 'Adoption checkpoint completed for Northstar analyst scope.', 'Bianca Ng', '30000000-0000-4000-8000-000000000006', '2026-03-18T17:25:00Z', '{"workspace":"northstar"}'),
  ('60000000-0000-4000-8000-000000000007', '30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'invite_sent', 'Invitation sent for VectorForge manager access.', 'Jules Adeyemi', '30000000-0000-4000-8000-000000000003', '2026-03-14T16:05:00Z', '{"invite_channel":"email"}'),
  ('60000000-0000-4000-8000-000000000008', '30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 'dormant_access_flagged', 'Inactive VectorForge admin flagged for dormant access review.', 'Noah Chen', '30000000-0000-4000-8000-000000000002', '2026-01-20T11:00:00Z', '{"days_since_activity":72}'),
  ('60000000-0000-4000-8000-000000000009', '30000000-0000-4000-8000-000000000002', NULL, 'assessment_admin_sign_in', 'Assessment admin reviewed release readiness and access registry context.', 'Noah Chen', '30000000-0000-4000-8000-000000000002', '2026-03-19T21:40:00Z', '{"surface":"admin-dashboard"}'),
  ('60000000-0000-4000-8000-000000000010', '30000000-0000-4000-8000-000000000003', NULL, 'customer_success_review', 'Customer success admin reviewed cross-tenant access posture.', 'Jules Adeyemi', '30000000-0000-4000-8000-000000000003', '2026-03-20T05:52:00Z', '{"surface":"admin-users"}')
ON CONFLICT (id)
DO UPDATE SET
  organisation_id = EXCLUDED.organisation_id,
  event_type = EXCLUDED.event_type,
  event_summary = EXCLUDED.event_summary,
  actor_name = EXCLUDED.actor_name,
  actor_identity_id = EXCLUDED.actor_identity_id,
  happened_at = EXCLUDED.happened_at,
  metadata = EXCLUDED.metadata;

COMMIT;

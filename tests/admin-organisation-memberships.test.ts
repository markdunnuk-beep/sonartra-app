import assert from 'node:assert/strict'
import test from 'node:test'
import {
  addAdminOrganisationMembership,
  inviteAdminOrganisationMember,
  updateAdminOrganisationMembershipRole,
  updateAdminOrganisationMembershipStatus,
} from '../lib/admin/server/organisation-memberships'

interface TestIdentity {
  id: string
  email: string
  full_name: string
  identity_type: string
  status: string
  auth_subject: string | null
  last_activity_at: string | null
}

interface TestMembership {
  id: string
  organisation_id: string
  identity_id: string
  membership_role: string
  membership_status: string
  joined_at: string | null
  invited_at: string | null
  full_name: string
  email: string
}


const baseOrganisation = {
  id: 'org-1',
  name: 'Northstar Logistics',
}

const baseIdentity: TestIdentity = {
  id: 'identity-1',
  email: 'alex@example.com',
  full_name: 'Alex Mercer',
  identity_type: 'organisation',
  status: 'active',
  auth_subject: 'clerk_alex',
  last_activity_at: '2026-03-20T09:00:00.000Z',
}

const baseMembership: TestMembership = {
  id: 'membership-1',
  organisation_id: 'org-1',
  identity_id: 'identity-1',
  membership_role: 'manager',
  membership_status: 'active',
  joined_at: '2026-03-01T10:00:00.000Z',
  invited_at: '2026-02-28T10:00:00.000Z',
  full_name: 'Alex Mercer',
  email: 'alex@example.com',
}

function createDeps(options: {
  organisation?: typeof baseOrganisation | null
  identity?: TestIdentity | null
  identityByEmail?: TestIdentity | null
  membership?: TestMembership | null
  accessAllowed?: boolean
}) {
  const auditEvents: unknown[][] = []
  const roleAssignments: unknown[][] = []
  const deletedRoleAssignments: unknown[][] = []
  const insertedMemberships: unknown[][] = []
  const updatedMemberships: unknown[][] = []
  const ids = ['membership-new', 'role-assignment-1', 'audit-1', 'identity-new', 'role-assignment-2', 'audit-2']

  const state = {
    organisation: options.organisation ?? baseOrganisation,
    identity: options.identity ?? baseIdentity,
    identityByEmail: options.identityByEmail ?? null,
    membership: options.membership ?? null,
  }

  return {
    deps: {
      resolveAdminAccess: async () => ({
        isAuthenticated: true,
        isAllowed: options.accessAllowed ?? true,
        email: 'rina.patel@sonartra.com',
        allowlist: ['rina.patel@sonartra.com'],
        accessSource: 'email_allowlist' as const,
        provisionalRole: null,
        provisionalAccess: null,
      }),
      getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
      queryDb: async () => {
        throw new Error('Unexpected queryDb call in membership mutation test')
      },
      withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
        query: async (sql: string, params: unknown[] = []) => {
          if (/from organisations/i.test(sql)) {
            return { rows: state.organisation ? [state.organisation] : [] }
          }

          if (/from admin_identities\s+where id = \$1/i.test(sql)) {
            return { rows: state.identity ? [state.identity] : [] }
          }

          if (/from admin_identities\s+where lower\(email\) = \$1/i.test(sql)) {
            return { rows: state.identityByEmail ? [state.identityByEmail] : [] }
          }

          if (/update admin_identities\s+set full_name/i.test(sql)) {
            state.identityByEmail = { ...(state.identityByEmail ?? baseIdentity), full_name: String(params[1]) }
            return { rows: state.identityByEmail ? [state.identityByEmail] : [] }
          }

          if (/insert into admin_identities/i.test(sql)) {
            state.identityByEmail = {
              id: String(params[0]),
              email: String(params[1]),
              full_name: String(params[2]),
              identity_type: 'organisation',
              status: 'invited',
              auth_subject: null,
              last_activity_at: null,
            }
            return { rows: [state.identityByEmail] }
          }

          if (/from organisation_memberships/i.test(sql) && /for update/i.test(sql)) {
            return { rows: state.membership ? [state.membership] : [] }
          }

          if (/update admin_identities\s+set status = case/i.test(sql) || /update admin_identities\s+set status = 'active'/i.test(sql)) {
            return { rows: [] }
          }

          if (/insert into organisation_memberships/i.test(sql)) {
            insertedMemberships.push(params)
            state.membership = {
              ...baseMembership,
              id: String(params[0]),
              identity_id: String(params[1]),
              organisation_id: String(params[2]),
              membership_role: String(params[3]),
              membership_status: String(params[4]),
              joined_at: params[5] ? String(params[5]) : null,
              invited_at: params[6] ? String(params[6]) : null,
              full_name: state.identity?.full_name ?? state.identityByEmail?.full_name ?? baseMembership.full_name,
              email: state.identity?.email ?? state.identityByEmail?.email ?? baseMembership.email,
            }
            return { rows: [] }
          }

          if (/update organisation_memberships/i.test(sql)) {
            updatedMemberships.push(params)
            if (state.membership) {
              state.membership = {
                ...state.membership,
                membership_role: typeof params[2] === 'string' ? String(params[2]) : state.membership.membership_role,
                membership_status: typeof params[3] === 'string' ? String(params[3]) : state.membership.membership_status,
              }
            }
            return { rows: [] }
          }

          if (/delete from admin_identity_roles/i.test(sql)) {
            deletedRoleAssignments.push(params)
            return { rows: [] }
          }

          if (/insert into admin_identity_roles/i.test(sql)) {
            roleAssignments.push(params)
            return { rows: [] }
          }

          if (/insert into access_audit_events/i.test(sql)) {
            auditEvents.push(params)
            return { rows: [] }
          }

          throw new Error(`Unexpected SQL: ${sql}`)
        },
      } as never),
      now: () => new Date('2026-03-21T00:00:00.000Z'),
      createId: () => ids.shift() ?? `generated-${Math.random()}`,
    },
    auditEvents,
    roleAssignments,
    deletedRoleAssignments,
    insertedMemberships,
    updatedMemberships,
    state,
  }
}

test('add existing user to organisation succeeds and audits member added', async () => {
  const { deps, auditEvents, roleAssignments, insertedMemberships } = createDeps({ membership: null })

  const result = await addAdminOrganisationMembership({ organisationId: 'org-1', identityId: 'identity-1', role: 'admin' }, deps as never)

  assert.equal(result.ok, true)
  assert.equal(result.code, 'added')
  assert.equal(insertedMemberships.length, 1)
  assert.equal(roleAssignments.length, 1)
  assert.equal(auditEvents.length, 1)
  assert.equal(String(auditEvents[0]?.[3]), 'member_added')
})

test('duplicate active membership is prevented', async () => {
  const { deps } = createDeps({ membership: baseMembership })

  const result = await addAdminOrganisationMembership({ organisationId: 'org-1', identityId: 'identity-1', role: 'admin' }, deps as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'duplicate_membership')
})

test('invite flow creates invited membership and audit event when no bound user exists', async () => {
  const { deps, auditEvents, insertedMemberships, state } = createDeps({ identityByEmail: null, membership: null })

  const result = await inviteAdminOrganisationMember({ organisationId: 'org-1', email: 'maya@example.com', fullName: 'Maya Holt', role: 'manager' }, deps as never)

  assert.equal(result.ok, true)
  assert.equal(result.code, 'invited')
  assert.equal(insertedMemberships.length, 1)
  assert.equal(String(auditEvents[0]?.[3]), 'invitation_created')
  assert.equal(state.identityByEmail?.status, 'invited')
})

test('role update succeeds and writes membership role audit coverage', async () => {
  const { deps, auditEvents, roleAssignments, updatedMemberships } = createDeps({ membership: { ...baseMembership, membership_role: 'manager' } })

  const result = await updateAdminOrganisationMembershipRole({ organisationId: 'org-1', identityId: 'identity-1', role: 'owner' }, deps as never)

  assert.equal(result.ok, true)
  assert.equal(result.code, 'role_updated')
  assert.equal(updatedMemberships.length, 1)
  assert.equal(roleAssignments.length, 1)
  assert.equal(String(auditEvents[0]?.[3]), 'membership_role_changed')
})

test('suspend and restore membership succeed', async () => {
  const suspendedDeps = createDeps({ membership: { ...baseMembership, membership_status: 'active' } })
  const suspended = await updateAdminOrganisationMembershipStatus({ organisationId: 'org-1', identityId: 'identity-1', nextStatus: 'suspended' }, suspendedDeps.deps as never)

  assert.equal(suspended.ok, true)
  assert.equal(suspended.code, 'status_updated')
  assert.equal(String(suspendedDeps.auditEvents[0]?.[3]), 'membership_suspended')

  const restoredDeps = createDeps({ membership: { ...baseMembership, membership_status: 'suspended' } })
  const restored = await updateAdminOrganisationMembershipStatus({ organisationId: 'org-1', identityId: 'identity-1', nextStatus: 'active' }, restoredDeps.deps as never)

  assert.equal(restored.ok, true)
  assert.equal(restored.code, 'status_updated')
  assert.equal(String(restoredDeps.auditEvents[0]?.[3]), 'membership_restored')
})

test('remove membership is soft and requires confirmation', async () => {
  const missingConfirmation = await updateAdminOrganisationMembershipStatus(
    { organisationId: 'org-1', identityId: 'identity-1', nextStatus: 'inactive' },
    createDeps({ membership: baseMembership }).deps as never,
  )

  assert.equal(missingConfirmation.ok, false)
  assert.equal(missingConfirmation.code, 'validation_error')

  const confirmedDeps = createDeps({ membership: baseMembership })
  const removed = await updateAdminOrganisationMembershipStatus(
    { organisationId: 'org-1', identityId: 'identity-1', nextStatus: 'inactive', confirmation: 'confirm' },
    confirmedDeps.deps as never,
  )

  assert.equal(removed.ok, true)
  assert.equal(removed.code, 'removed')
  assert.equal(confirmedDeps.deletedRoleAssignments.length, 1)
  assert.equal(String(confirmedDeps.auditEvents[0]?.[3]), 'membership_removed')
})

test('membership mutation helpers deny access when admin guard fails', async () => {
  const result = await inviteAdminOrganisationMember(
    { organisationId: 'org-1', email: 'maya@example.com', fullName: 'Maya Holt', role: 'manager' },
    createDeps({ membership: null, accessAllowed: false }).deps as never,
  )

  assert.equal(result.ok, false)
  assert.equal(result.code, 'permission_denied')
})

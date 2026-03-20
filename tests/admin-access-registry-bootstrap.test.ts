import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAdminAccessRegistryBootstrapPlan,
  buildExistingIdentityMap,
  buildExistingMembershipMap,
  buildExistingRoleAssignmentMap,
  classifyLegacyIdentity,
  mapLegacyMembershipToOrganisationMembership,
  mapLegacyMembershipToRoleAssignment,
  mapLegacyUserToAdminIdentity,
  type ExistingAdminIdentityRecord,
  type ExistingAdminIdentityRoleRecord,
  type ExistingOrganisationMembershipRecord,
  type LegacyOrganisationMembershipRecord,
  type LegacyUserRecord,
} from '../lib/admin/server/access-registry-bootstrap'

function buildUser(overrides: Partial<LegacyUserRecord> = {}): LegacyUserRecord {
  return {
    id: 'user-1',
    email: 'owner@example.com',
    firstName: 'Ada',
    lastName: 'Lovelace',
    accountType: 'individual',
    externalAuthId: 'clerk_123',
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-10T00:00:00.000Z',
    lastAssessmentActivityAt: '2026-01-09T00:00:00.000Z',
    ...overrides,
  }
}

function buildMembership(overrides: Partial<LegacyOrganisationMembershipRecord> = {}): LegacyOrganisationMembershipRecord {
  return {
    id: 'membership-1',
    userId: 'user-1',
    organisationId: 'org-1',
    role: 'owner',
    memberStatus: 'active',
    joinedAt: '2026-01-03T00:00:00.000Z',
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-08T00:00:00.000Z',
    lastActivityAt: '2026-01-07T00:00:00.000Z',
    ...overrides,
  }
}

test('maps a legacy user into an admin identity using live profile and auth fields', () => {
  const user = buildUser()
  const membership = buildMembership()

  const result = mapLegacyUserToAdminIdentity(user, [membership], { internalAdminEmails: [] })

  assert.equal(result.skippedMissingEmail, false)
  assert.equal(result.ambiguity, null)
  assert.deepEqual(result.identity, {
    id: 'user-1',
    email: 'owner@example.com',
    fullName: 'Ada Lovelace',
    identityType: 'organisation',
    authProvider: 'clerk',
    authSubject: 'clerk_123',
    status: 'active',
    lastActivityAt: '2026-01-10T00:00:00.000Z',
    createdAt: '2026-01-02T00:00:00.000Z',
  })
})

test('maps organisation memberships into registry memberships with invited status handling', () => {
  const membership = buildMembership({
    role: 'manager',
    memberStatus: 'pending',
    joinedAt: null,
    createdAt: '2026-02-01T00:00:00.000Z',
    updatedAt: '2026-02-04T00:00:00.000Z',
    lastActivityAt: null,
  })

  const result = mapLegacyMembershipToOrganisationMembership('user-1', membership)

  assert.equal(result.skippedUnknownRole, false)
  assert.deepEqual(result.membership, {
    identityId: 'user-1',
    organisationId: 'org-1',
    membershipRole: 'manager',
    membershipStatus: 'invited',
    joinedAt: null,
    invitedAt: '2026-02-04T00:00:00.000Z',
    lastActivityAt: '2026-02-04T00:00:00.000Z',
  })
})

test('maps owner admin manager and analyst memberships into organisation-scoped role assignments', () => {
  const roles = ['owner', 'admin', 'manager', 'analyst'].map((role) => mapLegacyMembershipToRoleAssignment('user-1', buildMembership({ role })))

  assert.deepEqual(roles, [
    { identityId: 'user-1', roleKey: 'owner', organisationId: 'org-1', assignedAt: '2026-01-08T00:00:00.000Z' },
    { identityId: 'user-1', roleKey: 'admin', organisationId: 'org-1', assignedAt: '2026-01-08T00:00:00.000Z' },
    { identityId: 'user-1', roleKey: 'manager', organisationId: 'org-1', assignedAt: '2026-01-08T00:00:00.000Z' },
    { identityId: 'user-1', roleKey: 'analyst', organisationId: 'org-1', assignedAt: '2026-01-08T00:00:00.000Z' },
  ])

  assert.equal(mapLegacyMembershipToRoleAssignment('user-1', buildMembership({ role: 'member' })), null)
})

test('bootstrap planning is idempotent when existing registry rows already match desired state', () => {
  const users = [buildUser()]
  const memberships = [buildMembership()]

  const existingIdentities: ExistingAdminIdentityRecord[] = [{
    id: 'user-1',
    email: 'owner@example.com',
    fullName: 'Ada Lovelace',
    identityType: 'organisation',
    authProvider: 'clerk',
    authSubject: 'clerk_123',
    status: 'active',
    lastActivityAt: '2026-01-10T00:00:00.000Z',
    createdAt: '2026-01-02T00:00:00.000Z',
  }]
  const existingMemberships: ExistingOrganisationMembershipRecord[] = [{
    identityId: 'user-1',
    organisationId: 'org-1',
    membershipRole: 'owner',
    membershipStatus: 'active',
    joinedAt: '2026-01-03T00:00:00.000Z',
    invitedAt: null,
    lastActivityAt: '2026-01-08T00:00:00.000Z',
  }]
  const existingRoles: ExistingAdminIdentityRoleRecord[] = [{
    identityId: 'user-1',
    roleKey: 'owner',
    organisationId: 'org-1',
    assignedAt: '2026-01-08T00:00:00.000Z',
  }]

  const plan = buildAdminAccessRegistryBootstrapPlan({
    users,
    memberships,
    config: { internalAdminEmails: [] },
    existing: {
      identitiesById: buildExistingIdentityMap(existingIdentities),
      membershipsByCompositeKey: buildExistingMembershipMap(existingMemberships),
      roleAssignmentsByCompositeKey: buildExistingRoleAssignmentMap(existingRoles),
    },
  })

  assert.equal(plan.counters.identitiesCreated, 0)
  assert.equal(plan.counters.identitiesUpdated, 0)
  assert.equal(plan.counters.identitiesUnchanged, 1)
  assert.equal(plan.counters.membershipsCreated, 0)
  assert.equal(plan.counters.membershipsUpdated, 0)
  assert.equal(plan.counters.membershipsUnchanged, 1)
  assert.equal(plan.counters.roleAssignmentsCreated, 0)
  assert.equal(plan.counters.roleAssignmentsUpdated, 0)
  assert.equal(plan.counters.roleAssignmentsUnchanged, 1)
})

test('handles null email unknown role and null timestamps conservatively', () => {
  const users = [buildUser({ id: 'user-2', email: null, updatedAt: null, lastAssessmentActivityAt: null })]
  const memberships = [buildMembership({ userId: 'user-2', role: null, joinedAt: null, createdAt: null, updatedAt: null, lastActivityAt: null })]

  const plan = buildAdminAccessRegistryBootstrapPlan({
    users,
    memberships,
    config: { internalAdminEmails: [] },
  })

  assert.equal(plan.counters.skippedMissingEmailCount, 1)
  assert.equal(plan.counters.identitiesPlanned, 0)
  assert.equal(plan.counters.membershipsPlanned, 0)
  assert.equal(plan.counters.roleAssignmentsPlanned, 0)
  assert.equal(plan.auditEvents.length, 0)
})

test('classifies ambiguous records conservatively as organisation users and reports them', () => {
  const user = buildUser({ id: 'user-3', email: 'solo@example.com', accountType: 'individual' })
  const classification = classifyLegacyIdentity(user, [], { internalAdminEmails: [] })

  assert.equal(classification.identityType, 'organisation')
  assert.match(classification.ambiguousReason ?? '', /defaulted to organisation/i)

  const plan = buildAdminAccessRegistryBootstrapPlan({
    users: [user],
    memberships: [],
    config: { internalAdminEmails: [] },
  })

  assert.equal(plan.counters.ambiguousIdentityTypeCount, 1)
  assert.equal(plan.ambiguities[0]?.userId, 'user-3')
})

test('classifies trusted internal users from the existing admin allowlist without fabricating internal roles', () => {
  const user = buildUser({ id: 'user-4', email: 'ops@sonartra.com' })
  const plan = buildAdminAccessRegistryBootstrapPlan({
    users: [user],
    memberships: [],
    config: { internalAdminEmails: ['ops@sonartra.com'] },
  })

  assert.equal(plan.identities[0]?.identityType, 'internal')
  assert.equal(plan.roleAssignments.length, 0)
  assert.equal(plan.auditEvents.length, 0)
})

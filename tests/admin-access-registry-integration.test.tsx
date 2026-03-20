import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import {
  assessUserAccessPriority,
  filterUsersByQuery,
  getAccessPresetViews,
  prioritiseUsers,
  type AdminAccessRegistryDomainData,
} from '../lib/admin/domain'
import type { AdminAccessIdentityDTO } from '../lib/admin/server/access-registry'
import {
  mapAccessIdentityDtoToAdminUser,
  mapAccessRegistryDtosToDomainData,
} from '../lib/admin/server/access-registry-mappers'
import { getUserAccessHistory, getUserSummary } from '../lib/admin/wireframe'

const fixtureDtos: AdminAccessIdentityDTO[] = [
  {
    id: '30000000-0000-4000-8000-000000000001',
    fullName: 'Rina Patel',
    email: 'rina.patel@sonartra.com',
    identityType: 'internal',
    status: 'active',
    authBinding: 'clerk:clerk_rina',
    lastActivityAt: '2026-03-20T07:18:00Z',
    createdAt: '2025-07-02T08:00:00Z',
    roles: [{ key: 'super_admin', label: 'Super admin', organisationId: null }],
    memberships: [],
    auditEvents: [{ id: 'rina-audit-1', eventType: 'privileged_access_confirmed', summary: 'Quarterly privileged access review confirmed scope remains required.', actorName: 'System', happenedAt: '2026-03-20T07:18:00Z' }],
  },
  {
    id: '30000000-0000-4000-8000-000000000004',
    fullName: 'Ella Wright',
    email: 'ella.wright@sonartra.com',
    identityType: 'internal',
    status: 'suspended',
    authBinding: 'clerk:clerk_ella',
    lastActivityAt: '2026-03-11T13:12:00Z',
    createdAt: '2025-08-18T11:45:00Z',
    roles: [{ key: 'support_admin', label: 'Support admin', organisationId: null }],
    memberships: [],
    auditEvents: [
      { id: 'ella-audit-1', eventType: 'internal_review_opened', summary: 'Suspended pending internal review of support access posture.', actorName: 'Rina Patel', happenedAt: '2026-03-12T09:00:00Z' },
      { id: 'ella-audit-2', eventType: 'access_suspended', summary: 'Support admin access suspended after escalation review.', actorName: 'Rina Patel', happenedAt: '2026-03-11T13:12:00Z' },
    ],
  },
  {
    id: '30000000-0000-4000-8000-000000000006',
    fullName: 'Bianca Ng',
    email: 'bianca.ng@aurorahealthgroup.com',
    identityType: 'organisation',
    status: 'active',
    authBinding: 'clerk:clerk_bianca',
    lastActivityAt: '2026-03-20T04:10:00Z',
    createdAt: '2025-12-02T12:00:00Z',
    roles: [
      { key: 'admin', label: 'Admin', organisationId: 'org-aurora' },
      { key: 'analyst', label: 'Analyst', organisationId: 'org-northstar' },
    ],
    memberships: [
      { organisationId: 'org-aurora', organisationName: 'Aurora Health Group', membershipRole: 'admin', membershipStatus: 'active', joinedAt: '2026-02-02T11:15:00Z', invitedAt: '2026-01-25T13:00:00Z', lastActivityAt: '2026-03-20T04:10:00Z' },
      { organisationId: 'org-northstar', organisationName: 'Northstar Logistics', membershipRole: 'analyst', membershipStatus: 'active', joinedAt: '2026-03-03T10:00:00Z', invitedAt: '2026-03-01T09:30:00Z', lastActivityAt: '2026-03-18T17:25:00Z' },
    ],
    auditEvents: [{ id: 'bianca-audit-1', eventType: 'multi_org_access_detected', summary: 'Cross-organisation membership detected across Aurora and Northstar.', actorName: 'Jules Adeyemi', happenedAt: '2026-03-20T04:12:00Z' }],
  },
  {
    id: '30000000-0000-4000-8000-000000000007',
    fullName: 'Isaac Reyes',
    email: 'isaac.reyes@vectorforge.io',
    identityType: 'organisation',
    status: 'invited',
    authBinding: null,
    lastActivityAt: null,
    createdAt: '2026-03-14T16:05:00Z',
    roles: [{ key: 'manager', label: 'Manager', organisationId: 'org-vectorforge' }],
    memberships: [
      { organisationId: 'org-vectorforge', organisationName: 'VectorForge Industrial', membershipRole: 'manager', membershipStatus: 'invited', joinedAt: null, invitedAt: '2026-03-14T16:05:00Z', lastActivityAt: null },
    ],
    auditEvents: [{ id: 'isaac-audit-1', eventType: 'invite_sent', summary: 'Invitation sent for VectorForge manager access.', actorName: 'Jules Adeyemi', happenedAt: '2026-03-14T16:05:00Z' }],
  },
]

test('maps internal identities without memberships into the existing admin domain model', () => {
  const user = mapAccessIdentityDtoToAdminUser(fixtureDtos[0])

  assert.equal(user.kind, 'internal_admin')
  assert.equal(user.internalAdminRole, 'super_admin')
  assert.equal(user.primaryOrganisationId, null)
  assert.equal(user.recentActivity.lastActiveAt, '2026-03-20T07:18:00Z')
})

test('maps multi-org memberships and audit history into domain data for app-layer selectors', () => {
  const data = mapAccessRegistryDtosToDomainData(fixtureDtos)
  const bianca = data.users.find((user) => user.profile.fullName === 'Bianca Ng')

  assert.ok(bianca)
  assert.equal(getUserSummary(bianca!, data).memberships.length, 2)
  assert.deepEqual(
    getUserSummary(bianca!, data).memberships.map((membership) => membership.organisationId),
    ['org-aurora', 'org-northstar'],
  )
  assert.equal(getUserAccessHistory(bianca!, data)[0]?.summary, 'Cross-organisation membership detected across Aurora and Northstar.')
})

test('mapped DB-backed users still support the existing query, preset, and priority logic', () => {
  const data = mapAccessRegistryDtosToDomainData(fixtureDtos)
  const presets = getAccessPresetViews()

  assert.deepEqual(
    filterUsersByQuery(data.users, presets.find((preset) => preset.id === 'high-risk')!.query, data).map((user) => user.profile.fullName),
    ['Rina Patel', 'Ella Wright', 'Bianca Ng'],
  )
  assert.deepEqual(
    prioritiseUsers(data.users, data).map((user) => user.profile.fullName),
    ['Ella Wright', 'Isaac Reyes', 'Rina Patel', 'Bianca Ng'],
  )
  assert.deepEqual(assessUserAccessPriority(data.users.find((user) => user.profile.fullName === 'Isaac Reyes')!, data), {
    score: 60,
    level: 'high',
    reasons: ['Invite pending activation', 'No recent activity', 'Inactive activity band', 'Invited status'],
  })
})

test('detail page preserves empty membership and audit states for mapped identities', async () => {
  const emptyData: AdminAccessRegistryDomainData = mapAccessRegistryDtosToDomainData([
    {
      id: '30000000-0000-4000-8000-000000000009',
      fullName: 'Sam Rivera',
      email: 'sam.rivera@sonartra.com',
      identityType: 'internal',
      status: 'active',
      authBinding: 'clerk:clerk_sam',
      lastActivityAt: null,
      createdAt: '2026-03-01T09:00:00Z',
      roles: [{ key: 'support_admin', label: 'Support admin', organisationId: null }],
      memberships: [],
      auditEvents: [],
    },
  ])

  const sam = emptyData.users[0]
  const source = await readFile(new URL('../components/admin/surfaces/AdminWireframeSurfaces.tsx', import.meta.url), 'utf8')

  assert.equal(getUserSummary(sam, emptyData).memberships.length, 0)
  assert.equal(getUserAccessHistory(sam, emptyData).length, 0)
  assert.match(source, /No tenant memberships/)
  assert.match(source, /No access history/)
})

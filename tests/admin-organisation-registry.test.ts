import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import {
  buildAdminOrganisationRegistryDomainData,
  deriveOrganisationActivityBand,
  deriveOrganisationLifecycle,
  filterOrganisationsByQuery,
} from '../lib/admin/domain/organisation-registry'
import { OrganisationPlan, OrganisationStatus, type Organisation } from '../lib/admin/domain/organisations'
import { mapOrganisationRegistryDtosToDomainData } from '../lib/admin/server/organisation-registry-mappers'
import { mapOrganisationRegistryRows } from '../lib/admin/server/organisation-registry'

function buildOrganisation(overrides: Partial<Organisation> = {}): Organisation {
  return {
    id: 'org-1',
    slug: 'northstar-logistics',
    name: 'Northstar Logistics',
    status: OrganisationStatus.Active,
    plan: OrganisationPlan.Growth,
    sector: 'Organisation',
    region: 'United Kingdom',
    primaryContactUserId: null,
    seatSummary: { purchased: 0, assigned: 0, invited: 0, available: 0 },
    enabledProducts: [],
    enabledAssessmentIds: [],
    workspaceProvisionedAt: null,
    contractRenewalDate: null,
    lastActivityAt: '2026-03-20T08:00:00Z',
    createdAt: '2026-03-18T08:00:00Z',
    updatedAt: '2026-03-20T08:00:00Z',
    ...overrides,
  }
}

test('organisation lifecycle derivation classifies new, dormant, and flagged tenants deterministically', () => {
  const referenceDate = new Date('2026-03-21T00:00:00Z')

  assert.equal(deriveOrganisationLifecycle({
    organisation: buildOrganisation({ createdAt: '2026-03-14T00:00:00Z' }),
    membershipCount: 1,
    activeMembershipCount: 1,
    invitedMembershipCount: 0,
    inactiveMembershipCount: 0,
    multiOrgMemberCount: 0,
    lastOperationalActivityAt: '2026-03-20T08:00:00Z',
  }, referenceDate), 'new')

  assert.equal(deriveOrganisationLifecycle({
    organisation: buildOrganisation({ createdAt: '2025-11-01T00:00:00Z' }),
    membershipCount: 2,
    activeMembershipCount: 0,
    invitedMembershipCount: 0,
    inactiveMembershipCount: 1,
    multiOrgMemberCount: 0,
    lastOperationalActivityAt: '2026-01-10T08:00:00Z',
  }, referenceDate), 'dormant')

  assert.equal(deriveOrganisationLifecycle({
    organisation: buildOrganisation({ status: OrganisationStatus.Suspended, createdAt: '2025-08-01T00:00:00Z' }),
    membershipCount: 2,
    activeMembershipCount: 0,
    invitedMembershipCount: 1,
    inactiveMembershipCount: 1,
    multiOrgMemberCount: 1,
    lastOperationalActivityAt: '2026-03-10T08:00:00Z',
  }, referenceDate), 'flagged')
})

test('organisation activity derivation distinguishes active, recent, inactive, and missing signals', () => {
  const referenceDate = new Date('2026-03-21T00:00:00Z')

  assert.equal(deriveOrganisationActivityBand({ lastOperationalActivityAt: '2026-03-20T23:00:00Z' }, referenceDate), 'active_now')
  assert.equal(deriveOrganisationActivityBand({ lastOperationalActivityAt: '2026-03-10T23:00:00Z' }, referenceDate), 'recent')
  assert.equal(deriveOrganisationActivityBand({ lastOperationalActivityAt: '2026-02-10T23:00:00Z' }, referenceDate), 'inactive')
  assert.equal(deriveOrganisationActivityBand({ lastOperationalActivityAt: null }, referenceDate), 'none')
})

test('organisation registry row mapping skips incomplete rows and normalises counts defensively', () => {
  const mapped = mapOrganisationRegistryRows([
    {
      id: 'org-1',
      name: 'Northstar Logistics',
      slug: 'northstar-logistics',
      country: 'United Kingdom',
      status: 'active',
      plan_tier: 'growth',
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
      membership_count: '2',
      active_membership_count: '1',
      invited_membership_count: '1',
      inactive_membership_count: '0',
      owner_count: '1',
      admin_count: '0',
      multi_org_member_count: '1',
      last_membership_activity_at: '2026-03-20T00:00:00Z',
      last_audit_activity_at: null,
    },
    {
      id: null,
      name: 'Broken Org',
      slug: 'broken-org',
      country: null,
      status: 'active',
      plan_tier: null,
      created_at: '2026-03-01T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
      membership_count: null,
      active_membership_count: null,
      invited_membership_count: null,
      inactive_membership_count: null,
      owner_count: null,
      admin_count: null,
      multi_org_member_count: null,
      last_membership_activity_at: null,
      last_audit_activity_at: null,
    },
  ])

  assert.equal(mapped.length, 1)
  assert.deepEqual(mapped[0], {
    id: 'org-1',
    name: 'Northstar Logistics',
    slug: 'northstar-logistics',
    country: 'United Kingdom',
    status: 'active',
    planTier: 'growth',
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    membershipCount: 2,
    activeMembershipCount: 1,
    invitedMembershipCount: 1,
    inactiveMembershipCount: 0,
    ownerCount: 1,
    adminCount: 0,
    multiOrgMemberCount: 1,
    lastMembershipActivityAt: '2026-03-20T00:00:00.000Z',
    lastAuditActivityAt: null,
  })
})

test('organisation registry row mapping retains persisted organisations with zero memberships', () => {
  const mapped = mapOrganisationRegistryRows([
    {
      id: 'org-empty',
      name: 'Empty Tenant',
      slug: 'empty-tenant',
      country: 'United States',
      status: 'active',
      plan_tier: 'growth',
      created_at: '2026-03-15T00:00:00Z',
      updated_at: '2026-03-20T00:00:00Z',
      membership_count: 0,
      active_membership_count: 0,
      invited_membership_count: 0,
      inactive_membership_count: 0,
      owner_count: 0,
      admin_count: 0,
      multi_org_member_count: 0,
      last_membership_activity_at: null,
      last_audit_activity_at: null,
    },
  ])

  assert.equal(mapped.length, 1)
  assert.equal(mapped[0]?.id, 'org-empty')
  assert.equal(mapped[0]?.membershipCount, 0)
})

test('organisation registry domain mapping and filters preserve lifecycle and posture contracts', () => {
  const data = mapOrganisationRegistryDtosToDomainData([
    {
      id: 'org-1',
      name: 'Northstar Logistics',
      slug: 'northstar-logistics',
      country: 'United Kingdom',
      status: 'active',
      planTier: 'growth',
      createdAt: '2026-03-18T00:00:00Z',
      updatedAt: '2026-03-20T00:00:00Z',
      membershipCount: 2,
      activeMembershipCount: 1,
      invitedMembershipCount: 1,
      inactiveMembershipCount: 0,
      ownerCount: 1,
      adminCount: 0,
      multiOrgMemberCount: 1,
      lastMembershipActivityAt: '2026-03-20T00:00:00Z',
      lastAuditActivityAt: '2026-03-20T08:00:00Z',
    },
    {
      id: 'org-2',
      name: 'VectorForge Industrial',
      slug: 'vectorforge-industrial',
      country: 'Germany',
      status: 'suspended',
      planTier: null,
      createdAt: '2025-08-01T00:00:00Z',
      updatedAt: '2026-03-18T00:00:00Z',
      membershipCount: 2,
      activeMembershipCount: 0,
      invitedMembershipCount: 1,
      inactiveMembershipCount: 1,
      ownerCount: 0,
      adminCount: 0,
      multiOrgMemberCount: 0,
      lastMembershipActivityAt: '2026-01-09T10:10:00Z',
      lastAuditActivityAt: '2026-01-20T11:00:00Z',
    },
  ])

  assert.deepEqual(
    filterOrganisationsByQuery(data.organisations, {
      search: 'northstar',
      lifecycle: ['new'],
      membershipPosture: ['owned'],
      activityBand: ['active_now'],
    }).map((entry) => entry.organisation.slug),
    ['northstar-logistics'],
  )
  assert.deepEqual(
    filterOrganisationsByQuery(data.organisations, {
      lifecycle: ['flagged'],
      membershipPosture: ['invited_only'],
      activityBand: ['inactive'],
    }).map((entry) => entry.organisation.slug),
    ['vectorforge-industrial'],
  )
})

test('empty-state hint and route data contract are wired for the organisations registry surface', async () => {
  const clientSource = await readFile(new URL('../components/admin/surfaces/AdminOrganisationsRegistryClient.tsx', import.meta.url), 'utf8')
  const routeSource = await readFile(new URL('../app/admin/organisations/page.tsx', import.meta.url), 'utf8')

  assert.match(clientSource, /Try removing one or more filters\./)
  assert.match(routeSource, /getAdminOrganisationRegistryData/)
  assert.match(routeSource, /mapOrganisationRegistryDtosToDomainData/)
})

test('domain builder enriches raw organisation entries with derived lifecycle metadata', () => {
  const data = buildAdminOrganisationRegistryDomainData([
    {
      organisation: buildOrganisation({ createdAt: '2026-03-19T00:00:00Z', updatedAt: '2026-03-20T00:00:00Z' }),
      membershipCount: 1,
      activeMembershipCount: 1,
      invitedMembershipCount: 0,
      inactiveMembershipCount: 0,
      ownerCount: 1,
      adminCount: 0,
      multiOrgMemberCount: 0,
      lastMembershipActivityAt: '2026-03-20T00:00:00Z',
      lastAuditActivityAt: null,
      lastOperationalActivityAt: '2026-03-20T00:00:00Z',
    },
  ])

  assert.equal(data.organisations[0]?.lifecycle, 'new')
  assert.equal(data.organisations[0]?.membershipPosture, 'owned')
})

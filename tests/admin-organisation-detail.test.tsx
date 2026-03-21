import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminOrganisationDetailSurface } from '../components/admin/surfaces/AdminOrganisationDetailSurface'
import { getAdminOrganisationDetailTab } from '../lib/admin/domain/organisation-detail'
import {
  mapOrganisationActivityRows,
  mapOrganisationAssessmentRows,
  mapOrganisationMemberRows,
  mapOrganisationSummaryRow,
} from '../lib/admin/server/organisation-detail'

const detailData = {
  organisation: {
    id: '20000000-0000-4000-8000-000000000001',
    name: 'Northstar Logistics',
    slug: 'northstar-logistics',
    status: 'active',
    country: 'United Kingdom',
    planTier: 'growth',
    seatBand: 'scale',
    classification: null,
    createdAt: '2026-03-01T10:00:00Z',
    updatedAt: '2026-03-20T10:00:00Z',
    totalMembers: 2,
    activeMembers: 2,
    invitedMembers: 0,
    inactiveMembers: 0,
    assignedAssessments: 3,
    assessmentCatalogCount: 1,
    completedAssessments: 2,
    lastMembershipActivityAt: '2026-03-20T09:00:00Z',
    lastAssessmentActivityAt: '2026-03-20T08:00:00Z',
    lastAuditActivityAt: '2026-03-20T07:00:00Z',
    lastOperationalActivityAt: '2026-03-20T09:00:00Z',
  },
  members: [
    {
      identityId: '30000000-0000-4000-8000-000000000005',
      fullName: 'Alex Mercer',
      email: 'alex.mercer@northstarlogistics.com',
      role: 'owner',
      accessStatus: 'active',
      joinedAt: '2026-03-01T10:00:00Z',
      invitedAt: '2026-02-28T10:00:00Z',
      lastActivityAt: '2026-03-20T09:00:00Z',
    },
  ],
  assessments: [
    {
      assessmentVersionId: 'assessment-version-1',
      title: 'WPLP-80 Sonartra Signals',
      libraryKey: 'wplp80-v1',
      publishState: 'published' as const,
      assignedUsersCount: 2,
      completionCount: 1,
      updatedAt: '2026-03-20T08:00:00Z',
    },
  ],
  recentActivity: [
    {
      id: 'audit-1',
      eventType: 'adoption_checkpoint',
      summary: 'Adoption checkpoint completed for Northstar analyst scope.',
      actorName: 'Bianca Ng',
      happenedAt: '2026-03-20T07:00:00Z',
      source: 'audit' as const,
    },
  ],
  auditTrail: [
    {
      id: 'audit-1',
      eventType: 'organisation_updated',
      summary: 'Organisation record updated: slug to northstar-logistics.',
      actorName: 'Rina Patel',
      happenedAt: '2026-03-20T10:00:00Z',
      source: 'audit' as const,
    },
    {
      id: 'membership-1',
      eventType: 'membership_joined',
      summary: 'Alex Mercer joined with owner access.',
      actorName: null,
      happenedAt: '2026-03-01T10:00:00Z',
      source: 'membership' as const,
    },
  ],
}

test('organisation detail overview renders production detail workspace sections and live actions', () => {
  const html = renderToStaticMarkup(<AdminOrganisationDetailSurface detailData={detailData} activeTab="overview" mutation="updated" />)

  assert.match(html, /Northstar Logistics/)
  assert.match(html, /northstar-logistics/)
  assert.match(html, /Overview/)
  assert.match(html, /Members/)
  assert.match(html, /Assessments/)
  assert.match(html, /Activity/)
  assert.match(html, /Settings/)
  assert.match(html, /Edit organisation/)
  assert.match(html, /Deactivate organisation/)
  assert.match(html, /Organisation changes saved successfully\./)
  assert.match(html, /Recent activity/)
  assert.match(html, /View audit trail/)
})

test('organisation detail members tab renders the linked admin user roster', () => {
  const html = renderToStaticMarkup(<AdminOrganisationDetailSurface detailData={detailData} activeTab="members" />)

  assert.match(html, /Tenant membership roster/)
  assert.match(html, /Alex Mercer/)
  assert.match(html, /alex\.mercer@northstarlogistics\.com/)
  assert.match(html, /\/admin\/users\/30000000-0000-4000-8000-000000000005/)
  assert.match(html, /Joined/)
})

test('organisation detail activity tab renders scoped audit trail rows', () => {
  const html = renderToStaticMarkup(<AdminOrganisationDetailSurface detailData={detailData} activeTab="activity" />)

  assert.match(html, /Organisation audit trail/)
  assert.match(html, /Organisation record updated/)
  assert.match(html, /membership joined/i)
  assert.match(html, /Open shared audit workspace/)
})

test('organisation detail settings tab renders safe metadata and future control placeholders', () => {
  const html = renderToStaticMarkup(<AdminOrganisationDetailSurface detailData={detailData} activeTab="settings" />)

  assert.match(html, /Organisation settings/)
  assert.match(html, /Organisation ID/)
  assert.match(html, /20000000-0000-4000-8000-000000000001/)
  assert.match(html, /Default assessment access/)
  assert.match(html, /Organisation branding/)
  assert.match(html, /Provisioning options/)
})

test('organisation detail route sanitises requested tabs', () => {
  assert.equal(getAdminOrganisationDetailTab('members'), 'members')
  assert.equal(getAdminOrganisationDetailTab('activity'), 'activity')
  assert.equal(getAdminOrganisationDetailTab('not-real'), 'overview')
  assert.equal(getAdminOrganisationDetailTab(undefined), 'overview')
})

test('organisation detail server mapping normalises summary, members, assessments, and activity rows', () => {
  const summary = mapOrganisationSummaryRow({
    id: 'org-1',
    name: 'Northstar Logistics',
    slug: 'northstar-logistics',
    status: 'active',
    country: 'United Kingdom',
    plan_tier: 'growth',
    seat_band: 'scale',
    created_at: '2026-03-01T10:00:00Z',
    updated_at: '2026-03-20T10:00:00Z',
    total_members: '2',
    active_members: '2',
    invited_members: '0',
    inactive_members: '0',
    assigned_assessments: '3',
    assessment_catalog_count: '1',
    completed_assessments: '2',
    last_membership_activity_at: '2026-03-20T09:00:00Z',
    last_assessment_activity_at: '2026-03-20T08:00:00Z',
    last_audit_activity_at: '2026-03-20T07:00:00Z',
    last_operational_activity_at: '2026-03-20T09:00:00Z',
  })
  const members = mapOrganisationMemberRows([{
    identity_id: 'identity-1',
    full_name: 'Alex Mercer',
    email: 'alex@example.com',
    role: 'owner',
    access_status: 'active',
    joined_at: '2026-03-01T10:00:00Z',
    invited_at: null,
    last_activity_at: '2026-03-20T09:00:00Z',
  }])
  const assessments = mapOrganisationAssessmentRows([{
    assessment_version_id: 'assessment-version-1',
    title: 'WPLP-80 Sonartra Signals',
    library_key: 'wplp80-v1',
    publish_state: true,
    assigned_users_count: '2',
    completion_count: '1',
    updated_at: '2026-03-20T08:00:00Z',
  }])
  const activity = mapOrganisationActivityRows([{
    id: 'audit-1',
    event_type: 'adoption_checkpoint',
    summary: 'Checkpoint complete',
    actor_name: 'Bianca Ng',
    happened_at: '2026-03-20T07:00:00Z',
    source: 'audit',
  }])

  assert.equal(summary?.assignedAssessments, 3)
  assert.equal(summary?.assessmentCatalogCount, 1)
  assert.equal(members[0]?.email, 'alex@example.com')
  assert.equal(assessments[0]?.publishState, 'published')
  assert.equal(activity[0]?.actorName, 'Bianca Ng')
  assert.equal(activity[0]?.source, 'audit')
})

test('organisation detail route and edit workspace wire server loading and operator controls', async () => {
  const [routeSource, editRouteSource, actionSource, notFoundSource, registrySource, layoutSource] = await Promise.all([
    readFile(new URL('../app/admin/organisations/[organisationId]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/organisations/[organisationId]/edit/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/organisations/[organisationId]/edit/actions.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/organisations/[organisationId]/not-found.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminOrganisationsRegistryClient.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/layout.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(routeSource, /getAdminOrganisationDetailData/)
  assert.match(routeSource, /mutation=updated|mutation/)
  assert.match(editRouteSource, /AdminOrganisationEditForm/)
  assert.match(actionSource, /updateAdminOrganisation/)
  assert.match(actionSource, /transitionAdminOrganisationStatus/)
  assert.match(notFoundSource, /Organisation not found/)
  assert.match(registrySource, /\/admin\/organisations\/\$\{organisation\.id\}/)
  assert.match(layoutSource, /resolveAdminAccess/)
  assert.match(layoutSource, /!access\.isAllowed/)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAuditWorkspaceSurface } from '../components/admin/surfaces/AdminAuditWorkspaceSurface'
import {
  buildAdminAuditHref,
  getAdminAuditAppliedFilters,
  getAdminAuditEventLabel,
  getAdminAuditFilters,
} from '../lib/admin/domain/audit'
import {
  mapAdminAuditEventRows,
  mapAuditEventsToOrganisationActivity,
} from '../lib/admin/server/audit-workspace'

const baseWorkspaceData = {
  filters: getAdminAuditFilters(undefined),
  events: [
    {
      id: 'audit-1',
      eventType: 'organisation_updated',
      eventLabel: 'Organisation Updated',
      summary: 'Organisation record updated: slug to northstar-logistics.',
      actorId: '30000000-0000-4000-8000-000000000001',
      actorName: 'Rina Patel',
      happenedAt: '2026-03-20T10:00:00Z',
      source: 'audit' as const,
      organisationId: '20000000-0000-4000-8000-000000000001',
      organisationName: 'Northstar Logistics',
      entityType: 'organisation' as const,
      entityId: '20000000-0000-4000-8000-000000000001',
      entityName: 'Northstar Logistics',
      entitySecondary: 'northstar-logistics',
      isDerived: false,
    },
    {
      id: 'membership-1-joined',
      eventType: 'membership_joined',
      eventLabel: 'Membership Joined',
      summary: 'Alex Mercer joined with owner access.',
      actorId: null,
      actorName: null,
      happenedAt: '2026-03-01T10:00:00Z',
      source: 'membership' as const,
      organisationId: '20000000-0000-4000-8000-000000000001',
      organisationName: 'Northstar Logistics',
      entityType: 'membership' as const,
      entityId: '50000000-0000-4000-8000-000000000001',
      entityName: 'Alex Mercer',
      entitySecondary: 'alex@example.com',
      isDerived: true,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 25,
    totalCount: 2,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    windowStart: 1,
    windowEnd: 2,
  },
  availableActors: [{ id: '30000000-0000-4000-8000-000000000001', label: 'Rina Patel' }],
  availableOrganisations: [{ id: '20000000-0000-4000-8000-000000000001', label: 'Northstar Logistics' }],
  availableEventTypes: ['membership_joined', 'organisation_updated'],
  appliedFilters: [],
}

test('/admin/audit workspace renders the base audit list and operational columns', () => {
  const html = renderToStaticMarkup(<AdminAuditWorkspaceSurface data={baseWorkspaceData} />)

  assert.match(html, /Operational audit workspace/)
  assert.match(html, /Organisation record updated: slug to northstar-logistics\./)
  assert.match(html, /Alex Mercer joined with owner access\./)
  assert.match(html, /Matching events|Indexed events/)
  assert.match(html, /Timestamp/)
  assert.match(html, /Summary/)
  assert.match(html, /Scope to organisation/)
})

test('organisation-filtered audit render reflects applied URL search params directly', () => {
  const filters = getAdminAuditFilters({ organisationId: '20000000-0000-4000-8000-000000000001', eventType: 'organisation_updated' })
  const data = {
    ...baseWorkspaceData,
    filters,
    appliedFilters: getAdminAuditAppliedFilters(filters, {
      organisations: baseWorkspaceData.availableOrganisations,
      actors: baseWorkspaceData.availableActors,
    }),
  }

  const html = renderToStaticMarkup(<AdminAuditWorkspaceSurface data={data} />)

  assert.match(html, /Filtered context/)
  assert.match(html, /Organisation: Northstar Logistics/)
  assert.match(html, /Event type: Organisation Updated/)
  assert.match(html, /Reset filters/)
})

test('empty state renders specific copy when no audit events match the filter set', () => {
  const filters = getAdminAuditFilters({ organisationId: '20000000-0000-4000-8000-000000000001', query: 'not-found' })
  const html = renderToStaticMarkup(
    <AdminAuditWorkspaceSurface
      data={{
        ...baseWorkspaceData,
        filters,
        events: [],
        pagination: {
          page: 1,
          pageSize: 25,
          totalCount: 0,
          totalPages: 1,
          hasPreviousPage: false,
          hasNextPage: false,
          windowStart: 0,
          windowEnd: 0,
        },
        appliedFilters: getAdminAuditAppliedFilters(filters, { organisations: baseWorkspaceData.availableOrganisations }),
      }}
    />,
  )

  assert.match(html, /No audit events match the current filters/)
  assert.match(html, /did not produce any truthful audit rows/i)
})

test('admin audit filter helpers sanitise invalid values and preserve filter state across pagination links', () => {
  const filters = getAdminAuditFilters({
    organisationId: 'not-a-uuid',
    actorId: 'also-bad',
    entityType: 'membership',
    eventType: 'membership_joined',
    query: 'northstar',
    page: '2',
  })

  assert.equal(filters.organisationId, '')
  assert.equal(filters.actorId, '')
  assert.equal(filters.entityType, 'membership')
  assert.equal(filters.page, 2)
  assert.equal(
    buildAdminAuditHref({ ...filters, organisationId: '20000000-0000-4000-8000-000000000001', page: 3 }),
    '/admin/audit?organisationId=20000000-0000-4000-8000-000000000001&entityType=membership&eventType=membership_joined&query=northstar&page=3',
  )
})

test('shared audit presentation mapping normalises event labels and organisation activity drill-in records', () => {
  const events = mapAdminAuditEventRows([
    {
      id: 'audit-1',
      event_type: 'membership_role_changed',
      summary: 'Alex Mercer role changed from admin to owner.',
      actor_name: 'Rina Patel',
      actor_id: '30000000-0000-4000-8000-000000000001',
      happened_at: '2026-03-20T10:00:00Z',
      source: 'audit',
      organisation_id: '20000000-0000-4000-8000-000000000001',
      organisation_name: 'Northstar Logistics',
      entity_type: 'membership',
      entity_id: '50000000-0000-4000-8000-000000000001',
      entity_name: 'Alex Mercer',
      entity_secondary: 'alex@example.com',
      is_derived: false,
    },
  ])
  const activity = mapAuditEventsToOrganisationActivity(events)

  assert.equal(events[0]?.eventLabel, 'Membership Role Changed')
  assert.equal(getAdminAuditEventLabel('organisation_created'), 'Organisation Created')
  assert.equal(activity[0]?.entityType, 'membership')
  assert.equal(activity[0]?.organisationName, 'Northstar Logistics')
})

test('organisation detail links into the filtered shared audit workspace with canonical params', async () => {
  const source = await readFile(new URL('../components/admin/surfaces/AdminOrganisationDetailSurface.tsx', import.meta.url), 'utf8')

  assert.match(source, /buildAdminAuditHref\(\{ organisationId: organisation\.id \}\)/)
  assert.match(source, /buildAdminAuditHref\(\{ organisationId: detailData\.organisation\.id \}\)/)
})

test('admin audit route uses server loading helpers and relies on shared admin access guard behavior', async () => {
  const [routeSource, layoutSource] = await Promise.all([
    readFile(new URL('../app/admin/audit/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/layout.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(routeSource, /getAdminAuditWorkspaceData/)
  assert.match(routeSource, /AdminAuditWorkspaceSurface/)
  assert.match(layoutSource, /resolveAdminAccess/)
  assert.match(layoutSource, /!access\.isAllowed/)
})

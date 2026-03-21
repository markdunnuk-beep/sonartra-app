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
  getAdminAuditWorkspaceData,
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
  notice: null,
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

test('audit workspace loader returns a safe empty-state payload when no audit data exists', async () => {
  const queries: Array<{ sql: string; params: unknown[] | undefined }> = []
  const data = await getAdminAuditWorkspaceData(undefined, {
    queryDb: async (sql, params) => {
      queries.push({ sql, params })

      if (/to_regclass/i.test(sql)) {
        return { rows: [{ has_access_audit_events_table: true }] } as never
      }

      if (/information_schema\\.columns/i.test(sql)) {
        return {
          rows: [
            { column_name: 'entity_type' },
            { column_name: 'entity_id' },
            { column_name: 'entity_label' },
            { column_name: 'entity_secondary' },
          ],
        } as never
      }

      if (/count\\(\\*\\)::int as total_count/i.test(sql)) {
        return { rows: [{ total_count: 0 }] } as never
      }

      return { rows: [] } as never
    },
  })

  assert.ok(queries.length >= 6)
  assert.equal(data.notice ?? null, null)
  assert.equal(data.events.length, 0)
  assert.equal(data.pagination.totalCount, 0)
  assert.equal(Array.isArray(data.availableEventTypes), true)

  const html = renderToStaticMarkup(<AdminAuditWorkspaceSurface data={data} />)
  assert.match(html, /Audit events will appear here once the current workspace records real or derived operational history\./)
})

test('shared audit row mapping tolerates missing optional actor and entity metadata', () => {
  const events = mapAdminAuditEventRows([
    {
      id: 'audit-1',
      event_type: 'assessment_package_imported',
      summary: 'Assessment package imported for Sonartra Signals v1.2.0.',
      actor_name: null,
      actor_id: null,
      happened_at: '2026-03-20T10:00:00Z',
      source: 'audit',
      organisation_id: null,
      organisation_name: null,
      entity_type: 'assessment_version',
      entity_id: null,
      entity_name: null,
      entity_secondary: null,
      is_derived: false,
    },
  ])

  assert.equal(events.length, 1)
  assert.equal(events[0]?.actorName, null)
  assert.equal(events[0]?.entityName, null)
  assert.equal(events[0]?.entityType, 'assessment_version')
})

test('audit workspace loader sanitises invalid search params and clamps stale pagination without crashing', async () => {
  const data = await getAdminAuditWorkspaceData({
    organisationId: 'not-a-uuid',
    actorId: 'still-not-a-uuid',
    dateFrom: 'not-a-date',
    dateTo: 'also-not-a-date',
    page: '99',
  }, {
    queryDb: async (sql) => {
      if (/to_regclass/i.test(sql)) {
        return { rows: [{ has_access_audit_events_table: false }] } as never
      }

      if (/select id::text as id, name as label/i.test(sql)) {
        return { rows: [] } as never
      }

      if (/count\\(\\*\\)::int as total_count/i.test(sql)) {
        return { rows: [{ total_count: 1 }] } as never
      }

      return {
        rows: [{
          id: 'organisation-created-20000000-0000-4000-8000-000000000001',
          event_type: 'organisation_created',
          summary: 'Organisation record created.',
          actor_name: null,
          actor_id: null,
          happened_at: '2026-03-20T10:00:00Z',
          source: 'organisation',
          organisation_id: '20000000-0000-4000-8000-000000000001',
          organisation_name: 'Northstar Logistics',
          entity_type: 'organisation',
          entity_id: '20000000-0000-4000-8000-000000000001',
          entity_name: 'Northstar Logistics',
          entity_secondary: 'northstar-logistics',
          is_derived: true,
        }],
      } as never
    },
  })

  assert.equal(data.filters.organisationId, '')
  assert.equal(data.filters.actorId, '')
  assert.equal(data.filters.page, 1)
  assert.equal(data.events.length, 1)
})

test('audit workspace loader degrades to a setup state when required schema is missing', async () => {
  const data = await getAdminAuditWorkspaceData(undefined, {
    queryDb: async () => {
      const error = new Error('column "entity_type" of relation "access_audit_events" does not exist') as Error & { code?: string }
      error.code = '42703'
      throw error
    },
  })

  assert.equal(data.notice?.kind, 'setup_required')
  assert.match(data.notice?.detail ?? '', /0006_admin_access_registry\.sql/)
  assert.equal(data.events.length, 0)

  const html = renderToStaticMarkup(<AdminAuditWorkspaceSurface data={data} />)
  assert.match(html, /Audit workspace setup is incomplete/)
  assert.match(html, /Apply filters/)
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

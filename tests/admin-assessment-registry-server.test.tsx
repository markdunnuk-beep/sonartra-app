import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAssessmentsRegistrySurface } from '../components/admin/surfaces/AdminAssessmentsRegistrySurface'
import { getAdminAssessmentRegistryData } from '../lib/admin/server/assessment-management'

test('assessment registry loader returns an empty-state payload when no records exist', async () => {
  const queries: Array<{ sql: string; params: unknown[] | undefined }> = []
  const data = await getAdminAssessmentRegistryData(undefined, {
    queryDb: async (sql, params) => {
      queries.push({ sql, params })

      if (/count\(\*\)::int as total_count/i.test(sql)) {
        return { rows: [{ total_count: 0 }] } as never
      }

      return { rows: [] } as never
    },
  })

  assert.equal(queries.length, 2)
  assert.equal(data.pagination.totalCount, 0)
  assert.equal(data.entries.length, 0)
  assert.equal(data.notice ?? null, null)

  const html = renderToStaticMarkup(<AdminAssessmentsRegistrySurface data={data} />)
  assert.match(html, /No assessments are registered yet/)
})

test('assessment registry loader tolerates absent optional relations and clamps invalid pages', async () => {
  const queries: Array<{ sql: string; params: unknown[] | undefined }> = []
  const data = await getAdminAssessmentRegistryData({ page: '99' }, {
    queryDb: async (sql, params) => {
      queries.push({ sql, params })

      if (/count\(\*\)::int as total_count/i.test(sql)) {
        return { rows: [{ total_count: 1 }] } as never
      }

      return {
        rows: [{
          id: 'assessment-1',
          key: 'sonartra_signals',
          slug: 'sonartra-signals',
          name: 'Sonartra Signals',
          category: 'behavioural_intelligence',
          description: null,
          lifecycle_status: 'draft',
          current_published_version_label: null,
          version_count: null,
          created_at: '2026-03-01T09:00:00Z',
          updated_at: '2026-03-02T09:00:00Z',
        }],
      } as never
    },
  })

  assert.equal(data.filters.page, 1)
  assert.equal(data.pagination.page, 1)
  assert.equal(data.entries[0]?.versionCount, 0)
  assert.equal(data.entries[0]?.currentPublishedVersionLabel, null)

  const rowsQuery = queries[1]
  assert.ok(rowsQuery)
  assert.match(rowsQuery.sql, /left join assessment_versions current_version[\s\S]*where/i)
  assert.equal(rowsQuery.params?.[4], 0)

  const html = renderToStaticMarkup(<AdminAssessmentsRegistrySurface data={data} />)
  assert.match(html, /No internal summary yet\./)
  assert.match(html, /No published version/)
})

test('assessment registry loader degrades to a setup state when required schema is missing', async () => {
  const data = await getAdminAssessmentRegistryData(undefined, {
    queryDb: async () => {
      const error = new Error('relation "assessment_definitions" does not exist') as Error & { code?: string }
      error.code = '42P01'
      throw error
    },
  })

  assert.equal(data.notice?.kind, 'setup_required')
  assert.match(data.notice?.detail ?? '', /0007_assessment_admin_registry\.sql/)

  const html = renderToStaticMarkup(<AdminAssessmentsRegistrySurface data={data} />)
  assert.match(html, /Assessment registry setup is incomplete/)
  assert.match(html, /Retry registry load/)
})

test('assessment registry route continues to rely on the shared admin access guard', async () => {
  const [layoutSource, routeSource] = await Promise.all([
    readFile(new URL('../app/admin/layout.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/page.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(layoutSource, /resolveAdminAccess/)
  assert.match(layoutSource, /!access\.isAllowed/)
  assert.match(routeSource, /getAdminAssessmentRegistryData/)
})

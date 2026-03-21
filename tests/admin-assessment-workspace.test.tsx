import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAssessmentsRegistrySurface } from '../components/admin/surfaces/AdminAssessmentsRegistrySurface'
import { AdminAssessmentDetailSurface } from '../components/admin/surfaces/AdminAssessmentDetailSurface'
import {
  getAdminAssessmentDetailTab,
  getAdminAssessmentRegistryFilters,
} from '../lib/admin/domain/assessment-management'
import { mapAssessmentVersionRows } from '../lib/admin/server/assessment-management'

const registryData = {
  filters: {
    query: '',
    lifecycle: 'all' as const,
    category: 'all' as const,
    sort: 'updated_desc' as const,
    page: 1,
    pageSize: 20,
  },
  entries: [
    {
      id: 'assessment-1',
      name: 'Sonartra Signals',
      key: 'sonartra_signals',
      slug: 'sonartra-signals',
      category: 'behavioural_intelligence',
      lifecycleStatus: 'published' as const,
      currentPublishedVersionLabel: '1.2.0',
      versionCount: 3,
      updatedAt: '2026-03-21T09:00:00Z',
      createdAt: '2026-03-01T09:00:00Z',
      description: 'Core behavioural intelligence line.',
    },
  ],
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    windowStart: 1,
    windowEnd: 1,
  },
}

const detailData = {
  assessment: {
    id: 'assessment-1',
    name: 'Sonartra Signals',
    key: 'sonartra_signals',
    slug: 'sonartra-signals',
    category: 'behavioural_intelligence',
    description: 'Core behavioural intelligence line.',
    lifecycleStatus: 'published' as const,
    currentPublishedVersionId: 'version-2',
    currentPublishedVersionLabel: '1.2.0',
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-21T09:00:00Z',
  },
  versions: [
    {
      id: 'version-2',
      assessmentId: 'assessment-1',
      versionLabel: '1.2.0',
      lifecycleStatus: 'published' as const,
      sourceType: 'manual' as const,
      notes: 'Current stable release',
      hasDefinitionPayload: false,
      validationStatus: null,
      createdAt: '2026-03-10T09:00:00Z',
      updatedAt: '2026-03-21T09:00:00Z',
      publishedAt: '2026-03-21T09:00:00Z',
      archivedAt: null,
      createdByName: 'Noah Chen',
      updatedByName: 'Noah Chen',
      publishedByName: 'Rina Patel',
    },
    {
      id: 'version-3',
      assessmentId: 'assessment-1',
      versionLabel: '1.3.0',
      lifecycleStatus: 'draft' as const,
      sourceType: 'manual' as const,
      notes: 'Next draft candidate',
      hasDefinitionPayload: false,
      validationStatus: null,
      createdAt: '2026-03-22T09:00:00Z',
      updatedAt: '2026-03-22T09:00:00Z',
      publishedAt: null,
      archivedAt: null,
      createdByName: 'Noah Chen',
      updatedByName: 'Noah Chen',
      publishedByName: null,
    },
  ],
  activity: [
    {
      id: 'audit-1',
      eventType: 'assessment_created',
      summary: 'Assessment record Sonartra Signals created in draft state.',
      actorId: 'admin-1',
      actorName: 'Rina Patel',
      happenedAt: '2026-03-01T09:00:00Z',
      source: 'audit' as const,
      entityType: 'assessment' as const,
      entityId: 'assessment-1',
      entityName: 'Sonartra Signals',
      entitySecondary: '1.2.0',
    },
    {
      id: 'audit-2',
      eventType: 'assessment_version_published',
      summary: 'Version 1.2.0 published for Sonartra Signals.',
      actorId: 'admin-1',
      actorName: 'Rina Patel',
      happenedAt: '2026-03-21T09:00:00Z',
      source: 'audit' as const,
      entityType: 'assessment_version' as const,
      entityId: 'version-2',
      entityName: 'Sonartra Signals v1.2.0',
      entitySecondary: 'assessment-1',
    },
  ],
  diagnostics: {
    versionCount: 2,
    draftCount: 1,
    archivedCount: 0,
    latestDraftVersionLabel: '1.3.0',
    latestPublishedVersionLabel: '1.2.0',
    latestVersionUpdatedAt: '2026-03-22T09:00:00Z',
  },
}

test('assessment registry renders server-driven list rows and create action', () => {
  const html = renderToStaticMarkup(<AdminAssessmentsRegistrySurface data={registryData} />)

  assert.match(html, /Assessment registry/)
  assert.match(html, /Create assessment record/)
  assert.match(html, /Sonartra Signals/)
  assert.match(html, /sonartra_signals/)
  assert.match(html, /No published version|v1.2.0/)
  assert.match(html, /\/admin\/assessments\/assessment-1/)
})

test('assessment detail overview renders workspace tabs, metadata, and audit action', () => {
  const html = renderToStaticMarkup(<AdminAssessmentDetailSurface detailData={detailData} activeTab="overview" mutation="created" />)

  assert.match(html, /Sonartra Signals/)
  assert.match(html, /sonartra_signals/)
  assert.match(html, /Overview/)
  assert.match(html, /Versions/)
  assert.match(html, /Settings/)
  assert.match(html, /Activity/)
  assert.match(html, /Assessment created successfully\./)
  assert.match(html, /Published version v1.2.0/)
  assert.match(html, /\/admin\/audit\?entityType=assessment&amp;entityId=assessment-1/)
})

test('assessment versions workspace wires lifecycle controls and version operators', async () => {
  const [surfaceSource, managerSource] = await Promise.all([
    readFile(new URL('../components/admin/surfaces/AdminAssessmentDetailSurface.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionsManager.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(surfaceSource, /AdminAssessmentVersionsManager/)
  assert.match(managerSource, /Create draft version/)
  assert.match(managerSource, /Publish/)
  assert.match(managerSource, /Archive/)
  assert.match(managerSource, /Metadata only/)
  assert.match(managerSource, /confirmation/)
})

test('assessment activity tab renders shared audit presentation and deep link', () => {
  const html = renderToStaticMarkup(<AdminAssessmentDetailSurface detailData={detailData} activeTab="activity" />)

  assert.match(html, /Assessment activity/)
  assert.match(html, /assessment created/i)
  assert.match(html, /assessment version published/i)
  assert.match(html, /Open in shared audit/)
  assert.match(html, /\/admin\/audit\?entityType=assessment&amp;entityId=assessment-1/)
})

test('assessment detail settings tab renders safe metadata and reserved controls', () => {
  const html = renderToStaticMarkup(<AdminAssessmentDetailSurface detailData={detailData} activeTab="settings" />)

  assert.match(html, /Assessment settings/)
  assert.match(html, /Assessment ID/)
  assert.match(html, /assessment-1/)
  assert.match(html, /Result\/report template binding/)
  assert.match(html, /Assignment defaults/)
})

test('assessment route helpers normalise tabs and registry filters', () => {
  assert.equal(getAdminAssessmentDetailTab('versions'), 'versions')
  assert.equal(getAdminAssessmentDetailTab('activity'), 'activity')
  assert.equal(getAdminAssessmentDetailTab('unexpected'), 'overview')

  const filters = getAdminAssessmentRegistryFilters({ lifecycle: 'published', category: 'behavioural_intelligence', page: '2' })
  assert.equal(filters.lifecycle, 'published')
  assert.equal(filters.category, 'behavioural_intelligence')
  assert.equal(filters.page, 2)
})

test('assessment version row mapping normalises audit-facing version state', () => {
  const versions = mapAssessmentVersionRows([{
    id: 'version-1',
    assessment_definition_id: 'assessment-1',
    version_label: '1.0.0',
    lifecycle_status: 'draft',
    source_type: 'manual',
    notes: 'Initial draft',
    has_definition_payload: false,
    validation_status: null,
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-02T09:00:00Z',
    published_at: null,
    archived_at: null,
    created_by_name: 'Noah Chen',
    updated_by_name: 'Noah Chen',
    published_by_name: null,
  }])

  assert.equal(versions[0]?.versionLabel, '1.0.0')
  assert.equal(versions[0]?.lifecycleStatus, 'draft')
  assert.equal(versions[0]?.createdByName, 'Noah Chen')
})

test('assessment routes and actions wire server data loading and mutation surfaces', async () => {
  const [registryRoute, detailRoute, createRoute, createAction, detailAction, notFoundSource, versionRoute] = await Promise.all([
    readFile(new URL('../app/admin/assessments/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/new/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/new/actions.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/actions.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/not-found.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/page.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(registryRoute, /getAdminAssessmentRegistryData/)
  assert.match(registryRoute, /AdminAssessmentsRegistrySurface/)
  assert.match(detailRoute, /getAdminAssessmentDetailData/)
  assert.match(detailRoute, /AdminAssessmentDetailSurface/)
  assert.match(createRoute, /AdminAssessmentCreateForm/)
  assert.match(createAction, /createAdminAssessment/)
  assert.match(detailAction, /createAdminAssessmentDraftVersion/)
  assert.match(detailAction, /publishAdminAssessmentVersion/)
  assert.match(detailAction, /archiveAdminAssessmentVersion/)
  assert.match(notFoundSource, /Assessment not found/)
  assert.match(versionRoute, /redirect\(/)
})

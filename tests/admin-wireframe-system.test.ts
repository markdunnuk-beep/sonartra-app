import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { findAssessmentBySlug, findAssessmentVersion, findOrganisationBySlug, findUserById, getAssessmentTabs, getReleaseBlockers, getValidationIssues } from '../lib/admin/wireframe'

test('wireframe selectors resolve typed entities for detail routes', () => {
  assert.equal(findOrganisationBySlug('northstar-logistics')?.name, 'Northstar Logistics')
  assert.equal(findUserById('user-admin-rina')?.profile.fullName, 'Rina Patel')
  assert.equal(findAssessmentBySlug('sonartra-signals')?.title, 'Sonartra Signals')
  assert.equal(findAssessmentVersion('sonartra-signals', '2.2.0')?.id, 'av-signals-2-2')
})

test('assessment tabs preserve overview, version, and new/import hierarchy', () => {
  const assessment = findAssessmentBySlug('sonartra-signals')
  assert.ok(assessment)

  const tabs = getAssessmentTabs(assessment!, 'version', findAssessmentVersion('sonartra-signals', '2.2.0')!)
  assert.deepEqual(
    tabs.map((tab) => tab.label),
    ['Overview', 'Versions', 'New / Import'],
  )
  assert.equal(tabs.find((tab) => tab.label === 'Versions')?.current, true)
})

test('validation and release helpers derive consistent readiness signals from typed versions', () => {
  const validatedVersion = findAssessmentVersion('sonartra-signals', '2.2.0')
  const inReviewVersion = findAssessmentVersion('team-dynamics', '1.1.0')

  assert.ok(validatedVersion)
  assert.ok(inReviewVersion)

  assert.equal(getValidationIssues(validatedVersion!).some((issue) => issue.state === 'error'), false)
  assert.equal(getReleaseBlockers(validatedVersion!).length, 0)
  assert.equal(getValidationIssues(inReviewVersion!).some((issue) => issue.state === 'error'), true)
  assert.equal(getReleaseBlockers(inReviewVersion!).length > 0, true)
})

test('wireframe surface files remain server-safe and avoid client directives', async () => {
  const files = ['../components/admin/surfaces/AdminWireframePrimitives.tsx', '../components/admin/surfaces/AdminWireframeSurfaces.tsx']

  for (const file of files) {
    const source = await readFile(new URL(file, import.meta.url), 'utf8')
    assert.doesNotMatch(source, /^['\"]use client['\"]/m)
  }
})

test('admin routes point to the shared high-fidelity wireframe surfaces', async () => {
  const routes = [
    '../app/admin/page.tsx',
    '../app/admin/dashboard/page.tsx',
    '../app/admin/organisations/page.tsx',
    '../app/admin/organisations/[slug]/page.tsx',
    '../app/admin/users/page.tsx',
    '../app/admin/users/[id]/page.tsx',
    '../app/admin/assessments/page.tsx',
    '../app/admin/assessments/[slug]/page.tsx',
    '../app/admin/assessments/[slug]/versions/[versionNumber]/page.tsx',
    '../app/admin/assessments/new/page.tsx',
    '../app/admin/releases/[versionId]/validation/page.tsx',
    '../app/admin/releases/[versionId]/publish/page.tsx',
    '../app/admin/audit/page.tsx',
  ]

  for (const route of routes) {
    const source = await readFile(new URL(route, import.meta.url), 'utf8')
    assert.match(source, /Admin.*WireframePage/)
  }
})

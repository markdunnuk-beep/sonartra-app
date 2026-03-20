import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { DEFAULT_ACCESS_QUERY, adminUsers, filterUsersByQuery, matchesActivity, matchesRisk, matchesScope } from '../lib/admin/domain'
import {
  findAssessmentBySlug,
  findAssessmentVersion,
  findOrganisationBySlug,
  findUserById,
  formatAdminRelativeTime,
  getAssessmentTabs,
  getOrganisationHealthSignals,
  getOrganisationMembershipSummary,
  getOrganisationUsers,
  getOrganisationUtilisationBand,
  getOrganisationVersionExposure,
  getReleaseBlockers,
  getUserAccessHistory,
  getUserAccessSignals,
  getUserActivityBand,
  getUserRoleSummary,
  getValidationIssues,
} from '../lib/admin/wireframe'

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

test('organisation registry helpers derive utilisation bands, intervention flags, membership counts, and version exposure', () => {
  const suspendedOrganisation = findOrganisationBySlug('vectorforge-industrial')
  const implementationOrganisation = findOrganisationBySlug('aurora-health-group')
  const northstarOrganisation = findOrganisationBySlug('northstar-logistics')

  assert.ok(suspendedOrganisation)
  assert.ok(implementationOrganisation)
  assert.ok(northstarOrganisation)

  assert.equal(getOrganisationUtilisationBand(implementationOrganisation!), 'low')
  assert.deepEqual(
    getOrganisationHealthSignals(suspendedOrganisation!).map((signal) => signal.label),
    ['Suspended', 'Dormant'],
  )
  assert.deepEqual(getOrganisationMembershipSummary(suspendedOrganisation!), {
    totalUsers: 2,
    adminUsers: 1,
    memberUsers: 1,
    invitedUsers: 1,
    inactiveUsers: 1,
  })
  assert.deepEqual(getOrganisationVersionExposure(implementationOrganisation!), ['Sonartra Signals v2.1.0', 'Organisation Pulse v1.0.0'])
  assert.deepEqual(
    getOrganisationUsers(northstarOrganisation!.id).map((user) => user.id),
    ['user-org-alex', 'user-org-bianca'],
  )
  assert.equal(formatAdminRelativeTime('2026-03-20T04:12:00Z'), 'Today')
  assert.equal(formatAdminRelativeTime('2026-02-07T09:48:00Z'), '1 month ago')
})

test('user access helpers expose role, risk, activity, and history for operator review surfaces', () => {
  const superAdmin = findUserById('user-admin-rina')
  const suspendedInternalAdmin = findUserById('user-admin-ella')
  const multiMembershipUser = findUserById('user-org-bianca')
  const invitedUser = findUserById('user-org-isaac')

  assert.ok(superAdmin)
  assert.ok(suspendedInternalAdmin)
  assert.ok(multiMembershipUser)
  assert.ok(invitedUser)

  assert.equal(getUserRoleSummary(superAdmin!).label, 'Super admin')
  assert.equal(getUserActivityBand(suspendedInternalAdmin!), 'watch')
  assert.deepEqual(
    getUserAccessSignals(superAdmin!).map((signal) => signal.label),
    ['Elevated access'],
  )
  assert.deepEqual(
    getUserAccessSignals(multiMembershipUser!).map((signal) => signal.label),
    ['Multi-org access'],
  )
  assert.deepEqual(
    getUserAccessSignals(invitedUser!).map((signal) => signal.label),
    ['Invite pending'],
  )
  assert.equal(getUserAccessHistory(suspendedInternalAdmin!).at(0)?.id, 'audit-1001')
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


test('access query selectors support operator-grade filtering across scope, role, status, activity, and risk', () => {
  assert.deepEqual(
    filterUsersByQuery(adminUsers, { ...DEFAULT_ACCESS_QUERY, scope: 'multi_org' }).map((user) => user.id),
    ['user-org-bianca'],
  )
  assert.deepEqual(
    filterUsersByQuery(adminUsers, { ...DEFAULT_ACCESS_QUERY, riskFlags: ['elevated_access'] }).map((user) => user.id),
    ['user-admin-rina'],
  )
  assert.deepEqual(
    filterUsersByQuery(adminUsers, { ...DEFAULT_ACCESS_QUERY, scope: 'organisation', activityBand: ['inactive'] }).map((user) => user.id),
    ['user-org-isaac', 'user-org-maya'],
  )
  assert.equal(matchesScope(adminUsers.find((user) => user.id === 'user-org-bianca')!, 'multi_org'), true)
  assert.equal(matchesActivity(adminUsers.find((user) => user.id === 'user-admin-ella')!, ['recent']), true)
  assert.equal(matchesRisk(adminUsers.find((user) => user.id === 'user-org-maya')!, ['no_recent_activity']), true)
})

test('access query selectors combine multiple filters and preserve empty states when no users match', () => {
  assert.deepEqual(
    filterUsersByQuery(adminUsers, {
      ...DEFAULT_ACCESS_QUERY,
      scope: 'internal',
      roleTypes: ['super_admin'],
      riskFlags: ['elevated_access'],
      status: ['active'],
      activityBand: ['active_now'],
    }).map((user) => user.id),
    ['user-admin-rina'],
  )
  assert.deepEqual(
    filterUsersByQuery(adminUsers, {
      ...DEFAULT_ACCESS_QUERY,
      scope: 'organisation',
      status: ['suspended'],
      riskFlags: ['multi_org'],
    }),
    [],
  )
})

test('access query search matches organisation and role context for operator questions', () => {
  assert.deepEqual(
    filterUsersByQuery(adminUsers, { ...DEFAULT_ACCESS_QUERY, search: 'northstar' }).map((user) => user.id),
    ['user-org-alex', 'user-org-bianca'],
  )
  assert.deepEqual(
    filterUsersByQuery(adminUsers, { ...DEFAULT_ACCESS_QUERY, search: 'super admin' }).map((user) => user.id),
    ['user-admin-rina'],
  )
})

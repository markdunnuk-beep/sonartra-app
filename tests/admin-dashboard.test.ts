import assert from 'node:assert/strict'
import test from 'node:test'

import { adminDashboardModel, buildAdminDashboardModel, getOrganisationSeatFootprintSummary, getReleasePublishStateSummary } from '../lib/admin/dashboard'
import { assessmentVersions, adminUsers, organisations } from '../lib/admin/domain'

test('dashboard overview metrics stay anchored to typed admin domain data', () => {
  const model = buildAdminDashboardModel()

  assert.equal(model.overviewMetrics.find((metric) => metric.label === 'Active organisations')?.value, '01')
  assert.equal(model.overviewMetrics.find((metric) => metric.label === 'Active users')?.value, '05')
  assert.equal(model.overviewMetrics.find((metric) => metric.label === 'Internal admins')?.value, '04')
  assert.equal(model.overviewMetrics.find((metric) => metric.label === 'Draft or in-progress versions')?.value, '01')
  assert.equal(model.overviewMetrics.find((metric) => metric.label === 'Pending release items')?.value, '02')
})

test('dashboard control queue surfaces validation, access, and tenant intervention signals', () => {
  const queue = adminDashboardModel.controlQueue

  assert.equal(queue.find((item) => item.id === 'awaiting-validation')?.metric, '1')
  assert.equal(queue.find((item) => item.id === 'release-prep-failures')?.metric, '1')
  assert.equal(queue.find((item) => item.id === 'tenant-health')?.metric, '2')
  assert.equal(queue.find((item) => item.id === 'access-review')?.metric, '2')
  assert.equal(queue.find((item) => item.id === 'audit-sensitive')?.metric, '3')
})

test('dashboard tenant health sorts organisations by operational flags instead of raw name order', () => {
  assert.deepEqual(
    adminDashboardModel.tenantHealth.map((tenant) => tenant.organisationName),
    ['VectorForge Industrial', 'Aurora Health Group', 'Northstar Logistics'],
  )
  assert.deepEqual(adminDashboardModel.tenantHealth[0]?.statusFlags, [
    'Suspended posture',
    'Dormant tenant activity',
    'Single-product enablement',
  ])
})

test('release publish-state summary preserves scheduled, paused, and rollback visibility', () => {
  assert.deepEqual(getReleasePublishStateSummary(assessmentVersions), {
    unpublished: 1,
    scheduled: 1,
    published: 2,
    paused: 1,
    rolled_back: 1,
  })
})

test('seat footprint summary aggregates purchased, assigned, and invited seats across tenants', () => {
  assert.deepEqual(getOrganisationSeatFootprintSummary(organisations), {
    purchased: 495,
    assigned: 315,
    invited: 28,
  })
})

test('dashboard model can be recomputed with alternative timestamps without mutating source arrays', () => {
  const snapshot = buildAdminDashboardModel({ now: new Date('2026-03-21T00:00:00Z'), users: adminUsers, tenantOrganisations: organisations })

  assert.equal(snapshot.generatedAt, '2026-03-21T00:00:00.000Z')
  assert.equal(snapshot.recentActivity[0]?.id, 'audit-1008')
  assert.equal(adminUsers[0]?.id, 'user-admin-rina')
})


test('dashboard assessment queue item routes into the canonical assessments workspace', () => {
  const assessmentQueueItem = adminDashboardModel.controlQueue.find((item) => item.id === 'awaiting-validation')

  assert.equal(assessmentQueueItem?.href, '/admin/assessments')
})

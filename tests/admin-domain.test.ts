import assert from 'node:assert/strict'
import test from 'node:test'

import {
  assessmentVersions,
  assessments,
  auditLogEvents,
  formatSeatUsageSummary,
  getAssessmentVersionCounts,
  getCurrentLiveAssessmentVersion,
  getSeatUtilisationPercent,
  getStatusLabel,
  groupAuditEventsByEntityType,
  organisations,
} from '../lib/admin/domain'

test('assessment selector keeps stable identity separate from live version lineage', () => {
  const assessment = assessments.find((item) => item.id === 'assessment-signals')

  assert.ok(assessment)
  const liveVersion = getCurrentLiveAssessmentVersion(assessment, assessmentVersions)

  assert.equal(liveVersion?.id, 'av-signals-2-1')
  assert.equal(liveVersion?.versionNumber, '2.1.0')
})

test('assessment version counts surface draft, review, live, and archived states for registry views', () => {
  const counts = getAssessmentVersionCounts('assessment-signals', assessmentVersions)

  assert.deepEqual(counts, {
    total: 3,
    draft: 0,
    in_review: 0,
    validated: 1,
    live: 1,
    archived: 1,
  })
})

test('organisation helpers format seat posture for dashboard and list surfaces', () => {
  const organisation = organisations.find((item) => item.id === 'org-northstar')

  assert.ok(organisation)
  assert.equal(formatSeatUsageSummary(organisation), '148/180 seats assigned')
  assert.equal(getSeatUtilisationPercent(organisation), 82)
})

test('audit helpers group events by entity class for timeline sidebars', () => {
  const grouped = groupAuditEventsByEntityType(auditLogEvents)

  assert.equal(grouped.release.length, 1)
  assert.equal(grouped.organisation.length, 1)
  assert.equal(grouped.membership.length, 2)
})

test('status labels stay display-ready without leaking raw enum tokens into the UI', () => {
  assert.equal(getStatusLabel('customer_success_admin'), 'Customer Success Admin')
  assert.equal(getStatusLabel('in_review'), 'In Review')
})

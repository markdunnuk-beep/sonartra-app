import assert from 'node:assert/strict'
import test from 'node:test'

import type { AssessmentResultRow } from '../lib/assessment-types'
import { reconcileIndividualLifecycle } from '../lib/server/individual-assessment-lifecycle-reconciliation'

const completeResult: AssessmentResultRow = {
  id: 'result-1',
  assessment_id: 'assessment-1',
  assessment_version_id: 'version-1',
  version_key: 'signals-v1',
  scoring_model_key: 'signals-model-v1',
  snapshot_version: 1,
  status: 'complete',
  result_payload: {
    contractVersion: 'package_contract_v2',
    materializedOutputs: {
      webSummaryOutputs: [{ id: 'summary-1', key: 'fit', title: 'Fit', label: 'Fit', status: 'available', severity: null, band: 'ready', value: { score: 90 }, explanation: { text: 'Ready' }, visibleInProduct: true }],
      integrityNotices: [],
    },
  },
  response_quality_payload: null,
  completed_at: '2026-03-24T10:00:00.000Z',
  scored_at: '2026-03-24T10:01:00.000Z',
  created_at: '2026-03-24T10:01:00.000Z',
  updated_at: '2026-03-24T10:01:00.000Z',
}

test('completed attempt + ready result + stale assignment resolves ready and requests repair', () => {
  const resolved = reconcileIndividualLifecycle({
    hasAssessment: true,
    isAssessmentEffectivelyCompleted: true,
    assessmentCompletedAt: '2026-03-24T10:00:00.000Z',
    latestAssessmentResult: completeResult,
    latestAssessmentSignalCount: 0,
    latestReadyResult: completeResult,
    assignmentStatus: 'completed_processing',
  })

  assert.equal(resolved.state, 'ready')
  assert.equal(resolved.needsAssignmentRepair, 'mark_assignment_ready')
})

test('assignment-ready without retrievable result is controlled non-ready state', () => {
  const resolved = reconcileIndividualLifecycle({
    hasAssessment: true,
    isAssessmentEffectivelyCompleted: true,
    assessmentCompletedAt: '2026-03-24T10:00:00.000Z',
    latestAssessmentResult: null,
    latestAssessmentSignalCount: 0,
    latestReadyResult: null,
    assignmentStatus: 'results_ready',
    now: new Date('2026-03-24T10:05:00.000Z'),
  })

  assert.equal(resolved.state, 'completed_processing')
  assert.equal(resolved.inconsistencyCode, 'assignment_ready_without_retrievable_result')
})

test('stale completed processing without evidence resolves failed deterministically', () => {
  const resolved = reconcileIndividualLifecycle({
    hasAssessment: true,
    isAssessmentEffectivelyCompleted: true,
    assessmentCompletedAt: '2026-03-24T09:00:00.000Z',
    latestAssessmentResult: { ...completeResult, status: 'pending', result_payload: null },
    latestAssessmentSignalCount: 0,
    latestReadyResult: null,
    assignmentStatus: 'completed_processing',
    now: new Date('2026-03-24T10:00:00.000Z'),
    staleProcessingThresholdMinutes: 30,
  })

  assert.equal(resolved.state, 'failed')
  assert.equal(resolved.needsAssignmentRepair, 'mark_assignment_failed')
})

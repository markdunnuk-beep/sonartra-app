import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAssessmentCompletionSubmissionPlan,
  resolveAssessmentCompletionClientOutcome,
} from '../lib/assessment/assessment-completion-client'

test('completion submission plan includes the current answer on the final question before submit', () => {
  const plan = buildAssessmentCompletionSubmissionPlan(
    [{ questionNumber: 1 }, { questionNumber: 2 }],
    { 1: 3, 2: 4 },
    1,
  )

  assert.equal(plan.isSubmittable, true)
  assert.equal(plan.unansweredCount, 0)
  assert.deepEqual(plan.currentQuestionSave, {
    questionNumber: 2,
    responseValue: 4,
  })
})

test('completion outcome redirects to results when scoring is ready immediately', () => {
  const outcome = resolveAssessmentCompletionClientOutcome({
    ok: true,
    status: 'ready',
    assessmentId: 'assessment-1',
    resultId: 'result-1',
  })

  assert.deepEqual(outcome, {
    redirectTo: '/individual/results/result-1',
    lifecycleState: 'ready',
    workspaceEntryState: 'results_ready',
    clearActiveAssessment: true,
    notice: null,
  })
})

test('completion outcome redirects to results while scoring is still pending', () => {
  const outcome = resolveAssessmentCompletionClientOutcome({
    ok: true,
    status: 'processing',
    assessmentId: 'assessment-1',
  })

  assert.deepEqual(outcome, {
    redirectTo: '/individual/results',
    lifecycleState: 'completed_processing',
    workspaceEntryState: 'results_processing',
    clearActiveAssessment: true,
    notice: null,
  })
})

test('completion outcome does not fallback to dashboard-style redirects', () => {
  const outcome = resolveAssessmentCompletionClientOutcome({
    ok: true,
    status: 'processing',
    assessmentId: 'assessment-1',
  })

  assert.equal(outcome.redirectTo, '/individual/results')
  assert.notEqual(outcome.redirectTo, '/dashboard')
})

test('completion outcome redirects to results and surfaces explicit failure state and warning copy', () => {
  const outcome = resolveAssessmentCompletionClientOutcome({
    ok: true,
    status: 'failed',
    assessmentId: 'assessment-1',
    failure: {
      code: 'RESULT_GENERATION_FAILED',
      message: 'Assessment was completed but result generation failed.',
    },
  })

  assert.deepEqual(outcome, {
    redirectTo: null,
    lifecycleState: 'error',
    workspaceEntryState: 'attention_required',
    clearActiveAssessment: false,
    notice: 'Assessment was completed but result generation failed.',
  })
})

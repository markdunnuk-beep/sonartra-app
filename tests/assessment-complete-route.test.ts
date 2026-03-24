import assert from 'node:assert/strict'
import test from 'node:test'

import { postCompleteAssessment } from '../lib/server/complete-assessment-route'

test('complete route preserves successful completion response when assignment lifecycle update fails', async () => {
  let readyCalls = 0

  const response = await postCompleteAssessment(new Request('http://localhost/api/assessments/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ assessmentId: 'assessment-v2-1' }),
  }), {
    resolveAuthenticatedAppUser: async () => ({
      clerkUserId: 'clerk-1',
      dbUserId: 'user-1',
      email: 'user@example.com',
    }),
    queryDb: async () => ({ rows: [{ id: 'assessment-v2-1' }] }) as never,
    completeAssessmentWithResults: async () => ({
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId: 'assessment-v2-1',
        assessmentStatus: 'completed' as const,
        resultStatus: 'succeeded' as const,
        resultId: 'result-v2-1',
      },
    }),
    markAssignmentCompletionProcessing: async () => {
      throw new Error('assessment_repository_assignments unavailable')
    },
    markAssignmentResultReady: async () => {
      readyCalls += 1
    },
    markAssignmentFailed: async () => {
      throw new Error('should not mark failed for succeeded results')
    },
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.ok, true)
  assert.equal(payload.resultStatus, 'succeeded')
  assert.equal(payload.resultId, 'result-v2-1')
  assert.equal(readyCalls, 1)
})

test('complete route returns structured failure response when completion pipeline reports failed result generation', async () => {
  let failedCalls = 0

  const response = await postCompleteAssessment(new Request('http://localhost/api/assessments/complete', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ assessmentId: 'assessment-hybrid-1' }),
  }), {
    resolveAuthenticatedAppUser: async () => ({
      clerkUserId: 'clerk-1',
      dbUserId: 'user-1',
      email: 'user@example.com',
    }),
    queryDb: async () => ({ rows: [{ id: 'assessment-hybrid-1' }] }) as never,
    completeAssessmentWithResults: async () => ({
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId: 'assessment-hybrid-1',
        assessmentStatus: 'completed' as const,
        resultStatus: 'failed' as const,
        resultId: 'result-hybrid-failed',
        warning: {
          code: 'RESULT_GENERATION_FAILED' as const,
          message: 'Assessment was completed but result generation failed.',
        },
      },
    }),
    markAssignmentCompletionProcessing: async () => {},
    markAssignmentResultReady: async () => {
      throw new Error('should not mark ready for failed results')
    },
    markAssignmentFailed: async () => {
      failedCalls += 1
    },
  })

  assert.equal(response.status, 200)
  const payload = await response.json()
  assert.equal(payload.ok, true)
  assert.equal(payload.resultStatus, 'failed')
  assert.equal(payload.warning?.code, 'RESULT_GENERATION_FAILED')
  assert.equal(failedCalls, 1)
})

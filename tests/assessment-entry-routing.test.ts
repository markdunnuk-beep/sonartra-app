import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ASSESSMENT_ENTRY_PATH,
  getAssessmentEntryRedirectTarget,
  getAssessmentEntrySignInRedirect,
  resolveAssessmentEntryRedirect,
} from '../lib/server/assessment-entry-routing'

test('assessment entry routes not_started and in_progress users to assessment', () => {
  assert.equal(getAssessmentEntryRedirectTarget('not_started'), '/assessment')
  assert.equal(getAssessmentEntryRedirectTarget('in_progress'), '/assessment')
})

test('assessment entry routes completed and non-startable states to dashboard', () => {
  assert.equal(getAssessmentEntryRedirectTarget('completed_processing'), '/dashboard')
  assert.equal(getAssessmentEntryRedirectTarget('ready'), '/dashboard')
  assert.equal(getAssessmentEntryRedirectTarget('error'), '/dashboard')
})

test('assessment entry redirects unauthenticated users to sign-in and preserves the entry route as redirect_url', async () => {
  const target = await resolveAssessmentEntryRedirect(async () => ({ authState: 'unauthenticated' }))

  assert.equal(ASSESSMENT_ENTRY_PATH, '/assessment-entry')
  assert.equal(getAssessmentEntrySignInRedirect(), '/sign-in?redirect_url=%2Fassessment-entry')
  assert.equal(target, '/sign-in?redirect_url=%2Fassessment-entry')
})

test('assessment entry uses canonical lifecycle state to choose the authenticated destination', async () => {
  const dashboardTarget = await resolveAssessmentEntryRedirect(async () => ({
    authState: 'authenticated',
    userId: 'user-1',
    lifecycle: {
      state: 'ready',
      latestAssessment: null,
      latestAssessmentResult: null,
      latestReadyResult: null,
      message: 'ready',
    },
  }))

  const assessmentTarget = await resolveAssessmentEntryRedirect(async () => ({
    authState: 'authenticated',
    userId: 'user-1',
    lifecycle: {
      state: 'in_progress',
      latestAssessment: null,
      latestAssessmentResult: null,
      latestReadyResult: null,
      message: 'resume',
    },
  }))

  assert.equal(dashboardTarget, '/dashboard')
  assert.equal(assessmentTarget, '/assessment')
})

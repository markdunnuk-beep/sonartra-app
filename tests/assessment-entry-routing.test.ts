import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ASSESSMENT_ENTRY_PATH,
  getAssessmentEntryRedirectTarget,
  getAssessmentEntrySignInRedirect,
  resolveAssessmentEntryRedirect,
  SIGNALS_ASSESSMENT_WORKSPACE_PATH,
} from '../lib/server/assessment-entry-routing'

test('assessment entry route always resolves to the canonical Signals workspace route', () => {
  assert.equal(SIGNALS_ASSESSMENT_WORKSPACE_PATH, '/assessment/workspace')
  assert.equal(getAssessmentEntryRedirectTarget(), '/assessment/workspace')
})

test('assessment entry sign-in redirect preserves the canonical workspace destination', () => {
  assert.equal(ASSESSMENT_ENTRY_PATH, '/assessment-entry')
  assert.equal(getAssessmentEntrySignInRedirect(), '/sign-in?redirect_url=%2Fassessment%2Fworkspace')
})

test('assessment entry redirect resolver bypasses lifecycle lookups and returns the canonical workspace path', async () => {
  assert.equal(await resolveAssessmentEntryRedirect(), '/assessment/workspace')
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { resolvePreferredAssessmentId } from '../lib/assessment-attempt'

test('query param assessmentId is authoritative over local storage', () => {
  assert.equal(resolvePreferredAssessmentId('assessment-query', 'assessment-local'), 'assessment-query')
})

test('falls back to local storage assessmentId when query param is missing', () => {
  assert.equal(resolvePreferredAssessmentId(null, 'assessment-local'), 'assessment-local')
})

test('returns null when neither query param nor local storage has an assessmentId', () => {
  assert.equal(resolvePreferredAssessmentId(null, null), null)
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { derivePersistedAssessmentProgress } from '../lib/server/assessment-progress'

test('derivePersistedAssessmentProgress reaches full completion at 80 responses', () => {
  const progress = derivePersistedAssessmentProgress(80, 80)

  assert.equal(progress.progressCount, 80)
  assert.equal(progress.progressPercent, 100)
})

test('derivePersistedAssessmentProgress clamps duplicate/update scenarios safely', () => {
  const progress = derivePersistedAssessmentProgress(82, 80)

  assert.equal(progress.progressCount, 80)
  assert.equal(progress.progressPercent, 100)
})

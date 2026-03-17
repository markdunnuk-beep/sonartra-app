import assert from 'node:assert/strict'
import test from 'node:test'

import { mapLifecyclePresentation } from '../lib/lifecycle-presentation'

test('presentation mapper returns in-progress copy without mutating numeric state responsibilities', () => {
  const presentation = mapLifecyclePresentation('in_progress')

  assert.equal(presentation.dashboardStatusLabel, 'In progress')
  assert.equal(presentation.dashboardActionLabel, 'Resume assessment')
})

test('not_started copy is returned only for true not_started lifecycle values', () => {
  const notStarted = mapLifecyclePresentation('not_started')
  const processing = mapLifecyclePresentation('completed_processing')

  assert.equal(notStarted.dashboardStatusLabel, 'Not started')
  assert.equal(notStarted.dashboardActionLabel, 'Start assessment')
  assert.notEqual(processing.dashboardStatusLabel, 'Not started')
})

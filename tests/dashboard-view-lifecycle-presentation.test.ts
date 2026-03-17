import assert from 'node:assert/strict'
import test from 'node:test'

import { mapLifecyclePresentation } from '../lib/lifecycle-presentation'

test('not_started lifecycle maps to start-assessment dashboard detail copy and CTA', () => {
  const presentation = mapLifecyclePresentation('not_started')

  assert.equal(presentation.dashboardStatusLabel, 'Not started')
  assert.equal(presentation.dashboardDetailTitle, 'Assessment not started')
  assert.equal(presentation.dashboardDetailBody, 'Complete the assessment to unlock Individual Results.')
  assert.equal(presentation.dashboardActionLabel, 'Start assessment')
  assert.equal(presentation.dashboardActionHref, '/assessment')
})

test('in_progress lifecycle maps to resume-assessment dashboard detail copy and CTA', () => {
  const presentation = mapLifecyclePresentation('in_progress')

  assert.equal(presentation.dashboardStatusLabel, 'In progress')
  assert.equal(presentation.dashboardDetailTitle, 'Assessment in progress')
  assert.equal(presentation.dashboardDetailBody, 'Continue the assessment to complete your profile.')
  assert.equal(presentation.dashboardActionLabel, 'Resume assessment')
  assert.equal(presentation.dashboardActionHref, '/assessment')
})

test('completed_processing lifecycle maps to completed detail copy and does not expose resume CTA', () => {
  const presentation = mapLifecyclePresentation('completed_processing')

  assert.equal(presentation.dashboardStatusLabel, 'Completed — results pending')
  assert.equal(presentation.dashboardDetailTitle, 'Assessment completed')
  assert.equal(presentation.dashboardDetailBody, 'Results are being processed and will be available shortly.')
  assert.equal(presentation.dashboardDetailFootnote, 'Results are being processed and will be available shortly.')
  assert.notEqual(presentation.dashboardDetailFootnote, 'Check back shortly while Individual Results are prepared from your completed responses.')
  assert.equal(presentation.dashboardActionLabel, null)
  assert.equal(presentation.dashboardActionHref, null)
})

test('ready lifecycle maps to results-available detail copy and Individual Results CTA', () => {
  const presentation = mapLifecyclePresentation('ready')

  assert.equal(presentation.dashboardStatusLabel, 'Results available')
  assert.equal(presentation.dashboardDetailTitle, 'Results available')
  assert.equal(presentation.dashboardDetailBody, 'Your latest completed profile is ready to view.')
  assert.equal(presentation.dashboardActionLabel, 'View Individual Results')
  assert.equal(presentation.dashboardActionHref, '/results/individual')
})

test('error lifecycle maps to safe fallback copy and safe CTA', () => {
  const presentation = mapLifecyclePresentation('error')

  assert.equal(presentation.dashboardStatusLabel, 'Results unavailable')
  assert.equal(presentation.dashboardDetailTitle, 'Results unavailable')
  assert.equal(presentation.dashboardDetailBody, 'The assessment completed, but results could not be loaded.')
  assert.equal(presentation.dashboardActionLabel, 'Return to dashboard')
  assert.equal(presentation.dashboardActionHref, '/dashboard')
})

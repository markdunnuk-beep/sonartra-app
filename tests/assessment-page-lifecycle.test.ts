import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import { mapLifecyclePresentation } from '../lib/lifecycle-presentation'

test('assessment page shows begin state for not_started', () => {
  const presentation = mapLifecyclePresentation('not_started')

  assert.equal(presentation.assessmentTitle, 'Begin your signal capture session')
  assert.equal(presentation.assessmentPrimaryActionLabel, 'Begin Assessment')
  assert.equal(presentation.assessmentSecondaryActionHref, '/dashboard')
})

test('assessment page shows resume state for in_progress', () => {
  const presentation = mapLifecyclePresentation('in_progress')

  assert.equal(presentation.assessmentTitle, 'Resume your signal capture session')
  assert.equal(presentation.assessmentPrimaryActionLabel, 'Resume Assessment')
})

test('assessment page shows completed-processing state for completed_processing', () => {
  const presentation = mapLifecyclePresentation('completed_processing')

  assert.equal(presentation.assessmentTitle, 'Assessment complete')
  assert.equal(presentation.assessmentBody, 'Results are processing and will be available shortly.')
  assert.equal(presentation.assessmentPrimaryActionLabel, 'Return to Dashboard')
})

test('assessment page shows completed-ready state for ready', () => {
  const presentation = mapLifecyclePresentation('ready')

  assert.equal(presentation.assessmentTitle, 'Assessment complete')
  assert.equal(presentation.assessmentBody, 'Your latest behavioural signal capture is complete.')
  assert.equal(presentation.assessmentPrimaryActionLabel, 'View Results')
  assert.equal(presentation.assessmentSecondaryActionLabel, 'Return to Dashboard')
})

test('completed users never render begin assessment CTA in shared presentation', () => {
  const readyPresentation = mapLifecyclePresentation('ready')
  const processingPresentation = mapLifecyclePresentation('completed_processing')

  assert.notEqual(readyPresentation.assessmentPrimaryActionLabel, 'Begin Assessment')
  assert.notEqual(processingPresentation.assessmentPrimaryActionLabel, 'Begin Assessment')
})

test('dashboard and assessment presentation share the same lifecycle mapper semantics', async () => {
  const [assessmentSource, dashboardSource] = await Promise.all([
    readFile(new URL('../app/assessment/workspace/AssessmentWorkspaceClient.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/dashboard/DashboardPageView.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(assessmentSource, /mapLifecyclePresentation/)
  assert.match(dashboardSource, /mapLifecyclePresentation/)

  const readyPresentation = mapLifecyclePresentation('ready')
  const processingPresentation = mapLifecyclePresentation('completed_processing')

  assert.equal(readyPresentation.dashboardActionHref, '/results/individual')
  assert.equal(readyPresentation.assessmentPrimaryActionHref, '/results/individual')
  assert.equal(processingPresentation.dashboardDetailBody, processingPresentation.assessmentBody)
})

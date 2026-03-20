import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AssessmentLifecycleCard } from '../app/assessment/workspace/AssessmentWorkspaceClient'
import { AssessmentWorkspaceFramingPanel } from '../components/assessment/AssessmentWorkspaceFramingPanel'
import {
  deriveAssessmentWorkspaceFraming,
  deriveAssessmentWorkspaceRecommendationCue,
  resolveAssessmentWorkspaceEntryState,
} from '../lib/assessment/assessment-workspace-framing'

test('workspace framing derives configured baseline context for the Signals start state', () => {
  const framing = deriveAssessmentWorkspaceFraming('signals', 'start')

  assert.equal(framing.title, 'Sonartra Signals Assessment')
  assert.equal(framing.classification, 'Individual baseline diagnostic')
  assert.equal(framing.currentActionLabel, 'Start')
  assert.match(framing.currentActionDetail, /baseline diagnostic/i)
  assert.match(framing.outputExpectation, /interpreted individual signal profile/i)
  assert.match(framing.whyItMatters, /baseline behavioural reference profile/i)
  assert.deepEqual(framing.measurementFocus, ['Behaviour style', 'Leadership execution', 'Conflict response', 'Stress patterning'])
})

test('workspace framing adapts the current action context for resume and results-ready states', () => {
  const resumeFraming = deriveAssessmentWorkspaceFraming('signals', 'resume')
  const resultsFraming = deriveAssessmentWorkspaceFraming('signals', 'results_ready')

  assert.equal(resumeFraming.currentActionLabel, 'Resume')
  assert.match(resumeFraming.currentActionDetail, /latest autosaved position/i)
  assert.equal(resultsFraming.currentActionLabel, 'View Results')
  assert.match(resultsFraming.currentActionDetail, /ready to review/i)
})

test('workspace framing falls back safely when bespoke framing metadata is missing', () => {
  const framing = deriveAssessmentWorkspaceFraming('leadership-effectiveness', 'start')

  assert.equal(framing.title, 'Leadership Effectiveness')
  assert.equal(framing.classification, 'Individual diagnostic')
  assert.match(framing.subtitle, /Assess day-to-day leadership execution/i)
  assert.match(framing.whyItMatters, /Evaluate how leadership intent translates into execution rhythm/i)
  assert.deepEqual(framing.measurementFocus, ['Delegation', 'Feedback quality', 'Execution discipline', 'Decision follow-through'])
})

test('workspace framing exposes a subtle recommendation cue only when the current assessment matches repository guidance', () => {
  const recommendationCue = deriveAssessmentWorkspaceRecommendationCue('signals', {
    kind: 'launch_baseline',
    eyebrow: 'Recommended next action',
    title: 'Start Sonartra Signals',
    rationale: 'Baseline first.',
    cta: { label: 'Start Assessment', href: '/assessment/workspace', action: 'launch' },
    metadata: ['Individual diagnostic', '10 min', 'Not Started'],
    itemId: 'signals',
  })

  const unrelatedCue = deriveAssessmentWorkspaceRecommendationCue('signals', {
    kind: 'resume_in_progress',
    eyebrow: 'Recommended next action',
    title: 'Continue Burnout Risk',
    rationale: 'Resume the active attempt.',
    cta: { label: 'Resume Assessment', href: '#', action: 'resume' },
    metadata: ['Individual diagnostic', '42% complete', '8 min'],
    itemId: 'burnout-risk',
  })

  assert.deepEqual(recommendationCue, {
    eyebrow: 'Recommended next diagnostic',
    detail: 'Repository sequencing treats this assessment as the next baseline step.',
  })
  assert.equal(unrelatedCue, null)
})

test('workspace framing panel renders the operational briefing surface for assessment entry', () => {
  const html = renderToStaticMarkup(
    <AssessmentWorkspaceFramingPanel
      framing={deriveAssessmentWorkspaceFraming('signals', 'resume', {
        kind: 'launch_baseline',
        eyebrow: 'Recommended next action',
        title: 'Start Sonartra Signals',
        rationale: 'Baseline first.',
        cta: { label: 'Start Assessment', href: '/assessment/workspace', action: 'launch' },
        metadata: ['Individual diagnostic', '10 min', 'Not Started'],
        itemId: 'signals',
      })}
    />,
  )

  assert.match(html, /Sonartra Signals Assessment/)
  assert.match(html, /Behavioural baseline diagnostic/)
  assert.match(html, /Current state/)
  assert.match(html, /Resume/)
  assert.match(html, /Expected time/)
  assert.match(html, /Question set/)
  assert.match(html, /Why it matters/)
  assert.match(html, /What to do now/)
  assert.match(html, /Recommended next diagnostic/)
})

test('lifecycle card renders as a continuation of the workspace briefing system', () => {
  const html = renderToStaticMarkup(
    <AssessmentLifecycleCard lifecycleState="ready" startError={null} loading={false} onPrimaryAction={() => undefined} />,
  )

  assert.match(html, /Assessment complete/)
  assert.match(html, /Results available/)
  assert.match(html, /Next step/)
  assert.match(html, /Open Individual Results to review your latest behavioural, leadership, and operating signal profile\./)
  assert.match(html, /View Results/)
  assert.match(html, /Return to Dashboard/)
})

test('lifecycle state mapping keeps workspace framing aligned with shared entry semantics', () => {
  assert.equal(resolveAssessmentWorkspaceEntryState('not_started'), 'start')
  assert.equal(resolveAssessmentWorkspaceEntryState('in_progress'), 'resume')
  assert.equal(resolveAssessmentWorkspaceEntryState('ready'), 'results_ready')
  assert.equal(resolveAssessmentWorkspaceEntryState('completed_processing'), 'results_processing')
  assert.equal(resolveAssessmentWorkspaceEntryState('error'), 'attention_required')
})

test('workspace client integrates the shared framing panel without altering the canonical workspace route model', async () => {
  const [workspaceClientSource, workspacePageSource, routingSource] = await Promise.all([
    readFile(new URL('../app/assessment/workspace/AssessmentWorkspaceClient.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/assessment/workspace/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../lib/server/assessment-entry-routing.ts', import.meta.url), 'utf8'),
  ])

  assert.match(workspaceClientSource, /AssessmentWorkspaceFramingPanel/)
  assert.match(workspaceClientSource, /deriveAssessmentWorkspaceFraming/)
  assert.match(workspaceClientSource, /Assessment Workspace/)
  assert.match(workspacePageSource, /canonicalAssessmentId/)
  assert.match(routingSource, /SIGNALS_ASSESSMENT_WORKSPACE_PATH = '\/assessment\/workspace'/)
})

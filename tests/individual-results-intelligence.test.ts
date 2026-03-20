import assert from 'node:assert/strict'
import test from 'node:test'

import { getAssessmentRepositoryInventory } from '../lib/assessment/assessment-repository-selectors'
import { deriveIndividualResultsIntelligence } from '../lib/results/individual-results-intelligence'
import type { IndividualResultReadyData } from '../lib/server/individual-results'

function makeReadyData(overrides: Partial<IndividualResultReadyData> = {}): IndividualResultReadyData {
  return {
    assessment: {
      assessmentId: 'assessment-1',
      versionKey: 'wplp80-v1',
      startedAt: '2026-01-01T10:00:00.000Z',
      completedAt: '2026-01-01T10:05:00.000Z',
    },
    snapshot: {
      resultId: 'result-1',
      status: 'complete',
      scoringModelKey: 'wplp80-signal-model-v1',
      snapshotVersion: 1,
      scoredAt: '2026-01-01T10:06:00.000Z',
      createdAt: '2026-01-01T10:06:01.000Z',
      updatedAt: '2026-01-01T10:06:01.000Z',
    },
    layers: [
      { layerKey: 'behaviour_style', totalRawValue: 22, signalCount: 6, primarySignalKey: 'Core_Driver', secondarySignalKey: 'Core_Analyst', rankedSignalKeys: ['Core_Driver', 'Core_Analyst'] },
      { layerKey: 'motivators', totalRawValue: 12, signalCount: 8, primarySignalKey: 'Mot_Mastery', secondarySignalKey: 'Mot_Achievement', rankedSignalKeys: ['Mot_Mastery', 'Mot_Achievement'] },
      { layerKey: 'leadership', totalRawValue: 18, signalCount: 6, primarySignalKey: 'Leader_Results', secondarySignalKey: 'Leader_Process', rankedSignalKeys: ['Leader_Results', 'Leader_Process'] },
      { layerKey: 'conflict', totalRawValue: 11, signalCount: 5, primarySignalKey: 'Conflict_Compete', secondarySignalKey: 'Conflict_Collaborate', rankedSignalKeys: ['Conflict_Compete', 'Conflict_Collaborate'] },
      { layerKey: 'culture', totalRawValue: 10, signalCount: 4, primarySignalKey: 'Culture_Market', secondarySignalKey: 'Culture_Clan', rankedSignalKeys: ['Culture_Market', 'Culture_Clan'] },
      { layerKey: 'risk', totalRawValue: 9, signalCount: 8, primarySignalKey: 'Stress_Control', secondarySignalKey: 'Decision_Evidence', rankedSignalKeys: ['Stress_Control', 'Decision_Evidence'] },
    ],
    signals: [],
    summaryJson: null,
    ...overrides,
  }
}

function makeSeed() {
  return {
    assessmentTitle: 'Sonartra Signals',
    assessmentSummary: 'Strategic Operator with Insight Explorer as the supporting pattern.',
    completedLabel: '01 Jan 2026',
    archetypeLabel: 'Strategic Operator',
    domainsAvailable: 6,
  }
}

test('results intelligence prioritises resuming another in-progress assessment before launching a new follow-on', () => {
  const intelligence = deriveIndividualResultsIntelligence(makeReadyData(), makeSeed(), getAssessmentRepositoryInventory())

  assert.equal(intelligence.summaryHeadline, 'Baseline profile completed and ready to use')
  assert.equal(intelligence.action.kind, 'resume_in_progress')
  assert.equal(intelligence.action.title, 'Resume Burnout Risk')
  assert.equal(intelligence.action.cta?.label, 'Resume Assessment')
  assert.equal(intelligence.action.cta?.href, '#')
})

test('results intelligence recommends the strongest live individual follow-on when no active attempt outranks it', () => {
  const inventory = getAssessmentRepositoryInventory().map((item) =>
    item.id === 'burnout-risk'
      ? { ...item, status: 'not_started' as const, progressPercent: 0, startedAt: null, lastSavedAt: null }
      : item,
  )

  const intelligence = deriveIndividualResultsIntelligence(makeReadyData(), makeSeed(), inventory)

  assert.equal(intelligence.action.kind, 'launch_individual_follow_up')
  assert.equal(intelligence.action.title, 'Deepen leadership execution with Leadership Effectiveness')
  assert.equal(intelligence.action.cta?.label, 'Start Assessment')
  assert.equal(intelligence.action.cta?.href, '#')
  assert.match(intelligence.action.rationale, /Leadership signal weight is strongest/i)
})

test('results intelligence excludes release-pending items from the primary recommendation and falls through to live team expansion', () => {
  const inventory = getAssessmentRepositoryInventory()
    .map((item) =>
      item.id === 'burnout-risk'
        ? { ...item, status: 'not_started' as const, progressPercent: 0, startedAt: null, lastSavedAt: null }
        : item,
    )
    .map((item) => (item.category === 'individual' && item.id !== 'signals' ? { ...item, assessmentHref: undefined } : item))

  const intelligence = deriveIndividualResultsIntelligence(makeReadyData(), makeSeed(), inventory)

  assert.equal(intelligence.action.kind, 'launch_team_follow_up')
  assert.equal(intelligence.action.title, 'Extend this baseline into Team Dynamics')
  assert.equal(intelligence.action.cta?.label, 'Launch Assessment')
  assert.equal(intelligence.action.cta?.href, '#')
  assert.doesNotMatch(intelligence.action.title, /Decision Profile/)
})

test('results intelligence keeps safe defaults when result context is partial', () => {
  const intelligence = deriveIndividualResultsIntelligence(
    makeReadyData({ layers: [] }),
    {
      assessmentTitle: 'Sonartra Signals',
      completedLabel: '01 Jan 2026',
      domainsAvailable: 0,
    },
    [],
  )

  assert.equal(intelligence.summaryHeadline, 'Baseline profile completed and ready to use')
  assert.match(intelligence.summaryOverview, /completed result is now available/i)
  assert.equal(intelligence.action.kind, 'none')
  assert.equal(intelligence.metadata[1], '0 interpreted domains')
})

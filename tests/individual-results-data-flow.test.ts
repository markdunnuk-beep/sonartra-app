import assert from 'node:assert/strict'
import test from 'node:test'

import { buildReadyIndividualResultViewModel } from '../components/results/IndividualIntelligenceResultView'
import type { IndividualResultReadyData } from '../lib/server/individual-results'

function makeReadyData(): IndividualResultReadyData {
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
      { layerKey: 'behaviour_style', totalRawValue: 22, signalCount: 2, primarySignalKey: 'Core_Driver', secondarySignalKey: 'Core_Analyst', rankedSignalKeys: ['Core_Driver', 'Core_Analyst'] },
      { layerKey: 'motivators', totalRawValue: 12, signalCount: 2, primarySignalKey: 'Mot_Mastery', secondarySignalKey: 'Mot_Achievement', rankedSignalKeys: ['Mot_Mastery', 'Mot_Achievement'] },
      { layerKey: 'leadership', totalRawValue: 10, signalCount: 2, primarySignalKey: 'Leader_Results', secondarySignalKey: 'Leader_Process', rankedSignalKeys: ['Leader_Results', 'Leader_Process'] },
      { layerKey: 'conflict', totalRawValue: 10, signalCount: 2, primarySignalKey: 'Conflict_Compete', secondarySignalKey: 'Conflict_Collaborate', rankedSignalKeys: ['Conflict_Compete', 'Conflict_Collaborate'] },
      { layerKey: 'culture', totalRawValue: 10, signalCount: 2, primarySignalKey: 'Culture_Market', secondarySignalKey: 'Culture_Clan', rankedSignalKeys: ['Culture_Market', 'Culture_Clan'] },
      { layerKey: 'risk', totalRawValue: 10, signalCount: 2, primarySignalKey: 'Stress_Control', secondarySignalKey: 'Decision_Evidence', rankedSignalKeys: ['Stress_Control', 'Decision_Evidence'] },
    ],
    signals: [
      { layerKey: 'behaviour_style', signalKey: 'Core_Driver', signalTotal: 11, normalisedScore: 0.55, relativeShare: 0.52, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'behaviour_style', signalKey: 'Core_Analyst', signalTotal: 10, normalisedScore: 0.5, relativeShare: 0.48, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'motivators', signalKey: 'Mot_Mastery', signalTotal: 7, normalisedScore: 0.7, relativeShare: 0.58, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'motivators', signalKey: 'Mot_Achievement', signalTotal: 5, normalisedScore: 0.5, relativeShare: 0.42, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'leadership', signalKey: 'Leader_Results', signalTotal: 6, normalisedScore: 0.6, relativeShare: 0.6, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'leadership', signalKey: 'Leader_Process', signalTotal: 4, normalisedScore: 0.4, relativeShare: 0.4, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'conflict', signalKey: 'Conflict_Compete', signalTotal: 6, normalisedScore: 0.6, relativeShare: 0.6, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'conflict', signalKey: 'Conflict_Collaborate', signalTotal: 4, normalisedScore: 0.4, relativeShare: 0.4, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'culture', signalKey: 'Culture_Market', signalTotal: 6, normalisedScore: 0.6, relativeShare: 0.6, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'culture', signalKey: 'Culture_Clan', signalTotal: 4, normalisedScore: 0.4, relativeShare: 0.4, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'risk', signalKey: 'Stress_Control', signalTotal: 6, normalisedScore: 0.6, relativeShare: 0.6, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'risk', signalKey: 'Decision_Evidence', signalTotal: 4, normalisedScore: 0.4, relativeShare: 0.4, rank: 2, isPrimary: false, isSecondary: true },
    ],
    summaryJson: null,
  }
}

test('ready individual results view model builds the production assessment card stack and fixed section order', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(makeReadyData(), 'Mark')
  const assessment = readyViewModel.presentation.assessments[0]

  assert.equal(readyViewModel.presentation.title, 'Sonartra Signals — Individual Results')
  assert.equal(readyViewModel.presentation.assessments.length, 1)
  assert.equal(assessment.defaultExpanded, true)
  assert.equal(assessment.title, 'Sonartra Signals')
  assert.deepEqual(
    assessment.howToUse.sections,
    ['Behaviour Style', 'Motivators', 'Leadership', 'Conflict', 'Culture', 'Stress'],
  )
  assert.deepEqual(
    assessment.domains.map((section) => section.title),
    ['Behaviour Style', 'Motivators', 'Leadership', 'Conflict', 'Culture', 'Stress'],
  )
})

test('presentation model keeps archetype overview limited to primary and secondary and uses concise card content', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(makeReadyData(), 'Mark')
  const assessment = readyViewModel.presentation.assessments[0]

  assert.equal(assessment.archetype.summary?.primaryLabel, 'Strategic Operator')
  assert.equal(assessment.archetype.summary?.secondaryLabel, 'Insight Explorer')
  assert.equal(assessment.archetype.strengths.length, 3)
  assert.equal(assessment.archetype.watchouts.length, 3)
  assert.equal(assessment.archetype.focusAreas.length, 3)
})

test('presentation model maps live domain distributions into visible percentage bars', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(makeReadyData(), 'Mark')
  const [behaviour, motivators, leadership, conflict, culture, stress] = readyViewModel.presentation.assessments[0].domains

  assert.deepEqual(behaviour.bars, [
    { label: 'Driver', value: 52 },
    { label: 'Analyst', value: 48 },
  ])
  assert.deepEqual(motivators.bars, [
    { label: 'Mastery', value: 58 },
    { label: 'Achievement', value: 42 },
  ])
  assert.equal(leadership.primaryProfile, 'Primary profile: Results – Process')
  assert.equal(conflict.primaryProfile, 'Primary profile: Compete – Collaborate')
  assert.equal(culture.primaryProfile, 'Primary profile: Performance – Collaboration')
  assert.equal(stress.primaryProfile, 'Primary profile: Control – Support')
})

test('presentation model handles optional data safely without inventing missing domain content', () => {
  const data = makeReadyData()
  data.layers = data.layers.filter((layer) => layer.layerKey !== 'culture')
  data.signals = data.signals.filter((signal) => signal.layerKey !== 'culture')

  const readyViewModel = buildReadyIndividualResultViewModel(data, 'Mark')
  const culture = readyViewModel.presentation.assessments[0].domains.find((section) => section.key === 'culture')

  assert.ok(culture)
  assert.equal(culture?.primaryProfile, 'Profile currently unavailable')
  assert.equal(culture?.strengths[0], 'No domain strengths are available yet.')
  assert.equal(culture?.watchouts[0], 'No domain watchouts are available yet.')
  assert.deepEqual(culture?.bars, [])
})

test('performance implications are mapped from the live interpretation synthesis layer', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(makeReadyData(), 'Mark')
  const performanceImplications = readyViewModel.presentation.assessments[0].performanceImplications

  assert.equal(performanceImplications.performsBest.length, 3)
  assert.equal(performanceImplications.risks.length, 3)
  assert.equal(performanceImplications.focus.length, 3)
  assert.match(performanceImplications.focus[0], /outcome priorities|good enough/i)
})

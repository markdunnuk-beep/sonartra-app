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
      { layerKey: 'behaviour_style', totalRawValue: 22, signalCount: 6, primarySignalKey: 'Core_Driver', secondarySignalKey: 'Core_Analyst', rankedSignalKeys: ['Core_Driver', 'Core_Analyst', 'Core_Influencer', 'Core_Stabiliser'] },
      { layerKey: 'motivators', totalRawValue: 12, signalCount: 8, primarySignalKey: 'Mot_Mastery', secondarySignalKey: 'Mot_Achievement', rankedSignalKeys: ['Mot_Mastery', 'Mot_Achievement', 'Mot_Influence', 'Mot_Stability'] },
      { layerKey: 'leadership', totalRawValue: 10, signalCount: 6, primarySignalKey: 'Leader_Results', secondarySignalKey: 'Leader_Process', rankedSignalKeys: ['Leader_Results', 'Leader_Process', 'Leader_Vision', 'Leader_People'] },
      { layerKey: 'conflict', totalRawValue: 10, signalCount: 5, primarySignalKey: 'Conflict_Compete', secondarySignalKey: 'Conflict_Collaborate', rankedSignalKeys: ['Conflict_Compete', 'Conflict_Collaborate', 'Conflict_Compromise', 'Conflict_Avoid', 'Conflict_Accommodate'] },
      { layerKey: 'culture', totalRawValue: 10, signalCount: 4, primarySignalKey: 'Culture_Market', secondarySignalKey: 'Culture_Clan', rankedSignalKeys: ['Culture_Market', 'Culture_Clan', 'Culture_Hierarchy', 'Culture_Adhocracy'] },
      { layerKey: 'risk', totalRawValue: 10, signalCount: 8, primarySignalKey: 'Stress_Control', secondarySignalKey: 'Decision_Evidence', rankedSignalKeys: ['Stress_Control', 'Decision_Evidence', 'Stress_Criticality', 'Stress_Avoidance'] },
    ],
    signals: [
      { layerKey: 'behaviour_style', signalKey: 'Core_Driver', signalTotal: 11, normalisedScore: 0.21, relativeShare: 0.21, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'behaviour_style', signalKey: 'Style_Driver', signalTotal: 9, normalisedScore: 0.14, relativeShare: 0.14, rank: 3, isPrimary: false, isSecondary: false },
      { layerKey: 'behaviour_style', signalKey: 'Core_Analyst', signalTotal: 10, normalisedScore: 0.26, relativeShare: 0.26, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'behaviour_style', signalKey: 'Contribution_Connect', signalTotal: 8, normalisedScore: 0.23, relativeShare: 0.23, rank: 4, isPrimary: false, isSecondary: false },
      { layerKey: 'behaviour_style', signalKey: 'Core_Stabiliser', signalTotal: 7, normalisedScore: 0.16, relativeShare: 0.16, rank: 5, isPrimary: false, isSecondary: false },

      { layerKey: 'motivators', signalKey: 'Mot_Mastery', signalTotal: 7, normalisedScore: 0.24, relativeShare: 0.24, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'motivators', signalKey: 'Need_Competence', signalTotal: 5, normalisedScore: 0.08, relativeShare: 0.08, rank: 5, isPrimary: false, isSecondary: false },
      { layerKey: 'motivators', signalKey: 'Mot_Achievement', signalTotal: 5, normalisedScore: 0.2, relativeShare: 0.2, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'motivators', signalKey: 'Need_Authority', signalTotal: 4, normalisedScore: 0.1, relativeShare: 0.1, rank: 4, isPrimary: false, isSecondary: false },
      { layerKey: 'motivators', signalKey: 'Mot_Influence', signalTotal: 4, normalisedScore: 0.16, relativeShare: 0.16, rank: 3, isPrimary: false, isSecondary: false },
      { layerKey: 'motivators', signalKey: 'Need_Influence', signalTotal: 3, normalisedScore: 0.06, relativeShare: 0.06, rank: 6, isPrimary: false, isSecondary: false },
      { layerKey: 'motivators', signalKey: 'Mot_Stability', signalTotal: 2, normalisedScore: 0.09, relativeShare: 0.09, rank: 7, isPrimary: false, isSecondary: false },
      { layerKey: 'motivators', signalKey: 'Need_Belonging', signalTotal: 1, normalisedScore: 0.07, relativeShare: 0.07, rank: 8, isPrimary: false, isSecondary: false },

      { layerKey: 'leadership', signalKey: 'Leader_Results', signalTotal: 6, normalisedScore: 0.24, relativeShare: 0.24, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'leadership', signalKey: 'Integrity_Driver', signalTotal: 5, normalisedScore: 0.12, relativeShare: 0.12, rank: 5, isPrimary: false, isSecondary: false },
      { layerKey: 'leadership', signalKey: 'Leader_Vision', signalTotal: 5, normalisedScore: 0.2, relativeShare: 0.2, rank: 3, isPrimary: false, isSecondary: false },
      { layerKey: 'leadership', signalKey: 'Integrity_Influencer', signalTotal: 4, normalisedScore: 0.06, relativeShare: 0.06, rank: 6, isPrimary: false, isSecondary: false },
      { layerKey: 'leadership', signalKey: 'Leader_People', signalTotal: 4, normalisedScore: 0.18, relativeShare: 0.18, rank: 4, isPrimary: false, isSecondary: false },
      { layerKey: 'leadership', signalKey: 'Leader_Process', signalTotal: 4, normalisedScore: 0.2, relativeShare: 0.2, rank: 2, isPrimary: false, isSecondary: true },

      { layerKey: 'conflict', signalKey: 'Conflict_Compete', signalTotal: 6, normalisedScore: 0.32, relativeShare: 0.32, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'conflict', signalKey: 'Conflict_Collaborate', signalTotal: 4, normalisedScore: 0.24, relativeShare: 0.24, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'conflict', signalKey: 'Conflict_Compromise', signalTotal: 3, normalisedScore: 0.18, relativeShare: 0.18, rank: 3, isPrimary: false, isSecondary: false },
      { layerKey: 'conflict', signalKey: 'Conflict_Avoid', signalTotal: 2, normalisedScore: 0.16, relativeShare: 0.16, rank: 4, isPrimary: false, isSecondary: false },
      { layerKey: 'conflict', signalKey: 'Conflict_Accommodate', signalTotal: 1, normalisedScore: 0.1, relativeShare: 0.1, rank: 5, isPrimary: false, isSecondary: false },

      { layerKey: 'culture', signalKey: 'Culture_Market', signalTotal: 6, normalisedScore: 0.31, relativeShare: 0.31, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'culture', signalKey: 'Culture_Clan', signalTotal: 4, normalisedScore: 0.27, relativeShare: 0.27, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'culture', signalKey: 'Culture_Hierarchy', signalTotal: 3, normalisedScore: 0.24, relativeShare: 0.24, rank: 3, isPrimary: false, isSecondary: false },
      { layerKey: 'culture', signalKey: 'Culture_Adhocracy', signalTotal: 2, normalisedScore: 0.18, relativeShare: 0.18, rank: 4, isPrimary: false, isSecondary: false },

      { layerKey: 'risk', signalKey: 'Stress_Control', signalTotal: 6, normalisedScore: 0.21, relativeShare: 0.21, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'risk', signalKey: 'Decision_Evidence', signalTotal: 4, normalisedScore: 0.14, relativeShare: 0.14, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'risk', signalKey: 'Stress_Criticality', signalTotal: 4, normalisedScore: 0.18, relativeShare: 0.18, rank: 3, isPrimary: false, isSecondary: false },
      { layerKey: 'risk', signalKey: 'Decision_Opportunity', signalTotal: 3, normalisedScore: 0.07, relativeShare: 0.07, rank: 4, isPrimary: false, isSecondary: false },
      { layerKey: 'risk', signalKey: 'Stress_Avoidance', signalTotal: 3, normalisedScore: 0.16, relativeShare: 0.16, rank: 5, isPrimary: false, isSecondary: false },
      { layerKey: 'risk', signalKey: 'Stress_Scatter', signalTotal: 2, normalisedScore: 0.09, relativeShare: 0.09, rank: 6, isPrimary: false, isSecondary: false },
      { layerKey: 'risk', signalKey: 'Decision_Stability', signalTotal: 2, normalisedScore: 0.1, relativeShare: 0.1, rank: 7, isPrimary: false, isSecondary: false },
      { layerKey: 'risk', signalKey: 'Decision_Social', signalTotal: 1, normalisedScore: 0.05, relativeShare: 0.05, rank: 8, isPrimary: false, isSecondary: false },
    ],
    summaryJson: null,
  }
}

test('ready individual results view model builds the production assessment card stack and fixed section order', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(makeReadyData(), 'Mark')
  const assessment = readyViewModel.presentation.assessments[0]

  assert.equal(readyViewModel.presentation.title, 'Sonartra Signals — Individual Results')
  assert.equal(readyViewModel.presentation.intelligence.summaryHeadline, 'Baseline profile ready')
  assert.match(readyViewModel.presentation.intelligence.summaryOverview, /Strategic Operator supported by Insight Explorer/i)
  assert.equal(readyViewModel.presentation.intelligence.action.kind, 'resume_in_progress')
  assert.equal(readyViewModel.presentation.intelligence.action.cta?.label, 'Resume diagnostic')
  assert.equal(readyViewModel.presentation.intelligence.action.cta?.href, '#')
  assert.equal(readyViewModel.presentation.assessments.length, 1)
  assert.equal(assessment.defaultExpanded, false)
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

test('presentation model maps live domain distributions into visible percentage bars sorted descending after normalisation', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(makeReadyData(), 'Mark')
  const [behaviour, motivators, leadership, conflict, culture, stress] = readyViewModel.presentation.assessments[0].domains

  assert.deepEqual(behaviour.bars, [
    { label: 'Driver', value: 35 },
    { label: 'Analyst', value: 26 },
    { label: 'Influencer', value: 23 },
    { label: 'Stabiliser', value: 16 },
  ])
  assert.deepEqual(motivators.bars, [
    { label: 'Mastery', value: 32 },
    { label: 'Achievement', value: 30 },
    { label: 'Influence', value: 22 },
    { label: 'Stability', value: 16 },
  ])
  assert.deepEqual(leadership.bars, [
    { label: 'Results', value: 36 },
    { label: 'Vision', value: 26 },
    { label: 'Process', value: 20 },
    { label: 'People', value: 18 },
  ])
  assert.deepEqual(conflict.bars, [
    { label: 'Compete', value: 32 },
    { label: 'Collaborate', value: 24 },
    { label: 'Compromise', value: 18 },
    { label: 'Avoid', value: 16 },
    { label: 'Accommodate', value: 10 },
  ])
  assert.deepEqual(culture.bars, [
    { label: 'Performance', value: 31 },
    { label: 'Collaboration', value: 27 },
    { label: 'Control', value: 24 },
    { label: 'Innovation', value: 18 },
  ])
  assert.deepEqual(stress.bars, [
    { label: 'Control', value: 35 },
    { label: 'Overdrive', value: 25 },
    { label: 'Withdraw', value: 25 },
    { label: 'Support', value: 15 },
  ])

  for (const distribution of [behaviour.bars, motivators.bars, leadership.bars, conflict.bars, culture.bars, stress.bars]) {
    const sorted = [...distribution].sort((a, b) => b.value - a.value)
    assert.deepEqual(distribution, sorted)

    const total = distribution.reduce((sum, d) => sum + d.value, 0)
    assert.equal(total, 100)
  }

  assert.equal(leadership.primaryProfile, 'Primary profile: Results – Process')
  assert.equal(conflict.primaryProfile, 'Primary profile: Compete – Collaborate')
  assert.equal(culture.primaryProfile, 'Primary profile: Performance – Collaboration')
  assert.equal(stress.primaryProfile, 'Primary profile: Control – Overdrive')
})

test('presentation model exposes only canonical domain rows and each displayed domain totals 100%', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(makeReadyData(), 'Mark')
  const expectedRowCounts = {
    behaviour: 4,
    motivators: 4,
    leadership: 4,
    conflict: 5,
    culture: 4,
    stress: 4,
  }

  for (const domain of readyViewModel.presentation.assessments[0].domains) {
    assert.equal(domain.bars.length, expectedRowCounts[domain.key as keyof typeof expectedRowCounts])
    assert.equal(
      domain.bars.reduce((sum, bar) => sum + bar.value, 0),
      100,
      `${domain.title} should normalise to 100%`,
    )
    assert.equal(new Set(domain.bars.map((bar) => bar.label)).size, domain.bars.length)
  }
})

test('presentation model handles optional data safely without inventing missing domain content', () => {
  const data = makeReadyData()
  data.layers = data.layers.filter((layer) => layer.layerKey !== 'culture')
  data.signals = data.signals.filter((signal) => signal.layerKey !== 'culture')

  const readyViewModel = buildReadyIndividualResultViewModel(data, 'Mark')
  const culture = readyViewModel.presentation.assessments[0].domains.find((section) => section.key === 'culture')

  assert.ok(culture)
  assert.equal(readyViewModel.presentation.intelligence.metadata[1], '5 interpreted domains')
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

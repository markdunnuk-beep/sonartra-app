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
      {
        layerKey: 'behaviour_style',
        totalRawValue: 22,
        signalCount: 2,
        primarySignalKey: 'Core_Driver',
        secondarySignalKey: 'Core_Analyst',
        rankedSignalKeys: ['Core_Driver', 'Core_Analyst'],
      },
      {
        layerKey: 'motivators',
        totalRawValue: 10,
        signalCount: 1,
        primarySignalKey: 'Mot_Achievement',
        secondarySignalKey: null,
        rankedSignalKeys: ['Mot_Achievement'],
      },
      {
        layerKey: 'leadership',
        totalRawValue: 10,
        signalCount: 1,
        primarySignalKey: 'Leader_Results',
        secondarySignalKey: null,
        rankedSignalKeys: ['Leader_Results'],
      },
      {
        layerKey: 'conflict',
        totalRawValue: 10,
        signalCount: 1,
        primarySignalKey: 'Conflict_Compete',
        secondarySignalKey: null,
        rankedSignalKeys: ['Conflict_Compete'],
      },
      {
        layerKey: 'culture',
        totalRawValue: 10,
        signalCount: 1,
        primarySignalKey: 'Culture_Market',
        secondarySignalKey: null,
        rankedSignalKeys: ['Culture_Market'],
      },
      {
        layerKey: 'risk',
        totalRawValue: 10,
        signalCount: 1,
        primarySignalKey: 'Stress_Control',
        secondarySignalKey: null,
        rankedSignalKeys: ['Stress_Control'],
      },
    ],
    signals: [
      { layerKey: 'behaviour_style', signalKey: 'Core_Driver', signalTotal: 14, normalisedScore: 0.7, relativeShare: 0.64, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'behaviour_style', signalKey: 'Core_Analyst', signalTotal: 8, normalisedScore: 0.4, relativeShare: 0.36, rank: 2, isPrimary: false, isSecondary: true },
      { layerKey: 'motivators', signalKey: 'Mot_Achievement', signalTotal: 10, normalisedScore: 0.5, relativeShare: 1, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'leadership', signalKey: 'Leader_Results', signalTotal: 10, normalisedScore: 0.5, relativeShare: 1, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'conflict', signalKey: 'Conflict_Compete', signalTotal: 10, normalisedScore: 0.5, relativeShare: 1, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'culture', signalKey: 'Culture_Market', signalTotal: 10, normalisedScore: 0.5, relativeShare: 1, rank: 1, isPrimary: true, isSecondary: false },
      { layerKey: 'risk', signalKey: 'Stress_Control', signalTotal: 10, normalisedScore: 0.5, relativeShare: 1, rank: 1, isPrimary: true, isSecondary: false },
    ],
    summaryJson: null,
  }
}

test('ready individual results view model carries archetypeSummary through the page-level ready path', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(makeReadyData(), 'Mark')

  assert.equal(readyViewModel.interpretation.archetypeSummary.primaryKey, 'strategic_operator')
  assert.equal(readyViewModel.interpretation.archetypeSummary.primaryLabel, 'Strategic Operator')
  assert.equal(readyViewModel.interpretation.archetypeSummary.confidence, 'high')
  assert.equal(typeof readyViewModel.interpretation.archetypeSummary.behaviouralTilt, 'string')
  assert.equal(typeof readyViewModel.interpretation.archetypeSummary.summary, 'string')
  assert.equal(readyViewModel.interpretation.archetypeSummary.secondaryKey, undefined)
  assert.equal(readyViewModel.interpretation.archetypeSummary.secondaryLabel, undefined)
})

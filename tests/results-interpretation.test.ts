import assert from 'node:assert/strict'
import test from 'node:test'

import { buildIndividualResultInterpretation } from '../lib/results-interpretation'
import { IndividualResultReadyData } from '../lib/server/individual-results'

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
      {
        layerKey: 'behaviour_style',
        totalRawValue: 20,
        signalCount: 2,
        primarySignalKey: 'Core_Driver',
        secondarySignalKey: 'Core_Analyst',
        rankedSignalKeys: ['Core_Driver', 'Core_Analyst'],
      },
    ],
    signals: [
      {
        layerKey: 'behaviour_style',
        signalKey: 'Core_Driver',
        signalTotal: 12,
        normalisedScore: 0.6,
        relativeShare: 0.6,
        rank: 1,
        isPrimary: true,
        isSecondary: false,
      },
      {
        layerKey: 'behaviour_style',
        signalKey: 'Core_Analyst',
        signalTotal: 8,
        normalisedScore: 0.4,
        relativeShare: 0.4,
        rank: 2,
        isPrimary: false,
        isSecondary: true,
      },
    ],
    summaryJson: null,
    ...overrides,
  }
}

test('creates deterministic interpretation blocks from ready-result layers and ranked signals', () => {
  const interpretation = buildIndividualResultInterpretation(makeReadyData())

  assert.equal(interpretation.onboarding.title, 'How to read this profile')
  assert.equal(interpretation.layerInterpretations.length, 1)
  assert.match(interpretation.layerInterpretations[0].summary, /Core Driver/)
  assert.match(interpretation.layerInterpretations[0].summary, /Core Analyst/)
  assert.equal(interpretation.managerNotes.title, 'Manager notes')
})

test('different signal patterns produce different mapped interpretations', () => {
  const driver = buildIndividualResultInterpretation(makeReadyData())

  const analyst = buildIndividualResultInterpretation(
    makeReadyData({
      layers: [
        {
          layerKey: 'behaviour_style',
          totalRawValue: 20,
          signalCount: 2,
          primarySignalKey: 'Core_Analyst',
          secondarySignalKey: 'Core_Driver',
          rankedSignalKeys: ['Core_Analyst', 'Core_Driver'],
        },
      ],
      signals: [
        {
          layerKey: 'behaviour_style',
          signalKey: 'Core_Analyst',
          signalTotal: 12,
          normalisedScore: 0.6,
          relativeShare: 0.6,
          rank: 1,
          isPrimary: true,
          isSecondary: false,
        },
        {
          layerKey: 'behaviour_style',
          signalKey: 'Core_Driver',
          signalTotal: 8,
          normalisedScore: 0.4,
          relativeShare: 0.4,
          rank: 2,
          isPrimary: false,
          isSecondary: true,
        },
      ],
    }),
  )

  assert.notEqual(driver.layerInterpretations[0].summary, analyst.layerInterpretations[0].summary)
  assert.notEqual(driver.layerInterpretations[0].watchouts[0], analyst.layerInterpretations[0].watchouts[0])
})

test('omits interpretation block when a layer has no usable signal data', () => {
  const interpretation = buildIndividualResultInterpretation(
    makeReadyData({
      layers: [
        {
          layerKey: 'motivators',
          totalRawValue: 0,
          signalCount: 0,
          primarySignalKey: null,
          secondarySignalKey: null,
          rankedSignalKeys: [],
        },
      ],
      signals: [],
    }),
  )

  assert.equal(interpretation.layerInterpretations.length, 0)
})

test('does not emit banned placeholder or demo language', () => {
  const interpretation = buildIndividualResultInterpretation(makeReadyData())
  const flattened = JSON.stringify(interpretation)

  assert.doesNotMatch(flattened, /coming soon/i)
  assert.doesNotMatch(flattened, /demo/i)
  assert.doesNotMatch(flattened, /unlock your true potential/i)
})

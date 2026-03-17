import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { IndividualIntelligenceResultContract } from '../lib/server/individual-intelligence-result'
import { IndividualIntelligenceResultView } from '../components/results/IndividualIntelligenceResultView'

const completeModel: IndividualIntelligenceResultContract = {
  hasResult: true,
  resultStatus: 'complete',
  assessmentId: 'assessment-1',
  completedAt: '2026-01-01T10:05:00.000Z',
  versionKey: 'wplp80-v1',
  summary: {
    assessmentResultId: 'result-1',
    scoringModelKey: 'wplp80-signal-model-v1',
    snapshotVersion: 1,
    scoredAt: '2026-01-01T10:06:00.000Z',
    createdAt: '2026-01-01T10:06:01.000Z',
    updatedAt: '2026-01-01T10:06:01.000Z',
  },
  layerSummaries: [
    { layerKey: 'behaviour_style', totalRawValue: 22, topSignalKey: 'Core_Driver', signalCount: 2 },
    { layerKey: 'leadership', totalRawValue: 12, topSignalKey: 'Decisive_Lead', signalCount: 1 },
  ],
  signalSummaries: [
    {
      layerKey: 'behaviour_style',
      signalKey: 'Core_Driver',
      rawTotal: 14,
      maxPossible: 20,
      normalisedScore: 0.7,
      relativeShare: 0.64,
      rankInLayer: 1,
      isPrimary: true,
      isSecondary: false,
    },
    {
      layerKey: 'behaviour_style',
      signalKey: 'Core_Analyst',
      rawTotal: 8,
      maxPossible: 20,
      normalisedScore: 0.4,
      relativeShare: 0.36,
      rankInLayer: 2,
      isPrimary: false,
      isSecondary: true,
    },
    {
      layerKey: 'leadership',
      signalKey: 'Decisive_Lead',
      rawTotal: 12,
      maxPossible: 20,
      normalisedScore: 0.6,
      relativeShare: 1,
      rankInLayer: 1,
      isPrimary: true,
      isSecondary: false,
    },
  ],
  responseQuality: {
    completionDurationSeconds: 302,
    responseQualityStatus: 'normal',
    responseQualityFlags: [],
    timingSummary: {
      hasResponseTimings: true,
      timedResponseCount: 80,
    },
  },
  emptyState: null,
  failedState: null,
}

test('complete state renders core sections and signal blocks from persisted model', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={completeModel} />)

  assert.match(html, /Individual Intelligence/)
  assert.match(html, /Core profile summary/)
  assert.match(html, /Layer breakdown/)
  assert.match(html, /Strategic interpretation/)
  assert.match(html, /Core Driver/)
  assert.match(html, /Decisive Lead/)
  assert.doesNotMatch(html, /Download Board-Ready Report/)
})

test('empty state renders explanation and assessment CTA', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ...completeModel,
        hasResult: false,
        resultStatus: 'empty',
        assessmentId: null,
        versionKey: null,
        signalSummaries: [],
        layerSummaries: [],
        summary: null,
        responseQuality: null,
        emptyState: {
          reason: 'no_completed_assessment',
          message: 'No completed Individual Intelligence assessment exists for this user.',
        },
      }}
    />,
  )

  assert.match(html, /No completed Individual Intelligence result is available yet/)
  assert.match(html, /No completed Individual Intelligence assessment exists for this user/)
  assert.match(html, /Start or resume assessment/)
})

test('failed state renders informational panel without fake report body', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ...completeModel,
        hasResult: false,
        resultStatus: 'failed',
        signalSummaries: [],
        layerSummaries: [],
        responseQuality: null,
        failedState: {
          reason: 'result_generation_failed',
          message: 'Result generation failed for the latest completed assessment.',
          failure: {
            stage: 'completion_orchestration',
            category: 'runtime_error',
            code: 'RESULT_GENERATION_FAILED',
            message: 'Scoring failed',
            occurredAt: '2026-01-01T10:07:00.000Z',
            assessmentVersionKey: 'wplp80-v1',
          },
        },
        emptyState: null,
      }}
    />,
  )

  assert.match(html, /latest report is not currently available/i)
  assert.match(html, /Reference code: RESULT_GENERATION_FAILED/)
  assert.doesNotMatch(html, /Layer breakdown/)
})

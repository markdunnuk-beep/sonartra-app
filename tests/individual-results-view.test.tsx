import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { IndividualIntelligenceResultView } from '../components/results/IndividualIntelligenceResultView'
import { IndividualResultApiResponse } from '../lib/server/individual-results'

const readyResponse: IndividualResultApiResponse = {
  ok: true,
  state: 'ready',
  data: {
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
      createdAt: '2026-01-01T10:06:01.000Z',
      updatedAt: '2026-01-01T10:06:01.000Z',
      scoredAt: '2026-01-01T10:06:00.000Z',
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
        layerKey: 'leadership',
        totalRawValue: 12,
        signalCount: 1,
        primarySignalKey: 'Decisive_Lead',
        secondarySignalKey: null,
        rankedSignalKeys: ['Decisive_Lead'],
      },
    ],
    signals: [
      {
        layerKey: 'behaviour_style',
        signalKey: 'Core_Driver',
        signalTotal: 14,
        normalisedScore: 0.7,
        relativeShare: 0.64,
        rank: 1,
        isPrimary: true,
        isSecondary: false,
      },
      {
        layerKey: 'behaviour_style',
        signalKey: 'Core_Analyst',
        signalTotal: 8,
        normalisedScore: 0.4,
        relativeShare: 0.36,
        rank: 2,
        isPrimary: false,
        isSecondary: true,
      },
      {
        layerKey: 'leadership',
        signalKey: 'Decisive_Lead',
        signalTotal: 12,
        normalisedScore: 0.6,
        relativeShare: 1,
        rank: 1,
        isPrimary: true,
        isSecondary: false,
      },
    ],
    summaryJson: { scoreBand: 'top' },
  },
}

test('ready state renders returned persisted result data', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView response={readyResponse} />)

  assert.match(html, /Individual Results/)
  assert.match(html, /Layer breakdown/)
  assert.match(html, /Behaviour Style/)
  assert.match(html, /Core Driver/)
  assert.match(html, /Assessment version: wplp80-v1/)
})

test('empty state renders no-data messaging and no mock content', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      response={{
        ok: true,
        state: 'empty',
        message: 'No assessment found for this user.',
      }}
    />,
  )

  assert.match(html, /No completed assessment found/)
  assert.match(html, /Start assessment/)
  assert.doesNotMatch(html, /Strategic interpretation/)
})

test('incomplete state renders controlled unavailable message', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      response={{
        ok: true,
        state: 'incomplete',
        message: 'Latest assessment is not completed yet.',
        data: {
          assessment: {
            assessmentId: 'assessment-2',
            versionKey: 'wplp80-v1',
            startedAt: '2026-01-01T09:00:00.000Z',
            completedAt: null,
          },
        },
      }}
    />,
  )

  assert.match(html, /Results are not available yet/)
  assert.match(html, /assessment-2/)
  assert.doesNotMatch(html, /Layer breakdown/)
})

test('error state renders safe failure panel', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      response={{
        ok: false,
        state: 'error',
        message: 'Unable to load the latest individual results right now.',
      }}
    />,
  )

  assert.match(html, /Unable to load results/)
  assert.match(html, /latest individual results/)
})

test('unauthenticated state renders auth-required messaging', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      response={{
        ok: false,
        state: 'unauthenticated',
        message: 'Authentication required.',
      }}
    />,
  )

  assert.match(html, /Authentication required/)
})

test('ready state preserves deterministic layer and signal ordering from API response', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView response={readyResponse} />)

  const behaviourIdx = html.indexOf('Behaviour Style')
  const leadershipIdx = html.indexOf('Leadership')
  const coreDriverIdx = html.indexOf('Core Driver')
  const coreAnalystIdx = html.indexOf('Core Analyst')

  assert.ok(behaviourIdx > -1 && leadershipIdx > -1 && behaviourIdx < leadershipIdx)
  assert.ok(coreDriverIdx > -1 && coreAnalystIdx > -1 && coreDriverIdx < coreAnalystIdx)
})

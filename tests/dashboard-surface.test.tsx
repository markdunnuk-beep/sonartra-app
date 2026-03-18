import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { DashboardPreResultContent } from '../components/dashboard/DashboardPageView'
import { DashboardState } from '../lib/server/dashboard-state'
import { IndividualIntelligenceResultContract } from '../lib/server/individual-intelligence-result'

const readyResult: IndividualIntelligenceResultContract = {
  hasResult: true,
  resultStatus: 'complete',
  assessmentId: 'assessment-1',
  completedAt: '2026-01-01T10:10:00.000Z',
  versionKey: 'wplp80-v1',
  summary: {
    assessmentResultId: 'result-1',
    scoringModelKey: 'wplp80-signal-model-v1',
    snapshotVersion: 1,
    scoredAt: '2026-01-01T10:11:00.000Z',
    createdAt: '2026-01-01T10:11:00.000Z',
    updatedAt: '2026-01-01T10:11:00.000Z',
  },
  layerSummaries: [
    { layerKey: 'behaviour_style', totalRawValue: 22, topSignalKey: 'Core_Driver', signalCount: 4 },
    { layerKey: 'motivators', totalRawValue: 18, topSignalKey: 'Mot_Mastery', signalCount: 4 },
    { layerKey: 'leadership', totalRawValue: 16, topSignalKey: 'Leader_Results', signalCount: 4 },
    { layerKey: 'conflict', totalRawValue: 11, topSignalKey: 'Conflict_Collaborate', signalCount: 5 },
  ],
  signalSummaries: [],
  responseQuality: null,
  emptyState: null,
  failedState: null,
}

function makeReadyState(): DashboardState {
  return {
    authStatus: 'authenticated',
    hasCompletedResult: true,
    result: readyResult,
    assessment: {
      status: 'ready',
      progressPercent: 100,
      questionsCompleted: 80,
      questionsRemaining: 0,
    },
  }
}

function makeInProgressState(): DashboardState {
  return {
    authStatus: 'authenticated',
    hasCompletedResult: false,
    result: null,
    assessment: {
      status: 'in_progress',
      progressPercent: 30,
      questionsCompleted: 24,
      questionsRemaining: 56,
    },
  }
}

test('ready dashboard replaces individual overview with action-oriented sections', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeReadyState()} />)

  assert.doesNotMatch(html, /Individual Intelligence Overview/)
  assert.match(html, /Next Actions/)
  assert.match(html, /Key Signals Snapshot/)
  assert.match(html, /Intelligence Coverage/)
  assert.match(html, /Behaviour Style/)
  assert.match(html, />Driver</)
  assert.match(html, />Mastery</)
  assert.match(html, />Results</)
  assert.match(html, />Collaborate</)
  assert.doesNotMatch(html, /Persisted signal profile from the latest completed assessment\./)
})

test('next actions render ready-state primary CTA to individual results', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeReadyState()} />)

  assert.match(html, />View Individual Results</)
  assert.match(html, /Review leadership profile/)
  assert.match(html, /Revisit behavioural profile/)
})

test('next actions adapt to non-ready lifecycle states', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeInProgressState()} />)

  assert.match(html, />Resume assessment</)
  assert.match(html, /Results unlock after completion/)
  assert.match(html, /Key signals will populate once a persisted individual result is available\./)
  assert.match(html, /Individual Intelligence/)
  assert.match(html, /In progress/)
})

test('intelligence coverage renders current and future platform states', () => {
  const html = renderToStaticMarkup(<DashboardPreResultContent state={makeReadyState()} />)

  assert.match(html, /Individual Intelligence/)
  assert.match(html, /Latest individual result snapshot is available\./)
  assert.match(html, /Team Intelligence/)
  assert.match(html, /Coming soon/)
  assert.match(html, /Organisation Intelligence/)
  assert.match(html, /Locked/)
})

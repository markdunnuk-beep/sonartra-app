import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  buildReadyIndividualResultViewModel,
  IndividualIntelligenceResultView,
  ReadyIndividualResultSections,
} from '../components/results/IndividualIntelligenceResultView'
import { IndividualResultApiResponse } from '../lib/server/individual-results'

const readyModel: IndividualResultApiResponse = {
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
    summaryJson: null,
  },
}

const buildPresentationModel = () => buildReadyIndividualResultViewModel(readyModel.data, 'Mark')

test('ready state renders archetype overview on the individual results page and preserves lower sections', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)

  assert.match(html, /Individual Intelligence/)
  assert.match(html, /Archetype Overview/)
  assert.match(html, /Primary Archetype: Strategic Operator/)
  assert.match(html, /Behavioural Tilt:/)
  assert.match(html, /Behaviour Style/)
  assert.match(html, /Motivators/)
  assert.match(html, /Leadership/)
  assert.match(html, /Conflict/)
  assert.match(html, /Culture/)
  assert.match(html, /Stress/)
  assert.match(html, /How to use this report/)
  assert.match(html, /Interpretation by layer/)
  assert.match(html, /Manager notes/)
  assert.match(html, /Why this may feel familiar/)

  assert.match(html, /Performance profile/)
  assert.match(html, /Where this person is likely to be most effective/)
  assert.match(html, /Leverage points/)
  assert.match(html, /Watchouts under pressure/)
  assert.match(html, /Team dynamics/)
  assert.match(html, /Manager playbook/)
  assert.match(html, /What to do/)
  assert.match(html, /What to avoid/)
  assert.match(html, /Mark is likely to establish clarity before committing/)
  assert.doesNotMatch(html, /Individual Overview/)
})

test('archetype map renders the primary archetype in the active primary state without visible state badges', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)

  assert.match(html, /data-archetype-key="strategic_operator"[^>]*data-archetype-state="primary"/)
})

test('archetype map renders an optional secondary influence in the softer active state', () => {
  const readyViewModel = buildPresentationModel()
  readyViewModel.interpretation.archetypeSummary = {
    ...readyViewModel.interpretation.archetypeSummary,
    secondaryKey: 'systems_architect',
    secondaryLabel: 'Systems Architect',
  }

  const html = renderToStaticMarkup(<ReadyIndividualResultSections data={readyModel.data} readyViewModel={readyViewModel} />)

  assert.match(html, /Secondary Influence: Systems Architect/)
  assert.match(html, /data-archetype-key="systems_architect"[^>]*data-archetype-state="secondary"/)
})

test('non-selected archetypes render in the inactive state with lightweight tile content', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)

  assert.match(html, /data-archetype-key="growth_catalyst"[^>]*data-archetype-state="inactive"/)
  assert.match(html, /data-archetype-key="balanced_operator"[^>]*data-archetype-state="inactive"/)
  assert.doesNotMatch(html, /Accelerates movement through visible energy and expansion\./)
})

test('ready state uses neutral personalisation fallback when first name is unavailable', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName={null} />)
  assert.match(html, /This individual is likely to establish clarity before committing/)
  assert.doesNotMatch(html, /Mark is likely to establish clarity before committing/)
})

test('ready-state sections omit the archetype overview gracefully when archetypeSummary is absent', () => {
  const readyViewModel = buildPresentationModel() as Parameters<typeof ReadyIndividualResultSections>[0]['readyViewModel']
  readyViewModel.interpretation = {
    ...readyViewModel.interpretation,
    archetypeSummary: undefined,
  }

  const html = renderToStaticMarkup(<ReadyIndividualResultSections data={readyModel.data} readyViewModel={readyViewModel} />)

  assert.doesNotMatch(html, /Archetype Overview/)
  assert.match(html, /Individual Overview/)
  assert.match(html, /Behaviour Style/)
})

test('archetype summary content renders primary, behavioural tilt, summary, and list blocks', () => {
  const readyViewModel = buildPresentationModel()
  readyViewModel.interpretation.archetypeSummary = {
    ...readyViewModel.interpretation.archetypeSummary,
    secondaryKey: 'systems_architect',
    secondaryLabel: 'Systems Architect',
  }

  const html = renderToStaticMarkup(<ReadyIndividualResultSections data={readyModel.data} readyViewModel={readyViewModel} />)

  assert.match(html, /Primary Archetype: Strategic Operator/)
  assert.match(html, /Secondary Influence: Systems Architect/)
  assert.match(html, /Behavioural Tilt:/)
  assert.match(html, /The profile shows a clear directional bias\./)
  assert.match(html, /Strengths/)
  assert.match(html, /Watchouts/)
  assert.match(html, /Focus Areas/)
  assert.match(html, /Sets direction quickly once evidence is good enough/)
  assert.match(html, /Can narrow consultation when pace is high/)
  assert.match(html, /Make room for challenge before locking direction/)
})

test('ready state omits why-this-may-feel-familiar section when no deterministic familiar patterns are present', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ...readyModel,
        data: {
          ...readyModel.data,
          layers: [
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
        },
      }}
      firstName="Mark"
    />,
  )

  assert.doesNotMatch(html, /Why this may feel familiar/)
})

test('empty state renders explanation and assessment CTA', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ok: true,
        state: 'empty',
        message: 'No assessment found for this user.',
      }}
    />,
  )

  assert.match(html, /No completed Individual Intelligence result is available yet/)
  assert.match(html, /No assessment found for this user/)
  assert.match(html, /Start or resume assessment/)
  assert.doesNotMatch(html, /How to use this report/)
  assert.doesNotMatch(html, /Performance profile/)
  assert.doesNotMatch(html, /Manager playbook/)
  assert.doesNotMatch(html, /Manager notes/)
  assert.doesNotMatch(html, /Performance profile/)
  assert.doesNotMatch(html, /Manager playbook/)
})

test('incomplete state renders visible progress copy and resume CTA', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ok: true,
        state: 'incomplete',
        message: 'Latest assessment is not completed yet.',
      }}
    />,
  )

  assert.match(html, /Assessment is in progress/)
  assert.match(html, /not completed yet/)
  assert.match(html, /Resume assessment/)
  assert.doesNotMatch(html, /How to use this report/)
  assert.doesNotMatch(html, /Performance profile/)
  assert.doesNotMatch(html, /Manager playbook/)
})

test('error state renders a controlled failure panel', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ok: false,
        state: 'error',
        message: 'Unable to load the latest individual results right now.',
      }}
    />,
  )

  assert.match(html, /latest report is not currently available/i)
  assert.match(html, /Results are unavailable right now/)
})

test('unexpected state renders fallback instead of blank output', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={{ state: 'mystery' }} />)

  assert.match(html, /Results are temporarily unavailable/)
  assert.match(html, /could not interpret the latest results state/i)
})

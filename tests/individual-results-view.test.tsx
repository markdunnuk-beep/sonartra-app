import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import {
  buildReadyIndividualResultViewModel,
  IndividualIntelligenceResultView,
  ReadyIndividualResultSections,
} from '../components/results/IndividualIntelligenceResultView'
import type { IndividualResultApiResponse, IndividualResultReadyData } from '../lib/server/individual-results'

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
        totalRawValue: 22,
        signalCount: 2,
        primarySignalKey: 'Core_Driver',
        secondarySignalKey: 'Core_Analyst',
        rankedSignalKeys: ['Core_Driver', 'Core_Analyst'],
      },
      {
        layerKey: 'motivators',
        totalRawValue: 12,
        signalCount: 2,
        primarySignalKey: 'Mot_Mastery',
        secondarySignalKey: 'Mot_Achievement',
        rankedSignalKeys: ['Mot_Mastery', 'Mot_Achievement'],
      },
      {
        layerKey: 'leadership',
        totalRawValue: 10,
        signalCount: 2,
        primarySignalKey: 'Leader_Results',
        secondarySignalKey: 'Leader_Process',
        rankedSignalKeys: ['Leader_Results', 'Leader_Process'],
      },
      {
        layerKey: 'conflict',
        totalRawValue: 10,
        signalCount: 2,
        primarySignalKey: 'Conflict_Compete',
        secondarySignalKey: 'Conflict_Collaborate',
        rankedSignalKeys: ['Conflict_Compete', 'Conflict_Collaborate'],
      },
      {
        layerKey: 'culture',
        totalRawValue: 10,
        signalCount: 2,
        primarySignalKey: 'Culture_Market',
        secondarySignalKey: 'Culture_Clan',
        rankedSignalKeys: ['Culture_Market', 'Culture_Clan'],
      },
      {
        layerKey: 'risk',
        totalRawValue: 10,
        signalCount: 2,
        primarySignalKey: 'Stress_Control',
        secondarySignalKey: 'Decision_Evidence',
        rankedSignalKeys: ['Stress_Control', 'Decision_Evidence'],
      },
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
    ...overrides,
  }
}

const readyModel: IndividualResultApiResponse = {
  ok: true,
  state: 'ready',
  data: makeReadyData(),
}

const buildPresentationModel = () => buildReadyIndividualResultViewModel(readyModel.data, 'Mark')

test('ready state renders the production scan-first results experience in the approved section order', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)

  assert.match(html, /Sonartra Signals — Individual Results/)
  assert.match(html, /How to Use This Report/)
  assert.match(html, /Sonartra Archetype Overview/)
  assert.match(html, /Behaviour Style/)
  assert.match(html, /Motivators/)
  assert.match(html, /Leadership/)
  assert.match(html, /Conflict/)
  assert.match(html, /Culture/)
  assert.match(html, /Stress/)
  assert.match(html, /Performance Implications/)

  assert.ok(html.indexOf('How to Use This Report') < html.indexOf('Sonartra Archetype Overview'))
  assert.ok(html.indexOf('Sonartra Archetype Overview') < html.indexOf('Primary profile: Driver – Analyst'))
  assert.ok(html.indexOf('Behaviour Style') < html.indexOf('Motivators'))
  assert.ok(html.indexOf('Motivators') < html.indexOf('Leadership'))
  assert.ok(html.indexOf('Leadership') < html.indexOf('Conflict'))
  assert.ok(html.indexOf('Conflict') < html.indexOf('Culture'))
  assert.ok(html.indexOf('Culture') < html.indexOf('Stress'))
  assert.ok(html.indexOf('Stress') < html.indexOf('Performance Implications'))

  assert.doesNotMatch(html, /Interpretation by layer/)
  assert.doesNotMatch(html, /Manager playbook/)
  assert.doesNotMatch(html, /Manager notes/)
})

test('archetype overview renders only primary and secondary archetypes with the live quick-read summary', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)

  assert.match(html, /Primary archetype/)
  assert.match(html, /Secondary archetype/)
  assert.match(html, /Strategic Operator/)
  assert.match(html, /Insight Explorer/)
  assert.match(html, /Quick read/)
  assert.doesNotMatch(html, /Balanced Operator/)
})

test('domain sections render with repeated structure, live bars, and concise guidance cards', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)

  assert.match(html, /Primary profile: Driver – Analyst/)
  assert.match(html, /Primary profile: Mastery – Achievement/)
  assert.match(html, /Primary profile: Results – Process/)
  assert.match(html, /Distribution/)
  assert.match(html, /Highest signal: Driver/)
  assert.match(html, /Highest signal: Mastery/)
  assert.match(html, /Strengths/)
  assert.match(html, /Watchouts/)
  assert.match(html, /52%/)
  assert.match(html, /58%/)
})

test('performance implications section renders the synthesised best-fit, risk, and focus guidance', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)

  assert.match(html, /Where performance is strongest/)
  assert.match(html, /Where performance risk appears/)
  assert.match(html, /Recommended focus/)
  assert.match(html, /Where this person creates value, where risk appears, and what to tighten next/)
})

test('ready state uses neutral fallback language when first name is unavailable', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName={null} />)
  assert.match(html, /this person is most likely to operate/i)
  assert.doesNotMatch(html, /Mark is likely to establish clarity before committing/)
})

test('ready sections fall back safely when an archetype or a domain is unavailable', () => {
  const readyViewModel = buildPresentationModel()
  readyViewModel.presentation.assessments[0].archetype.summary = undefined
  readyViewModel.presentation.assessments[0].archetype.personalSummary = 'Fallback summary.'
  readyViewModel.presentation.assessments[0].domains[3].bars = []

  const html = renderToStaticMarkup(<ReadyIndividualResultSections data={readyModel.data} readyViewModel={readyViewModel} />)

  assert.match(html, /Archetype unavailable/)
  assert.match(html, /Fallback summary/)
  assert.match(html, /No scored signal distribution is available yet for this domain/)
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
  assert.doesNotMatch(html, /How to Use This Report/)
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
  assert.doesNotMatch(html, /Sonartra Archetype Overview/)
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

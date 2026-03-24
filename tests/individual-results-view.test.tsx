import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TestRenderer, { act } from 'react-test-renderer'

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

const readyData = makeReadyData()

const readyModel: IndividualResultApiResponse = {
  ok: true,
  state: 'ready',
  data: readyData,
}

Object.assign(globalThis, { self: globalThis })

const buildPresentationModel = () => buildReadyIndividualResultViewModel(readyData, 'Mark')

function assertSortedDistribution(distribution: Array<{ label: string; value: number }>) {
  const sorted = [...distribution].sort((a, b) => b.value - a.value)
  assert.deepEqual(distribution, sorted)

  const total = distribution.reduce((sum, d) => sum + d.value, 0)
  assert.equal(total, 100)
}

function renderExpandedReadySections() {
  const readyViewModel = buildPresentationModel()
  readyViewModel.presentation.assessments[0]!.defaultExpanded = true

  return renderToStaticMarkup(<ReadyIndividualResultSections data={readyData} readyViewModel={readyViewModel} />)
}

test('ready state defaults the live assessment card to collapsed while preserving the summary line', () => {
  const html = renderToStaticMarkup(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)

  assert.match(html, /Sonartra Signals — Individual Results/)
  assert.match(html, /Results overview/)
  assert.match(html, /Baseline ready/)
  assert.match(html, /What matters now/)
  assert.match(html, /What this unlocks/)
  assert.match(html, /Resume Burnout Risk/)
  assert.match(html, /Resume diagnostic/)
  assert.match(html, /Current result/)
  assert.match(html, /Review full results/)
  assert.doesNotMatch(html, /Decision briefing/)
  assert.doesNotMatch(html, /Summary view/)
  assert.match(html, /Strategic Operator with Insight Explorer/)
  assert.doesNotMatch(html, /How to Use This Report/)
  assert.doesNotMatch(html, /Sonartra Archetype Overview/)
  assert.doesNotMatch(html, /Performance Implications/)
})

test('expanded ready state renders the production scan-first results experience in the approved section order', () => {
  const html = renderExpandedReadySections()

  assert.ok(html.indexOf('Results overview') < html.indexOf('How to Use This Report'))
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
  assert.ok(html.indexOf('Primary profile: Driver – Analyst') < html.indexOf('Primary profile: Mastery – Achievement'))
  assert.ok(html.indexOf('Primary profile: Mastery – Achievement') < html.indexOf('Primary profile: Results – Process'))
  assert.ok(html.indexOf('Primary profile: Results – Process') < html.indexOf('Primary profile: Compete – Collaborate'))
  assert.ok(html.indexOf('Primary profile: Compete – Collaborate') < html.indexOf('Primary profile: Performance – Collaboration'))
  assert.ok(html.indexOf('Primary profile: Performance – Collaboration') < html.indexOf('Primary profile: Control – Support'))
  assert.ok(html.indexOf('Primary profile: Control – Support') < html.indexOf('Performance Implications'))

  assert.doesNotMatch(html, /Interpretation by layer/)
  assert.doesNotMatch(html, /Manager playbook/)
  assert.doesNotMatch(html, /Manager notes/)
})

test('archetype overview renders only primary and secondary archetypes with the live quick-read summary', () => {
  const html = renderExpandedReadySections()

  assert.match(html, /Primary archetype/)
  assert.match(html, /Secondary archetype/)
  assert.match(html, /Strategic Operator/)
  assert.match(html, /Insight Explorer/)
  assert.match(html, /Quick read/)
  assert.doesNotMatch(html, /Balanced Operator/)
})

test('domain sections render with repeated structure, live bars, and concise guidance cards', () => {
  const html = renderExpandedReadySections()
  const readyViewModel = buildPresentationModel()

  assert.match(html, /Primary profile: Driver – Analyst/)
  assert.match(html, /Primary profile: Mastery – Achievement/)
  assert.match(html, /Primary profile: Results – Process/)
  assert.match(html, /Distribution/)
  assert.match(html, /Highest signal: Driver/)
  assert.match(html, /Highest signal: Mastery/)
  assert.match(html, /Strengths/)
  assert.match(html, /Watchouts/)
  assert.match(html, /52%/)
  assert.match(html, /42%/)

  for (const domain of readyViewModel.presentation.assessments[0].domains) {
    assertSortedDistribution(domain.bars)
  }
})

test('performance implications section renders the synthesised best-fit, risk, and focus guidance', () => {
  const html = renderExpandedReadySections()

  assert.match(html, /Where performance is strongest/)
  assert.match(html, /Where performance risk appears/)
  assert.match(html, /Recommended focus/)
  assert.match(html, /Where this person creates value, where risk appears, and what to tighten next/)
})

test('ready state uses neutral fallback language when first name is unavailable', () => {
  const readyViewModel = buildReadyIndividualResultViewModel(readyData, null)
  readyViewModel.presentation.assessments[0]!.defaultExpanded = true
  const html = renderToStaticMarkup(<ReadyIndividualResultSections data={readyData} readyViewModel={readyViewModel} />)
  assert.match(html, /this person is most likely to operate/i)
  assert.doesNotMatch(html, /Mark is likely to establish clarity before committing/)
})

test('ready sections fall back safely when an archetype or a domain is unavailable', () => {
  const readyViewModel = buildPresentationModel()
  readyViewModel.presentation.assessments[0].archetype.summary = undefined
  readyViewModel.presentation.assessments[0].archetype.personalSummary = 'Fallback summary.'
  readyViewModel.presentation.assessments[0].domains[3].bars = []
  readyViewModel.presentation.assessments[0].defaultExpanded = true

  const html = renderToStaticMarkup(<ReadyIndividualResultSections data={readyData} readyViewModel={readyViewModel} />)

  assert.match(html, /Archetype unavailable/)
  assert.match(html, /Fallback summary/)
  assert.match(html, /No scored signal distribution is available yet for this domain/)
})

test('expanded assessment does not render the removed non-functional domain chip row', () => {
  const html = renderExpandedReadySections()

  assert.doesNotMatch(html, /text-\[#AFC0D3\]/)
  assert.doesNotMatch(html, /rounded-xl border border-white\/\[0\.05\] bg-white\/\[0\.025\]/)
})

test('assessment card expand/collapse interaction still works', () => {
  const renderer = TestRenderer.create(<IndividualIntelligenceResultView model={readyModel} firstName="Mark" />)
  const toggle = renderer.root.findByType('button')

  assert.equal((JSON.stringify(renderer.toJSON()).match(/How to Use This Report/g) ?? []).length, 0)

  act(() => {
    toggle.props.onClick()
  })

  assert.match(JSON.stringify(renderer.toJSON()), /Hide full results/)
  assert.match(JSON.stringify(renderer.toJSON()), /How to Use This Report/)

  act(() => {
    toggle.props.onClick()
  })

  assert.match(JSON.stringify(renderer.toJSON()), /Review full results/)
  assert.equal((JSON.stringify(renderer.toJSON()).match(/How to Use This Report/g) ?? []).length, 0)
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

test('in-progress state renders visible progress copy and resume CTA', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ok: true,
        state: 'in_progress',
        message: 'Latest assessment is not completed yet.',
      }}
    />,
  )

  assert.match(html, /Assessment is in progress/)
  assert.match(html, /not completed yet/)
  assert.match(html, /Resume assessment/)
  assert.doesNotMatch(html, /Sonartra Archetype Overview/)
})

test('completed-processing state renders a stable post-completion handoff message', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ok: true,
        state: 'completed_processing',
        message: 'Assessment is completed but persisted result is not available yet.',
      }}
    />,
  )

  assert.match(html, /results are processing/i)
  assert.match(html, /persisted result is not available yet/i)
  assert.match(html, /Back to assessment workspace/)
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


test('ready_v2 state renders product-safe summary cards and notices', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ok: true,
        state: 'ready_v2',
        data: {
          contractVersion: 'live_assessment_user_result/v1',
          status: 'completed',
          assessmentId: 'assessment-v2',
          assessmentStatus: 'completed',
          scoringStatus: 'scored',
          assessmentMeta: {
            versionKey: 'signals-v2',
            title: 'Adaptive Balance',
            packageSemver: '2.1.0',
          },
          resultMeta: {
            resultId: 'result-v2',
            completedAt: '2026-03-20T09:15:00.000Z',
            scoredAt: '2026-03-20T09:15:10.000Z',
            availableAt: '2026-03-20T09:15:11.000Z',
          },
          report: {
            state: 'pending',
            format: null,
            generatedAt: null,
            label: 'Report pending generation',
            message: 'Your downloadable assessment report will be generated when you open or download it.',
            downloadHref: '/api/assessment-results/result-v2/report?download=1',
            viewHref: '/api/assessment-results/result-v2/report',
          },
          summaryCards: [
            {
              id: 'summary:1',
              key: 'adaptive-balance',
              title: 'Adaptive Balance',
              label: 'Adaptive Balance',
              status: 'available',
              severity: null,
              band: 'Balanced',
              score: 74,
              rawScore: 12,
              percentile: 81,
              descriptor: 'Strongly balanced',
              explanation: 'Consistent balance across adaptive dimensions.',
            },
          ],
          notices: [
            {
              id: 'notice:1',
              severity: 'warning',
              title: 'Response consistency',
              message: 'A small number of answers were inconsistent.',
            },
          ],
          statusMessage: 'Assessment results are available.',
          resultsAvailable: true,
        },
      }}
    />,
  )

  assert.match(html, /Adaptive Balance/)
  assert.match(html, /Results ready/)
  assert.match(html, /Strongly balanced/)
  assert.match(html, /Response consistency/)
  assert.match(html, /Report pending generation/)
  assert.match(html, /Generate report/)
  assert.match(html, /Generate download/)
  assert.doesNotMatch(html, /technicalDiagnostics/)
})

test('results_unavailable state renders a controlled completed-but-unavailable message', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ok: true,
        state: 'results_unavailable',
        message: 'Assessment completed, but no user-facing summary is available for this result yet.',
      }}
    />,
  )

  assert.match(html, /completed assessment is not yet available to view/i)
  assert.match(html, /no user-facing summary is available/i)
})

test('ready_hybrid state renders premium hybrid summary sections', () => {
  const html = renderToStaticMarkup(
    <IndividualIntelligenceResultView
      model={{
        ok: true,
        state: 'ready_hybrid',
        data: {
          assessment: readyData.assessment,
          snapshot: readyData.snapshot,
          hybrid: {
            contractVersion: 'hybrid_mvp_v1',
            assessmentMeta: {
              assessmentId: 'assessment-1',
              assessmentKey: 'signals',
              assessmentVersionKey: 'hybrid-v1',
              assessmentVersionName: 'Hybrid Signals v1',
            },
            summary: {
              id: 'summary-1',
              headline: 'Execution profile',
              text: 'Strong execution drive with focused follow-through.',
            },
            sections: [
              {
                id: 'strengths',
                title: 'Strengths',
                blocks: [{ id: 's1', kind: 'signal', title: 'Drive', body: 'Strong momentum.', value: '66%' }],
              },
              {
                id: 'watchouts',
                title: 'Watchouts',
                blocks: [{ id: 'w1', kind: 'watchout', title: 'Pacing', body: 'Can over-index on speed.', value: '24%' }],
              },
            ],
            rankedSignals: [
              { signalId: 'signal-1', signalKey: 'Drive', domainId: 'execution', rawScore: 12, normalizedScore: 0.66, rank: 1 },
              { signalId: 'signal-2', signalKey: 'Pacing', domainId: 'execution', rawScore: 4, normalizedScore: 0.24, rank: 2 },
            ],
            normalizedSignalScores: { 'signal-1': 0.66, 'signal-2': 0.24 },
            domainSummaries: [
              { domainId: 'execution', totalRawScore: 16, signalCount: 2, topSignalId: 'signal-1', topNormalizedScore: 0.66 },
            ],
          },
        },
      }}
    />,
  )

  assert.match(html, /Hybrid Signals v1/)
  assert.match(html, /Execution profile/)
  assert.match(html, /Strengths/)
  assert.match(html, /Watchouts/)
  assert.match(html, /Signal breakdown/)
  assert.match(html, /Domain vector summary/)
})

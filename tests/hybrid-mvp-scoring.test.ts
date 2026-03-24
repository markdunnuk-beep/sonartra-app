import assert from 'node:assert/strict'
import test from 'node:test'

import {
  HYBRID_MVP_CONTRACT_VERSION,
  type HybridMvpAssessmentDefinition,
  buildHybridAggregationVectors,
  normalizeHybridSignalScores,
  rankHybridSignals,
  scoreHybridMvpAssessment,
} from '../lib/assessment/hybrid-mvp-scoring'

const baseDefinition: HybridMvpAssessmentDefinition = {
  contractVersion: HYBRID_MVP_CONTRACT_VERSION,
  assessmentId: 'assessment-hybrid-1',
  assessmentKey: 'hybrid-foundation',
  domains: [
    { id: 'style', key: 'style', label: 'Style' },
    { id: 'drive', key: 'drive', label: 'Drive' },
  ],
  signals: [
    { id: 'sig_core_driver', key: 'Core_Driver', label: 'Core Driver', domainId: 'style' },
    { id: 'sig_core_analyst', key: 'Core_Analyst', label: 'Core Analyst', domainId: 'style' },
    { id: 'sig_need_mastery', key: 'Need_Mastery', label: 'Need Mastery', domainId: 'drive' },
  ],
  questions: [
    {
      id: 'q1',
      prompt: 'How do you usually decide?',
      responseModel: 'single_select',
      options: [
        {
          id: 'q1_a',
          label: 'Move quickly',
          signalWeights: [
            { signalId: 'sig_core_driver', weight: 3 },
            { signalId: 'sig_need_mastery', weight: 1 },
          ],
        },
        {
          id: 'q1_b',
          label: 'Validate detail',
          signalWeights: [
            { signalId: 'sig_core_analyst', weight: 3 },
          ],
        },
      ],
    },
    {
      id: 'q2',
      prompt: 'Select all that apply',
      responseModel: 'multi_select',
      options: [
        {
          id: 'q2_a',
          label: 'Process clarity',
          signalWeights: [{ signalId: 'sig_core_analyst', weight: 2 }],
        },
        {
          id: 'q2_b',
          label: 'Outcome urgency',
          signalWeights: [{ signalId: 'sig_core_driver', weight: 2 }],
        },
      ],
    },
  ],
}

test('basic weighted scoring aggregates raw signal totals deterministically', () => {
  const scored = scoreHybridMvpAssessment(baseDefinition, {
    q1: 'q1_a',
    q2: ['q2_a', 'q2_b'],
  })

  assert.equal(scored.ok, true)
  if (!scored.ok) return

  assert.deepEqual(scored.result.rawSignalScores, {
    sig_core_analyst: 2,
    sig_core_driver: 5,
    sig_need_mastery: 1,
  })
})

test('normalization distributes score mass within each domain using fixed platform behavior', () => {
  const normalized = normalizeHybridSignalScores({
    rawSignalScores: {
      sig_core_analyst: 2,
      sig_core_driver: 6,
      sig_need_mastery: 4,
    },
    signalDomainById: {
      sig_core_analyst: 'style',
      sig_core_driver: 'style',
      sig_need_mastery: 'drive',
    },
  })

  assert.equal(normalized.sig_core_driver, 0.75)
  assert.equal(normalized.sig_core_analyst, 0.25)
  assert.equal(normalized.sig_need_mastery, 1)
})

test('ranking behavior is deterministic on normalized score, raw score, then key', () => {
  const ranked = rankHybridSignals({
    rawSignalScores: {
      sig_a: 6,
      sig_b: 6,
      sig_c: 2,
    },
    normalizedSignalScores: {
      sig_a: 0.5,
      sig_b: 0.5,
      sig_c: 0.2,
    },
    signalKeyById: {
      sig_a: 'A',
      sig_b: 'B',
      sig_c: 'C',
    },
    signalDomainById: {
      sig_a: 'style',
      sig_b: 'style',
      sig_c: 'drive',
    },
  })

  assert.deepEqual(ranked.map((entry) => entry.signalId), ['sig_a', 'sig_b', 'sig_c'])
  assert.deepEqual(ranked.map((entry) => entry.rank), [1, 2, 3])
})

test('invalid or missing responses fail fast with deterministic issue payloads', () => {
  const scored = scoreHybridMvpAssessment(baseDefinition, {
    q1: 'missing_option',
  })

  assert.equal(scored.ok, false)
  if (scored.ok) return

  assert.equal(scored.issues.some((issue) => issue.code === 'missing_response' && issue.questionId === 'q2'), true)
  assert.equal(scored.issues.some((issue) => issue.code === 'unknown_option' && issue.questionId === 'q1'), true)
})

test('multi-domain assessment output includes aggregation-ready vectors', () => {
  const scored = scoreHybridMvpAssessment(baseDefinition, {
    q1: 'q1_b',
    q2: ['q2_a'],
  })

  assert.equal(scored.ok, true)
  if (!scored.ok) return

  const vectors = buildHybridAggregationVectors(scored.result.rankedSignals)
  assert.equal(vectors.global.vector.length, 3)
  assert.equal(vectors.byDomain.length, 2)
  assert.equal(vectors.byDomain.find((vector) => vector.domainId === 'style')?.vector[0]?.signalId, 'sig_core_analyst')
})

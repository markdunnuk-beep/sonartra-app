import assert from 'node:assert/strict'
import test from 'node:test'

import {
  HYBRID_MVP_CONTRACT_VERSION,
  type HybridMvpAssessmentDefinition,
  scoreHybridMvpAssessment,
} from '../lib/assessment/hybrid-mvp-scoring'

const definition: HybridMvpAssessmentDefinition = {
  contractVersion: HYBRID_MVP_CONTRACT_VERSION,
  assessmentId: 'wplp80-hybrid',
  assessmentKey: 'wplp80',
  domains: [
    { id: 'style', key: 'style', label: 'Style' },
    { id: 'drive', key: 'drive', label: 'Drive' },
  ],
  signals: [
    { id: 'sig_a', key: 'A', label: 'Adaptive Drive', domainId: 'style' },
    { id: 'sig_b', key: 'B', label: 'Balanced Focus', domainId: 'style' },
    { id: 'sig_c', key: 'C', label: 'Calm Execution', domainId: 'drive' },
  ],
  questions: [
    {
      id: 'q1',
      prompt: 'pick one',
      responseModel: 'single_select',
      options: [
        { id: 'q1_a', label: 'a', signalWeights: [{ signalId: 'sig_a', weight: 10 }] },
        { id: 'q1_b', label: 'b', signalWeights: [{ signalId: 'sig_b', weight: 4 }] },
      ],
    },
    {
      id: 'q2',
      prompt: 'pick one',
      responseModel: 'single_select',
      options: [
        { id: 'q2_a', label: 'a', signalWeights: [{ signalId: 'sig_b', weight: 4 }] },
        { id: 'q2_b', label: 'b', signalWeights: [{ signalId: 'sig_c', weight: 1 }] },
      ],
    },
  ],
  outputTemplates: {
    signalNarratives: {
      sig_a: {
        high: '{signalLabel} is a dominant strength at {normalizedPercent}.',
      },
      sig_b: {
        balanced: '{signalLabel} is in a balanced range at {normalizedPercent}.',
      },
    },
    domainNarratives: {
      style: {
        summary: '{domainLabel} is anchored by {topSignalLabel} at {topSignalPercent}.',
      },
    },
  },
}

test('top-signal narratives are selected deterministically from ranked signals', () => {
  const scored = scoreHybridMvpAssessment(definition, { q1: 'q1_a', q2: 'q2_a' })
  assert.equal(scored.ok, true)
  if (!scored.ok) return

  const strengths = scored.result.report.sections.find((section) => section.id === 'strengths')
  assert.ok(strengths)
  assert.equal(strengths.blocks[0]?.id, 'strength:sig_a:high')
  assert.match(strengths.blocks[0]?.body ?? '', /dominant strength/i)
})

test('bucket selection supports high, balanced, and low narratives', () => {
  const scored = scoreHybridMvpAssessment(definition, { q1: 'q1_a', q2: 'q2_b' })
  assert.equal(scored.ok, true)
  if (!scored.ok) return

  const watchouts = scored.result.report.sections.find((section) => section.id === 'watchouts')
  assert.ok(watchouts)
  const text = watchouts.blocks.map((block) => block.body).join(' ')
  assert.match(text, /less expressed|balanced range/i)
})

test('report section assembly order is fixed and stable', () => {
  const scored = scoreHybridMvpAssessment(definition, { q1: 'q1_a', q2: 'q2_a' })
  assert.equal(scored.ok, true)
  if (!scored.ok) return

  assert.deepEqual(
    scored.result.report.sections.map((section) => section.id),
    ['overview', 'strengths', 'watchouts', 'development_focus', 'domain_summaries'],
  )
})

test('deterministic ranking and tie behavior drives deterministic output ids', () => {
  const tieDefinition: HybridMvpAssessmentDefinition = {
    ...definition,
    outputTemplates: undefined,
    questions: [
      {
        id: 'q1',
        prompt: 'pick one',
        responseModel: 'single_select',
        options: [
          {
            id: 'q1_a',
            label: 'a',
            signalWeights: [
              { signalId: 'sig_a', weight: 5 },
              { signalId: 'sig_b', weight: 5 },
            ],
          },
        ],
      },
    ],
  }

  const scored = scoreHybridMvpAssessment(tieDefinition, { q1: 'q1_a' })
  assert.equal(scored.ok, true)
  if (!scored.ok) return

  const strengths = scored.result.report.sections.find((section) => section.id === 'strengths')
  assert.ok(strengths)
  assert.deepEqual(
    strengths.blocks.map((block) => block.id),
    ['strength:sig_a:balanced', 'strength:sig_b:balanced'],
  )
})

test('missing templates gracefully fall back to deterministic defaults with trace', () => {
  const noTemplateDefinition: HybridMvpAssessmentDefinition = {
    ...definition,
    outputTemplates: undefined,
  }

  const scored = scoreHybridMvpAssessment(noTemplateDefinition, { q1: 'q1_a', q2: 'q2_a' })
  assert.equal(scored.ok, true)
  if (!scored.ok) return

  assert.equal(scored.result.report.trace.some((entry) => entry.templateRef.startsWith('default:signal:')), true)
  assert.equal(scored.result.report.trace.some((entry) => entry.sectionKey === 'domain_summaries'), true)
})

test('template rendering remains safe when runtime template payload contains non-string values', () => {
  const malformedTemplateDefinition = {
    ...definition,
    outputTemplates: {
      ...definition.outputTemplates,
      overview: {
        default: { text: 'unexpected object payload' },
      },
      signalNarratives: {
        sig_a: {
          high: ['unexpected', 'array'],
        },
      },
      domainNarratives: {
        style: {
          summary: 42,
        },
      },
    },
  } as unknown as HybridMvpAssessmentDefinition

  const scored = scoreHybridMvpAssessment(malformedTemplateDefinition, { q1: 'q1_a', q2: 'q2_a' })
  assert.equal(scored.ok, true)
  if (!scored.ok) return

  assert.match(scored.result.report.summary?.text ?? '', /strongest signal|response pattern/i)
  assert.equal(scored.result.report.trace.some((entry) => entry.templateRef.startsWith('default:')), true)
})

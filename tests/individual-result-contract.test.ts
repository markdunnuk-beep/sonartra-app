import assert from 'node:assert/strict'
import test from 'node:test'

import type { AssessmentResultRow } from '../lib/assessment-types'
import { classifyIndividualResultContract } from '../lib/server/individual-result-contract'

const baseResult: AssessmentResultRow = {
  id: 'result-1',
  assessment_id: 'assessment-1',
  assessment_version_id: 'version-1',
  version_key: 'signals-v2',
  scoring_model_key: 'signals-v2-model',
  snapshot_version: 1,
  status: 'complete',
  result_payload: null,
  response_quality_payload: null,
  completed_at: '2026-02-01T10:12:00.000Z',
  scored_at: '2026-02-01T10:12:10.000Z',
  created_at: '2026-02-01T10:12:11.000Z',
  updated_at: '2026-02-01T10:12:11.000Z',
}

test('classifies package_contract_v2 results as the canonical new-result contract', () => {
  const classification = classifyIndividualResultContract({
    ...baseResult,
    result_payload: {
      contractVersion: 'package_contract_v2',
      packageMetadata: {
        assessmentName: 'Adaptive Balance',
        packageSemver: '2.1.0',
      },
      materializedOutputs: {
        webSummaryOutputs: [
          {
            id: 'summary:1',
            key: 'adaptive-balance',
            title: 'Adaptive Balance',
            label: 'Adaptive Balance',
            status: 'available',
            severity: null,
            band: 'Balanced',
            value: { score: 74, rawScore: 12, percentile: 81, descriptor: 'Strongly balanced' },
            explanation: { text: 'Consistent balance across adaptive dimensions.' },
            visibleInProduct: true,
          },
        ],
        integrityNotices: [],
      },
    },
  })

  assert.equal(classification.kind, 'canonical_v2')
  if (classification.kind === 'canonical_v2') {
    assert.equal(classification.contract.status, 'completed')
    assert.equal(classification.contract.resultsAvailable, true)
  }
})

test('classifies hybrid_mvp_v1 payloads as explicit historic compatibility', () => {
  const classification = classifyIndividualResultContract({
    ...baseResult,
    version_key: 'hybrid-v1',
    result_payload: {
      contractVersion: 'hybrid_mvp_v1',
      assessmentMeta: {
        assessmentId: 'assessment-1',
        assessmentKey: 'signals',
        assessmentVersionKey: 'hybrid-v1',
        assessmentVersionName: 'Hybrid v1',
      },
      rankedSignals: [{ signalId: 's1', signalKey: 'Drive', domainId: 'execution', rawScore: 1, normalizedScore: 1, rank: 1 }],
      normalizedSignalScores: { s1: 1 },
      normalizedSignalPercentages: { s1: 100 },
      topSignal: { signalId: 's1', signalKey: 'Drive', signalLabel: 'Drive', normalizedPercent: 100, rank: 1 },
      overviewSummary: { id: 'summary-1', headline: 'Execution profile', text: 'Execution profile.' },
      domainSummaries: [{ domainId: 'execution', totalRawScore: 1, signalCount: 1, topSignalId: 's1', topSignalNormalizedPercent: 100 }],
      report: {
        summary: { id: 'summary-1', headline: 'Execution profile', text: 'Execution profile.' },
        sections: [{ id: 'strengths', title: 'Strengths', blocks: [{ id: 'b1', kind: 'signal', title: 'Drive', body: 'High drive', value: '100%' }] }],
      },
    },
  })

  assert.equal(classification.kind, 'historic_hybrid')
})

test('classifies non-v2 non-hybrid snapshots as historic signals compatibility', () => {
  const classification = classifyIndividualResultContract({
    ...baseResult,
    version_key: 'wplp80-v1',
    result_payload: {
      layers: [],
    },
  })

  assert.equal(classification.kind, 'historic_signals')
})

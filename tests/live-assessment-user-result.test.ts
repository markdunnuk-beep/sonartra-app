import assert from 'node:assert/strict'
import test from 'node:test'

import type { AssessmentResultRow, AssessmentRow } from '../lib/assessment-types'
import { buildLiveAssessmentUserResultContract } from '../lib/server/live-assessment-user-result'

const assessment: AssessmentRow = {
  id: 'assessment-v2',
  user_id: 'user-1',
  organisation_id: null,
  assessment_version_id: 'version-v2',
  status: 'completed',
  started_at: '2026-03-20T09:00:00.000Z',
  completed_at: '2026-03-20T09:15:00.000Z',
  last_activity_at: '2026-03-20T09:15:00.000Z',
  progress_count: 10,
  progress_percent: '100',
  current_question_index: 10,
  scoring_status: 'scored',
  source: 'web',
  metadata_json: null,
  created_at: '2026-03-20T09:00:00.000Z',
  updated_at: '2026-03-20T09:15:00.000Z',
}

const result: AssessmentResultRow = {
  id: 'result-v2',
  assessment_id: 'assessment-v2',
  assessment_version_id: 'version-v2',
  version_key: 'signals-v2',
  scoring_model_key: 'package-contract-v2-runtime',
  snapshot_version: 1,
  status: 'complete',
  result_payload: {
    contractVersion: 'package_contract_v2',
    packageMetadata: {
      assessmentName: 'Adaptive Balance',
      packageSemver: '2.1.0',
    },
    evaluation: { internal: true },
    materializedOutputs: {
      webSummaryOutputs: [
        {
          id: 'summary:dimension:adaptive-balance',
          key: 'adaptive-balance',
          title: 'Adaptive Balance',
          label: 'Adaptive Balance',
          status: 'available',
          severity: null,
          band: 'Balanced',
          value: {
            score: 74,
            rawScore: 12,
            percentile: 81,
            descriptor: 'Strongly balanced',
          },
          explanation: { text: 'Consistent balance across adaptive dimensions.' },
          visibleInProduct: true,
        },
      ],
      integrityNotices: [
        {
          id: 'integrity:1',
          severity: 'warning',
          title: 'response consistency',
          message: 'A small number of answers were inconsistent.',
          source: 'integrity_rule',
          affectedIds: ['q-1'],
        },
      ],
      technicalDiagnostics: [{ code: 'hidden', message: 'do not leak' }],
    },
  },
  response_quality_payload: null,
  report_artifact_json: null,
  completed_at: '2026-03-20T09:15:00.000Z',
  scored_at: '2026-03-20T09:15:10.000Z',
  created_at: '2026-03-20T09:15:11.000Z',
  updated_at: '2026-03-20T09:15:11.000Z',
}

test('buildLiveAssessmentUserResultContract returns a product-safe v2 contract without internal diagnostics', () => {
  const contract = buildLiveAssessmentUserResultContract({ assessment, result })

  assert.equal(contract.contractVersion, 'live_assessment_user_result/v1')
  assert.equal(contract.status, 'completed')
  assert.equal(contract.assessmentMeta.title, 'Adaptive Balance')
  assert.equal(contract.report.state, 'pending')
  assert.match(contract.report.message, /generated when you open or download it/i)
  assert.equal(contract.summaryCards.length, 1)
  assert.equal(contract.notices.length, 1)
  assert.equal('evaluation' in (contract as unknown as Record<string, unknown>), false)
  assert.equal(JSON.stringify(contract).includes('technicalDiagnostics'), false)
})

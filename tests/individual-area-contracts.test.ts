import assert from 'node:assert/strict'
import test from 'node:test'

import {
  loadIndividualAssessmentsViewModel,
  loadIndividualResultsViewModel,
} from '../lib/server/individual-area'

test('assessments contract returns start/resume/view-status actions without result rendering payloads', async () => {
  const model = await loadIndividualAssessmentsViewModel('user-1', {
    loadInventory: async () => [
      {
        id: 'signals',
        slug: 'signals',
        title: 'Sonartra Signals',
        category: 'individual',
        description: 'Baseline',
        longDescription: 'Baseline',
        status: 'in_progress',
        hasAdvancedOutputs: true,
        questionCount: 80,
        estimatedMinutes: 20,
        resultsAvailable: false,
        isRetakeAllowed: false,
        measures: [],
        operationalDetails: [],
        accessRows: [],
        outputRows: [],
        productOrder: 1,
        lifecycleState: 'in_progress',
        assessmentHref: '/assessment/workspace?definitionId=d1',
        availability: {
          definitionId: 'd1',
          definitionKey: 'signals',
          definitionSlug: 'signals',
          versionId: 'v1',
          versionKey: 'v1',
          versionName: 'v1',
        },
        latestAttemptId: 'attempt-1',
      },
    ],
  })

  assert.equal(model.length, 1)
  assert.equal(model[0]?.definitionId, 'd1')
  assert.equal(model[0]?.nextPrimaryAction, 'resume')
  assert.equal(model[0]?.attemptStatus, 'in_progress')
  assert.equal('resultId' in (model[0] as unknown as Record<string, unknown>), false)
})

test('results contract returns persisted result records and detail targets', async () => {
  const model = await loadIndividualResultsViewModel('user-1', {
    queryDb: async () => ({
      rows: [
        {
          id: 'result-1',
          assessment_id: 'assessment-1',
          assessment_version_id: 'version-1',
          version_key: 'v1',
          scoring_model_key: 'model',
          snapshot_version: 1,
          status: 'complete',
          result_payload: null,
          response_quality_payload: null,
          completed_at: '2026-03-20T09:10:00.000Z',
          scored_at: '2026-03-20T09:10:10.000Z',
          created_at: '2026-03-20T09:10:10.000Z',
          updated_at: '2026-03-20T09:10:10.000Z',
          definition_id: 'definition-1',
          definition_name: 'Sonartra Signals',
        },
        {
          id: 'result-2',
          assessment_id: 'assessment-2',
          assessment_version_id: 'version-1',
          version_key: 'v1',
          scoring_model_key: 'model',
          snapshot_version: 1,
          status: 'pending',
          result_payload: null,
          response_quality_payload: null,
          completed_at: null,
          scored_at: null,
          created_at: '2026-03-21T09:10:10.000Z',
          updated_at: '2026-03-21T09:10:10.000Z',
          definition_id: 'definition-1',
          definition_name: 'Sonartra Signals',
        },
      ],
    }) as never,
  })

  assert.equal(model.length, 2)
  assert.equal(model[0]?.readinessState, 'ready')
  assert.equal(model[0]?.detailHref, '/individual/results/result-1')
  assert.equal(model[1]?.readinessState, 'processing')
})

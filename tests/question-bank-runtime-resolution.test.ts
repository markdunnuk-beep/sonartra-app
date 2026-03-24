import assert from 'node:assert/strict'
import test from 'node:test'

import { HYBRID_MVP_CONTRACT_VERSION, type HybridMvpAssessmentDefinition } from '../lib/assessment/hybrid-mvp-scoring'
import { getQuestionsByAssessmentIdWithDependencies } from '../lib/question-bank'

const hybridDefinition: HybridMvpAssessmentDefinition = {
  contractVersion: HYBRID_MVP_CONTRACT_VERSION,
  assessmentId: 'assessment-hybrid-foundation',
  assessmentKey: 'hybrid-foundation',
  domains: [{ id: 'domain-self', key: 'self', label: 'Self' }],
  signals: [{ id: 'signal-focus', key: 'focus', label: 'Focus', domainId: 'domain-self' }],
  questions: [
    {
      id: 'hq1',
      prompt: 'Hybrid Question 1',
      responseModel: 'single_select',
      options: [
        { id: 'hq1_a', label: 'A', signalWeights: [{ signalId: 'signal-focus', weight: 2 }] },
        { id: 'hq1_b', label: 'B', signalWeights: [{ signalId: 'signal-focus', weight: 1 }] },
      ],
    },
  ],
}

test('getQuestionsByAssessmentIdWithDependencies resolves hybrid questions from definition payload without question-set tables', async () => {
  const queriedSql: string[] = []

  const response = await getQuestionsByAssessmentIdWithDependencies('assessment-hybrid', {
    queryDb: async (sql: string) => {
      queriedSql.push(sql)
      if (/FROM assessments/i.test(sql)) {
        return {
          rows: [{
            id: 'assessment-hybrid',
            user_id: 'user-1',
            organisation_id: null,
            assessment_version_id: 'version-hybrid',
            status: 'in_progress',
            started_at: null,
            completed_at: null,
            last_activity_at: null,
            progress_count: 1,
            progress_percent: '100',
            current_question_index: 1,
            scoring_status: 'not_scored',
            source: 'web',
            metadata_json: {
              liveHybridMvpV1: {
                responses: { hq1: 'hq1_b' },
                updatedAtByQuestionId: { hq1: '2026-03-24T12:00:00.000Z' },
              },
            },
            created_at: '2026-03-24T12:00:00.000Z',
            updated_at: '2026-03-24T12:00:00.000Z',
          }],
        } as never
      }

      if (/FROM assessment_versions/i.test(sql)) {
        return {
          rows: [{
            id: 'version-hybrid',
            key: 'hybrid-v1',
            name: 'Hybrid v1',
            total_questions: 1,
            is_active: true,
            package_schema_version: null,
            package_raw_payload: hybridDefinition,
            definition_payload: hybridDefinition,
          }],
        } as never
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
  })

  assert.ok(response)
  assert.equal(response?.questions.length, 1)
  assert.equal(response?.questions[0]?.question_key, 'hq1')
  assert.equal(response?.responses[0]?.question_id, 1)
  assert.equal(response?.responses[0]?.response_value, 2)
  assert.equal(queriedSql.some((sql) => /assessment_question_sets/i.test(sql)), false)
})

test('getQuestionsByAssessmentIdWithDependencies keeps legacy question-set fallback for non-package assessments', async () => {
  const response = await getQuestionsByAssessmentIdWithDependencies('assessment-legacy', {
    queryDb: async (sql: string) => {
      if (/FROM assessments/i.test(sql)) {
        return {
          rows: [{
            id: 'assessment-legacy',
            user_id: 'user-1',
            organisation_id: null,
            assessment_version_id: 'version-legacy',
            status: 'in_progress',
            started_at: null,
            completed_at: null,
            last_activity_at: null,
            progress_count: 1,
            progress_percent: '25',
            current_question_index: 1,
            scoring_status: 'not_scored',
            source: 'web',
            metadata_json: null,
            created_at: '2026-03-24T12:00:00.000Z',
            updated_at: '2026-03-24T12:00:00.000Z',
          }],
        } as never
      }

      if (/SELECT id, key, name, total_questions, is_active, package_schema_version, package_raw_payload, definition_payload/i.test(sql)) {
        return {
          rows: [{
            id: 'version-legacy',
            key: 'legacy-v1',
            name: 'Legacy v1',
            total_questions: 4,
            is_active: true,
            package_schema_version: null,
            package_raw_payload: null,
            definition_payload: null,
          }],
        } as never
      }

      if (/FROM assessment_versions av\s+INNER JOIN assessment_question_sets/i.test(sql)) {
        return {
          rows: [{
            id: 'version-legacy',
            key: 'legacy-v1',
            name: 'Legacy v1',
            total_questions: 4,
            is_active: true,
            question_set_id: 'qs-legacy',
            assessment_version_id: 'version-legacy',
            question_set_key: 'default',
            question_set_name: 'Default',
            description: null,
            question_set_is_active: true,
            created_at: '2026-03-24T12:00:00.000Z',
            updated_at: '2026-03-24T12:00:00.000Z',
          }],
        } as never
      }

      if (/FROM assessment_questions q\s+INNER JOIN assessment_question_options/i.test(sql)) {
        return {
          rows: [{
            question_number: 1,
            question_key: 'q1',
            prompt: 'Legacy Question 1',
            section_key: 'default',
            section_name: null,
            reverse_scored: false,
            option_key: 'o1',
            option_text: 'Strongly disagree',
            display_order: 1,
            numeric_value: 1,
          }],
        } as never
      }

      if (/FROM assessment_responses/i.test(sql)) {
        return {
          rows: [{
            question_id: 1,
            response_value: 1,
            response_time_ms: null,
            is_changed: false,
            updated_at: '2026-03-24T12:00:00.000Z',
          }],
        } as never
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
  })

  assert.ok(response)
  assert.equal(response?.questionSet.id, 'qs-legacy')
  assert.equal(response?.questions.length, 1)
  assert.equal(response?.responses.length, 1)
})

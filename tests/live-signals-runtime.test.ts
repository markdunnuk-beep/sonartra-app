import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveLiveSignalsPublishedVersion,
  resolveLiveSignalsPublishedVersionState,
} from '../lib/server/live-signals-runtime'

test('resolveLiveSignalsPublishedVersion returns the canonical published Signals version only when runtime is executable', async () => {
  const sqlCalls: string[] = []

  const result = await resolveLiveSignalsPublishedVersion({
    queryDb: async (sql) => {
      sqlCalls.push(sql)
      return {
        rows: [
          {
            assessment_definition_id: 'definition-signals',
            assessment_definition_key: 'sonartra_signals',
            assessment_definition_slug: 'sonartra-signals',
            current_published_version_id: 'version-signals-live',
            assessment_version_id: 'version-signals-live',
            assessment_version_key: 'signals-v2',
            assessment_version_name: 'Sonartra Signals v2',
            total_questions: 80,
            is_active: true,
            active_question_set_id: 'question-set-1',
            active_question_count: 80,
            questions_with_runtime_metadata: 80,
          },
        ],
      }
    },
  })

  assert.ok(sqlCalls[0]?.includes('FROM assessment_definitions ad'))
  assert.deepEqual(result, {
    assessmentDefinitionId: 'definition-signals',
    assessmentDefinitionKey: 'sonartra_signals',
    assessmentDefinitionSlug: 'sonartra-signals',
    currentPublishedVersionId: 'version-signals-live',
    assessmentVersionId: 'version-signals-live',
    assessmentVersionKey: 'signals-v2',
    assessmentVersionName: 'Sonartra Signals v2',
    totalQuestions: 80,
    isActive: true,
  })
})

test('resolveLiveSignalsPublishedVersionState returns runtime materialization diagnostics for a published-but-not-executable version', async () => {
  const result = await resolveLiveSignalsPublishedVersionState({
    queryDb: async () => ({
      rows: [
        {
          assessment_definition_id: 'definition-signals',
          assessment_definition_key: 'sonartra_signals',
          assessment_definition_slug: 'sonartra-signals',
          current_published_version_id: 'version-signals-live',
          assessment_version_id: 'version-signals-live',
          assessment_version_key: 'signals-v2',
          assessment_version_name: 'Sonartra Signals v2',
          total_questions: 80,
          is_active: true,
          active_question_set_id: null,
          active_question_count: 0,
          questions_with_runtime_metadata: 0,
        },
      ],
    }),
  })

  assert.equal(result.version, null)
  assert.deepEqual(result.diagnostic, {
    code: 'runtime_not_materialized',
    message: 'The published Sonartra Signals version is not runnable yet because runtime materialization has not completed.',
  })
})

test('resolveLiveSignalsPublishedVersionState returns null-equivalent state when Signals has no valid published version link', async () => {
  const result = await resolveLiveSignalsPublishedVersionState({
    queryDb: async () => ({
      rows: [
        {
          assessment_definition_id: 'definition-signals',
          assessment_definition_key: 'sonartra_signals',
          assessment_definition_slug: 'sonartra-signals',
          current_published_version_id: 'version-signals-live',
          assessment_version_id: null,
          assessment_version_key: null,
          assessment_version_name: null,
          total_questions: null,
          is_active: null,
          active_question_set_id: null,
          active_question_count: 0,
          questions_with_runtime_metadata: 0,
        },
      ],
    }),
  })

  assert.equal(result.version, null)
  assert.deepEqual(result.diagnostic, {
    code: 'no_published_version',
    message: 'No active published Sonartra Signals version is available.',
  })
})

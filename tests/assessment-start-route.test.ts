import assert from 'node:assert/strict'
import test from 'node:test'

import { startLiveSignalsAssessment } from '../lib/server/start-live-signals-assessment'

test('start helper creates a new live Signals attempt from the published admin version', async () => {
  const queryCalls: Array<{ sql: string; params?: unknown[] }> = []
  let insertedParams: unknown[] | undefined

  const response = await startLiveSignalsAssessment(
    {
      appUser: {
        clerkUserId: 'clerk-1',
        dbUserId: 'user-1',
        email: 'user@example.com',
      },
      source: 'workspace',
    },
    {
      queryDb: async (sql: string, params?: unknown[]) => {
        queryCalls.push({ sql, params })
        if (/FROM assessment_repository_assignments/i.test(sql)) return { rows: [] } as never
        if (/FROM assessments a/i.test(sql)) return { rows: [] } as never
        return { rows: [] } as never
      },
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: {
          assessmentDefinitionId: 'definition-signals',
          assessmentDefinitionKey: 'sonartra_signals',
          assessmentDefinitionSlug: 'sonartra-signals',
          currentPublishedVersionId: 'version-live',
          assessmentVersionId: 'version-live',
          assessmentVersionKey: 'signals-v2',
          assessmentVersionName: 'Sonartra Signals v2',
          totalQuestions: 80,
          isActive: true,
        },
        diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
      }),
      withTransaction: async <T>(work: (client: never) => Promise<T>) =>
        work({
          query: async (_sql: string, params?: unknown[]) => {
            insertedParams = params
            return { rows: [{ id: 'assessment-new' }] }
          },
        } as never),
      linkLatestAssignmentToAssessment: async () => {},
    },
  )

  assert.equal(response.status, 201)
  assert.deepEqual(response.body, {
    assessmentId: 'assessment-new',
    resumed: false,
    version: {
      id: 'version-live',
      key: 'signals-v2',
      name: 'Sonartra Signals v2',
      totalQuestions: 80,
    },
  })
  assert.ok(queryCalls.some((call) => /av\.assessment_definition_id = \$2/.test(call.sql)))
  assert.deepEqual(insertedParams, ['user-1', 'version-live', 'workspace'])
})

test('start helper blocks launches when no published live Signals version is available', async () => {
  const response = await startLiveSignalsAssessment(
    {
      appUser: {
        clerkUserId: 'clerk-1',
        dbUserId: 'user-1',
        email: 'user@example.com',
      },
      source: 'direct',
    },
    {
      queryDb: async () => ({ rows: [] }) as never,
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: null,
        diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
      }),
      withTransaction: async () => {
        throw new Error('withTransaction should not be called when no published version exists')
      },
      linkLatestAssignmentToAssessment: async () => {},
    },
  )

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, {
    error: 'No active published Sonartra Signals version is available.',
    code: 'no_published_version',
  })
})

test('start helper blocks launches when the published live Signals version is not materialized for runtime execution', async () => {
  const response = await startLiveSignalsAssessment(
    {
      appUser: {
        clerkUserId: 'clerk-1',
        dbUserId: 'user-1',
        email: 'user@example.com',
      },
      source: 'direct',
    },
    {
      queryDb: async () => ({ rows: [] }) as never,
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: null,
        diagnostic: {
          code: 'runtime_not_materialized',
          message: 'The published Sonartra Signals version is not runnable yet because runtime materialization has not completed.',
        },
      }),
      withTransaction: async () => {
        throw new Error('withTransaction should not be called when the runtime is not executable')
      },
      linkLatestAssignmentToAssessment: async () => {},
    },
  )

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, {
    error: 'The published Sonartra Signals version is not runnable yet because runtime materialization has not completed.',
    code: 'runtime_not_materialized',
  })
})

test('start helper resumes the latest unfinished Signals attempt even after the published version changes', async () => {
  let transactionCalled = false

  const response = await startLiveSignalsAssessment(
    {
      appUser: {
        clerkUserId: 'clerk-1',
        dbUserId: 'user-1',
        email: 'user@example.com',
      },
      source: 'direct',
    },
    {
      queryDb: async (sql: string) => {
        if (/FROM assessment_repository_assignments/i.test(sql)) {
          return { rows: [] } as never
        }

        return {
          rows: [
            {
              id: 'assessment-in-progress',
              version_id: 'version-previous',
              version_key: 'signals-v1',
              version_name: 'Sonartra Signals v1',
              total_questions: 80,
            },
          ],
        } as never
      },
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: {
          assessmentDefinitionId: 'definition-signals',
          assessmentDefinitionKey: 'sonartra_signals',
          assessmentDefinitionSlug: 'sonartra-signals',
          currentPublishedVersionId: 'version-live',
          assessmentVersionId: 'version-live',
          assessmentVersionKey: 'signals-v2',
          assessmentVersionName: 'Sonartra Signals v2',
          totalQuestions: 80,
          isActive: true,
        },
        diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
      }),
      withTransaction: async () => {
        transactionCalled = true
        throw new Error('withTransaction should not be called when resuming an existing attempt')
      },
      linkLatestAssignmentToAssessment: async () => {},
    },
  )

  assert.equal(response.status, 200)
  assert.deepEqual(response.body, {
    assessmentId: 'assessment-in-progress',
    resumed: true,
    version: {
      id: 'version-previous',
      key: 'signals-v1',
      name: 'Sonartra Signals v1',
      totalQuestions: 80,
    },
  })
  assert.equal(transactionCalled, false)
})

test('start helper prefers active assignment version when present', async () => {
  const response = await startLiveSignalsAssessment(
    {
      appUser: {
        clerkUserId: 'clerk-1',
        dbUserId: 'user-1',
        email: 'user@example.com',
      },
      source: 'workspace',
    },
    {
      queryDb: async (sql: string) => {
        if (/FROM assessment_repository_assignments/i.test(sql)) {
          return {
            rows: [{
              assignment_id: 'assignment-1',
              version_id: 'version-assigned',
              version_key: 'signals-v9',
              version_name: 'Assigned Signals v9',
              total_questions: 72,
              assessment_definition_id: 'definition-signals',
              is_active: true,
            }],
          } as never
        }

        if (/FROM assessments a/i.test(sql)) {
          return { rows: [] } as never
        }

        return { rows: [] } as never
      },
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: {
          assessmentDefinitionId: 'definition-signals',
          assessmentDefinitionKey: 'sonartra_signals',
          assessmentDefinitionSlug: 'sonartra-signals',
          currentPublishedVersionId: 'version-live',
          assessmentVersionId: 'version-live',
          assessmentVersionKey: 'signals-v2',
          assessmentVersionName: 'Sonartra Signals v2',
          totalQuestions: 80,
          isActive: true,
        },
        diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
      }),
      withTransaction: async <T>(work: (client: never) => Promise<T>) =>
        work({
          query: async () => ({ rows: [{ id: 'assessment-new' }] }),
        } as never),
      linkLatestAssignmentToAssessment: async () => {},
    },
  )

  assert.equal(response.status, 201)
  assert.deepEqual(response.body.version, {
    id: 'version-assigned',
    key: 'signals-v9',
    name: 'Assigned Signals v9',
    totalQuestions: 72,
  })
})

import assert from 'node:assert/strict'
import test from 'node:test'

import { startLiveSignalsAssessment } from '../app/api/assessments/start/route'

type StartDeps = NonNullable<Parameters<typeof startLiveSignalsAssessment>[1]>

function buildDeps(overrides: Partial<StartDeps> = {}): StartDeps {
  return {
    resolveAuthenticatedAppUser: async () => ({
      clerkUserId: 'clerk-1',
      dbUserId: 'user-1',
      email: 'user@example.com',
    }),
    resolveLiveSignalsPublishedVersion: async () => ({
      assessmentDefinitionId: 'definition-signals',
      assessmentDefinitionKey: 'sonartra_signals',
      assessmentDefinitionSlug: 'sonartra-signals',
      currentPublishedVersionId: 'version-live',
      assessmentVersionId: 'version-live',
      assessmentVersionKey: 'signals-v2',
      assessmentVersionName: 'Sonartra Signals v2',
      totalQuestions: 80,
      isActive: true,
    }),
    queryDb: async () => ({ rows: [] }),
    withTransaction: async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) =>
      work({
        query: async () => ({ rows: [{ id: 'assessment-new' }] }),
      }),
    ...overrides,
  }
}

test('start route creates a new live Signals attempt from the published admin version', async () => {
  const queryCalls: Array<{ sql: string; params?: unknown[] }> = []
  let insertedParams: unknown[] | undefined

  const response = await startLiveSignalsAssessment(
    { source: 'workspace' },
    buildDeps({
      queryDb: async (sql: string, params?: unknown[]) => {
        queryCalls.push({ sql, params })
        return { rows: [] }
      },
      withTransaction: async (work) =>
        work({
          query: async (_sql: string, params?: unknown[]) => {
            insertedParams = params
            return { rows: [{ id: 'assessment-new' }] }
          },
        }),
    }),
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
  assert.match(queryCalls[0]?.sql ?? '', /av\.assessment_definition_id = \$2/)
  assert.deepEqual(insertedParams, ['user-1', 'version-live', 'workspace'])
})

test('start route blocks launches when no published live Signals version is available', async () => {
  const response = await startLiveSignalsAssessment(
    { source: 'direct' },
    buildDeps({
      resolveLiveSignalsPublishedVersion: async () => null,
      queryDb: async () => {
        throw new Error('queryDb should not be called when no published version exists')
      },
      withTransaction: async () => {
        throw new Error('withTransaction should not be called when no published version exists')
      },
    }) as never,
  )

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, {
    error: 'No active published Sonartra Signals version is available.',
  })
})

test('start route resumes the latest unfinished Signals attempt even after the published version changes', async () => {
  let transactionCalled = false

  const response = await startLiveSignalsAssessment(
    { source: 'direct' },
    buildDeps({
      queryDb: async () => ({
        rows: [
          {
            id: 'assessment-in-progress',
            assessment_version_id: 'version-previous',
            assessment_version_key: 'signals-v1',
            assessment_version_name: 'Sonartra Signals v1',
            total_questions: 80,
          },
        ],
      }),
      withTransaction: async () => {
        transactionCalled = true
        throw new Error('withTransaction should not be called when resuming an existing attempt')
      },
    }) as never,
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

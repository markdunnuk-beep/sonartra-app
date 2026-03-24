import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { startLiveSignalsAssessment } from '../lib/server/start-live-signals-assessment'
import type { AuthenticatedAppUser } from '../lib/server/auth'

const appUser: AuthenticatedAppUser = {
  clerkUserId: 'clerk-user-1',
  dbUserId: 'user-1',
  email: 'user@example.com',
}

test('returns unauthenticated when no app user is available', async () => {
  let queryCalled = false

  const result = await startLiveSignalsAssessment(
    { appUser: null },
    {
      queryDb: async () => {
        queryCalled = true
        throw new Error('query should not be called')
      },
    },
  )

  assert.equal(result.kind, 'unauthenticated')
  assert.equal(result.status, 401)
  assert.equal(result.body.error, 'Authentication required.')
  assert.equal(queryCalled, false)
})

test('blocks starts when no active published Signals version is available', async () => {
  let transactionCalled = false

  const result = await startLiveSignalsAssessment(
    { appUser },
    {
      queryDb: async () => ({ rows: [] }) as never,
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: null,
        diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
      }),
      withTransaction: async () => {
        transactionCalled = true
        throw new Error('transaction should not be called')
      },
    },
  )

  assert.equal(result.kind, 'unavailable')
  assert.equal(result.status, 404)
  assert.match(result.body.error, /No active published Sonartra Signals version is available\./)
  assert.equal(result.body.code, 'no_published_version')
  assert.equal(transactionCalled, false)
})

test('starts from an explicitly assigned published version when live runtime resolution is unavailable', async () => {
  const result = await startLiveSignalsAssessment(
    { appUser, source: 'workspace' },
    {
      queryDb: async (sql) => {
        if (/FROM assessment_repository_assignments/i.test(sql)) {
          return {
            rows: [{
              assignment_id: 'assignment-1',
              version_id: 'version-assigned',
              version_key: 'signals-hybrid-v1',
              version_name: 'Assigned Signals Hybrid v1',
              total_questions: 64,
              assessment_definition_id: 'definition-signals',
              is_active: true,
            }],
          } as never
        }

        return { rows: [] } as never
      },
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: null,
        diagnostic: {
          code: 'runtime_not_materialized',
          message: 'The published Sonartra Signals version is not runnable yet because runtime materialization has not completed.',
        },
      }),
      withTransaction: async (work) =>
        work({
          query: async () => ({ rows: [{ id: 'assessment-new' }] }),
        } as never),
      linkLatestAssignmentToAssessment: async () => {},
    },
  )

  assert.equal(result.kind, 'ok')
  assert.equal(result.status, 201)
  assert.deepEqual(result.body.version, {
    id: 'version-assigned',
    key: 'signals-hybrid-v1',
    name: 'Assigned Signals Hybrid v1',
    totalQuestions: 64,
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
    },
  )

  assert.equal(response.status, 404)
  assert.deepEqual(response.body, {
    error: 'The published Sonartra Signals version is not runnable yet because runtime materialization has not completed.',
    code: 'runtime_not_materialized',
  })
})

test('resumes the latest unfinished Signals attempt across versions under the same definition', async () => {
  const calls: Array<{ sql: string; params: unknown[] | undefined }> = []

  const result = await startLiveSignalsAssessment(
    { appUser },
    {
      queryDb: async (sql, params) => {
        calls.push({ sql, params })

        return {
          rows: [
            {
              id: 'assessment-existing',
              version_id: 'version-previous',
              version_key: 'wplp80-v1',
              version_name: 'WPLP-80 v1',
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
          currentPublishedVersionId: 'version-current',
          assessmentVersionId: 'version-current',
          assessmentVersionKey: 'wplp80-v2',
          assessmentVersionName: 'WPLP-80 v2',
          totalQuestions: 80,
          isActive: true,
        },
        diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
      }),
      withTransaction: async () => {
        throw new Error('transaction should not be called when resuming')
      },
      linkLatestAssignmentToAssessment: async () => {},
    },
  )

  assert.equal(result.kind, 'ok')
  assert.equal(result.status, 200)
  assert.equal(result.body.assessmentId, 'assessment-existing')
  assert.equal(result.body.resumed, true)
  assert.deepEqual(result.body.version, {
    id: 'version-previous',
    key: 'wplp80-v1',
    name: 'WPLP-80 v1',
    totalQuestions: 80,
  })
  assert.equal(calls.length, 2)
  assert.match(calls[1]!.sql, /av\.assessment_definition_id = \$2/i)
  assert.deepEqual(calls[1]!.params, ['user-1', 'definition-signals', 'version-current'])
})

test('creates a new attempt against the current published version when no unfinished attempt exists', async () => {
  const queryCalls: Array<{ sql: string; params: unknown[] | undefined }> = []
  const insertCalls: Array<{ sql: string; params: unknown[] | undefined }> = []

  const result = await startLiveSignalsAssessment(
    { appUser, source: 'workspace' },
    {
      queryDb: async (sql, params) => {
        queryCalls.push({ sql, params })
        return { rows: [] } as never
      },
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: {
          assessmentDefinitionId: 'definition-signals',
          assessmentDefinitionKey: 'sonartra_signals',
          assessmentDefinitionSlug: 'sonartra-signals',
          currentPublishedVersionId: 'version-current',
          assessmentVersionId: 'version-current',
          assessmentVersionKey: 'wplp80-v2',
          assessmentVersionName: 'WPLP-80 v2',
          totalQuestions: 80,
          isActive: true,
        },
        diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
      }),
      withTransaction: async (work) =>
        work({
          query: async (sql: string, params?: unknown[]) => {
            insertCalls.push({ sql, params })
            return { rows: [{ id: 'assessment-new' }] }
          },
        } as never),
      linkLatestAssignmentToAssessment: async () => {},
    },
  )

  assert.equal(result.kind, 'ok')
  assert.equal(result.status, 201)
  assert.equal(result.body.assessmentId, 'assessment-new')
  assert.equal(result.body.resumed, false)
  assert.deepEqual(result.body.version, {
    id: 'version-current',
    key: 'wplp80-v2',
    name: 'WPLP-80 v2',
    totalQuestions: 80,
  })
  assert.equal(queryCalls.length, 2)
  assert.equal(insertCalls.length, 1)
  assert.match(insertCalls[0]!.sql, /insert into assessments/i)
  assert.deepEqual(insertCalls[0]!.params, ['user-1', 'version-current', 'workspace'])
})



test('assessmentDefinitionId launch is assignment-scoped and does not fall back to an unrelated published version', async () => {
  const result = await startLiveSignalsAssessment(
    { appUser, assessmentDefinitionId: 'definition-hybrid' },
    {
      queryDb: async (sql) => {
        if (/FROM assessment_repository_assignments/i.test(sql)) {
          return { rows: [] } as never
        }

        return { rows: [] } as never
      },
      resolveLiveSignalsPublishedVersionState: async () => ({
        version: {
          assessmentDefinitionId: 'definition-signals',
          assessmentDefinitionKey: 'sonartra_signals',
          assessmentDefinitionSlug: 'sonartra-signals',
          currentPublishedVersionId: 'version-current',
          assessmentVersionId: 'version-current',
          assessmentVersionKey: 'wplp80-v2',
          assessmentVersionName: 'WPLP-80 v2',
          totalQuestions: 80,
          isActive: true,
        },
        diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
      }),
      withTransaction: async () => {
        throw new Error('transaction should not be called when assignment is missing')
      },
    },
  )

  assert.equal(result.kind, 'unavailable')
  assert.equal(result.status, 404)
  assert.equal(result.body.error, 'No launchable published assignment found for this assessment.')
})
test('route file keeps the helper internal and exports only POST', async () => {
  const source = await readFile(new URL('../app/api/assessments/start/route.ts', import.meta.url), 'utf8')

  assert.match(source, /import \{ startLiveSignalsAssessment \} from ['"]@\/lib\/server\/start-live-signals-assessment['"]/)
  assert.match(source, /export async function POST\(/)
  assert.doesNotMatch(source, /export\s+(async\s+)?function\s+startLiveSignalsAssessment\s*\(/)
  assert.doesNotMatch(source, /export\s+\{\s*startLiveSignalsAssessment\s*\}/)
})

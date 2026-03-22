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
      withTransaction: async () => {
        transactionCalled = true
        throw new Error('transaction should not be called')
      },
    },
  )

  assert.equal(result.kind, 'unavailable')
  assert.equal(result.status, 404)
  assert.match(result.body.error, /No active published Sonartra Signals version is available\./)
  assert.equal(transactionCalled, false)
})

test('resumes the latest unfinished Signals attempt across versions under the same definition', async () => {
  const calls: Array<{ sql: string; params: unknown[] | undefined }> = []

  const result = await startLiveSignalsAssessment(
    { appUser },
    {
      queryDb: async (sql, params) => {
        calls.push({ sql, params })

        if (calls.length === 1) {
          return {
            rows: [
              {
                id: 'version-current',
                key: 'wplp80-v2',
                name: 'WPLP-80 v2',
                total_questions: 80,
                is_active: true,
                assessment_definition_id: 'definition-signals',
              },
            ],
          } as never
        }

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
      withTransaction: async () => {
        throw new Error('transaction should not be called when resuming')
      },
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
  assert.match(calls[0]!.sql, /from assessment_definitions ad/i)
  assert.deepEqual(calls[0]!.params, ['sonartra_signals'])
  assert.match(calls[1]!.sql, /av\.assessment_definition_id = \$2/i)
  assert.deepEqual(calls[1]!.params, ['user-1', 'definition-signals'])
})

test('creates a new attempt against the current published version when no unfinished attempt exists', async () => {
  const queryCalls: Array<{ sql: string; params: unknown[] | undefined }> = []
  const insertCalls: Array<{ sql: string; params: unknown[] | undefined }> = []

  const result = await startLiveSignalsAssessment(
    { appUser, source: 'workspace' },
    {
      queryDb: async (sql, params) => {
        queryCalls.push({ sql, params })

        if (queryCalls.length === 1) {
          return {
            rows: [
              {
                id: 'version-current',
                key: 'wplp80-v2',
                name: 'WPLP-80 v2',
                total_questions: 80,
                is_active: true,
                assessment_definition_id: 'definition-signals',
              },
            ],
          } as never
        }

        return { rows: [] } as never
      },
      withTransaction: async (work) =>
        work({
          query: async (sql: string, params?: unknown[]) => {
            insertCalls.push({ sql, params })
            return { rows: [{ id: 'assessment-new' }] }
          },
        } as never),
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

test('route file keeps the helper internal and exports only POST', async () => {
  const source = await readFile(new URL('../app/api/assessments/start/route.ts', import.meta.url), 'utf8')

  assert.match(source, /import \{ startLiveSignalsAssessment \} from ['"]@\/lib\/server\/start-live-signals-assessment['"]/)
  assert.match(source, /export async function POST\(/)
  assert.doesNotMatch(source, /export\s+(async\s+)?function\s+startLiveSignalsAssessment\s*\(/)
  assert.doesNotMatch(source, /export\s+\{\s*startLiveSignalsAssessment\s*\}/)
})

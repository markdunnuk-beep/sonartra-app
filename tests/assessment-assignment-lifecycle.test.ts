import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createAdminAssessmentAssignment,
  markAssignmentCompletionProcessing,
  markAssignmentResultReady,
} from '../lib/server/assessment-assignments'

test('createAdminAssessmentAssignment creates an assigned row for the current published version', async () => {
  const queries: string[] = []

  const result = await createAdminAssessmentAssignment(
    {
      assessmentId: 'definition-1',
      targetUserEmail: 'person@example.com',
    },
    {
      resolveAdminAccess: async () => ({
        isAuthenticated: true,
        canAccessAdmin: true,
        adminIdentityId: 'admin-1',
        adminIdentityType: 'internal',
      }) as never,
      withTransaction: (async <T>(work: (client: never) => Promise<T>) => work({
        query: async (sql: string) => {
          queries.push(sql)
          if (/FROM assessment_definitions/i.test(sql)) {
            return {
              rows: [{
                definition_id: 'definition-1',
                definition_name: 'Signals',
                version_id: 'version-published',
                version_label: '1.2.0',
                version_name: 'Signals v1.2.0',
              }],
            }
          }
          if (/FROM users/i.test(sql)) {
            return { rows: [{ id: 'user-1', email: 'person@example.com', first_name: 'Test', last_name: 'User' }] }
          }
          if (/FROM assessment_repository_assignments/i.test(sql)) {
            return { rows: [] }
          }
          if (/INSERT INTO assessment_repository_assignments/i.test(sql)) {
            return { rows: [] }
          }
          throw new Error(`Unexpected query: ${sql}`)
        },
      } as never)) as never,
    },
  )

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.code, 'assigned')
  assert.ok(queries.some((sql) => /INSERT INTO assessment_repository_assignments/i.test(sql)))
})

test('createAdminAssessmentAssignment blocks assignment when assessment has no published version', async () => {
  const result = await createAdminAssessmentAssignment(
    {
      assessmentId: 'definition-1',
      targetUserEmail: 'person@example.com',
    },
    {
      resolveAdminAccess: async () => ({
        isAuthenticated: true,
        canAccessAdmin: true,
        adminIdentityId: 'admin-1',
        adminIdentityType: 'internal',
      }) as never,
      withTransaction: (async <T>(work: (client: never) => Promise<T>) => work({
        query: async (sql: string) => {
          if (/FROM assessment_definitions/i.test(sql)) {
            return {
              rows: [{
                definition_id: 'definition-1',
                definition_name: 'Signals',
                version_id: null,
                version_label: null,
                version_name: null,
              }],
            }
          }
          throw new Error(`Unexpected query: ${sql}`)
        },
      } as never)) as never,
    },
  )

  assert.equal(result.ok, false)
  if (result.ok) return
  assert.equal(result.code, 'invalid_transition')
})

test('assignment lifecycle transitions from completion processing to results ready', async () => {
  const executed: string[] = []
  const client = {
    query: async (sql: string) => {
      executed.push(sql)
      return { rows: [] }
    },
  }

  await markAssignmentCompletionProcessing('assessment-1', client as never)
  await markAssignmentResultReady({ assessmentId: 'assessment-1', resultId: 'result-1' }, client as never)

  assert.ok(executed.some((sql) => /status = CASE WHEN status IN \('assigned', 'in_progress'\) THEN 'completed_processing'/i.test(sql)))
  assert.ok(executed.some((sql) => /SET status = 'results_ready'/i.test(sql)))
})

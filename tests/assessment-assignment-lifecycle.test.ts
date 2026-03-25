import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createAdminAssessmentAssignment,
  listAdminAssessmentAssignments,
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
        isAllowed: true,
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
        isAllowed: true,
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

test('listAdminAssessmentAssignments keeps assignment rows visible when linked user membership/org data is missing', async () => {
  const executed: string[] = []

  const rows = await listAdminAssessmentAssignments('definition-1', {
    queryDb: async (sql: string) => {
      executed.push(sql)
      return {
        rows: [
          {
            id: 'assignment-1',
            target_user_id: 'user-1',
            target_user_email: null,
            target_user_name: null,
            assessment_version_id: null,
            assessment_version_label: null,
            status: 'assigned',
            linked_assessment_id: null,
            linked_organisation_id: null,
            linked_organisation_name: null,
            linked_membership_role: null,
            latest_result_id: null,
            result_status: null,
            result_scored_at: null,
            assigned_at: '2026-03-01T10:00:00Z',
            started_at: null,
            completed_at: null,
            results_ready_at: null,
            failed_at: null,
            assigned_by_name: null,
            failure_message: null,
          },
        ],
      } as never
    },
  })

  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.targetUserEmail, 'Unknown user')
  assert.equal(rows[0]?.assessmentId, null)
  assert.equal(rows[0]?.linkedOrganisationId, null)
  assert.equal(rows[0]?.latestResultId, null)
  assert.equal(rows[0]?.assessmentVersionLabel, 'unknown')

  const sql = executed[0] ?? ''
  assert.match(sql, /LEFT JOIN users/i)
  assert.match(sql, /LEFT JOIN assessment_versions/i)
  assert.match(sql, /LEFT JOIN LATERAL \(\s*SELECT a\.id, a\.organisation_id/i)
  assert.match(sql, /LEFT JOIN assessment_results linked_result/i)
})

test('listAdminAssessmentAssignments maps linked attempt, organisation, and fallback result fields for admin visibility', async () => {
  const rows = await listAdminAssessmentAssignments('definition-1', {
    queryDb: async () => ({
      rows: [
        {
          id: 'assignment-2',
          target_user_id: 'user-2',
          target_user_email: 'person@example.com',
          target_user_name: 'Person Example',
          assessment_version_id: 'version-2',
          assessment_version_label: '2.0.0',
          status: 'results_ready',
          linked_assessment_id: 'attempt-2',
          linked_organisation_id: 'org-1',
          linked_organisation_name: 'Northwind',
          linked_membership_role: 'member',
          latest_result_id: 'result-2',
          result_status: 'complete',
          result_scored_at: '2026-03-02T12:00:00Z',
          assigned_at: '2026-03-01T10:00:00Z',
          started_at: '2026-03-01T10:05:00Z',
          completed_at: '2026-03-01T10:30:00Z',
          results_ready_at: '2026-03-01T10:31:00Z',
          failed_at: null,
          assigned_by_name: 'Admin User',
          failure_message: null,
        },
      ],
    }) as never,
  })

  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.assessmentId, 'attempt-2')
  assert.equal(rows[0]?.linkedOrganisationId, 'org-1')
  assert.equal(rows[0]?.linkedOrganisationName, 'Northwind')
  assert.equal(rows[0]?.linkedMembershipRole, 'member')
  assert.equal(rows[0]?.latestResultId, 'result-2')
  assert.equal(rows[0]?.resultStatus, 'complete')
})

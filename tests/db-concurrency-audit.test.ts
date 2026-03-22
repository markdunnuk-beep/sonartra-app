import assert from 'node:assert/strict'
import test from 'node:test'

import { getAdminAccessRegistryData } from '../lib/admin/server/access-registry'
import { getAdminAuditWorkspaceData } from '../lib/admin/server/audit-workspace'
import { getQuestionsByAssessmentIdWithDependencies } from '../lib/question-bank'

type QueryCall = {
  sql: string
  params: unknown[] | undefined
}

function createTrackedQueryDb(
  resolver: (sql: string, params: unknown[] | undefined) => { rows: unknown[] },
) {
  const calls: QueryCall[] = []
  let inFlight = 0
  let maxInFlight = 0

  return {
    calls,
    getMaxInFlight: () => maxInFlight,
    queryDb: async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params })
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)

      await Promise.resolve()

      try {
        return resolver(sql, params) as never
      } finally {
        inFlight -= 1
      }
    },
  }
}

test('question bank assessment loader avoids overlapping DB reads while assembling questions and responses', async () => {
  const tracked = createTrackedQueryDb((sql) => {
    if (/from assessments/i.test(sql)) {
      return {
        rows: [{
          id: 'assessment-1',
          user_id: 'user-1',
          organisation_id: null,
          assessment_version_id: 'version-1',
          status: 'in_progress',
          started_at: '2026-01-01T10:00:00.000Z',
          completed_at: null,
          last_activity_at: '2026-01-01T10:00:00.000Z',
          progress_count: 1,
          progress_percent: '1.25',
          current_question_index: 1,
          scoring_status: 'not_scored',
          source: 'web',
          metadata_json: null,
          created_at: '2026-01-01T10:00:00.000Z',
          updated_at: '2026-01-01T10:00:00.000Z',
        }],
      }
    }

    if (/from assessment_versions/i.test(sql)) {
      return { rows: [{ id: 'version-1', key: 'wplp80-v1', name: 'WPLP', total_questions: 80, is_active: true }] }
    }

    if (/from assessment_versions av/i.test(sql) && /assessment_question_sets/i.test(sql)) {
      return {
        rows: [{
          id: 'version-1',
          key: 'wplp80-v1',
          name: 'WPLP',
          total_questions: 80,
          is_active: true,
          question_set_id: 'set-1',
          assessment_version_id: 'version-1',
          question_set_key: 'default',
          question_set_name: 'Default',
          description: 'Default set',
          question_set_is_active: true,
          created_at: '2026-01-01T10:00:00.000Z',
          updated_at: '2026-01-01T10:00:00.000Z',
        }],
      }
    }

    if (/from assessment_questions q/i.test(sql)) {
      return {
        rows: [{
          question_number: 1,
          question_key: 'q_1',
          prompt: 'Prompt',
          section_key: 'core',
          section_name: 'Core',
          reverse_scored: false,
          option_key: 'opt_1',
          option_text: 'Option 1',
          display_order: 1,
          numeric_value: 1,
        }],
      }
    }

    if (/from assessment_responses/i.test(sql)) {
      return {
        rows: [{
          question_id: 1,
          response_value: 1,
          response_time_ms: 1200,
          is_changed: false,
          updated_at: '2026-01-01T10:01:00.000Z',
        }],
      }
    }

    throw new Error(`Unexpected SQL in question-bank test: ${sql}`)
  })

  const result = await getQuestionsByAssessmentIdWithDependencies('assessment-1', { queryDb: tracked.queryDb as never })

  assert.equal(tracked.getMaxInFlight(), 1)
  assert.deepEqual(
    tracked.calls.map(({ sql }) => {
      if (/from assessments/i.test(sql)) return 'assessment'
      if (/from assessment_versions av/i.test(sql)) return 'version_question_set'
      if (/from assessment_versions/i.test(sql)) return 'version'
      if (/from assessment_questions q/i.test(sql)) return 'questions'
      if (/from assessment_responses/i.test(sql)) return 'responses'
      return 'unknown'
    }),
    ['assessment', 'version', 'version_question_set', 'questions', 'responses'],
  )
  assert.equal(result?.responses.length, 1)
  assert.equal(result?.questions.length, 1)
})

test('admin access registry loader sequences collection queries to avoid pool fan-out', async () => {
  const tracked = createTrackedQueryDb((sql) => {
    if (/from admin_identities/i.test(sql)) {
      return {
        rows: [{
          id: 'identity-1',
          email: 'alex@example.com',
          full_name: 'Alex Mercer',
          identity_type: 'internal',
          auth_provider: 'clerk',
          auth_subject: 'user_123',
          status: 'active',
          last_activity_at: '2026-03-20T10:00:00.000Z',
          created_at: '2026-03-01T10:00:00.000Z',
        }],
      }
    }

    if (/from admin_identity_roles/i.test(sql)) {
      return { rows: [{ identity_id: 'identity-1', key: 'internal_admin', label: 'Internal admin', organisation_id: null }] }
    }

    if (/from organisation_memberships/i.test(sql)) {
      return {
        rows: [{
          identity_id: 'identity-1',
          organisation_id: 'org-1',
          organisation_name: 'Northstar Logistics',
          organisation_slug: 'northstar-logistics',
          organisation_country: 'US',
          organisation_status: 'active',
          organisation_created_at: '2026-01-01T10:00:00.000Z',
          membership_role: 'owner',
          membership_status: 'active',
          joined_at: '2026-02-01T10:00:00.000Z',
          invited_at: null,
          last_activity_at: '2026-03-20T10:00:00.000Z',
        }],
      }
    }

    if (/from access_audit_events/i.test(sql)) {
      return {
        rows: [{
          id: 'audit-1',
          identity_id: 'identity-1',
          event_type: 'membership_joined',
          event_summary: 'Joined organisation.',
          actor_name: 'System',
          happened_at: '2026-03-20T10:00:00.000Z',
        }],
      }
    }

    throw new Error(`Unexpected SQL in access-registry test: ${sql}`)
  })

  const result = await getAdminAccessRegistryData({ queryDb: tracked.queryDb as never })

  assert.equal(tracked.getMaxInFlight(), 1)
  assert.deepEqual(
    tracked.calls.map(({ sql }) => {
      if (/from admin_identities/i.test(sql)) return 'identities'
      if (/from admin_identity_roles/i.test(sql)) return 'roles'
      if (/from organisation_memberships/i.test(sql)) return 'memberships'
      if (/from access_audit_events/i.test(sql)) return 'audit'
      return 'unknown'
    }),
    ['identities', 'roles', 'memberships', 'audit'],
  )
  assert.equal(result[0]?.id, 'identity-1')
  assert.equal(result[0]?.roles?.length, 1)
})

test('admin audit workspace loader runs schema, event, and lookup queries without overlapping DB work', async () => {
  const tracked = createTrackedQueryDb((sql) => {
    if (/to_regclass/i.test(sql)) {
      return { rows: [{ has_access_audit_events_table: true }] }
    }

    if (/information_schema\.columns/i.test(sql)) {
      return {
        rows: [
          { column_name: 'entity_type' },
          { column_name: 'entity_id' },
          { column_name: 'entity_label' },
          { column_name: 'entity_secondary' },
        ],
      }
    }

    if (/select\s+id,\s+event_type,\s+summary/i.test(sql)) {
      return {
        rows: [{
          id: 'audit-1',
          event_type: 'organisation_created',
          summary: 'Organisation record created.',
          actor_name: null,
          actor_id: null,
          happened_at: '2026-03-20T10:00:00.000Z',
          source: 'organisation',
          organisation_id: 'org-1',
          organisation_name: 'Northstar Logistics',
          entity_type: 'organisation',
          entity_id: 'org-1',
          entity_name: 'Northstar Logistics',
          entity_secondary: 'northstar-logistics',
          is_derived: true,
        }],
      }
    }

    if (/count\(\*\)::int as total_count/i.test(sql)) {
      return { rows: [{ total_count: 1 }] }
    }

    if (/select distinct\s+actor\.id::text as id/i.test(sql)) {
      return { rows: [{ id: 'actor-1', label: 'Rina Patel' }] }
    }

    if (/select id::text as id, name as label/i.test(sql)) {
      return { rows: [{ id: 'org-1', label: 'Northstar Logistics' }] }
    }

    if (/with event_types as/i.test(sql)) {
      return { rows: [{ event_type: 'organisation_created' }] }
    }

    throw new Error(`Unexpected SQL in audit-workspace test: ${sql}`)
  })

  const result = await getAdminAuditWorkspaceData(undefined, { queryDb: tracked.queryDb as never })

  assert.equal(tracked.getMaxInFlight(), 1)
  assert.deepEqual(
    tracked.calls.map(({ sql }) => {
      if (/to_regclass/i.test(sql)) return 'capabilities_table'
      if (/information_schema\.columns/i.test(sql)) return 'capabilities_columns'
      if (/select\s+id,\s+event_type,\s+summary/i.test(sql)) return 'events'
      if (/count\(\*\)::int as total_count/i.test(sql)) return 'count'
      if (/select distinct\s+actor\.id::text as id/i.test(sql)) return 'actors'
      if (/select id::text as id, name as label/i.test(sql)) return 'organisations'
      if (/with event_types as/i.test(sql)) return 'event_types'
      return 'unknown'
    }),
    ['capabilities_table', 'capabilities_columns', 'events', 'count', 'actors', 'organisations', 'event_types'],
  )
  assert.equal(result.events.length, 1)
  assert.equal(result.pagination.totalCount, 1)
})

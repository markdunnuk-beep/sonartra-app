import assert from 'node:assert/strict'
import test from 'node:test'
import {
  archiveAdminAssessmentVersion,
  createAdminAssessment,
  createAdminAssessmentDraftVersion,
  publishAdminAssessmentVersion,
} from '../lib/admin/server/assessment-management'

function createBaseAccess(allowed = true) {
  return {
    isAuthenticated: true,
    isAllowed: allowed,
    email: 'rina.patel@sonartra.com',
    allowlist: ['rina.patel@sonartra.com'],
    accessSource: 'email_allowlist' as const,
    provisionalRole: null,
    provisionalAccess: null,
  }
}

test('create assessment flow succeeds and records audit', async () => {
  const auditEvents: unknown[][] = []
  const inserts: unknown[][] = []
  const result = await createAdminAssessment({
    name: 'Sonartra Signals',
    key: 'sonartra_signals',
    slug: 'sonartra-signals',
    category: 'behavioural_intelligence',
    description: 'Core behavioural intelligence line.',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    queryDb: async () => ({ rows: [] } as never),
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/insert into assessment_definitions/i.test(sql)) {
          inserts.push(params)
          return { rows: [] }
        }

        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(params)
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T00:00:00.000Z'),
    createId: () => 'new-assessment-id',
  } as never)

  assert.equal(result.ok, true)
  assert.equal(result.code, 'created')
  assert.equal(result.assessmentId, 'new-assessment-id')
  assert.equal(inserts.length, 1)
  assert.equal(auditEvents.length, 1)
})

test('create assessment flow rejects duplicate keys and denied access', async () => {
  const duplicate = await createAdminAssessment({
    name: 'Signals',
    key: 'sonartra_signals',
    slug: 'signals',
    category: 'behavioural_intelligence',
    description: '',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    queryDb: async (sql: string) => ({ rows: /where key = \$1/i.test(sql) ? [{ id: 'assessment-1' }] : [] } as never),
  } as never)

  const denied = await createAdminAssessment({
    name: 'Signals',
    key: 'signals',
    slug: 'signals',
    category: 'behavioural_intelligence',
    description: '',
  }, {
    resolveAdminAccess: async () => createBaseAccess(false),
  } as never)

  assert.equal(duplicate.ok, false)
  assert.equal(duplicate.code, 'duplicate_key')
  assert.equal(denied.ok, false)
  assert.equal(denied.code, 'permission_denied')
})

test('create draft version succeeds for an existing assessment', async () => {
  const inserts: unknown[][] = []
  const auditEvents: unknown[][] = []
  const result = await createAdminAssessmentDraftVersion({
    assessmentId: 'assessment-1',
    versionLabel: '1.1.0',
    notes: 'New draft candidate',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/select id, name from assessment_definitions/i.test(sql)) {
          return { rows: [{ id: 'assessment-1', name: 'Sonartra Signals' }] }
        }

        if (/select id from assessment_versions where assessment_definition_id = \$1 and version_label = \$2/i.test(sql)) {
          return { rows: [] }
        }

        if (/insert into assessment_versions/i.test(sql)) {
          inserts.push(params)
          return { rows: [] }
        }

        if (/update assessment_definitions/i.test(sql)) {
          return { rows: [] }
        }

        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(params)
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T00:00:00.000Z'),
    createId: (() => {
      const ids = ['version-1', 'audit-1']
      return () => ids.shift() ?? 'audit-2'
    })(),
  } as never)

  assert.equal(result.ok, true)
  assert.equal(result.code, 'created')
  assert.equal(result.versionId, 'version-1')
  assert.equal(inserts.length, 1)
  assert.equal(auditEvents.length, 2)
})

test('publish version succeeds and enforces a single published version', async () => {
  const updates: string[] = []
  const result = await publishAdminAssessmentVersion({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [{
            id: 'version-2',
            assessment_definition_id: 'assessment-1',
            version_label: '1.2.0',
            lifecycle_status: 'draft',
            updated_at: '2026-03-21T09:00:00.000Z',
            assessment_name: 'Sonartra Signals',
          }] }
        }

        if (/update assessment_versions\s+set lifecycle_status = 'archived'/i.test(sql) || /update assessment_versions\s+set lifecycle_status = 'published'/i.test(sql) || /update assessment_definitions/i.test(sql)) {
          updates.push(sql)
          return { rows: /returning id/i.test(sql) ? [{ id: 'version-2' }] : [] }
        }

        if (/insert into access_audit_events/i.test(sql)) {
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T10:00:00.000Z'),
    createId: (() => {
      const ids = ['audit-1', 'audit-2']
      return () => ids.shift() ?? 'audit-3'
    })(),
  } as never)

  assert.equal(result.ok, true)
  assert.equal(result.code, 'published')
  assert.equal(updates.length, 3)
})

test('archive version succeeds and requires confirmation', async () => {
  const missingConfirmation = await archiveAdminAssessmentVersion({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
  } as never)

  const result = await archiveAdminAssessmentVersion({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
    confirmation: 'confirm',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [{
            id: 'version-2',
            assessment_definition_id: 'assessment-1',
            version_label: '1.2.0',
            lifecycle_status: 'published',
            updated_at: '2026-03-21T09:00:00.000Z',
            assessment_name: 'Sonartra Signals',
          }] }
        }

        if (/update assessment_versions/i.test(sql) || /update assessment_definitions/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T11:00:00.000Z'),
    createId: (() => {
      const ids = ['audit-1', 'audit-2']
      return () => ids.shift() ?? 'audit-3'
    })(),
  } as never)

  assert.equal(missingConfirmation.ok, false)
  assert.equal(missingConfirmation.code, 'validation_error')
  assert.equal(result.ok, true)
  assert.equal(result.code, 'archived')
})

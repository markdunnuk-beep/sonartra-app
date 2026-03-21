import assert from 'node:assert/strict'
import test from 'node:test'
import {
  archiveAdminAssessmentVersion,
  createAdminAssessment,
  createAdminAssessmentDraftVersion,
  importAdminAssessmentPackage,
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

const validPackage = JSON.stringify({
  meta: {
    schemaVersion: 'sonartra-assessment-package/v1',
    assessmentKey: 'sonartra_signals',
    assessmentTitle: 'Sonartra Signals',
    versionLabel: '1.2.0',
    defaultLocale: 'en',
  },
  dimensions: [
    { id: 'drive', labelKey: 'dimension.drive.label' },
    { id: 'focus', labelKey: 'dimension.focus.label' },
  ],
  questions: [
    {
      id: 'q1',
      promptKey: 'question.q1.prompt',
      dimensionId: 'drive',
      reverseScored: false,
      weight: 1,
      options: [
        { id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { drive: 1 } },
        { id: 'q1.b', labelKey: 'question.q1.option.b', value: 2, scoreMap: { drive: 2, focus: 1 } },
      ],
    },
  ],
  scoring: {
    dimensionRules: [
      { dimensionId: 'drive', aggregation: 'sum' },
    ],
  },
  normalization: {
    scales: [
      {
        id: 'core-scale',
        dimensionIds: ['drive', 'focus'],
        range: { min: 0, max: 10 },
        bands: [
          { key: 'low', min: 0, max: 3, labelKey: 'band.low.label' },
          { key: 'high', min: 7, max: 10, labelKey: 'band.high.label' },
        ],
      },
    ],
  },
  outputs: {
    reportRules: [
      {
        key: 'core-summary',
        labelKey: 'output.core-summary.label',
        dimensionIds: ['drive'],
        normalizationScaleId: 'core-scale',
      },
    ],
  },
  language: {
    locales: [
      {
        locale: 'en',
        text: {
          'dimension.drive.label': 'Drive',
          'dimension.focus.label': 'Focus',
          'question.q1.prompt': 'I naturally set the pace for the team.',
          'question.q1.option.a': 'Rarely',
          'question.q1.option.b': 'Often',
          'band.low.label': 'Low',
          'band.high.label': 'High',
          'output.core-summary.label': 'Core summary',
        },
      },
    ],
  },
})

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

test('valid package import succeeds and records replacement audit metadata', async () => {
  const updates: unknown[][] = []
  const auditEvents: string[] = []
  const result = await importAdminAssessmentPackage({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
    packageText: validPackage,
    sourceFilename: 'signals-v1.json',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [{
            id: 'version-2',
            assessment_definition_id: 'assessment-1',
            version_label: '1.2.0',
            lifecycle_status: 'draft',
            updated_at: '2026-03-21T09:00:00.000Z',
            package_status: 'missing',
            assessment_name: 'Sonartra Signals',
          }] }
        }

        if (/update assessment_versions/i.test(sql) || /update assessment_definitions/i.test(sql)) {
          updates.push(params)
          return { rows: [] }
        }

        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
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
  assert.equal(result.code, 'imported')
  assert.equal(updates.length, 2)
  assert.deepEqual(auditEvents, ['assessment_package_imported', 'assessment_package_imported'])
})

test('package import rejects malformed JSON before any database writes', async () => {
  const result = await importAdminAssessmentPackage({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    packageText: '{bad json',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'validation_error')
  assert.match(result.message, /could not be parsed/i)
})

test('package import persists validation failure for missing sections and broken references', async () => {
  const auditEvents: string[] = []
  const invalidPayload = JSON.stringify({
    meta: {
      schemaVersion: 'sonartra-assessment-package/v1',
      assessmentKey: 'sonartra_signals',
      assessmentTitle: 'Sonartra Signals',
      defaultLocale: 'en',
    },
    dimensions: [{ id: 'drive', labelKey: 'dimension.drive.label' }, { id: 'drive', labelKey: 'dimension.drive.duplicate' }],
    questions: [{ id: 'q1', promptKey: 'question.q1.prompt', dimensionId: 'missing', options: [{ id: 'a', labelKey: 'option.a', value: 1, scoreMap: { missing: 1 } }] }],
    scoring: { dimensionRules: [{ dimensionId: 'missing', aggregation: 'sum' }] },
    normalization: { scales: [{ id: 'core', dimensionIds: ['missing'], range: { min: 10, max: 0 }, bands: [] }] },
    language: { locales: [{ locale: 'en', text: { 'dimension.drive.label': 'Drive', 'question.q1.prompt': 'Prompt', 'option.a': 'A' } }] },
  })

  const result = await importAdminAssessmentPackage({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
    packageText: invalidPayload,
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [{
            id: 'version-2',
            assessment_definition_id: 'assessment-1',
            version_label: '1.2.0',
            lifecycle_status: 'draft',
            updated_at: '2026-03-21T09:00:00.000Z',
            package_status: 'missing',
            assessment_name: 'Sonartra Signals',
          }] }
        }

        if (/update assessment_versions/i.test(sql) || /update assessment_definitions/i.test(sql)) {
          return { rows: [] }
        }

        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
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

  assert.equal(result.ok, false)
  assert.equal(result.code, 'validation_error')
  assert.ok((result.validationResult?.errors.length ?? 0) >= 4)
  assert.deepEqual(auditEvents, ['assessment_package_validation_failed', 'assessment_package_validation_failed'])
})

test('publish version succeeds when a valid package is attached and enforces a single published version', async () => {
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
            package_status: 'valid',
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

test('publish version is blocked when no valid package exists', async () => {
  const auditEvents: string[] = []
  const result = await publishAdminAssessmentVersion({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [{
            id: 'version-2',
            assessment_definition_id: 'assessment-1',
            version_label: '1.2.0',
            lifecycle_status: 'draft',
            updated_at: '2026-03-21T09:00:00.000Z',
            package_status: 'invalid',
            assessment_name: 'Sonartra Signals',
          }] }
        }

        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
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

  assert.equal(result.ok, false)
  assert.equal(result.code, 'invalid_transition')
  assert.match(result.message, /valid package/i)
  assert.deepEqual(auditEvents, ['assessment_publish_blocked_invalid_package', 'assessment_publish_blocked_invalid_package'])
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

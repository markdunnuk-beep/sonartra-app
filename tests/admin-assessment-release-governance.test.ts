import assert from 'node:assert/strict'
import test from 'node:test'

import {
  importAdminAssessmentPackage,
  publishAdminAssessmentVersion,
  signOffAdminAssessmentVersion,
  updateAdminAssessmentVersionReleaseNotes,
} from '../lib/admin/server/assessment-management'
import type { AdminAssessmentVersionSchemaCapabilities } from '../lib/admin/server/assessment-version-schema-capabilities'

function buildAssessmentVersionSchemaCapabilities(columns: string[]): AdminAssessmentVersionSchemaCapabilities {
  return {
    hasAssessmentVersionsTable: true,
    assessmentVersionColumns: new Set(columns),
  }
}

const MODERN_ASSESSMENT_VERSION_CAPABILITIES = buildAssessmentVersionSchemaCapabilities([
  'package_raw_payload',
  'package_schema_version',
  'package_status',
  'package_source_type',
  'package_source_filename',
  'package_imported_at',
  'package_imported_by_identity_id',
  'package_validation_report_json',
  'publish_readiness_status',
  'readiness_check_summary_json',
  'last_readiness_evaluated_at',
  'sign_off_status',
  'sign_off_at',
  'sign_off_by_identity_id',
  'sign_off_material_updated_at',
  'release_notes',
  'material_updated_at',
  'latest_regression_suite_snapshot_json',
])

const LEGACY_ASSESSMENT_VERSION_CAPABILITIES = buildAssessmentVersionSchemaCapabilities([])

const READINESS_ONLY_ASSESSMENT_VERSION_CAPABILITIES = buildAssessmentVersionSchemaCapabilities([
  'publish_readiness_status',
  'readiness_check_summary_json',
  'last_readiness_evaluated_at',
])

const RUNTIME_TABLE_NAMES = [
  'assessment_question_sets',
  'assessment_questions',
  'assessment_question_options',
  'assessment_option_signal_mappings',
] as const

const RUNTIME_TABLE_COLUMNS: Record<(typeof RUNTIME_TABLE_NAMES)[number], string[]> = {
  assessment_question_sets: ['id', 'assessment_version_id', 'key', 'name', 'description', 'is_active'],
  assessment_questions: ['id', 'question_set_id', 'question_number', 'question_key', 'prompt', 'section_key', 'section_name', 'reverse_scored', 'question_weight_default', 'scoring_family', 'notes', 'is_active', 'metadata_json'],
  assessment_question_options: ['id', 'question_id', 'option_key', 'option_text', 'display_order', 'numeric_value'],
  assessment_option_signal_mappings: ['id', 'question_option_id', 'signal_code', 'signal_weight'],
}

function matchRuntimeSchemaQuery(sql: string, params: unknown[] = []) {
  if (/select to_regclass\(current_schema\(\) \|\| '\.' \|\| \$1::text\) is not null as table_exists/i.test(sql)) {
    return { rows: [{ table_exists: true }] }
  }

  if (/from information_schema\.columns/i.test(sql) && /table_name = any\(\$1::text\[\]\)/i.test(sql)) {
    const tableNames = Array.isArray(params[0]) ? params[0].map((value) => String(value)) : []
    return {
      rows: tableNames.flatMap((tableName) => (RUNTIME_TABLE_COLUMNS[tableName as keyof typeof RUNTIME_TABLE_COLUMNS] ?? []).map((column_name) => ({ table_name: tableName, column_name }))),
    }
  }

  return null
}

function createBaseAccess() {
  return {
    isAuthenticated: true,
    isAllowed: true,
    email: 'rina.patel@sonartra.com',
    allowlist: ['rina.patel@sonartra.com'],
    accessSource: 'email_allowlist' as const,
    provisionalRole: null,
    provisionalAccess: null,
  }
}

function makeVersionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'version-1',
    assessment_definition_id: 'assessment-1',
    version_label: '1.2.0',
    lifecycle_status: 'draft',
    source_type: 'import',
    notes: null,
    has_definition_payload: true,
    definition_payload: {
      meta: {
        schemaVersion: 'sonartra-assessment-package/v1',
        assessmentKey: 'sonartra_signals',
        assessmentTitle: 'Sonartra Signals',
        versionLabel: '1.2.0',
        defaultLocale: 'en',
      },
      dimensions: [{ id: 'drive', labelKey: 'dimension.drive.label' }],
      questions: [{ id: 'q1', promptKey: 'question.q1.prompt', dimensionId: 'drive', reverseScored: false, weight: 1, options: [{ id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { drive: 1 } }] }],
      scoring: { dimensionRules: [{ dimensionId: 'drive', aggregation: 'sum' }] },
      normalization: { scales: [{ id: 'core-scale', dimensionIds: ['drive'], range: { min: 0, max: 10 }, bands: [{ key: 'low', min: 0, max: 4, labelKey: 'band.low.label' }] }] },
      outputs: { reportRules: [] },
      language: { locales: [{ locale: 'en', text: { 'dimension.drive.label': 'Drive', 'question.q1.prompt': 'Prompt', 'question.q1.option.a': 'A', 'band.low.label': 'Low' } }] },
    },
    validation_status: 'valid_with_warnings',
    package_status: 'valid_with_warnings',
    package_schema_version: 'sonartra-assessment-package/v1',
    package_source_type: 'manual_import',
    package_imported_at: '2026-03-21T08:00:00.000Z',
    package_source_filename: 'signals.json',
    package_imported_by_name: 'Rina Patel',
    package_validation_report_json: { summary: { dimensionsCount: 1, questionsCount: 1, optionsCount: 1, scoringRuleCount: 1, normalizationRuleCount: 1, outputRuleCount: 0, localeCount: 1 }, errors: [], warnings: [{ path: 'outputs.reportRules', message: 'No output rules are attached.' }] },
    publish_readiness_status: 'ready_with_warnings',
    readiness_check_summary_json: null,
    last_readiness_evaluated_at: null,
    sign_off_status: 'unsigned',
    sign_off_at: null,
    sign_off_by_name: null,
    sign_off_material_updated_at: null,
    release_notes: null,
    material_updated_at: '2026-03-21T08:00:00.000Z',
    created_at: '2026-03-21T08:00:00.000Z',
    updated_at: '2026-03-21T08:00:00.000Z',
    published_at: null,
    archived_at: null,
    created_by_name: 'Rina Patel',
    updated_by_name: 'Rina Patel',
    published_by_name: null,
    latest_regression_suite_snapshot_json: {
      executedAt: '2026-03-21T09:00:00.000Z',
      executedBy: 'Rina Patel',
      baselineVersionId: null,
      baselineVersionLabel: null,
      totalScenarios: 0,
      passedCount: 0,
      warningCount: 0,
      failedCount: 0,
      overallStatus: 'warning',
      summaryText: 'No active saved scenarios were available for a suite run.',
    },
    assessment_name: 'Sonartra Signals',
    ...overrides,
  }
}

test('publish is warning-gated until sign-off is recorded', async () => {
  const auditEvents: string[] = []
  const baseRow = makeVersionRow()
  const result = await publishAdminAssessmentVersion({ assessmentId: 'assessment-1', versionId: 'version-1', expectedUpdatedAt: '2026-03-21T08:00:00.000Z' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        if (/from assessment_versions av[\s\S]*where av.id = \$1[\s\S]*assessment_definition_id = \$2/i.test(sql)) {
          return { rows: [baseRow] }
        }
        if (/from assessment_versions av[\s\S]*where av.assessment_definition_id = \$1/i.test(sql)) {
          return { rows: [baseRow] }
        }
        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }
        if (/update assessment_versions\s+set publish_readiness_status/i.test(sql)) {
          return { rows: [] }
        }
        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T10:00:00.000Z'),
    createId: (() => { const ids = ['audit-1', 'audit-2', 'audit-3', 'audit-4']; return () => ids.shift() ?? crypto.randomUUID() })(),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'invalid_transition')
  assert.match(result.message, /sign off this version/i)
  assert.ok(auditEvents.includes('assessment_publish_blocked_release_governance'))
})

test('publish loader uses modern compatibility-safe assessment_versions queries when optional columns are available', async () => {
  const byIdQueries: string[] = []
  const assessmentQueries: string[] = []
  const baseRow = makeVersionRow()

  const result = await publishAdminAssessmentVersion({ assessmentId: 'assessment-1', versionId: 'version-1' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        if (/from assessment_versions av[\s\S]*where av.id = \$1 and av.assessment_definition_id = \$2[\s\S]*limit 1/i.test(sql)) {
          byIdQueries.push(sql)
          return { rows: [baseRow] }
        }
        if (/from assessment_versions av[\s\S]*where av.assessment_definition_id = \$1/i.test(sql)) {
          assessmentQueries.push(sql)
          return { rows: [baseRow] }
        }
        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }
        if (/update assessment_versions\s+set publish_readiness_status/i.test(sql)) {
          return { rows: [] }
        }
        if (/insert into access_audit_events/i.test(sql)) {
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T10:00:00.000Z'),
    createId: () => 'audit-modern',
  } as never)

  assert.equal(result.ok, false)
  assert.equal(byIdQueries.length, 1)
  assert.equal(assessmentQueries.length, 1)
  assert.match(byIdQueries[0] ?? '', /av\.package_schema_version/i)
  assert.match(byIdQueries[0] ?? '', /av\.package_validation_report_json/i)
  assert.match(byIdQueries[0] ?? '', /package_imported_by\.id = av\.package_imported_by_identity_id/i)
  assert.match(byIdQueries[0] ?? '', /av\.publish_readiness_status/i)
  assert.match(byIdQueries[0] ?? '', /av\.latest_regression_suite_snapshot_json/i)
  assert.match(byIdQueries[0] ?? '', /sign_off_by\.id = av\.sign_off_by_identity_id/i)
  assert.match(assessmentQueries[0] ?? '', /av\.package_schema_version/i)
  assert.match(assessmentQueries[0] ?? '', /av\.package_validation_report_json/i)
  assert.match(assessmentQueries[0] ?? '', /av\.publish_readiness_status/i)
  assert.match(assessmentQueries[0] ?? '', /av\.latest_regression_suite_snapshot_json/i)
})

test('publish fails fast with the full release-governance schema contract in legacy capability mode', async () => {
  const byIdQueries: string[] = []
  const assessmentQueries: string[] = []

  const result = await publishAdminAssessmentVersion({ assessmentId: 'assessment-1', versionId: 'version-1' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => LEGACY_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        if (/from assessment_versions av[\s\S]*where av.id = \$1 and av.assessment_definition_id = \$2[\s\S]*limit 1/i.test(sql)) {
          byIdQueries.push(sql)
          return { rows: [] }
        }
        if (/from assessment_versions av[\s\S]*where av.assessment_definition_id = \$1/i.test(sql)) {
          assessmentQueries.push(sql)
          return { rows: [] }
        }
        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }
        if (/insert into access_audit_events/i.test(sql)) {
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T10:00:00.000Z'),
    createId: () => 'audit-legacy',
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'schema_incompatible')
  assert.match(result.message, /publishing assessment versions/i)
  assert.match(result.message, /publish_readiness_status/)
  assert.match(result.message, /last_readiness_evaluated_at/)
  assert.match(result.message, /sign_off_status/)
  assert.match(result.message, /sign_off_material_updated_at/)
  assert.match(result.message, /material_updated_at/)
  assert.equal(byIdQueries.length, 0)
  assert.equal(assessmentQueries.length, 0)
})

test('publish reports missing sign-off columns even when readiness columns are present', async () => {
  const result = await publishAdminAssessmentVersion({ assessmentId: 'assessment-1', versionId: 'version-1' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => READINESS_ONLY_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        if (/from assessment_versions av/i.test(sql) || /from assessment_version_saved_scenarios scenarios/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T10:00:00.000Z'),
    createId: () => 'audit-readiness-only',
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'schema_incompatible')
  assert.doesNotMatch(result.message, /readiness_check_summary_json/)
  assert.match(result.message, /sign_off_status/)
  assert.match(result.message, /sign_off_at/)
  assert.match(result.message, /sign_off_by_identity_id/)
  assert.match(result.message, /sign_off_material_updated_at/)
  assert.match(result.message, /material_updated_at/)
})

test('sign-off records signer identity and timestamp for draft versions', async () => {
  const updates: unknown[][] = []
  const auditEvents: string[] = []
  const baseRow = makeVersionRow()
  const result = await signOffAdminAssessmentVersion({ assessmentId: 'assessment-1', versionId: 'version-1' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av[\s\S]*where av.assessment_definition_id = \$1/i.test(sql)) {
          return { rows: [baseRow] }
        }
        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }
        if (/update assessment_versions\s+set publish_readiness_status/i.test(sql) || /update assessment_versions\s+set sign_off_status = 'signed_off'/i.test(sql)) {
          updates.push(params)
          return { rows: [] }
        }
        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T11:00:00.000Z'),
    createId: (() => { const ids = ['audit-1', 'audit-2']; return () => ids.shift() ?? crypto.randomUUID() })(),
  } as never)

  assert.equal(result.ok, true)
  assert.equal(result.message, 'Version signed off.')
  assert.equal(updates.length, 2)
  assert.ok(auditEvents.includes('assessment_release_sign_off_recorded'))
})

test('sign-off fails fast when release sign-off schema support is unavailable', async () => {
  let writeCount = 0
  const result = await signOffAdminAssessmentVersion({ assessmentId: 'assessment-1', versionId: 'version-1' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => LEGACY_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/update assessment_versions/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
          writeCount += 1
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'schema_incompatible')
  assert.match(result.message, /recording release sign-off/i)
  assert.match(result.message, /publish_readiness_status|sign_off_status/i)
  assert.equal(writeCount, 0)
})

const validPackageText = JSON.stringify({
  meta: { schemaVersion: 'sonartra-assessment-package/v1', assessmentKey: 'sonartra_signals', assessmentTitle: 'Sonartra Signals', versionLabel: '1.3.0', defaultLocale: 'en' },
  dimensions: [{ id: 'drive', labelKey: 'dimension.drive.label' }],
  questions: [{ id: 'q1', promptKey: 'question.q1.prompt', dimensionId: 'drive', reverseScored: false, weight: 1, options: [{ id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { drive: 1 } }] }],
  scoring: { dimensionRules: [{ dimensionId: 'drive', aggregation: 'sum' }] },
  normalization: { scales: [{ id: 'core-scale', dimensionIds: ['drive'], range: { min: 0, max: 10 }, bands: [{ key: 'low', min: 0, max: 4, labelKey: 'band.low.label' }] }] },
  outputs: { reportRules: [{ key: 'summary', labelKey: 'output.summary.label', dimensionIds: ['drive'], normalizationScaleId: 'core-scale' }] },
  language: { locales: [{ locale: 'en', text: { 'dimension.drive.label': 'Drive', 'question.q1.prompt': 'Prompt', 'question.q1.option.a': 'A', 'band.low.label': 'Low', 'output.summary.label': 'Summary' } }] },
})

test('material package updates invalidate sign-off and release notes persist', async () => {
  const auditEvents: string[] = []
  const updatedRows = [
    makeVersionRow({ sign_off_status: 'signed_off', sign_off_at: '2026-03-21T07:30:00.000Z', sign_off_by_name: 'Rina Patel', sign_off_material_updated_at: '2026-03-21T08:00:00.000Z' }),
    makeVersionRow({
      package_status: 'valid',
      package_validation_report_json: { summary: { dimensionsCount: 1, questionsCount: 1, optionsCount: 1, scoringRuleCount: 1, normalizationRuleCount: 1, outputRuleCount: 1, localeCount: 1 }, errors: [], warnings: [] },
      publish_readiness_status: 'ready',
      sign_off_status: 'unsigned',
      sign_off_at: null,
      sign_off_by_name: null,
      sign_off_material_updated_at: null,
      material_updated_at: '2026-03-21T12:00:00.000Z',
      updated_at: '2026-03-21T12:00:00.000Z',
      latest_regression_suite_snapshot_json: { executedAt: '2026-03-21T12:00:00.000Z', executedBy: 'Rina Patel', baselineVersionId: null, baselineVersionLabel: null, totalScenarios: 0, passedCount: 0, warningCount: 0, failedCount: 0, overallStatus: 'warning', summaryText: 'No active saved scenarios were available for a suite run.' },
    }),
  ]
  let versionLoadCount = 0
  const notesUpdates: unknown[][] = []
  await importAdminAssessmentPackage({ assessmentId: 'assessment-1', versionId: 'version-1', packageText: validPackageText }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av[\s\S]*where av.id = \$1[\s\S]*assessment_definition_id = \$2/i.test(sql)) {
          return { rows: [updatedRows[0]] }
        }
        if (/from assessment_versions av[\s\S]*where av.assessment_definition_id = \$1/i.test(sql)) {
          const row = updatedRows[Math.min(versionLoadCount, updatedRows.length - 1)]
          versionLoadCount += 1
          return { rows: [row] }
        }
        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }
        if (/update assessment_versions\s+set definition_payload/i.test(sql) || /update assessment_definitions/i.test(sql) || /update assessment_versions\s+set sign_off_status = 'unsigned'/i.test(sql) || /update assessment_versions\s+set publish_readiness_status/i.test(sql)) {
          return { rows: [] }
        }
        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T12:00:00.000Z'),
    createId: (() => { const ids = ['audit-1', 'audit-2', 'audit-3', 'audit-4']; return () => ids.shift() ?? crypto.randomUUID() })(),
  } as never)

  const notesResult = await updateAdminAssessmentVersionReleaseNotes({ assessmentId: 'assessment-1', versionId: 'version-1', releaseNotes: 'Ready for internal launch window.' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/select av.id, av.version_label, ad.name as assessment_name/i.test(sql)) {
          return { rows: [{ id: 'version-1', version_label: '1.2.0', assessment_name: 'Sonartra Signals' }] }
        }
        if (/update assessment_versions\s+set release_notes = \$3/i.test(sql) || /update assessment_definitions/i.test(sql)) {
          notesUpdates.push(params)
          return { rows: [] }
        }
        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T12:30:00.000Z'),
    createId: (() => { const ids = ['audit-5', 'audit-6']; return () => ids.shift() ?? crypto.randomUUID() })(),
  } as never)

  assert.equal(notesResult.ok, true)
  assert.ok(auditEvents.includes('assessment_release_sign_off_invalidated'))
  assert.ok(auditEvents.includes('assessment_release_notes_updated'))
  assert.equal(notesUpdates.length, 2)
})

test('release notes fail fast when the schema does not support release notes writes', async () => {
  let writeCount = 0
  const result = await updateAdminAssessmentVersionReleaseNotes({ assessmentId: 'assessment-1', versionId: 'version-1', releaseNotes: 'Ready for internal launch window.' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getAssessmentVersionSchemaCapabilities: async () => LEGACY_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/update assessment_versions/i.test(sql) || /update assessment_definitions/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
          writeCount += 1
          return { rows: [] }
        }
        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'schema_incompatible')
  assert.match(result.message, /saving release notes/i)
  assert.match(result.message, /release_notes/i)
  assert.equal(writeCount, 0)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import {
  archiveAdminAssessmentVersion,
  cloneAdminAssessmentSavedScenario,
  createAdminAssessment,
  createAdminAssessmentDraftVersion,
  importAdminAssessmentPackage,
  importAdminAssessmentSavedScenarios,
  publishAdminAssessmentVersion,
  runAdminAssessmentScenarioSuite,
} from '../lib/admin/server/assessment-management'
import type { AdminAssessmentVersionSchemaCapabilities } from '../lib/admin/server/assessment-version-schema-capabilities'

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

const PACKAGE_ERA_ASSESSMENT_VERSION_CAPABILITIES = buildAssessmentVersionSchemaCapabilities([
  'package_raw_payload',
  'package_schema_version',
  'package_status',
  'package_source_type',
  'package_source_filename',
  'package_imported_at',
  'package_imported_by_identity_id',
  'package_validation_report_json',
])

const LEGACY_ASSESSMENT_VERSION_CAPABILITIES = buildAssessmentVersionSchemaCapabilities([])

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

function matchRuntimeSchemaQuery(
  sql: string,
  params: unknown[] = [],
  options: { missingTables?: string[]; missingColumns?: Record<string, string[]> } = {},
) {
  if (/select to_regclass\(current_schema\(\) \|\| '\.' \|\| \$1::text\) is not null as table_exists/i.test(sql)) {
    const tableName = String(params[0] ?? '')
    return { rows: [{ table_exists: !(options.missingTables ?? []).includes(tableName) }] }
  }

  if (/from information_schema\.columns/i.test(sql) && /table_name = any\(\$1::text\[\]\)/i.test(sql)) {
    const tableNames = Array.isArray(params[0]) ? params[0].map((value) => String(value)) : []
    return {
      rows: tableNames.flatMap((tableName) => {
        const missingColumns = new Set(options.missingColumns?.[tableName] ?? [])
        return (RUNTIME_TABLE_COLUMNS[tableName as keyof typeof RUNTIME_TABLE_COLUMNS] ?? [])
          .filter((columnName) => !missingColumns.has(columnName))
          .map((column_name) => ({ table_name: tableName, column_name }))
      }),
    }
  }

  return null
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
    { id: 'Core_Driver', labelKey: 'dimension.core_driver.label' },
    { id: 'Core_Analyst', labelKey: 'dimension.core_analyst.label' },
  ],
  questions: [
    {
      id: 'q1',
      promptKey: 'question.q1.prompt',
      dimensionId: 'Core_Driver',
      reverseScored: false,
      weight: 1,
      options: [
        { id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { Core_Driver: 1, Core_Analyst: 4 } },
        { id: 'q1.b', labelKey: 'question.q1.option.b', value: 2, scoreMap: { Core_Driver: 2, Core_Analyst: 3 } },
        { id: 'q1.c', labelKey: 'question.q1.option.c', value: 3, scoreMap: { Core_Driver: 3, Core_Analyst: 2 } },
        { id: 'q1.d', labelKey: 'question.q1.option.d', value: 4, scoreMap: { Core_Driver: 4, Core_Analyst: 1 } },
      ],
    },
  ],
  scoring: {
    dimensionRules: [
      { dimensionId: 'Core_Driver', aggregation: 'sum' },
      { dimensionId: 'Core_Analyst', aggregation: 'sum' },
    ],
  },
  normalization: {
    scales: [
      {
        id: 'core-scale',
        dimensionIds: ['Core_Driver', 'Core_Analyst'],
        range: { min: 0, max: 10 },
        bands: [
          { key: 'low', min: 0, max: 3, labelKey: 'band.low.label' },
          { key: 'mid', min: 4, max: 6, labelKey: 'band.mid.label' },
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
        dimensionIds: ['Core_Driver', 'Core_Analyst'],
        normalizationScaleId: 'core-scale',
      },
    ],
  },
  language: {
    locales: [
      {
        locale: 'en',
        text: {
          'dimension.core_driver.label': 'Core Driver',
          'dimension.core_analyst.label': 'Core Analyst',
          'question.q1.prompt': 'I naturally set the pace for the team.',
          'question.q1.option.a': 'Rarely',
          'question.q1.option.b': 'Sometimes',
          'question.q1.option.c': 'Often',
          'question.q1.option.d': 'Almost always',
          'band.low.label': 'Low',
          'band.mid.label': 'Mid',
          'band.high.label': 'High',
          'output.core-summary.label': 'Core summary',
        },
      },
    ],
  },
})


function makeManagedVersionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'version-2',
    assessment_definition_id: 'assessment-1',
    version_label: '1.2.0',
    lifecycle_status: 'draft',
    source_type: 'import',
    notes: null,
    has_definition_payload: true,
    definition_payload: JSON.parse(validPackage),
    validation_status: 'valid',
    package_status: 'valid',
    package_schema_version: 'sonartra-assessment-package/v1',
    package_source_type: 'manual_import',
    package_imported_at: '2026-03-21T08:00:00.000Z',
    package_source_filename: 'signals-v1.json',
    package_imported_by_name: 'Rina Patel',
    package_validation_report_json: {
      summary: {
        dimensionsCount: 2,
        questionsCount: 1,
        optionsCount: 4,
        scoringRuleCount: 2,
        normalizationRuleCount: 1,
        outputRuleCount: 1,
        localeCount: 1,
      },
      errors: [],
      warnings: [],
    },
    publish_readiness_status: 'ready',
    readiness_check_summary_json: null,
    last_readiness_evaluated_at: null,
    sign_off_status: 'unsigned',
    sign_off_at: null,
    sign_off_by_name: null,
    sign_off_material_updated_at: null,
    release_notes: null,
    material_updated_at: '2026-03-21T08:00:00.000Z',
    created_at: '2026-03-21T08:00:00.000Z',
    updated_at: '2026-03-21T09:00:00.000Z',
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
      totalScenarios: 1,
      passedCount: 1,
      warningCount: 0,
      failedCount: 0,
      overallStatus: 'pass',
      summaryText: '1/1 passed.',
    },
    assessment_name: 'Sonartra Signals',
    ...overrides,
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

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [{
            id: 'scenario-1',
            assessment_version_id: 'version-2',
            version_label: '1.2.0',
            name: 'Baseline',
            description: null,
            scenario_payload: { answers: [{ questionId: 'q1', optionId: 'q1.b' }], locale: 'en', source: 'manual_json', scenarioKey: null },
            status: 'active',
            source_version_id: null,
            source_version_label: null,
            source_scenario_id: null,
            provenance_json: {},
            created_at: '2026-03-21T08:30:00.000Z',
            updated_at: '2026-03-21T08:30:00.000Z',
            archived_at: null,
            created_by_name: 'Rina Patel',
            updated_by_name: 'Rina Patel',
          }] }
        }

        if (/update assessment_versions\s+set publish_readiness_status/i.test(sql)) {
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

test('create assessment duplicate checks run sequentially and surface duplicate slug conflicts', async () => {
  const queryOrder: string[] = []
  let activeQueries = 0

  const duplicateSlug = await createAdminAssessment({
    name: 'Signals',
    key: 'sonartra_signals',
    slug: 'signals',
    category: 'behavioural_intelligence',
    description: '',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    queryDb: async (sql: string) => {
      activeQueries += 1
      assert.equal(activeQueries, 1, `expected sequential duplicate checks, received overlap while running: ${sql}`)

      try {
        await new Promise((resolve) => setTimeout(resolve, 5))

        if (/where key = \$1/i.test(sql)) {
          queryOrder.push('key')
          return { rows: [] } as never
        }

        if (/where slug = \$1/i.test(sql)) {
          queryOrder.push('slug')
          return { rows: [{ id: 'assessment-2' }] } as never
        }

        throw new Error(`Unexpected query: ${sql}`)
      } finally {
        activeQueries -= 1
      }
    },
  } as never)

  assert.equal(duplicateSlug.ok, false)
  assert.equal(duplicateSlug.code, 'duplicate_slug')
  assert.deepEqual(queryOrder, ['key', 'slug'])
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
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
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

        if (/update assessment_versions\s+set publish_readiness_status/i.test(sql) || /update assessment_definitions/i.test(sql)) {
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
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [makeManagedVersionRow({ package_status: 'missing' })] }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }

        if (/update assessment_versions/i.test(sql) || /update assessment_definitions/i.test(sql)) {
          updates.push(params)
          return { rows: [] }
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
  assert.equal(updates.length, 3)
  assert.ok(auditEvents.includes('assessment_package_imported'))
  assert.ok(auditEvents.includes('assessment_release_readiness_evaluated'))
})

test('package import skips governance metadata writes when release governance columns are unavailable', async () => {
  const versionUpdateSql: string[] = []
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
    getAssessmentVersionSchemaCapabilities: async () => PACKAGE_ERA_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [makeManagedVersionRow({ package_status: 'missing' })] }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }

        if (/update assessment_versions\s+set definition_payload/i.test(sql)) {
          versionUpdateSql.push(sql)
          return { rows: [] }
        }

        if (/update assessment_versions\s+set sign_off_status = 'unsigned'/i.test(sql) || /update assessment_versions\s+set publish_readiness_status/i.test(sql)) {
          throw new Error(`Unexpected governance write: ${sql}`)
        }

        if (/update assessment_definitions/i.test(sql)) {
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
  assert.equal(versionUpdateSql.length, 1)
  assert.doesNotMatch(versionUpdateSql[0] ?? '', /material_updated_at/i)
  assert.ok(auditEvents.includes('assessment_package_imported'))
  assert.ok(!auditEvents.includes('assessment_release_readiness_evaluated'))
  assert.ok(!auditEvents.includes('assessment_release_sign_off_invalidated'))
})

test('package import fails fast when package metadata columns are unavailable', async () => {
  let writeCount = 0
  const result = await importAdminAssessmentPackage({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    packageText: validPackage,
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getAssessmentVersionSchemaCapabilities: async () => LEGACY_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/update assessment_versions/i.test(sql) || /update assessment_definitions/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
          writeCount += 1
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'schema_incompatible')
  assert.match(result.message, /importing assessment packages/i)
  assert.match(result.message, /package_raw_payload|package_schema_version|package_status/i)
  assert.equal(writeCount, 0)
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
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [makeManagedVersionRow({ package_status: 'missing' })] }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
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
  assert.ok(auditEvents.includes('assessment_package_validation_failed'))
  assert.ok(auditEvents.includes('assessment_release_readiness_evaluated'))
})

test('bulk scenario copy-forward imports valid scenarios, skips invalid ones, and suffixes duplicate names', async () => {
  const insertedNames: string[] = []
  const auditEvents: string[] = []
  const validScenarioPayload = JSON.stringify({
    answers: [{ questionId: 'q1', optionId: 'q1.b' }],
    locale: 'en',
    source: 'manual_json',
    scenarioKey: null,
  })
  const invalidScenarioPayload = '{"answers":[{"questionId":"q1"}]}'

  const result = await importAdminAssessmentSavedScenarios({
    assessmentId: 'assessment-1',
    targetVersionId: 'version-3',
    sourceVersionId: 'version-2',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av/i.test(sql)) {
          return {
            rows: [
              {
                id: 'version-3',
                assessment_definition_id: 'assessment-1',
                version_label: '1.3.0',
                lifecycle_status: 'draft',
                source_type: 'import',
                notes: 'Draft',
                has_definition_payload: true,
                definition_payload: JSON.parse(validPackage),
                validation_status: 'valid',
                package_status: 'valid',
                package_schema_version: 'sonartra-assessment-package/v1',
                package_source_type: 'manual_import',
                package_imported_at: '2026-03-21T09:00:00.000Z',
                package_source_filename: 'draft.json',
                package_imported_by_name: 'Rina Patel',
                package_validation_report_json: { summary: { dimensionsCount: 2, questionsCount: 1, optionsCount: 4, scoringRuleCount: 2, normalizationRuleCount: 1, outputRuleCount: 1, localeCount: 1 }, errors: [], warnings: [] },
                created_at: '2026-03-21T09:00:00.000Z',
                updated_at: '2026-03-21T09:00:00.000Z',
                published_at: null,
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
                published_by_name: null,
                latest_regression_suite_snapshot_json: null,
              },
              {
                id: 'version-2',
                assessment_definition_id: 'assessment-1',
                version_label: '1.2.0',
                lifecycle_status: 'published',
                source_type: 'import',
                notes: 'Published',
                has_definition_payload: true,
                definition_payload: JSON.parse(validPackage),
                validation_status: 'valid',
                package_status: 'valid',
                package_schema_version: 'sonartra-assessment-package/v1',
                package_source_type: 'manual_import',
                package_imported_at: '2026-03-20T09:00:00.000Z',
                package_source_filename: 'published.json',
                package_imported_by_name: 'Rina Patel',
                package_validation_report_json: { summary: { dimensionsCount: 2, questionsCount: 1, optionsCount: 4, scoringRuleCount: 2, normalizationRuleCount: 1, outputRuleCount: 1, localeCount: 1 }, errors: [], warnings: [] },
                created_at: '2026-03-20T09:00:00.000Z',
                updated_at: '2026-03-20T09:00:00.000Z',
                published_at: '2026-03-20T09:00:00.000Z',
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
                published_by_name: 'Rina Patel',
                latest_regression_suite_snapshot_json: null,
              },
            ],
          }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return {
            rows: [
              {
                id: 'scenario-valid',
                assessment_version_id: 'version-2',
                version_label: '1.2.0',
                name: 'Leadership baseline',
                description: 'Valid scenario',
                scenario_payload: JSON.parse(validScenarioPayload),
                status: 'active',
                source_version_id: null,
                source_version_label: null,
                source_scenario_id: null,
                provenance_json: {},
                created_at: '2026-03-20T09:00:00.000Z',
                updated_at: '2026-03-20T09:00:00.000Z',
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
              },
              {
                id: 'scenario-invalid',
                assessment_version_id: 'version-2',
                version_label: '1.2.0',
                name: 'Broken legacy scenario',
                description: 'Invalid scenario',
                scenario_payload: invalidScenarioPayload,
                status: 'active',
                source_version_id: null,
                source_version_label: null,
                source_scenario_id: null,
                provenance_json: {},
                created_at: '2026-03-20T09:00:00.000Z',
                updated_at: '2026-03-20T09:00:00.000Z',
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
              },
            ],
          }
        }

        if (/select name\s+from assessment_version_saved_scenarios/i.test(sql)) {
          return { rows: [{ name: 'Leadership baseline' }] }
        }

        if (/insert into assessment_version_saved_scenarios/i.test(sql)) {
          insertedNames.push(String(params[2]))
          return { rows: [] }
        }

        if (/update assessment_versions\s+set publish_readiness_status/i.test(sql) || /update assessment_definitions/i.test(sql)) {
          return { rows: [] }
        }

        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T11:00:00.000Z'),
    createId: (() => {
      const ids = ['new-scenario-1', 'new-scenario-2', 'audit-1', 'audit-2']
      return () => ids.shift() ?? 'audit-3'
    })(),
  } as never)

  assert.equal(result.ok, true)
  assert.equal(result.importedCount, 1)
  assert.equal(result.skippedCount, 1)
  assert.deepEqual(insertedNames, ['Leadership baseline (copy 2)'])
  assert.match(result.skipped[0]?.reason ?? '', /optionId is required/i)
  assert.ok(auditEvents.includes('assessment_saved_scenarios_imported'))
  assert.ok(auditEvents.includes('assessment_release_readiness_evaluated'))
})

test('single scenario clone rejects incompatible payloads for the target version', async () => {
  const incompatiblePayload = JSON.stringify({
    answers: [{ questionId: 'missing-question', optionId: 'q1.b' }],
    locale: 'en',
    source: 'manual_json',
    scenarioKey: null,
  })

  const result = await cloneAdminAssessmentSavedScenario({
    assessmentId: 'assessment-1',
    targetVersionId: 'version-3',
    sourceScenarioId: 'scenario-incompatible',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/from assessment_versions av/i.test(sql)) {
          return {
            rows: [
              {
                id: 'version-3',
                assessment_definition_id: 'assessment-1',
                version_label: '1.3.0',
                lifecycle_status: 'draft',
                source_type: 'import',
                notes: 'Draft',
                has_definition_payload: true,
                definition_payload: JSON.parse(validPackage),
                validation_status: 'valid',
                package_status: 'valid',
                package_schema_version: 'sonartra-assessment-package/v1',
                package_source_type: 'manual_import',
                package_imported_at: '2026-03-21T09:00:00.000Z',
                package_source_filename: 'draft.json',
                package_imported_by_name: 'Rina Patel',
                package_validation_report_json: { summary: { dimensionsCount: 2, questionsCount: 1, optionsCount: 4, scoringRuleCount: 2, normalizationRuleCount: 1, outputRuleCount: 1, localeCount: 1 }, errors: [], warnings: [] },
                created_at: '2026-03-21T09:00:00.000Z',
                updated_at: '2026-03-21T09:00:00.000Z',
                published_at: null,
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
                published_by_name: null,
                latest_regression_suite_snapshot_json: null,
              },
              {
                id: 'version-2',
                assessment_definition_id: 'assessment-1',
                version_label: '1.2.0',
                lifecycle_status: 'published',
                source_type: 'import',
                notes: 'Published',
                has_definition_payload: true,
                definition_payload: JSON.parse(validPackage),
                validation_status: 'valid',
                package_status: 'valid',
                package_schema_version: 'sonartra-assessment-package/v1',
                package_source_type: 'manual_import',
                package_imported_at: '2026-03-20T09:00:00.000Z',
                package_source_filename: 'published.json',
                package_imported_by_name: 'Rina Patel',
                package_validation_report_json: { summary: { dimensionsCount: 2, questionsCount: 1, optionsCount: 4, scoringRuleCount: 2, normalizationRuleCount: 1, outputRuleCount: 1, localeCount: 1 }, errors: [], warnings: [] },
                created_at: '2026-03-20T09:00:00.000Z',
                updated_at: '2026-03-20T09:00:00.000Z',
                published_at: '2026-03-20T09:00:00.000Z',
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
                published_by_name: 'Rina Patel',
                latest_regression_suite_snapshot_json: null,
              },
            ],
          }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return {
            rows: [{
              id: 'scenario-incompatible',
              assessment_version_id: 'version-2',
              version_label: '1.2.0',
              name: 'Incompatible scenario',
              description: 'Invalid for target',
              scenario_payload: incompatiblePayload,
              status: 'active',
              source_version_id: null,
              source_version_label: null,
              source_scenario_id: null,
              provenance_json: {},
              created_at: '2026-03-20T09:00:00.000Z',
              updated_at: '2026-03-20T09:00:00.000Z',
              archived_at: null,
              created_by_name: 'Rina Patel',
              updated_by_name: 'Rina Patel',
            }],
          }
        }

        if (/insert into assessment_version_saved_scenarios/i.test(sql) || /insert into access_audit_events/i.test(sql) || /update assessment_definitions/i.test(sql)) {
          throw new Error(`Unexpected write query: ${sql}`)
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'validation_error')
  assert.match(result.message, /does not exist in the normalized package|requires a selected option/i)
})

test('suite snapshot persists latest full-run summary without using single simulation state', async () => {
  const versionUpdates: unknown[][] = []
  const auditEvents: string[] = []
  const scenarioPayload = JSON.stringify({
    answers: [{ questionId: 'q1', optionId: 'q1.d' }],
    locale: 'en',
    source: 'manual_json',
    scenarioKey: null,
  })

  const result = await runAdminAssessmentScenarioSuite({
    assessmentId: 'assessment-1',
    versionId: 'version-3',
    baselineVersionId: 'version-2',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/from assessment_versions av/i.test(sql)) {
          return {
            rows: [
              {
                id: 'version-3',
                assessment_definition_id: 'assessment-1',
                version_label: '1.3.0',
                lifecycle_status: 'draft',
                source_type: 'import',
                notes: 'Draft',
                has_definition_payload: true,
                definition_payload: JSON.parse(validPackage),
                validation_status: 'valid',
                package_status: 'valid',
                package_schema_version: 'sonartra-assessment-package/v1',
                package_source_type: 'manual_import',
                package_imported_at: '2026-03-21T09:00:00.000Z',
                package_source_filename: 'draft.json',
                package_imported_by_name: 'Rina Patel',
                package_validation_report_json: { summary: { dimensionsCount: 2, questionsCount: 1, optionsCount: 4, scoringRuleCount: 2, normalizationRuleCount: 1, outputRuleCount: 1, localeCount: 1 }, errors: [], warnings: [] },
                created_at: '2026-03-21T09:00:00.000Z',
                updated_at: '2026-03-21T09:00:00.000Z',
                published_at: null,
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
                published_by_name: null,
                latest_regression_suite_snapshot_json: null,
              },
              {
                id: 'version-2',
                assessment_definition_id: 'assessment-1',
                version_label: '1.2.0',
                lifecycle_status: 'published',
                source_type: 'import',
                notes: 'Published',
                has_definition_payload: true,
                definition_payload: JSON.parse(validPackage),
                validation_status: 'valid',
                package_status: 'valid',
                package_schema_version: 'sonartra-assessment-package/v1',
                package_source_type: 'manual_import',
                package_imported_at: '2026-03-20T09:00:00.000Z',
                package_source_filename: 'published.json',
                package_imported_by_name: 'Rina Patel',
                package_validation_report_json: { summary: { dimensionsCount: 2, questionsCount: 1, optionsCount: 4, scoringRuleCount: 2, normalizationRuleCount: 1, outputRuleCount: 1, localeCount: 1 }, errors: [], warnings: [] },
                created_at: '2026-03-20T09:00:00.000Z',
                updated_at: '2026-03-20T09:00:00.000Z',
                published_at: '2026-03-20T09:00:00.000Z',
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
                published_by_name: 'Rina Patel',
                latest_regression_suite_snapshot_json: null,
              },
            ],
          }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return {
            rows: [
              {
                id: 'scenario-pass',
                assessment_version_id: 'version-3',
                version_label: '1.3.0',
                name: 'Scenario pass',
                description: null,
                scenario_payload: scenarioPayload,
                status: 'active',
                source_version_id: 'version-2',
                source_version_label: '1.2.0',
                source_scenario_id: 'scenario-source',
                provenance_json: {},
                created_at: '2026-03-21T09:00:00.000Z',
                updated_at: '2026-03-21T09:00:00.000Z',
                archived_at: null,
                created_by_name: 'Rina Patel',
                updated_by_name: 'Rina Patel',
              },
            ],
          }
        }

        if (/update assessment_versions\s+set latest_regression_suite_snapshot_json/i.test(sql) || /update assessment_versions\s+set publish_readiness_status/i.test(sql)) {
          versionUpdates.push(params)
          return { rows: [] }
        }

        if (/update assessment_definitions/i.test(sql)) {
          return { rows: [] }
        }

        if (/insert into access_audit_events/i.test(sql)) {
          auditEvents.push(String(params[1]))
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
    now: () => new Date('2026-03-21T12:00:00.000Z'),
    createId: (() => {
      const ids = ['audit-1', 'audit-2']
      return () => ids.shift() ?? 'audit-3'
    })(),
  } as never)

  assert.equal(result.ok, true)
  assert.equal(result.code, 'completed')
  assert.equal(result.snapshot?.baselineVersionLabel, '1.2.0')
  assert.equal(result.snapshot?.overallStatus, 'pass')
  assert.equal(result.snapshot?.totalScenarios, 1)
  assert.equal(versionUpdates.length, 2)
  assert.ok(auditEvents.includes('assessment_regression_suite_snapshot_updated'))
  assert.ok(auditEvents.includes('assessment_release_readiness_evaluated'))
})

test('suite snapshot fails fast when regression snapshot schema support is unavailable', async () => {
  let writeCount = 0
  const result = await runAdminAssessmentScenarioSuite({
    assessmentId: 'assessment-1',
    versionId: 'version-3',
    baselineVersionId: 'version-2',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => LEGACY_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/update assessment_versions/i.test(sql) || /update assessment_definitions/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
          writeCount += 1
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'schema_incompatible')
  assert.match(result.message, /regression suite snapshot/i)
  assert.match(result.message, /latest_regression_suite_snapshot_json/i)
  assert.equal(writeCount, 0)
})

test('publish version succeeds when a valid package is attached and enforces a single published version', async () => {
  const queries: string[] = []
  const result = await publishAdminAssessmentVersion({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        queries.push(sql)

        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [makeManagedVersionRow({ sign_off_status: 'signed_off', sign_off_at: '2026-03-21T09:30:00.000Z', sign_off_by_name: 'Rina Patel', sign_off_material_updated_at: '2026-03-21T08:00:00.000Z' })] }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }

        if (/select key, name\s+from assessment_versions/i.test(sql)) {
          return { rows: [{ key: 'signals-v1', name: 'Sonartra Signals' }] }
        }

        if (/insert into assessment_question_sets/i.test(sql) || /update assessment_question_sets/i.test(sql) || /insert into assessment_questions/i.test(sql) || /delete from assessment_questions/i.test(sql) || /insert into assessment_question_options/i.test(sql) || /delete from assessment_question_options/i.test(sql) || /insert into assessment_option_signal_mappings/i.test(sql) || /delete from assessment_option_signal_mappings/i.test(sql) || /update assessment_versions\s+set publish_readiness_status/i.test(sql) || /update assessment_versions\s+set lifecycle_status = 'archived'/i.test(sql) || /update assessment_versions\s+set lifecycle_status = 'published'/i.test(sql) || /update assessment_definitions/i.test(sql)) {
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
  assert.ok(queries.some((sql) => /insert into assessment_question_sets/i.test(sql)))
  assert.ok(queries.some((sql) => /insert into assessment_questions/i.test(sql)))
  assert.ok(queries.some((sql) => /insert into assessment_question_options/i.test(sql)))
  assert.ok(queries.some((sql) => /insert into assessment_option_signal_mappings/i.test(sql)))
  assert.ok(queries.some((sql) => /update assessment_versions\s+set lifecycle_status = 'published'[\s\S]*total_questions = \$5/i.test(sql)))
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
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [makeManagedVersionRow({ package_status: 'invalid', definition_payload: null, package_validation_report_json: { summary: null, errors: [{ path: 'questions[0].dimensionId', message: 'Unknown dimension.' }], warnings: [] } })] }
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
  assert.match(result.message, /publish blocked|unknown dimension/i)
  assert.ok(auditEvents.includes('assessment_publish_blocked_release_governance'))
})

test('publish version is blocked when the package is valid but not executable by the live runtime', async () => {
  const auditEvents: string[] = []
  const result = await publishAdminAssessmentVersion({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        if (/from assessment_versions av/i.test(sql)) {
          return {
            rows: [
              makeManagedVersionRow({
                sign_off_status: 'signed_off',
                sign_off_at: '2026-03-21T09:30:00.000Z',
                sign_off_by_name: 'Rina Patel',
                sign_off_material_updated_at: '2026-03-21T08:00:00.000Z',
                definition_payload: {
                  meta: {
                    schemaVersion: 'sonartra-assessment-package/v1',
                    assessmentKey: 'signals',
                    assessmentTitle: 'Signals',
                    versionLabel: '1.2.0',
                    defaultLocale: 'en',
                  },
                  dimensions: [{ id: 'Unsupported_Signal', labelKey: 'dimension.unsupported.label' }],
                  questions: [{
                    id: 'q1',
                    promptKey: 'question.q1.prompt',
                    dimensionId: 'Unsupported_Signal',
                    reverseScored: false,
                    weight: 1,
                    options: [
                      { id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { Unsupported_Signal: 1 } },
                    ],
                  }],
                  scoring: { dimensionRules: [{ dimensionId: 'Unsupported_Signal', aggregation: 'sum' }] },
                  normalization: { scales: [{ id: 'core-scale', dimensionIds: ['Unsupported_Signal'], range: { min: 0, max: 1 }, bands: [{ key: 'low', min: 0, max: 1, labelKey: 'band.low.label' }] }] },
                  outputs: { reportRules: [{ key: 'summary', labelKey: 'output.summary.label', dimensionIds: ['Unsupported_Signal'], normalizationScaleId: 'core-scale' }] },
                  language: { locales: [{ locale: 'en', text: { 'dimension.unsupported.label': 'Unsupported', 'question.q1.prompt': 'Question', 'question.q1.option.a': 'Option', 'band.low.label': 'Low', 'output.summary.label': 'Summary' } }] },
                },
              }),
            ],
          }
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

        if (/insert into assessment_question_sets/i.test(sql) || /update assessment_versions\s+set lifecycle_status = 'published'/i.test(sql)) {
          throw new Error(`Unexpected live-runtime materialization write: ${sql}`)
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
  assert.match(result.message, /does not support signal code/i)
  assert.ok(auditEvents.includes('assessment_publish_blocked_release_governance'))
})

test('publish fails fast with a schema compatibility error when runtime materialization tables are unavailable', async () => {
  let runtimeWrites = 0

  const result = await publishAdminAssessmentVersion({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params, { missingTables: ['assessment_question_sets'] })
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        if (/insert into assessment_question_sets/i.test(sql) || /insert into assessment_questions/i.test(sql)) {
          runtimeWrites += 1
          throw new Error(`Unexpected runtime write: ${sql}`)
        }

        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [makeManagedVersionRow({ sign_off_status: 'signed_off', sign_off_at: '2026-03-21T09:30:00.000Z', sign_off_by_name: 'Rina Patel', sign_off_material_updated_at: '2026-03-21T08:00:00.000Z' })] }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }

        if (/update assessment_versions\s+set publish_readiness_status/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
          return { rows: [] }
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'schema_incompatible')
  assert.match(result.message, /runtime schema is incompatible with publishing assessment versions/i)
  assert.match(result.message, /assessment_question_sets/i)
  assert.equal(runtimeWrites, 0)
})

test('publish maps runtime materialization constraint failures into a clean blocking error', async () => {
  const result = await publishAdminAssessmentVersion({
    assessmentId: 'assessment-1',
    versionId: 'version-2',
    expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
  }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
        if (runtimeSchemaResult) {
          return runtimeSchemaResult
        }

        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [makeManagedVersionRow({ sign_off_status: 'signed_off', sign_off_at: '2026-03-21T09:30:00.000Z', sign_off_by_name: 'Rina Patel', sign_off_material_updated_at: '2026-03-21T08:00:00.000Z' })] }
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] }
        }

        if (/update assessment_versions\s+set publish_readiness_status/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
          return { rows: [] }
        }

        if (/select key, name\s+from assessment_versions/i.test(sql)) {
          return { rows: [{ key: 'signals-v1', name: 'Sonartra Signals' }] }
        }

        if (/insert into assessment_question_sets/i.test(sql)) {
          const error = new Error('null value in column "option_text" of relation "assessment_question_options" violates not-null constraint') as Error & { code?: string }
          error.code = '23502'
          throw error
        }

        throw new Error(`Unexpected transactional query: ${sql}`)
      },
    } as never),
  } as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'invalid_transition')
  assert.match(result.message, /could not be materialized into the live runtime question bank safely/i)
})

test('publish maps live-pointer update failures into a targeted admin-safe error and logs the failing stage', async () => {
  const originalConsoleError = console.error
  const consoleCalls: unknown[][] = []
  console.error = (...args: unknown[]) => {
    consoleCalls.push(args)
  }

  try {
    const result = await publishAdminAssessmentVersion({
      assessmentId: 'assessment-1',
      versionId: 'version-2',
      expectedUpdatedAt: '2026-03-21T09:00:00.000Z',
    }, {
      resolveAdminAccess: async () => createBaseAccess(),
      getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
      getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
      withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
        query: async (sql: string, params: unknown[] = []) => {
          const runtimeSchemaResult = matchRuntimeSchemaQuery(sql, params)
          if (runtimeSchemaResult) {
            return runtimeSchemaResult
          }

          if (/from assessment_versions av/i.test(sql)) {
            return { rows: [makeManagedVersionRow({ sign_off_status: 'signed_off', sign_off_at: '2026-03-21T09:30:00.000Z', sign_off_by_name: 'Rina Patel', sign_off_material_updated_at: '2026-03-21T08:00:00.000Z' })] }
          }

          if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
            return { rows: [] }
          }

          if (/update assessment_versions\s+set publish_readiness_status/i.test(sql) || /insert into access_audit_events/i.test(sql)) {
            return { rows: [] }
          }

          if (/select key, name\s+from assessment_versions/i.test(sql)) {
            return { rows: [{ key: 'signals-v1', name: 'Sonartra Signals' }] }
          }

          if (/insert into assessment_question_sets/i.test(sql)) {
            return { rows: [{ id: 'question-set-1' }] }
          }

          if (/update assessment_question_sets/i.test(sql) || /insert into assessment_questions/i.test(sql) || /insert into assessment_question_options/i.test(sql) || /insert into assessment_option_signal_mappings/i.test(sql) || /delete from assessment_option_signal_mappings/i.test(sql) || /delete from assessment_question_options/i.test(sql) || /delete from assessment_questions/i.test(sql)) {
            return { rows: [{ id: 'question-1' }] }
          }

          if (/update assessment_versions\s+set lifecycle_status = 'archived'/i.test(sql) || /update assessment_versions\s+set lifecycle_status = 'published'/i.test(sql)) {
            return { rows: [{ id: 'version-2' }] }
          }

          if (/update assessment_definitions/i.test(sql)) {
            const error = new Error('insert or update on table "assessment_definitions" violates foreign key constraint "assessment_definitions_current_published_version_id_fkey"') as Error & {
              code?: string
              table?: string
              column?: string
              constraint?: string
              detail?: string
            }
            error.code = '23503'
            error.table = 'assessment_definitions'
            error.column = 'current_published_version_id'
            error.constraint = 'assessment_definitions_current_published_version_id_fkey'
            error.detail = 'Key (current_published_version_id)=(version-2) is not present in table "assessment_versions".'
            throw error
          }

          throw new Error(`Unexpected transactional query: ${sql}`)
        },
      } as never),
    } as never)

    assert.equal(result.ok, false)
    assert.equal(result.code, 'invalid_transition')
    assert.match(result.message, /live assessment pointer/i)

    const diagnostic = consoleCalls.find((call) => call[0] === '[admin-assessment-management] Publish stage failed.')
    assert.ok(diagnostic)
    assert.deepEqual(diagnostic?.[1], {
      stage: 'live_pointer_update',
      postgresCode: '23503',
      constraint: 'assessment_definitions_current_published_version_id_fkey',
      table: 'assessment_definitions',
      column: 'current_published_version_id',
      detail: 'Key (current_published_version_id)=(version-2) is not present in table "assessment_versions".',
      message: 'insert or update on table "assessment_definitions" violates foreign key constraint "assessment_definitions_current_published_version_id_fkey"',
      assessmentId: 'assessment-1',
      versionId: 'version-2',
    })
  } finally {
    console.error = originalConsoleError
  }
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

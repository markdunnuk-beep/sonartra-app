import assert from 'node:assert/strict'
import test from 'node:test'

import {
  importAdminAssessmentPackage,
  publishAdminAssessmentVersion,
  signOffAdminAssessmentVersion,
  updateAdminAssessmentVersionReleaseNotes,
} from '../lib/admin/server/assessment-management'

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
    withTransaction: async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
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

test('sign-off records signer identity and timestamp for draft versions', async () => {
  const updates: unknown[][] = []
  const auditEvents: string[] = []
  const baseRow = makeVersionRow()
  const result = await signOffAdminAssessmentVersion({ assessmentId: 'assessment-1', versionId: 'version-1' }, {
    resolveAdminAccess: async () => createBaseAccess(),
    getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
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

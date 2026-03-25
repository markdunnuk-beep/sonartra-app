import assert from 'node:assert/strict'
import test from 'node:test'

import fullResultsFixture from './fixtures/package-contract-v2-wplp80-lite-full-results.json'
import liteFixture from './fixtures/package-contract-v2-wplp80-lite.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { detectAssessmentPackageVersion, importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import { getAdminAssessmentVersionReadiness } from '../lib/admin/domain/assessment-package-review'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '../lib/admin/domain/assessment-package-v2'
import { evaluateCompletedV2Assessment } from '../lib/server/live-assessment-v2'
import { getLatestIndividualResultForUser } from '../lib/server/individual-results'
import type { AssessmentResultRow } from '../lib/assessment-types'

function cloneFixture() {
  return structuredClone(fullResultsFixture)
}

function buildDeterministicResponses(packagePayload: Record<string, any>) {
  const responses: Record<string, string> = {}
  const updatedAtByQuestionId: Record<string, string> = {}

  const modelsById = new Map((packagePayload.responseModels?.models ?? []).map((model: Record<string, any>) => [model.id, model]))

  for (const question of packagePayload.questions ?? []) {
    const model = modelsById.get(question.responseModelId)
    assert.ok(model)
    assert.equal(model?.type, 'single_select')

    const options = model?.optionSetId
      ? (packagePayload.responseModels?.optionSets?.find((optionSet: Record<string, any>) => optionSet.id === model.optionSetId)?.options ?? [])
      : (model?.options ?? [])

    const firstOption = options[0]?.id
    assert.ok(firstOption)
    responses[question.id] = firstOption
    updatedAtByQuestionId[question.id] = '2026-03-25T00:00:00.000Z'
  }

  return { responses, updatedAtByQuestionId }
}

test('WPLP-80 Lite Full Results fixture closes content-level output gaps from the minimal lite fixture', () => {
  const oldLiteValidation = validateSonartraAssessmentPackageV2(structuredClone(liteFixture))
  const newValidation = validateSonartraAssessmentPackageV2(cloneFixture())

  assert.equal(oldLiteValidation.ok, true)
  assert.equal(newValidation.ok, true)
  assert.equal(newValidation.errors.length, 0)

  assert.equal(oldLiteValidation.summary.outputRuleCount, 4)
  assert.equal(newValidation.summary.outputRuleCount, 8)
  assert.equal(oldLiteValidation.summary.normalizationRuleCount, 0)
  assert.equal(newValidation.summary.normalizationRuleCount, 1)

  assert.equal(fullResultsFixture.report.content.length, 8)
  assert.ok(fullResultsFixture.report.content.every((entry) => typeof entry.explanation === 'string' && entry.explanation.length > 80))
})

test('WPLP-80 Lite Full Results fixture validates imports and materializes rich dashboard-friendly output content through completion', async () => {
  const importedCanonical = importAssessmentPackagePayload(cloneFixture())

  assert.equal(importedCanonical.validationSummary.success, true)
  assert.equal(importedCanonical.detectedVersion, 'package_contract_v2')
  assert.equal(importedCanonical.classifier, 'canonical_contract_v2')
  assert.equal(importedCanonical.readiness.importable, true)
  assert.equal(importedCanonical.readiness.compilable, true)

  const detected = detectAssessmentPackageVersion(cloneFixture())
  assert.equal(detected.detectedVersion, 'package_contract_v2')
  assert.equal(detected.classifier, 'canonical_contract_v2')
  assert.equal(detected.versionLabel, '2.0.0-lite-full-results.1')

  const readiness = getAdminAssessmentVersionReadiness({
    packageInfo: {
      status: importedCanonical.packageStatus,
      detectedVersion: importedCanonical.detectedVersion,
      schemaVersion: importedCanonical.schemaVersion,
      sourceType: 'manual_import',
      importedAt: '2026-03-25T00:00:00.000Z',
      importedByName: 'Fixture Runner',
      sourceFilename: 'package-contract-v2-wplp80-lite-full-results.json',
      summary: importedCanonical.summary,
      errors: importedCanonical.errors,
      warnings: importedCanonical.warnings,
    },
    normalizedPackage: null,
    storedDefinitionPayload: importedCanonical.definitionPayload,
    lifecycleStatus: 'draft',
    packageValidationReport: { analysis: importedCanonical.analysis },
    savedScenarios: [],
    latestSuiteSnapshot: null,
  })

  const runtimePath = readiness.checks.find((check) => check.key === 'runtime_execution_path')
  assert.equal(runtimePath?.status, 'pass')

  const deterministic = buildDeterministicResponses(importedCanonical.definitionPayload as Record<string, any>)
  let persistedResultPayload: Record<string, unknown> | null = null

  const completion = await evaluateCompletedV2Assessment({
    assessmentId: 'assessment-wplp80-lite-full-results',
    ownerUserId: 'user-1',
    persistResult: async (input) => {
      persistedResultPayload = input.resultPayload
      return { assessmentResultId: 'result-wplp80-lite-full-results' }
    },
  }, {
    withTransactionFn: (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
          return {
            rows: [{
              assessment_id: 'assessment-wplp80-lite-full-results',
              assessment_version_id: 'version-wplp80-lite-full-results-runtime',
              assessment_version_key: 'wplp80-lite-full-results-runtime-v1',
              assessment_version_name: 'WPLP-80 Lite Full Results Runtime v1',
              package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
              package_status: 'valid',
              definition_payload: importedCanonical.definitionPayload,
              package_validation_report_json: { analysis: importedCanonical.analysis },
              assessment_status: 'in_progress',
              total_questions: 16,
              metadata_json: {
                liveRuntimeV2: deterministic,
              },
              completed_at: '2026-03-25T00:10:00.000Z',
              scoring_status: 'not_scored',
            }],
          }
        }

        if (/UPDATE assessments/i.test(sql)) {
          return { rows: [] }
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never)) as never,
    getLatestResultSnapshot: (async () => null) as never,
  })

  assert.equal(completion.httpStatus, 200)
  assert.equal(completion.body.ok, true)
  assert.equal(completion.body.resultStatus, 'succeeded')
  assert.ok(persistedResultPayload)

  const materialized = (persistedResultPayload as { materializedOutputs?: { webSummaryOutputs?: Array<{ key: string, explanation?: { text?: string | null } }> } })?.materializedOutputs
  const outputs = materialized?.webSummaryOutputs ?? []

  const requiredKeys = [
    'overview-summary',
    'top-signal-summary',
    'behaviour-domain-summary',
    'motivators-domain-summary',
    'leadership-domain-summary',
    'culture-domain-summary',
    'ranked-signal-summary',
    'development-priority-summary',
  ]

  for (const key of requiredKeys) {
    const output = outputs.find((entry) => entry.key === key)
    assert.ok(output)
    assert.ok(typeof output?.explanation?.text === 'string' && output.explanation.text.length > 80)
  }

  const resultRow: AssessmentResultRow = {
    id: 'result-wplp80-lite-full-results',
    assessment_id: 'assessment-wplp80-lite-full-results',
    assessment_version_id: 'version-wplp80-lite-full-results-runtime',
    version_key: 'wplp80-lite-full-results-runtime-v1',
    scoring_model_key: 'package-contract-v2-runtime',
    snapshot_version: 1,
    status: 'complete',
    result_payload: persistedResultPayload,
    response_quality_payload: null,
    completed_at: '2026-03-25T00:10:00.000Z',
    scored_at: '2026-03-25T00:11:00.000Z',
    created_at: '2026-03-25T00:11:00.000Z',
    updated_at: '2026-03-25T00:11:00.000Z',
  }

  const dashboardResult = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({
      id: 'assessment-wplp80-lite-full-results',
      user_id: 'user-1',
      organisation_id: null,
      assessment_version_id: 'version-wplp80-lite-full-results-runtime',
      status: 'completed',
      started_at: null,
      completed_at: '2026-03-25T00:10:00.000Z',
      last_activity_at: '2026-03-25T00:10:00.000Z',
      progress_count: 16,
      progress_percent: '100',
      current_question_index: 16,
      scoring_status: 'scored',
      source: 'web',
      metadata_json: null,
      created_at: '2026-03-25T00:00:00.000Z',
      updated_at: '2026-03-25T00:11:00.000Z',
      version_key: 'wplp80-lite-full-results-runtime-v1',
      total_questions: 16,
    }),
    getLatestResultForAssessment: async () => resultRow,
    getResultById: async () => resultRow,
    getLatestReadyResultForUser: async () => ({
      ...resultRow,
      assessment_started_at: null,
      assessment_completed_at: '2026-03-25T00:10:00.000Z',
      assessment_version_key: 'wplp80-lite-full-results-runtime-v1',
    }),
    getSignalsByResultId: async () => [],
  })

  assert.equal(dashboardResult.ok, true)
  assert.equal(dashboardResult.state, 'ready_v2')
  if (dashboardResult.ok && dashboardResult.state === 'ready_v2') {
    assert.ok(dashboardResult.data.summaryCards.length >= requiredKeys.length)
    assert.ok(dashboardResult.data.summaryCards.some((entry) => entry.key === 'ranked-signal-summary' && typeof entry.explanation === 'string'))
  }
})

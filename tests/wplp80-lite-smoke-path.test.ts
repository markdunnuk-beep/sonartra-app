import assert from 'node:assert/strict'
import test from 'node:test'

import liteFixture from './fixtures/package-contract-v2-wplp80-lite.json'
import { extractAssessmentPackageIdentity, importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import { getAdminAssessmentVersionReadiness } from '../lib/admin/domain/assessment-package-review'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '../lib/admin/domain/assessment-package-v2'
import { resolveLiveSignalsPublishedVersionState } from '../lib/server/live-signals-runtime'
import { getQuestionsByAssessmentIdWithDependencies } from '../lib/question-bank'
import { evaluateCompletedV2Assessment } from '../lib/server/live-assessment-v2'
import { getAssessmentResultReadModel } from '../lib/server/assessment-result-read'
import type { AssessmentResultRow } from '../lib/assessment-types'

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

    assert.equal(options.length, 4)
    const firstOption = options[0]?.id
    assert.ok(firstOption)
    responses[question.id] = firstOption
    updatedAtByQuestionId[question.id] = '2026-03-25T00:00:00.000Z'
  }

  return { responses, updatedAtByQuestionId }
}

test('WPLP-80 Lite package-first smoke path covers import readiness runtime delivery completion and results visibility', async () => {
  const importedCanonical = importAssessmentPackagePayload(structuredClone(liteFixture))

  assert.equal(importedCanonical.validationSummary.success, true)
  assert.equal(importedCanonical.detectedVersion, 'package_contract_v2')
  assert.equal(importedCanonical.classifier, 'canonical_contract_v2')
  assert.equal(importedCanonical.readiness.importable, true)
  assert.equal(importedCanonical.summary?.questionsCount, 16)
  assert.equal(importedCanonical.summary?.sectionCount, 4)
  const identity = extractAssessmentPackageIdentity(importedCanonical.definitionPayload)
  assert.equal(identity.identity.assessmentKey, 'wplp-80-lite')
  assert.equal(identity.identity.slug, 'wplp-80-lite')
  assert.equal(identity.identity.category, 'behaviour')

  const readiness = getAdminAssessmentVersionReadiness({
    packageInfo: {
      status: importedCanonical.packageStatus,
      detectedVersion: importedCanonical.detectedVersion,
      schemaVersion: importedCanonical.schemaVersion,
      sourceType: 'manual_import',
      importedAt: '2026-03-25T00:00:00.000Z',
      importedByName: 'Smoke Runner',
      sourceFilename: 'package-contract-v2-wplp80-lite.json',
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

  assert.equal(readiness.status, 'not_ready')
  const runtimeReadinessCheck = readiness.checks.find((check) => check.key === 'runtime_execution_path')
  assert.equal(runtimeReadinessCheck?.status, 'fail')
  assert.match(runtimeReadinessCheck?.detail ?? '', /not runtime-contract classified/i)

  assert.ok(importedCanonical.analysis.compiledRuntimeArtifact)

  const resolved = await resolveLiveSignalsPublishedVersionState({
    queryDb: async () => ({
      rows: [{
        assessment_definition_id: 'definition-wplp80-lite',
        assessment_definition_key: 'sonartra_signals',
        assessment_definition_slug: 'sonartra-signals',
        current_published_version_id: 'version-wplp80-lite-runtime',
        assessment_version_id: 'version-wplp80-lite-runtime',
        assessment_version_key: 'wplp80-lite-runtime-v1',
        assessment_version_name: 'WPLP-80 Lite Runtime v1',
        total_questions: 16,
        is_active: true,
        active_question_set_id: null,
        active_question_count: 0,
        questions_with_runtime_metadata: 0,
        package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
        package_status: 'valid',
        definition_payload: importedCanonical.definitionPayload,
      }],
    }),
  })

  assert.ok(resolved.version)
  assert.equal(resolved.version?.contractVersion, 'package_contract_v2')

  const delivery = await getQuestionsByAssessmentIdWithDependencies('assessment-wplp80-lite', {
    queryDb: async (sql: string) => {
      if (/FROM assessments/i.test(sql)) {
        return {
          rows: [{
            id: 'assessment-wplp80-lite',
            user_id: 'user-1',
            organisation_id: null,
            assessment_version_id: 'version-wplp80-lite-runtime',
            status: 'in_progress',
            started_at: null,
            completed_at: null,
            last_activity_at: null,
            progress_count: 0,
            progress_percent: '0',
            current_question_index: 1,
            scoring_status: 'not_scored',
            source: 'web',
            metadata_json: null,
            created_at: '2026-03-25T00:00:00.000Z',
            updated_at: '2026-03-25T00:00:00.000Z',
          }],
        } as never
      }
      if (/FROM assessment_versions/i.test(sql)) {
        return {
          rows: [{
            id: 'version-wplp80-lite-runtime',
            key: 'wplp80-lite-runtime-v1',
            name: 'WPLP-80 Lite Runtime v1',
            total_questions: 16,
            is_active: true,
            package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
            package_raw_payload: importedCanonical.definitionPayload,
            definition_payload: importedCanonical.definitionPayload,
            package_validation_report_json: {
              analysis: { classifier: 'runtime_contract_v2', readinessState: { capabilities: { liveRuntimeSupported: true } } },
            },
          }],
        } as never
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
  })

  assert.ok(delivery)
  assert.equal(delivery?.questions.length, 16)
  const runtimeQuestions = (delivery as unknown as { runtime: { questions: Array<{ id: string; responseModel: { type: string; options: unknown[] } }> } }).runtime.questions
  assert.equal(runtimeQuestions.length, 16)
  assert.ok(runtimeQuestions.every((question) => question.responseModel.type === 'single_select'))
  assert.ok(runtimeQuestions.every((question) => question.responseModel.options.length === 4))

  const deterministic = buildDeterministicResponses(importedCanonical.definitionPayload as Record<string, any>)

  let persistedResultPayload: Record<string, unknown> | null = null
  const completion = await evaluateCompletedV2Assessment({
    assessmentId: 'assessment-wplp80-lite',
    ownerUserId: 'user-1',
    persistResult: async (input) => {
      persistedResultPayload = input.resultPayload
      return { assessmentResultId: 'result-wplp80-lite' }
    },
  }, {
    withTransactionFn: (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
          return {
            rows: [{
              assessment_id: 'assessment-wplp80-lite',
              assessment_version_id: 'version-wplp80-lite-runtime',
              assessment_version_key: 'wplp80-lite-runtime-v1',
              assessment_version_name: 'WPLP-80 Lite Runtime v1',
              package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
              package_status: 'valid',
              definition_payload: importedCanonical.definitionPayload,
              package_validation_report_json: { analysis: { classifier: 'runtime_contract_v2', readinessState: { capabilities: { liveRuntimeSupported: true } } } },
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
  assert.equal(completion.body.resultId, 'result-wplp80-lite')
  assert.ok(persistedResultPayload)

  const resultRow: AssessmentResultRow = {
    id: 'result-wplp80-lite',
    assessment_id: 'assessment-wplp80-lite',
    assessment_version_id: 'version-wplp80-lite-runtime',
    version_key: 'wplp80-lite-runtime-v1',
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

  const readModel = await getAssessmentResultReadModel('assessment-wplp80-lite', undefined, {
    getAssessmentById: async () => ({
      id: 'assessment-wplp80-lite',
      user_id: 'user-1',
      organisation_id: null,
      assessment_version_id: 'version-wplp80-lite-runtime',
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
    }),
    getResultByAssessmentId: async () => resultRow,
    getSignalsByResultId: async () => [],
  })

  assert.equal(readModel.kind, 'ok')
  if (readModel.kind !== 'ok') return
  assert.equal(readModel.body.result.availability, 'available')
  if (readModel.body.result.availability !== 'available') return
  assert.equal(readModel.body.result.status, 'complete')
  assert.equal(readModel.body.result.contractVersion, 'package_contract_v2')
  assert.ok((readModel.body.result.liveRuntime?.webSummaryOutputs.length ?? 0) > 0)
})

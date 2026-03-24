import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'

import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { materializeAssessmentOutputsV2 } from '../lib/admin/domain/assessment-package-v2-materialization'
import { evaluateAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-evaluator'
import {
  SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
  validateSonartraAssessmentPackageV2,
} from '../lib/admin/domain/assessment-package-v2'
import { getAdminAssessmentVersionReadiness } from '../lib/admin/domain/assessment-package-review'
import { getQuestionsByAssessmentIdWithDependencies } from '../lib/question-bank'
import { getAssessmentResultReadModel } from '../lib/server/assessment-result-read'
import { resolveLiveSignalsPublishedVersionState } from '../lib/server/live-signals-runtime'
import type { AssessmentResultRow } from '../lib/assessment-types'

async function loadExamplePackage() {
  const payload = JSON.parse(await fs.readFile(new URL('./fixtures/package-contract-v2-example.json', import.meta.url), 'utf8'))
  const validation = validateSonartraAssessmentPackageV2(payload)
  assert.equal(validation.ok, true)
  return validation.normalizedPackage!
}

test('resolveLiveSignalsPublishedVersionState recognizes an eligible published Package Contract v2 runtime', async () => {
  const pkg = await loadExamplePackage()

  const result = await resolveLiveSignalsPublishedVersionState({
    queryDb: async () => ({
      rows: [
        {
          assessment_definition_id: 'definition-signals',
          assessment_definition_key: 'sonartra_signals',
          assessment_definition_slug: 'sonartra-signals',
          current_published_version_id: 'version-v2',
          assessment_version_id: 'version-v2',
          assessment_version_key: 'signals-v2-live',
          assessment_version_name: 'Signals v2 Live',
          total_questions: 4,
          is_active: true,
          active_question_set_id: null,
          active_question_count: 0,
          questions_with_runtime_metadata: 0,
          package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
          package_status: 'valid',
          definition_payload: pkg,
        },
      ],
    }),
  })

  assert.deepEqual(result.version, {
    assessmentDefinitionId: 'definition-signals',
    assessmentDefinitionKey: 'sonartra_signals',
    assessmentDefinitionSlug: 'sonartra-signals',
    currentPublishedVersionId: 'version-v2',
    assessmentVersionId: 'version-v2',
    assessmentVersionKey: 'signals-v2-live',
    assessmentVersionName: 'Signals v2 Live',
    totalQuestions: 4,
    isActive: true,
    contractVersion: 'package_contract_v2',
  })
})

test('getQuestionsByAssessmentIdWithDependencies returns a safe v2 live delivery contract', async () => {
  const pkg = await loadExamplePackage()
  const response = await getQuestionsByAssessmentIdWithDependencies('assessment-v2', {
    queryDb: async (sql: string) => {
      if (/FROM assessments/i.test(sql)) {
        return {
          rows: [{
            id: 'assessment-v2',
            user_id: 'user-1',
            organisation_id: null,
            assessment_version_id: 'version-v2',
            status: 'in_progress',
            started_at: null,
            completed_at: null,
            last_activity_at: null,
            progress_count: 1,
            progress_percent: '25',
            current_question_index: 1,
            scoring_status: 'not_scored',
            source: 'web',
            metadata_json: {
              liveRuntimeV2: {
                responses: { q1: 'often' },
                updatedAtByQuestionId: { q1: '2026-03-23T12:00:00.000Z' },
              },
            },
            created_at: '2026-03-23T12:00:00.000Z',
            updated_at: '2026-03-23T12:00:00.000Z',
          }],
        } as never
      }
      if (/FROM assessment_versions/i.test(sql)) {
        return {
          rows: [{
            id: 'version-v2',
            key: 'signals-v2-live',
            name: 'Signals v2 Live',
            total_questions: 4,
            is_active: true,
            package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
            definition_payload: pkg,
            package_validation_report_json: {
              analysis: {
                classifier: 'runtime_contract_v2',
                readinessState: { capabilities: { liveRuntimeSupported: true } },
              },
            },
          }],
        } as never
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
  })

  assert.ok(response)
  assert.equal(response?.questions.length, 0)
  assert.equal((response as unknown as { runtime: { contractVersion: string } }).runtime.contractVersion, 'package_contract_v2')
  assert.equal((response as unknown as { runtime: { questions: Array<{ id: string; responseModel: { options: unknown[] } }> } }).runtime.questions[0]?.id, 'q1')
  assert.equal((response as unknown as { runtime: { responses: Array<{ questionId: string; value: unknown }> } }).runtime.responses[0]?.questionId, 'q1')
})

test('saveV2AssessmentResponse validates and persists live v2 responses safely', async () => {
  const pkg = await loadExamplePackage()
  const module = await import('../lib/server/live-assessment-v2')

  const updates: unknown[][] = []
  const withTransactionFn = (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
    query: async (sql: string, params: unknown[] = []) => {
      if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
        return {
          rows: [{
            assessment_id: 'assessment-v2',
            assessment_version_id: 'version-v2',
            assessment_version_key: 'signals-v2-live',
            assessment_version_name: 'Signals v2 Live',
            package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
            package_status: 'valid',
            definition_payload: pkg,
            package_validation_report_json: {
              analysis: {
                classifier: 'runtime_contract_v2',
                readinessState: { capabilities: { liveRuntimeSupported: true } },
              },
            },
            assessment_status: 'in_progress',
            total_questions: 4,
            metadata_json: null,
            completed_at: null,
            scoring_status: 'not_scored',
          }],
        }
      }
      if (/UPDATE assessments/i.test(sql)) {
        updates.push(params)
        return { rows: [] }
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
  } as never)) as never

  const saved = await module.saveV2AssessmentResponse({
    assessmentId: 'assessment-v2',
    appUserId: 'user-1',
    questionId: 'q1',
    response: 'often',
  }, { withTransactionFn })
  assert.equal(saved.status, 200)
  assert.equal(updates.length, 1)

  const invalid = await module.saveV2AssessmentResponse({
    assessmentId: 'assessment-v2',
    appUserId: 'user-1',
    questionId: 'q1',
    response: 'not-an-option',
  }, { withTransactionFn })
  assert.equal(invalid.status, 400)
  assert.equal((invalid.body as { error: string }).error.includes('expects a valid option id'), true)
})

test('saveV2AssessmentResponse blocks conservatively when report metadata is present but incomplete', async () => {
  const pkg = await loadExamplePackage()
  const module = await import('../lib/server/live-assessment-v2')

  const withTransactionFn = (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
    query: async (sql: string) => {
      if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
        return {
          rows: [{
            assessment_id: 'assessment-v2',
            assessment_version_id: 'version-v2',
            assessment_version_key: 'signals-v2-live',
            assessment_version_name: 'Signals v2 Live',
            package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
            package_status: 'valid',
            definition_payload: pkg,
            package_validation_report_json: {
              analysis: {
                classifier: 'runtime_contract_v2',
              },
            },
            assessment_status: 'in_progress',
            total_questions: 4,
            metadata_json: null,
            completed_at: null,
            scoring_status: 'not_scored',
          }],
        }
      }
      if (/UPDATE assessments/i.test(sql)) {
        throw new Error(`update should not run when runtime routing is blocked: ${sql}`)
      }
      throw new Error(`Unexpected query: ${sql}`)
    },
  } as never)) as never

  const blocked = await module.saveV2AssessmentResponse({
    assessmentId: 'assessment-v2',
    appUserId: 'user-1',
    questionId: 'q1',
    response: 'often',
  }, { withTransactionFn })

  assert.equal(blocked.status, 409)
  assert.match((blocked.body as { error: string }).error, /missing explicit live runtime support metadata/i)
})

test('getAssessmentResultReadModel returns stable v2 live result outputs', async () => {
  const pkg = await loadExamplePackage()
  const compiled = compileAssessmentPackageV2(pkg)
  assert.equal(compiled.ok, true)
  const evaluation = evaluateAssessmentPackageV2(compiled.executablePackage!, {
    q1: 'always',
    q2: 'rarely',
    q3: 'always',
    q4: 'often',
  })
  const materialized = materializeAssessmentOutputsV2(compiled.executablePackage!, evaluation)

  const resultRow: AssessmentResultRow = {
    id: 'result-v2',
    assessment_id: 'assessment-v2',
    assessment_version_id: 'version-v2',
    version_key: 'signals-v2-live',
    scoring_model_key: 'package-contract-v2-runtime',
    snapshot_version: 1,
    status: 'complete',
    result_payload: {
      contractVersion: 'package_contract_v2',
      packageMetadata: {
        assessmentKey: compiled.executablePackage!.metadata.assessmentKey,
        assessmentName: compiled.executablePackage!.metadata.assessmentName,
        packageSemver: compiled.executablePackage!.metadata.compatibility.packageSemver,
      },
      evaluation,
      materializedOutputs: materialized,
    },
    response_quality_payload: {
      contractVersion: 'package_contract_v2',
      technicalDiagnostics: materialized.technicalDiagnostics,
    },
    completed_at: '2026-03-23T12:00:00.000Z',
    scored_at: '2026-03-23T12:01:00.000Z',
    created_at: '2026-03-23T12:01:00.000Z',
    updated_at: '2026-03-23T12:01:00.000Z',
  }

  const result = await getAssessmentResultReadModel('assessment-v2', undefined, {
    getAssessmentById: async () => ({
      id: 'assessment-v2',
      user_id: 'user-1',
      organisation_id: null,
      assessment_version_id: 'version-v2',
      status: 'completed',
      started_at: null,
      completed_at: '2026-03-23T12:00:00.000Z',
      last_activity_at: '2026-03-23T12:00:00.000Z',
      progress_count: 4,
      progress_percent: '100',
      current_question_index: 4,
      scoring_status: 'scored',
      source: 'web',
      metadata_json: null,
      created_at: '2026-03-23T11:00:00.000Z',
      updated_at: '2026-03-23T12:01:00.000Z',
    }),
    getResultByAssessmentId: async () => resultRow,
    getSignalsByResultId: async () => [],
  })

  assert.equal(result.kind, 'ok')
  if (result.kind !== 'ok') return
  assert.equal(result.body.result.availability, 'available')
  if (result.body.result.availability !== 'available' || result.body.result.status !== 'complete') return
  assert.equal(result.body.result.contractVersion, 'package_contract_v2')
  assert.ok((result.body.result.liveRuntime?.webSummaryOutputs.length ?? 0) > 0)
  assert.equal('evaluation' in (result.body.result.liveRuntime ?? {}), false)
  assert.equal('technicalDiagnostics' in (result.body.result.liveRuntime ?? {}), false)
  assert.equal('evaluation' in ((result.body.result.snapshot as Record<string, unknown>) ?? {}), false)
  assert.equal('materializedOutputs' in ((result.body.result.snapshot as Record<string, unknown>) ?? {}), false)
  assert.equal(result.body.result.responseQuality, null)
})

test('getAdminAssessmentVersionReadiness keeps publish gating truthful for runnable v2 packages', async () => {
  const pkg = await loadExamplePackage()
  const readiness = getAdminAssessmentVersionReadiness({
    packageInfo: {
      status: 'valid',
      detectedVersion: 'package_contract_v2',
      schemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
      sourceType: 'manual_import',
      importedAt: '2026-03-23T12:00:00.000Z',
      importedByName: 'Rina Patel',
      sourceFilename: 'signals-v2.json',
      summary: null,
      errors: [],
      warnings: [],
    },
    normalizedPackage: null,
    storedDefinitionPayload: pkg,
    lifecycleStatus: 'draft',
    packageValidationReport: {
      analysis: {
        classifier: 'runtime_contract_v2',
        readinessState: {
          capabilities: {
            liveRuntimeSupported: true,
          },
        },
      },
    },
    savedScenarios: [],
    latestSuiteSnapshot: null,
  })

  assert.notEqual(readiness.status, 'not_ready')
  assert.equal(readiness.checks.find((check) => check.key === 'runtime_execution_path')?.status, 'pass')
})

test('getAdminAssessmentVersionReadiness does not overstate live support when runtime report evidence is missing', async () => {
  const pkg = await loadExamplePackage()
  const readiness = getAdminAssessmentVersionReadiness({
    packageInfo: {
      status: 'valid',
      detectedVersion: 'package_contract_v2',
      schemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
      sourceType: 'manual_import',
      importedAt: '2026-03-23T12:00:00.000Z',
      importedByName: 'Rina Patel',
      sourceFilename: 'signals-v2.json',
      summary: null,
      errors: [],
      warnings: [],
    },
    normalizedPackage: null,
    storedDefinitionPayload: pkg,
    lifecycleStatus: 'draft',
    savedScenarios: [],
    latestSuiteSnapshot: null,
  })

  assert.equal(readiness.checks.find((check) => check.key === 'runtime_execution_path')?.status, 'fail')
  assert.equal(readiness.status, 'not_ready')
})

test('evaluateCompletedV2Assessment treats duplicate submits during scoring handoff as pending instead of regenerating results', async () => {
  const pkg = await loadExamplePackage()
  let persistCalls = 0
  const { evaluateCompletedV2Assessment } = await import('../lib/server/live-assessment-v2')

  const result = await evaluateCompletedV2Assessment({
    assessmentId: 'assessment-v2',
    ownerUserId: 'user-1',
    persistResult: async () => {
      persistCalls += 1
      return { assessmentResultId: 'result-v2' }
    },
  }, {
    withTransactionFn: (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
          return {
            rows: [{
              assessment_id: 'assessment-v2',
              assessment_version_id: 'version-v2',
              assessment_version_key: 'signals-v2-live',
              assessment_version_name: 'Signals v2 Live',
              package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
              package_status: 'valid',
              definition_payload: pkg,
              package_validation_report_json: {
                analysis: {
                  classifier: 'runtime_contract_v2',
                  readinessState: { capabilities: { liveRuntimeSupported: true } },
                },
              },
              assessment_status: 'completed',
              total_questions: 4,
              metadata_json: {
                liveRuntimeV2: {
                  responses: { q1: 'always', q2: 'rarely', q3: 'always', q4: 'often' },
                  updatedAtByQuestionId: {
                    q1: '2026-03-23T12:00:00.000Z',
                    q2: '2026-03-23T12:00:01.000Z',
                    q3: '2026-03-23T12:00:02.000Z',
                    q4: '2026-03-23T12:00:03.000Z',
                  },
                },
              },
              completed_at: '2026-03-23T12:05:00.000Z',
              scoring_status: 'pending',
            }],
          }
        }

        if (/UPDATE assessments/i.test(sql)) {
          throw new Error(`Duplicate submit should not update assessments during pending handoff: ${sql}`)
        }

        throw new Error(`Unexpected query: ${sql} :: ${JSON.stringify(params)}`)
      },
    } as never)) as never,
    getLatestResultSnapshot: (async () => null) as never,
  })

  assert.equal(result.httpStatus, 200)
  assert.deepEqual(result.body, {
    ok: true,
    assessmentId: 'assessment-v2',
    assessmentStatus: 'completed',
    resultStatus: 'pending',
    resultId: null,
  })
  assert.equal(persistCalls, 0)
})

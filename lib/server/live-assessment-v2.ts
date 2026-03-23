import type { PoolClient } from 'pg'

import { compileAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import { materializeAssessmentOutputsV2, type MaterializedAssessmentOutputsV2 } from '@/lib/admin/domain/assessment-package-v2-materialization'
import { evaluateAssessmentPackageV2, type AssessmentEvaluationResultV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'
import {
  SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
  parseStoredValidatedAssessmentPackageV2,
  type SonartraAssessmentPackageV2Option,
  type SonartraAssessmentPackageV2ResponseModel,
  type SonartraAssessmentPackageV2ValidatedImport,
} from '@/lib/admin/domain/assessment-package-v2'
import type { AssessmentRow } from '@/lib/assessment-types'
import { queryDb, withTransaction } from '@/lib/db'
import { getLatestAssessmentResultSnapshot } from '@/lib/server/assessment-results'

export type LiveAssessmentContractVersion = 'legacy_v1' | 'package_contract_v2'
export type RuntimeExecutionDiagnosticCode =
  | 'assessment_not_found'
  | 'package_missing'
  | 'package_invalid'
  | 'package_not_publishable'
  | 'package_not_live_runtime_enabled'
  | 'package_not_compilable'
  | 'invalid_response'
  | 'unsupported_response_model'
  | 'assessment_completed'
  | 'assessment_incomplete'

export interface RuntimeExecutionDiagnostic {
  code: RuntimeExecutionDiagnosticCode
  message: string
  stage: 'eligibility' | 'question_delivery' | 'response_save' | 'completion' | 'result_read'
  details?: Record<string, unknown>
}

export interface V2LiveQuestionOptionPayload {
  id: string
  code: string | null
  label: string
  value: string | number | boolean | null
}

export interface V2LiveQuestionPayload {
  id: string
  code: string
  prompt: string
  helpText: string | null
  responseModel: {
    id: string
    type: SonartraAssessmentPackageV2ResponseModel['type']
    numericRange: SonartraAssessmentPackageV2ResponseModel['numericRange'] | null
    multiSelect: SonartraAssessmentPackageV2ResponseModel['multiSelect'] | null
    forcedChoice: SonartraAssessmentPackageV2ResponseModel['forcedChoice'] | null
    options: V2LiveQuestionOptionPayload[]
  }
  sections: Array<{
    id: string
    title: string
    description: string | null
    order: number
  }>
  order: number
}

export interface V2LiveQuestionDeliveryContract {
  contractVersion: 'package_contract_v2'
  assessmentId: string
  assessmentVersionId: string
  assessmentVersionKey: string
  assessmentVersionName: string
  packageSchemaVersion: typeof SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
  sessionStatus: AssessmentRow['status']
  questionCount: number
  questions: V2LiveQuestionPayload[]
  responses: Array<{
    questionId: string
    value: unknown
    updatedAt: string | null
  }>
}

export interface V2PersistedEvaluationArtifact {
  contractVersion: 'package_contract_v2'
  runtimeVersion: string
  packageSchemaVersion: typeof SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
  packageMetadata: {
    assessmentKey: string
    assessmentName: string
    packageSemver: string
  }
  evaluation: AssessmentEvaluationResultV2
  materializedOutputs: V2PersistedMaterializedOutputs
  completedAt: string | null
  scoredAt: string | null
}

export type V2PersistedMaterializedOutputs = MaterializedAssessmentOutputsV2

export interface LiveRuntimeEligibilityResult {
  eligible: boolean
  contractVersion: LiveAssessmentContractVersion
  diagnostics: RuntimeExecutionDiagnostic[]
}

interface AssessmentVersionRuntimeRow {
  assessment_id: string
  assessment_version_id: string
  assessment_version_key: string
  assessment_version_name: string
  package_schema_version: string | null
  package_status: string | null
  definition_payload: unknown
  assessment_status: AssessmentRow['status']
  total_questions: number
  metadata_json: Record<string, unknown> | null
  completed_at: string | null
  scoring_status: AssessmentRow['scoring_status']
}

interface V2ResponseEnvelope {
  responses: Record<string, unknown>
  updatedAtByQuestionId: Record<string, string>
}

export interface SaveV2AssessmentResponseInput {
  assessmentId: string
  appUserId: string
  questionId: string
  response: unknown
  responseTimeMs?: number
}

export interface SaveV2AssessmentResponseResult {
  status: 200 | 400 | 401 | 404 | 409
  body:
    | { error: string }
    | {
        assessmentId: string
        questionId: string
        response: unknown
        progressCount: number
        progressPercent: number
      }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function getResponseModelOptions(
  pkg: SonartraAssessmentPackageV2ValidatedImport,
  responseModel: SonartraAssessmentPackageV2ResponseModel,
): SonartraAssessmentPackageV2Option[] {
  return [
    ...(responseModel.optionSetId ? (pkg.responseModels.optionSets ?? []).find((entry) => entry.id === responseModel.optionSetId)?.options ?? [] : []),
    ...(responseModel.options ?? []),
  ]
}

export function isV2PackageLiveRuntimeExecutable(
  pkg: SonartraAssessmentPackageV2ValidatedImport | null,
): LiveRuntimeEligibilityResult {
  const diagnostics: RuntimeExecutionDiagnostic[] = []

  if (!pkg) {
    diagnostics.push({
      code: 'package_invalid',
      message: 'Package Contract v2 runtime is unavailable because the stored package is missing or invalid.',
      stage: 'eligibility',
    })
    return { eligible: false, contractVersion: 'package_contract_v2', diagnostics }
  }

  const compiled = compileAssessmentPackageV2(pkg)
  const blockingDiagnostics = compiled.diagnostics.filter((entry) => entry.severity === 'error')

  if (!compiled.ok || !compiled.executablePackage) {
    diagnostics.push({
      code: 'package_not_compilable',
      message: blockingDiagnostics[0]?.message ?? 'Package Contract v2 could not be compiled for live runtime execution.',
      stage: 'eligibility',
      details: blockingDiagnostics[0]
        ? { path: blockingDiagnostics[0].path, diagnosticCode: blockingDiagnostics[0].code }
        : undefined,
    })
  }

  return {
    eligible: diagnostics.length === 0,
    contractVersion: 'package_contract_v2',
    diagnostics,
  }
}

export function extractV2ResponseEnvelope(metadataJson: Record<string, unknown> | null | undefined): V2ResponseEnvelope {
  const runtime = metadataJson && isRecord(metadataJson.liveRuntimeV2) ? metadataJson.liveRuntimeV2 : null
  const responses = runtime && isRecord(runtime.responses) ? runtime.responses : {}
  const updatedAtByQuestionId = runtime && isRecord(runtime.updatedAtByQuestionId) ? runtime.updatedAtByQuestionId : {}

  return {
    responses: { ...responses },
    updatedAtByQuestionId: Object.fromEntries(
      Object.entries(updatedAtByQuestionId).filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string'),
    ),
  }
}

export function mergeV2ResponsesIntoMetadata(
  metadataJson: Record<string, unknown> | null | undefined,
  envelope: V2ResponseEnvelope,
): Record<string, unknown> {
  const base = isRecord(metadataJson) ? { ...metadataJson } : {}
  base.liveRuntimeV2 = {
    responses: envelope.responses,
    updatedAtByQuestionId: envelope.updatedAtByQuestionId,
  }
  return base
}

export function buildV2QuestionDeliveryContract(input: {
  assessmentId: string
  assessmentVersionId: string
  assessmentVersionKey: string
  assessmentVersionName: string
  assessmentStatus: AssessmentRow['status']
  metadataJson: Record<string, unknown> | null
  pkg: SonartraAssessmentPackageV2ValidatedImport
}): V2LiveQuestionDeliveryContract {
  const { responses, updatedAtByQuestionId } = extractV2ResponseEnvelope(input.metadataJson)
  const sectionsById = new Map(input.pkg.sections.map((section) => [section.id, section]))

  return {
    contractVersion: 'package_contract_v2',
    assessmentId: input.assessmentId,
    assessmentVersionId: input.assessmentVersionId,
    assessmentVersionKey: input.assessmentVersionKey,
    assessmentVersionName: input.assessmentVersionName,
    packageSchemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
    sessionStatus: input.assessmentStatus,
    questionCount: input.pkg.questions.length,
    questions: input.pkg.questions.map((question, index) => {
      const responseModel = input.pkg.responseModels.models.find((entry) => entry.id === question.responseModelId)
      const options = responseModel ? getResponseModelOptions(input.pkg, responseModel) : []
      return {
        id: question.id,
        code: question.code,
        prompt: question.prompt,
        helpText: question.helpText ?? null,
        responseModel: {
          id: responseModel?.id ?? question.responseModelId ?? 'missing-response-model',
          type: responseModel?.type ?? 'single_select',
          numericRange: responseModel?.numericRange ?? null,
          multiSelect: responseModel?.multiSelect ?? null,
          forcedChoice: responseModel?.forcedChoice ?? null,
          options: options.map((option) => ({
            id: option.id,
            code: option.code ?? null,
            label: option.label,
            value: option.value ?? null,
          })),
        },
        sections: (question.sectionIds ?? [])
          .map((sectionId) => sectionsById.get(sectionId))
          .filter((section): section is NonNullable<typeof section> => Boolean(section))
          .sort((left, right) => left.order - right.order)
          .map((section) => ({
            id: section.id,
            title: section.title,
            description: section.description ?? null,
            order: section.order,
          })),
        order: index + 1,
      }
    }),
    responses: Object.entries(responses).map(([questionId, value]) => ({
      questionId,
      value,
      updatedAt: updatedAtByQuestionId[questionId] ?? null,
    })),
  }
}

export function validateV2LiveResponse(input: {
  pkg: SonartraAssessmentPackageV2ValidatedImport
  questionId: string
  response: unknown
}): { ok: true } | { ok: false; diagnostic: RuntimeExecutionDiagnostic } {
  const question = input.pkg.questions.find((entry) => entry.id === input.questionId)
  if (!question) {
    return {
      ok: false,
      diagnostic: {
        code: 'invalid_response',
        message: 'Question id is not part of this assessment session.',
        stage: 'response_save',
        details: { questionId: input.questionId },
      },
    }
  }

  const responseModel = input.pkg.responseModels.models.find((entry) => entry.id === question.responseModelId)
  if (!responseModel) {
    return {
      ok: false,
      diagnostic: {
        code: 'unsupported_response_model',
        message: `Question "${input.questionId}" is missing a valid response model.`,
        stage: 'response_save',
      },
    }
  }

  const options = getResponseModelOptions(input.pkg, responseModel)
  const optionIds = new Set(options.map((option) => option.id))

  switch (responseModel.type) {
    case 'numeric':
      if (typeof input.response !== 'number' || !Number.isFinite(input.response)) {
        return { ok: false, diagnostic: { code: 'invalid_response', message: `Question "${input.questionId}" expects a numeric response.`, stage: 'response_save' } }
      }
      if (
        responseModel.numericRange
        && (input.response < responseModel.numericRange.min || input.response > responseModel.numericRange.max)
      ) {
        return {
          ok: false,
          diagnostic: {
            code: 'invalid_response',
            message: `Question "${input.questionId}" expects a value between ${responseModel.numericRange.min} and ${responseModel.numericRange.max}.`,
            stage: 'response_save',
          },
        }
      }
      return { ok: true }
    case 'boolean':
      return typeof input.response === 'boolean'
        ? { ok: true }
        : { ok: false, diagnostic: { code: 'invalid_response', message: `Question "${input.questionId}" expects a boolean response.`, stage: 'response_save' } }
    case 'multi_select': {
      if (!Array.isArray(input.response)) {
        return { ok: false, diagnostic: { code: 'invalid_response', message: `Question "${input.questionId}" expects an array of option ids.`, stage: 'response_save' } }
      }
      const selected = input.response.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
      const unique = new Set(selected)
      if (selected.length !== input.response.length || unique.size !== selected.length || selected.some((optionId) => !optionIds.has(optionId))) {
        return { ok: false, diagnostic: { code: 'invalid_response', message: `Question "${input.questionId}" includes one or more unknown option ids.`, stage: 'response_save' } }
      }
      if (typeof responseModel.multiSelect?.minSelections === 'number' && selected.length < responseModel.multiSelect.minSelections) {
        return { ok: false, diagnostic: { code: 'invalid_response', message: `Question "${input.questionId}" requires at least ${responseModel.multiSelect.minSelections} selections.`, stage: 'response_save' } }
      }
      if (typeof responseModel.multiSelect?.maxSelections === 'number' && selected.length > responseModel.multiSelect.maxSelections) {
        return { ok: false, diagnostic: { code: 'invalid_response', message: `Question "${input.questionId}" allows at most ${responseModel.multiSelect.maxSelections} selections.`, stage: 'response_save' } }
      }
      return { ok: true }
    }
    default:
      return typeof input.response === 'string' && optionIds.has(input.response)
        ? { ok: true }
        : { ok: false, diagnostic: { code: 'invalid_response', message: `Question "${input.questionId}" expects a valid option id.`, stage: 'response_save' } }
  }
}

export async function loadAssessmentVersionRuntimeRow(
  assessmentId: string,
  ownerUserId: string,
  client?: Pick<PoolClient, 'query'>,
): Promise<AssessmentVersionRuntimeRow | null> {
  const sql = `SELECT a.id AS assessment_id,
                      a.assessment_version_id,
                      av.key AS assessment_version_key,
                      av.name AS assessment_version_name,
                      av.package_schema_version,
                      av.package_status,
                      av.definition_payload,
                      a.status AS assessment_status,
                      av.total_questions,
                      a.metadata_json,
                      a.completed_at,
                      a.scoring_status
               FROM assessments a
               INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
               WHERE a.id = $1 AND a.user_id = $2
               LIMIT 1`

  const result = client
    ? await client.query<AssessmentVersionRuntimeRow>(sql, [assessmentId, ownerUserId])
    : await queryDb<AssessmentVersionRuntimeRow>(sql, [assessmentId, ownerUserId])

  return result.rows[0] ?? null
}

export async function saveV2AssessmentResponse(
  input: SaveV2AssessmentResponseInput,
  deps: { withTransactionFn?: typeof withTransaction } = {},
): Promise<SaveV2AssessmentResponseResult> {
  if (!input.appUserId) {
    return { status: 401, body: { error: 'Authentication required.' } }
  }

  const runInTransaction = deps.withTransactionFn ?? withTransaction

  return runInTransaction(async (client) => {
    const row = await loadAssessmentVersionRuntimeRow(input.assessmentId, input.appUserId, client)
    if (!row) {
      return { status: 404 as const, body: { error: 'Assessment not found.' } }
    }
    if (row.package_schema_version !== SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
      return { status: 400 as const, body: { error: 'Assessment is not using Package Contract v2.' } }
    }
    if (row.assessment_status === 'completed') {
      return { status: 409 as const, body: { error: 'Assessment is already completed and cannot be modified.' } }
    }

    const pkg = parseStoredValidatedAssessmentPackageV2(row.definition_payload)
    const eligibility = isV2PackageLiveRuntimeExecutable(pkg)
    if (!pkg || !eligibility.eligible) {
      return {
        status: 409 as const,
        body: { error: eligibility.diagnostics[0]?.message ?? 'Assessment is not eligible for live runtime execution.' },
      }
    }

    const validation = validateV2LiveResponse({ pkg, questionId: input.questionId, response: input.response })
    if (!validation.ok) {
      console.warn('[live-assessment-v2] response rejected', {
        assessmentId: input.assessmentId,
        questionId: input.questionId,
        diagnostic: validation.diagnostic,
      })
      return { status: 400 as const, body: { error: validation.diagnostic.message } }
    }

    const responseEnvelope = extractV2ResponseEnvelope(row.metadata_json)
    responseEnvelope.responses[input.questionId] = input.response
    responseEnvelope.updatedAtByQuestionId[input.questionId] = new Date().toISOString()
    const progressCount = Object.keys(responseEnvelope.responses).length
    const progressPercent = row.total_questions > 0 ? Math.round((progressCount * 10000) / row.total_questions) / 100 : 0
    const questionIndex = Math.max(0, pkg.questions.findIndex((entry) => entry.id === input.questionId)) + 1

    await client.query(
      `UPDATE assessments
       SET metadata_json = $2::jsonb,
           progress_count = $3,
           progress_percent = $4,
           current_question_index = GREATEST(current_question_index, $5),
           status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END,
           last_activity_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [
        input.assessmentId,
        JSON.stringify(mergeV2ResponsesIntoMetadata(row.metadata_json, responseEnvelope)),
        progressCount,
        progressPercent,
        questionIndex,
      ],
    )

    return {
      status: 200 as const,
      body: {
        assessmentId: input.assessmentId,
        questionId: input.questionId,
        response: input.response,
        progressCount,
        progressPercent,
      },
    }
  })
}

export async function evaluateCompletedV2Assessment(input: {
  assessmentId: string
  ownerUserId: string
  persistResult: (payload: {
    assessmentId: string
    assessmentVersionId: string
    versionKey: string
    status: 'complete' | 'failed'
    completedAt: string | null
    scoredAt: string | null
    resultPayload: Record<string, unknown> | null
    responseQualityPayload: Record<string, unknown> | null
  }, client: PoolClient) => Promise<{ assessmentResultId: string }>
}): Promise<{
  httpStatus: number
  body: {
    ok: boolean
    assessmentId?: string
    assessmentStatus?: 'completed'
    resultStatus?: 'succeeded' | 'failed' | 'pending'
    resultId?: string | null
    warning?: { code: 'RESULT_GENERATION_FAILED'; message: string }
    error?: string
  }
}> {
  const lifecycle = await withTransaction(async (client) => {
    const row = await loadAssessmentVersionRuntimeRow(input.assessmentId, input.ownerUserId, client)
    if (!row) {
      return { kind: 'error' as const, httpStatus: 404, error: 'Assessment not found.' }
    }
    if (row.package_schema_version !== SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
      return { kind: 'error' as const, httpStatus: 400, error: 'Assessment is not using Package Contract v2.' }
    }

    const pkg = parseStoredValidatedAssessmentPackageV2(row.definition_payload)
    const eligibility = isV2PackageLiveRuntimeExecutable(pkg)
    if (!pkg || !eligibility.eligible) {
      return {
        kind: 'error' as const,
        httpStatus: 409,
        error: eligibility.diagnostics[0]?.message ?? 'Assessment is not eligible for live runtime execution.',
      }
    }

    const responses = extractV2ResponseEnvelope(row.metadata_json).responses
    if (Object.keys(responses).length < pkg.questions.length) {
      return {
        kind: 'error' as const,
        httpStatus: 400,
        error: `Assessment cannot be completed. Expected ${pkg.questions.length} responses, found ${Object.keys(responses).length}.`,
      }
    }

    const latestResult = await getLatestAssessmentResultSnapshot(input.assessmentId, client)
    if (row.assessment_status === 'completed' && latestResult && (latestResult.status === 'complete' || latestResult.status === 'failed')) {
      return {
        kind: 'existing' as const,
        assessmentVersionId: row.assessment_version_id,
        versionKey: row.assessment_version_key,
        assessment: row,
        latestResult,
        pkg,
        responses,
      }
    }

    const completedAtResult = await client.query<{ completed_at: string }>(
      `UPDATE assessments
       SET status = 'completed',
           completed_at = COALESCE(completed_at, NOW()),
           last_activity_at = NOW(),
           scoring_status = 'pending',
           progress_count = $2,
           progress_percent = 100,
           current_question_index = GREATEST(current_question_index, $2),
           updated_at = NOW()
       WHERE id = $1
       RETURNING completed_at`,
      [input.assessmentId, pkg.questions.length],
    )

    return {
      kind: 'ready' as const,
      assessment: {
        ...row,
        completed_at: completedAtResult.rows[0]?.completed_at ?? row.completed_at,
      },
      pkg,
      responses,
    }
  })

  if (lifecycle.kind === 'error') {
    return { httpStatus: lifecycle.httpStatus, body: { ok: false, error: lifecycle.error } }
  }

  if (lifecycle.kind === 'existing') {
    return {
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId: input.assessmentId,
        assessmentStatus: 'completed',
        resultStatus: lifecycle.latestResult.status === 'failed' ? 'failed' : lifecycle.latestResult.status === 'pending' ? 'pending' : 'succeeded',
        resultId: lifecycle.latestResult.id,
      },
    }
  }

  try {
    const compiled = compileAssessmentPackageV2(lifecycle.pkg)
    if (!compiled.ok || !compiled.executablePackage) {
      throw new Error(compiled.diagnostics.find((entry) => entry.severity === 'error')?.message ?? 'Package Contract v2 could not be compiled for live execution.')
    }

    const evaluation = evaluateAssessmentPackageV2(compiled.executablePackage, lifecycle.responses, {
      includeTrace: true,
      evaluationId: `live-${input.assessmentId}`,
    })
    const materializedOutputs = materializeAssessmentOutputsV2(compiled.executablePackage, evaluation)
    const scoredAt = new Date().toISOString()

    const payload: V2PersistedEvaluationArtifact = {
      contractVersion: 'package_contract_v2',
      runtimeVersion: compiled.executablePackage.runtimeVersion,
      packageSchemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
      packageMetadata: {
        assessmentKey: compiled.executablePackage.metadata.assessmentKey,
        assessmentName: compiled.executablePackage.metadata.assessmentName,
        packageSemver: compiled.executablePackage.metadata.compatibility.packageSemver,
      },
      evaluation,
      materializedOutputs,
      completedAt: lifecycle.assessment.completed_at,
      scoredAt,
    }

    const persisted = await withTransaction(async (client) => {
      const result = await input.persistResult({
        assessmentId: input.assessmentId,
        assessmentVersionId: lifecycle.assessment.assessment_version_id,
        versionKey: lifecycle.assessment.assessment_version_key,
        status: 'complete',
        completedAt: lifecycle.assessment.completed_at,
        scoredAt,
        resultPayload: payload as unknown as Record<string, unknown>,
        responseQualityPayload: {
          contractVersion: 'package_contract_v2',
          technicalDiagnostics: materializedOutputs.technicalDiagnostics,
          integrityNoticeCount: materializedOutputs.integrityNotices.length,
          webSummaryOutputCount: materializedOutputs.webSummaryOutputs.length,
        },
      }, client)
      await client.query(
        `UPDATE assessments
         SET scoring_status = 'scored',
             updated_at = NOW()
         WHERE id = $1`,
        [input.assessmentId],
      )
      return result
    })

    return {
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId: input.assessmentId,
        assessmentStatus: 'completed',
        resultStatus: 'succeeded',
        resultId: persisted.assessmentResultId,
      },
    }
  } catch (error) {
    console.error('[live-assessment-v2] completion failed', {
      assessmentId: input.assessmentId,
      message: error instanceof Error ? error.message : 'Unexpected error',
    })

    const failedResult = await withTransaction(async (client) => {
      const failurePayload = {
        failure: {
          stage: 'completion_orchestration',
          category: 'runtime_error',
          code: 'RESULT_GENERATION_FAILED',
          message: error instanceof Error ? error.message : 'Unexpected v2 runtime failure.',
          occurredAt: new Date().toISOString(),
          assessmentVersionKey: lifecycle.assessment.assessment_version_key,
        },
        contractVersion: 'package_contract_v2',
      }

      const result = await input.persistResult({
        assessmentId: input.assessmentId,
        assessmentVersionId: lifecycle.assessment.assessment_version_id,
        versionKey: lifecycle.assessment.assessment_version_key,
        status: 'failed',
        completedAt: lifecycle.assessment.completed_at,
        scoredAt: null,
        resultPayload: failurePayload,
        responseQualityPayload: null,
      }, client)
      await client.query(
        `UPDATE assessments
         SET scoring_status = 'failed',
             updated_at = NOW()
         WHERE id = $1`,
        [input.assessmentId],
      )
      return result
    })

    return {
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId: input.assessmentId,
        assessmentStatus: 'completed',
        resultStatus: 'failed',
        resultId: failedResult.assessmentResultId,
        warning: {
          code: 'RESULT_GENERATION_FAILED',
          message: 'Assessment was completed but result generation failed.',
        },
      },
    }
  }
}

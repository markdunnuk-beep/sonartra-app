import type { PoolClient } from 'pg'

import { materializeAssessmentOutputsV2, type MaterializedAssessmentOutputsV2 } from '@/lib/admin/domain/assessment-package-v2-materialization'
import type { AssessmentEvaluationResultV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'
import {
  SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
  parseStoredValidatedAssessmentPackageV2,
  type SonartraAssessmentPackageV2ResponseModel,
  type SonartraAssessmentPackageV2ValidatedImport,
} from '@/lib/admin/domain/assessment-package-v2'
import type { AssessmentRow } from '@/lib/assessment-types'
import { queryDb, withTransaction } from '@/lib/db'
import {
  canonicalizeV2ResponseEnvelope,
  evaluatePackageV2LiveRuntimeSupport,
  normalizeV2LiveResponseValue,
} from '@/lib/package-contract-v2-live-runtime'
import { getAssessmentResultByAssessmentId, getLatestAssessmentResultSnapshot } from '@/lib/server/assessment-results'
import { evaluateAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'
import {
  PACKAGE_CONTRACT_V2_RESULT_ARTIFACT_VERSION,
  createPackageRuntimeFingerprint,
  decideEvaluationArtifactReuse,
  getOrCompileRuntime,
} from '@/lib/admin/domain/assessment-package-v2-performance'

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
  resultArtifactVersion: string
  packageFingerprint: string
  compiledAt: string
  packageMetadata: {
    assessmentKey: string
    assessmentName: string
    packageSemver: string
  }
  evaluation: AssessmentEvaluationResultV2
  materializedOutputs: V2PersistedMaterializedOutputs
  completedAt: string | null
  scoredAt: string | null
  generatedAt: string | null
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

export function isV2PackageLiveRuntimeExecutable(
  pkg: SonartraAssessmentPackageV2ValidatedImport | null,
): LiveRuntimeEligibilityResult {
  const support = evaluatePackageV2LiveRuntimeSupport(pkg)
  const diagnostics: RuntimeExecutionDiagnostic[] = support.issues.map((issue) => ({
    code:
      issue.code === 'package_invalid'
        ? 'package_invalid'
        : issue.code === 'package_not_compilable'
          ? 'package_not_compilable'
          : issue.code === 'invalid_response'
            ? 'invalid_response'
          : issue.code === 'unsupported_response_model'
            ? 'unsupported_response_model'
            : 'invalid_response',
    message: issue.message,
    stage: issue.capability === 'completion'
      ? 'completion'
      : issue.capability === 'result_read'
        ? 'result_read'
        : issue.capability === 'question_delivery'
          ? 'question_delivery'
          : 'response_save',
    details: issue.details,
  }))

  return {
    eligible: support.supported,
    contractVersion: 'package_contract_v2',
    diagnostics,
  }
}

export function mergeV2ResponsesIntoMetadata(
  metadataJson: Record<string, unknown> | null | undefined,
  envelope: ReturnType<typeof canonicalizeV2ResponseEnvelope>,
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
  const { responses, updatedAtByQuestionId } = canonicalizeV2ResponseEnvelope(input.pkg, input.metadataJson)
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
      const options = responseModel
        ? [
            ...(responseModel.optionSetId ? (input.pkg.responseModels.optionSets ?? []).find((entry) => entry.id === responseModel.optionSetId)?.options ?? [] : []),
            ...(responseModel.options ?? []),
          ]
        : []
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
    responses: input.pkg.questions
      .filter((question) => question.id in responses)
      .map((question) => ({
        questionId: question.id,
        value: responses[question.id],
        updatedAt: updatedAtByQuestionId[question.id] ?? null,
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
  const normalized = normalizeV2LiveResponseValue(input)
  return normalized.ok
    ? { ok: true }
    : {
        ok: false,
        diagnostic: {
          code: normalized.issue.code === 'unsupported_response_model' ? 'unsupported_response_model' : 'invalid_response',
          message: normalized.issue.message,
          stage: 'response_save',
          details: normalized.issue.details,
        },
      }
}

export async function loadAssessmentVersionRuntimeRow(
  assessmentId: string,
  ownerUserId: string,
  client?: Pick<PoolClient, 'query'>,
  options: {
    forUpdate?: boolean
  } = {},
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
               LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}`

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

    const responseEnvelope = canonicalizeV2ResponseEnvelope(pkg, row.metadata_json)
    const normalized = normalizeV2LiveResponseValue({ pkg, questionId: input.questionId, response: input.response })
    if (!normalized.ok) {
      return { status: 400 as const, body: { error: normalized.issue.message } }
    }
    responseEnvelope.responses[input.questionId] = normalized.value
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
}, deps: {
  withTransactionFn?: typeof withTransaction
  getLatestResultSnapshot?: typeof getLatestAssessmentResultSnapshot
  getAssessmentResultByAssessmentId?: typeof getAssessmentResultByAssessmentId
} = {}): Promise<{
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
  const runInTransaction = deps.withTransactionFn ?? withTransaction
  const getLatestResultSnapshot = deps.getLatestResultSnapshot ?? getLatestAssessmentResultSnapshot
  const getResultByAssessmentId = deps.getAssessmentResultByAssessmentId ?? getAssessmentResultByAssessmentId

  const lifecycle = await runInTransaction(async (client) => {
    const row = await loadAssessmentVersionRuntimeRow(input.assessmentId, input.ownerUserId, client, { forUpdate: true })
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

    const responses = canonicalizeV2ResponseEnvelope(pkg, row.metadata_json).responses
    if (Object.keys(responses).length < pkg.questions.length) {
      return {
        kind: 'error' as const,
        httpStatus: 400,
        error: `Assessment cannot be completed. Expected ${pkg.questions.length} responses, found ${Object.keys(responses).length}.`,
      }
    }

    const latestResult = await getLatestResultSnapshot(input.assessmentId, client)
    const existingResult = row.assessment_status === 'completed' ? await getResultByAssessmentId(input.assessmentId, client) : null
    const packageFingerprint = createPackageRuntimeFingerprint(pkg, {
      assessmentVersionId: row.assessment_version_id,
      schemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
    })
    const reuseDecision = decideEvaluationArtifactReuse({
      result: existingResult,
      packageFingerprint: packageFingerprint.packageFingerprint,
      schemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
    })

    if (row.assessment_status === 'completed' && existingResult?.status === 'failed') {
      return {
        kind: 'existing' as const,
        assessmentVersionId: row.assessment_version_id,
        versionKey: row.assessment_version_key,
        assessment: row,
        latestResult: existingResult,
        pkg,
        responses,
        reuseDecision,
        packageFingerprint,
      }
    }

    if (row.assessment_status === 'completed' && reuseDecision.reuse && existingResult) {
      return {
        kind: 'existing' as const,
        assessmentVersionId: row.assessment_version_id,
        versionKey: row.assessment_version_key,
        assessment: row,
        latestResult: existingResult,
        pkg,
        responses,
        reuseDecision,
        packageFingerprint,
      }
    }

    if (row.assessment_status === 'completed' && latestResult && reuseDecision.reason !== 'missing_result' && reuseDecision.reason !== 'valid') {
      console.info('[live-assessment-v2] evaluation artifact invalidated', {
        assessmentId: input.assessmentId,
        reason: reuseDecision.reason,
      })
    }

    if (row.assessment_status === 'completed' && row.scoring_status === 'pending' && !latestResult) {
      return {
        kind: 'pending' as const,
        assessment: row,
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

  if (lifecycle.kind === 'pending') {
    return {
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId: input.assessmentId,
        assessmentStatus: 'completed',
        resultStatus: 'pending',
        resultId: null,
      },
    }
  }

  try {
    const runtimeSupport = evaluatePackageV2LiveRuntimeSupport(lifecycle.pkg)
    if (!runtimeSupport.supported) {
      throw new Error(runtimeSupport.issues[0]?.message ?? 'Package Contract v2 could not be executed safely on the live runtime.')
    }

    const compiled = getOrCompileRuntime(lifecycle.pkg, {
      assessmentVersionId: lifecycle.assessment.assessment_version_id,
      schemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
      onDiagnostic: (diagnostic) => console.info('[live-assessment-v2]', diagnostic),
    })
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
      resultArtifactVersion: PACKAGE_CONTRACT_V2_RESULT_ARTIFACT_VERSION,
      packageFingerprint: compiled.cache.fingerprint.packageFingerprint,
      compiledAt: compiled.cache.compiledAt ?? new Date().toISOString(),
      packageMetadata: {
        assessmentKey: compiled.executablePackage.metadata.assessmentKey,
        assessmentName: compiled.executablePackage.metadata.assessmentName,
        packageSemver: compiled.executablePackage.metadata.compatibility.packageSemver,
      },
      evaluation,
      materializedOutputs,
      completedAt: lifecycle.assessment.completed_at,
      scoredAt,
      generatedAt: scoredAt,
    }

    const persisted = await runInTransaction(async (client) => {
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

    const failedResult = await runInTransaction(async (client) => {
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

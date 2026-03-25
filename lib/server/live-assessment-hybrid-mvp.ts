import type { PoolClient } from 'pg'

import type { AssessmentRow } from '@/lib/assessment-types'
import {
  HYBRID_MVP_CONTRACT_VERSION,
  scoreHybridMvpAssessment,
  type HybridMvpAssessmentDefinition,
  type HybridMvpScoringResult,
  type HybridMvpResponseSet,
  type HybridMvpResponseValue,
} from '@/lib/assessment/hybrid-mvp-scoring'
import { queryDb, withTransaction } from '@/lib/db'
import { getLatestAssessmentResultSnapshot } from '@/lib/server/assessment-results'

interface HybridCompletionRuntimeRow {
  assessment_id: string
  assessment_version_id: string
  assessment_version_key: string
  assessment_version_name: string
  assessment_definition_id: string
  assessment_version_definition_payload: unknown
  published_version_id: string | null
  published_version_key: string | null
  published_version_name: string | null
  published_definition_payload: unknown
  assessment_status: AssessmentRow['status']
  total_questions: number
  metadata_json: Record<string, unknown> | null
  completed_at: string | null
  scoring_status: AssessmentRow['scoring_status']
}

interface SaveHybridAssessmentResponseInput {
  assessmentId: string
  appUserId: string
  questionId: string
  response: unknown
}

interface SaveHybridAssessmentResponseResult {
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

function parseHybridMvpDefinition(value: unknown): HybridMvpAssessmentDefinition | null {
  if (!isRecord(value)) {
    return null
  }

  if (value.contractVersion !== HYBRID_MVP_CONTRACT_VERSION) {
    return null
  }

  return value as unknown as HybridMvpAssessmentDefinition
}

function normalizeHybridResponseValue(question: HybridMvpAssessmentDefinition['questions'][number], value: unknown): HybridMvpResponseValue | null {
  if (question.responseModel === 'single_select') {
    if (typeof value !== 'string' || value.trim().length === 0) {
      return null
    }

    return value
  }

  if (!Array.isArray(value)) {
    return null
  }

  const canonical = value
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    .sort((left, right) => left.localeCompare(right))
  if (canonical.length === 0) {
    return null
  }

  return Array.from(new Set(canonical))
}

function canonicalizeHybridResponseEnvelope(
  definition: HybridMvpAssessmentDefinition,
  metadataJson: Record<string, unknown> | null | undefined,
): {
  responses: HybridMvpResponseSet
  updatedAtByQuestionId: Record<string, string>
} {
  const liveHybrid = isRecord(metadataJson?.liveHybridMvpV1) ? metadataJson.liveHybridMvpV1 : {}
  const rawResponses = isRecord(liveHybrid.responses) ? liveHybrid.responses : {}
  const rawUpdatedAtByQuestionId = isRecord(liveHybrid.updatedAtByQuestionId) ? liveHybrid.updatedAtByQuestionId : {}

  const responses: HybridMvpResponseSet = {}
  const updatedAtByQuestionId: Record<string, string> = {}

  for (const question of definition.questions) {
    const normalized = normalizeHybridResponseValue(question, rawResponses[question.id])
    if (normalized !== null) {
      responses[question.id] = normalized
    }

    if (typeof rawUpdatedAtByQuestionId[question.id] === 'string') {
      updatedAtByQuestionId[question.id] = rawUpdatedAtByQuestionId[question.id] as string
    }
  }

  return { responses, updatedAtByQuestionId }
}

function mergeHybridResponsesIntoMetadata(input: {
  metadataJson: Record<string, unknown> | null | undefined
  envelope: ReturnType<typeof canonicalizeHybridResponseEnvelope>
}): Record<string, unknown> {
  const base = isRecord(input.metadataJson) ? { ...input.metadataJson } : {}
  base.liveHybridMvpV1 = {
    responses: input.envelope.responses,
    updatedAtByQuestionId: input.envelope.updatedAtByQuestionId,
  }

  return base
}

async function loadHybridCompletionRuntimeRow(
  assessmentId: string,
  ownerUserId: string,
  client?: Pick<PoolClient, 'query'>,
  options: { forUpdate?: boolean } = {},
): Promise<HybridCompletionRuntimeRow | null> {
  const sql = `SELECT a.id AS assessment_id,
                      a.assessment_version_id,
                      av.key AS assessment_version_key,
                      av.name AS assessment_version_name,
                      av.assessment_definition_id,
                      av.definition_payload AS assessment_version_definition_payload,
                      ad.current_published_version_id AS published_version_id,
                      published_av.key AS published_version_key,
                      published_av.name AS published_version_name,
                      published_av.definition_payload AS published_definition_payload,
                      a.status AS assessment_status,
                      av.total_questions,
                      a.metadata_json,
                      a.completed_at,
                      a.scoring_status
               FROM assessments a
               INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
               INNER JOIN assessment_definitions ad ON ad.id = av.assessment_definition_id
               LEFT JOIN assessment_versions published_av ON published_av.id = ad.current_published_version_id
               WHERE a.id = $1 AND a.user_id = $2
               LIMIT 1${options.forUpdate ? ' FOR UPDATE' : ''}`

  const result = client
    ? await client.query<HybridCompletionRuntimeRow>(sql, [assessmentId, ownerUserId])
    : await queryDb<HybridCompletionRuntimeRow>(sql, [assessmentId, ownerUserId])

  return result.rows[0] ?? null
}

function resolveHybridDefinition(row: HybridCompletionRuntimeRow): {
  definition: HybridMvpAssessmentDefinition
  sourceVersionId: string
  sourceVersionKey: string
  sourceVersionName: string
} | null {
  const publishedDefinition = parseHybridMvpDefinition(row.published_definition_payload)
  if (publishedDefinition && row.published_version_id && row.published_version_key && row.published_version_name) {
    return {
      definition: publishedDefinition,
      sourceVersionId: row.published_version_id,
      sourceVersionKey: row.published_version_key,
      sourceVersionName: row.published_version_name,
    }
  }

  const attachedDefinition = parseHybridMvpDefinition(row.assessment_version_definition_payload)
  if (attachedDefinition) {
    return {
      definition: attachedDefinition,
      sourceVersionId: row.assessment_version_id,
      sourceVersionKey: row.assessment_version_key,
      sourceVersionName: row.assessment_version_name,
    }
  }

  return null
}

function toPercent(score: number): number {
  return Number((Math.max(0, score) * 100).toFixed(2))
}

function buildHybridResultPayload(input: {
  definition: HybridMvpAssessmentDefinition
  scored: HybridMvpScoringResult
  assessmentMeta: {
    assessmentVersionId: string
    assessmentVersionKey: string
    assessmentVersionName: string
    sourceDefinitionVersionId: string
    sourceDefinitionVersionKey: string
    sourceDefinitionVersionName: string
  }
}): Record<string, unknown> {
  const signalById = input.definition.signals.reduce<Record<string, { label: string; key: string; domainId: string | null }>>((acc, signal) => {
    acc[signal.id] = {
      label: signal.label,
      key: signal.key,
      domainId: signal.domainId ?? null,
    }
    return acc
  }, {})

  const domainById = input.definition.domains.reduce<Record<string, { label: string; key: string }>>((acc, domain) => {
    acc[domain.id] = { label: domain.label, key: domain.key }
    return acc
  }, {})

  const normalizedSignalPercentages = Object.entries(input.scored.normalizedSignalScores).reduce<Record<string, number>>((acc, [signalId, score]) => {
    acc[signalId] = toPercent(score)
    return acc
  }, {})

  const rankedSignals = input.scored.rankedSignals.map((signal) => ({
    ...signal,
    normalizedPercent: normalizedSignalPercentages[signal.signalId] ?? 0,
    signalLabel: signalById[signal.signalId]?.label ?? signal.signalKey,
  }))

  const topSignal = rankedSignals[0] ?? null

  const domainSummaries = input.scored.aggregationVectors.byDomain.map((domainVector) => {
    const topRankedSignal = domainVector.vector[0] ?? null
    const topSignalMeta = topRankedSignal ? signalById[topRankedSignal.signalId] : null
    const domainMeta = domainVector.domainId ? domainById[domainVector.domainId] : null

    return {
      domainId: domainVector.domainId,
      domainKey: domainVector.domainId ? (domainMeta?.key ?? domainVector.domainId) : 'cross_domain',
      domainLabel: domainVector.domainId ? (domainMeta?.label ?? domainVector.domainId) : 'Cross-domain',
      totalRawScore: domainVector.totalRawScore,
      signalCount: domainVector.vector.length,
      topSignalId: topRankedSignal?.signalId ?? null,
      topSignalKey: topRankedSignal ? (signalById[topRankedSignal.signalId]?.key ?? topRankedSignal.signalId) : null,
      topSignalLabel: topSignalMeta?.label ?? null,
      topSignalNormalizedPercent: topRankedSignal ? toPercent(topRankedSignal.normalizedScore) : null,
      rankedSignals: domainVector.vector.map((signal) => ({
        ...signal,
        normalizedPercent: toPercent(signal.normalizedScore),
      })),
    }
  })

  return {
    contractVersion: HYBRID_MVP_CONTRACT_VERSION,
    assessmentMeta: {
      assessmentId: input.scored.assessmentId,
      assessmentKey: input.scored.assessmentKey,
      assessmentVersionId: input.assessmentMeta.assessmentVersionId,
      assessmentVersionKey: input.assessmentMeta.assessmentVersionKey,
      assessmentVersionName: input.assessmentMeta.assessmentVersionName,
      sourceDefinitionVersionId: input.assessmentMeta.sourceDefinitionVersionId,
      sourceDefinitionVersionKey: input.assessmentMeta.sourceDefinitionVersionKey,
      sourceDefinitionVersionName: input.assessmentMeta.sourceDefinitionVersionName,
    },
    rawSignalScores: input.scored.rawSignalScores,
    normalizedSignalScores: input.scored.normalizedSignalScores,
    normalizedSignalPercentages,
    rankedSignals,
    topSignal,
    domainSummaries,
    overviewSummary: input.scored.report.summary,
    report: input.scored.report,
    aggregationVectors: input.scored.aggregationVectors,
  }
}

export async function saveHybridAssessmentResponse(
  input: SaveHybridAssessmentResponseInput,
  deps: { withTransactionFn?: typeof withTransaction } = {},
): Promise<SaveHybridAssessmentResponseResult> {
  if (!input.appUserId) {
    return { status: 401, body: { error: 'Authentication required.' } }
  }

  const runInTransaction = deps.withTransactionFn ?? withTransaction

  return runInTransaction(async (client) => {
    const row = await loadHybridCompletionRuntimeRow(input.assessmentId, input.appUserId, client)
    if (!row) {
      return { status: 404 as const, body: { error: 'Assessment not found.' } }
    }

    if (row.assessment_status === 'completed') {
      return { status: 409 as const, body: { error: 'Assessment is already completed and cannot be modified.' } }
    }

    const resolved = resolveHybridDefinition(row)
    if (!resolved) {
      return { status: 400 as const, body: { error: 'Assessment is not using hybrid_mvp_v1 runtime.' } }
    }

    const question = resolved.definition.questions.find((entry) => entry.id === input.questionId)
    if (!question) {
      return { status: 400 as const, body: { error: 'Question id is not part of this assessment session.' } }
    }

    const normalized = normalizeHybridResponseValue(question, input.response)
    if (normalized === null) {
      return { status: 400 as const, body: { error: `Question "${input.questionId}" response shape is invalid.` } }
    }

    const envelope = canonicalizeHybridResponseEnvelope(resolved.definition, row.metadata_json)
    envelope.responses[input.questionId] = normalized
    envelope.updatedAtByQuestionId[input.questionId] = new Date().toISOString()

    const progressCount = Object.keys(envelope.responses).length
    const totalQuestions = resolved.definition.questions.length
    const progressPercent = totalQuestions > 0 ? Math.round((progressCount * 10000) / totalQuestions) / 100 : 0
    const questionIndex = Math.max(0, resolved.definition.questions.findIndex((entry) => entry.id === input.questionId)) + 1

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
        JSON.stringify(mergeHybridResponsesIntoMetadata({ metadataJson: row.metadata_json, envelope })),
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
        response: normalized,
        progressCount,
        progressPercent,
      },
    }
  })
}

export async function evaluateCompletedHybridAssessment(input: {
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
  let stage:
    | 'lifecycle_load'
    | 'score'
    | 'build_payload'
    | 'persist_complete_result'
    | 'persist_failed_result'
    | 'update_scoring_status'
    = 'lifecycle_load'

  const lifecycle = await runInTransaction(async (client) => {
    const row = await loadHybridCompletionRuntimeRow(input.assessmentId, input.ownerUserId, client, { forUpdate: true })
    if (!row) {
      return { kind: 'error' as const, httpStatus: 404, error: 'Assessment not found.' }
    }

    const resolved = resolveHybridDefinition(row)
    if (!resolved) {
      return { kind: 'error' as const, httpStatus: 400, error: 'Assessment is not using hybrid_mvp_v1 runtime.' }
    }

    const envelope = canonicalizeHybridResponseEnvelope(resolved.definition, row.metadata_json)
    const responseCount = Object.keys(envelope.responses).length
    if (responseCount < resolved.definition.questions.length) {
      return {
        kind: 'error' as const,
        httpStatus: 400,
        error: `Assessment cannot be completed. Expected ${resolved.definition.questions.length} responses, found ${responseCount}.`,
      }
    }

    const latestResult = await getLatestResultSnapshot(input.assessmentId, client)
    if (row.assessment_status === 'completed' && latestResult && (latestResult.status === 'complete' || latestResult.status === 'failed')) {
      return {
        kind: 'existing' as const,
        latestResult,
      }
    }

    if (row.assessment_status === 'completed' && row.scoring_status === 'pending' && !latestResult) {
      return {
        kind: 'pending' as const,
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
      [input.assessmentId, resolved.definition.questions.length],
    )

    return {
      kind: 'ready' as const,
      assessment: {
        ...row,
        completed_at: completedAtResult.rows[0]?.completed_at ?? row.completed_at,
      },
      resolved,
      responses: envelope.responses,
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
    stage = 'score'
    const scored = scoreHybridMvpAssessment(lifecycle.resolved.definition, lifecycle.responses)
    if (!scored.ok) {
      return {
        httpStatus: 400,
        body: {
          ok: false,
          error: `Hybrid assessment could not be scored: ${scored.issues[0]?.message ?? 'unknown scoring issue.'}`,
        },
      }
    }

    const scoredAt = new Date().toISOString()
    stage = 'build_payload'
    const payload = buildHybridResultPayload({
      definition: lifecycle.resolved.definition,
      scored: scored.result,
      assessmentMeta: {
        assessmentVersionId: lifecycle.assessment.assessment_version_id,
        assessmentVersionKey: lifecycle.assessment.assessment_version_key,
        assessmentVersionName: lifecycle.assessment.assessment_version_name,
        sourceDefinitionVersionId: lifecycle.resolved.sourceVersionId,
        sourceDefinitionVersionKey: lifecycle.resolved.sourceVersionKey,
        sourceDefinitionVersionName: lifecycle.resolved.sourceVersionName,
      },
    })

    stage = 'persist_complete_result'
    const persisted = await runInTransaction(async (client) => {
      const result = await input.persistResult({
        assessmentId: input.assessmentId,
        assessmentVersionId: lifecycle.assessment.assessment_version_id,
        versionKey: lifecycle.assessment.assessment_version_key,
        status: 'complete',
        completedAt: lifecycle.assessment.completed_at,
        scoredAt,
        resultPayload: payload,
        responseQualityPayload: {
          contractVersion: HYBRID_MVP_CONTRACT_VERSION,
          questionCount: lifecycle.resolved.definition.questions.length,
          responseCount: Object.keys(lifecycle.responses).length,
          scoringIssueCount: 0,
        },
      }, client)

      stage = 'update_scoring_status'
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
    const err = error instanceof Error ? error : new Error('Unexpected hybrid runtime failure.')
    console.error('[assessment.complete.hybrid] completion failed', {
      assessmentId: input.assessmentId,
      stage,
      message: err.message,
      stack: err.stack,
    })

    let failedResultId: string | null = null
    try {
      stage = 'persist_failed_result'
      const failedResult = await runInTransaction(async (client) => {
        const result = await input.persistResult({
          assessmentId: input.assessmentId,
          assessmentVersionId: lifecycle.assessment.assessment_version_id,
          versionKey: lifecycle.assessment.assessment_version_key,
          status: 'failed',
          completedAt: lifecycle.assessment.completed_at,
          scoredAt: null,
          resultPayload: {
            contractVersion: HYBRID_MVP_CONTRACT_VERSION,
            failure: {
              stage: 'completion_orchestration',
              category: 'runtime_error',
              code: 'RESULT_GENERATION_FAILED',
              message: err.message,
              occurredAt: new Date().toISOString(),
              assessmentVersionKey: lifecycle.assessment.assessment_version_key,
            },
          },
          responseQualityPayload: null,
        }, client)

        stage = 'update_scoring_status'
        await client.query(
          `UPDATE assessments
           SET scoring_status = 'failed',
               updated_at = NOW()
           WHERE id = $1`,
          [input.assessmentId],
        )

        return result
      })
      failedResultId = failedResult.assessmentResultId
    } catch (persistError) {
      const persistErr = persistError instanceof Error ? persistError : new Error('Unknown failed-result persist error')
      console.error('[assessment.complete.hybrid] unable to persist failed result', {
        assessmentId: input.assessmentId,
        stage,
        message: persistErr.message,
        stack: persistErr.stack,
      })
    }

    return {
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId: input.assessmentId,
        assessmentStatus: 'completed',
        resultStatus: 'failed',
        resultId: failedResultId,
        warning: {
          code: 'RESULT_GENERATION_FAILED',
          message: 'Assessment was completed but result generation failed.',
        },
      },
    }
  }
}

export function isHybridMvpRuntimeDefinition(value: unknown): boolean {
  return Boolean(parseHybridMvpDefinition(value))
}

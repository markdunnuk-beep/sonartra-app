import assert from 'node:assert/strict'
import test from 'node:test'

import { buildReadyIndividualResultViewModel } from '../components/results/IndividualIntelligenceResultView'
import { getQuestionsByAssessmentIdWithDependencies } from '../lib/question-bank'
import { getAssessmentResultReadModel } from '../lib/server/assessment-result-read'
import { completeAssessmentWithResults } from '../lib/server/assessment-completion'
import { getLatestIndividualResultForUser } from '../lib/server/individual-results'
import { resolveLiveSignalsPublishedVersionState } from '../lib/server/live-signals-runtime'
import { saveAssessmentResponse } from '../lib/server/save-assessment-response'
import { startLiveSignalsAssessment } from '../lib/server/start-live-signals-assessment'
import type {
  AssessmentResponseInput,
  PersistFailedAssessmentResultInput,
  PersistSuccessfulAssessmentResultInput,
  ScoringEngineInput,
  SignalMappingInput,
} from '../lib/scoring/types'
import { scoreAssessment } from '../lib/scoring/engine'
import { WPLP80_SCORING_MODEL_KEY, type ASSESSMENT_LAYER_KEYS } from '../lib/scoring/constants'
import type { AssessmentResultRow, AssessmentResultSignalRow, AssessmentRow } from '../lib/assessment-types'
import type { AuthenticatedAppUser } from '../lib/server/auth'

type LayerKey = (typeof ASSESSMENT_LAYER_KEYS)[number]

type ResponseRow = {
  assessment_id: string
  question_id: number
  response_value: number
  response_time_ms: number | null
  is_changed: boolean
  created_at: string
  updated_at: string
}

type RuntimeOption = {
  id: string
  optionKey: string
  optionText: string
  displayOrder: number
  numericValue: number
  mappings: Array<{
    signalCode: string
    signalWeight: number
    layerKey: LayerKey
  }>
}

type RuntimeQuestion = {
  id: string
  questionNumber: number
  questionKey: string
  prompt: string
  sectionKey: string
  sectionName: string
  reverseScored: boolean
  isActive: boolean
  metadataJson: Record<string, string>
  options: RuntimeOption[]
}

const appUser: AuthenticatedAppUser = {
  clerkUserId: 'clerk-user-1',
  dbUserId: 'user-1',
  email: 'user@example.com',
}

function iso(stepMinutes: number) {
  return new Date(Date.UTC(2026, 1, 1, 9, stepMinutes, 0)).toISOString()
}

function createRuntimeQuestions(): RuntimeQuestion[] {
  return [
    {
      id: 'question-1',
      questionNumber: 1,
      questionKey: 'signals-q1',
      prompt: 'I move quickly from ambiguity to action.',
      sectionKey: 'behaviour_style',
      sectionName: 'Behaviour Style',
      reverseScored: false,
      isActive: true,
      metadataJson: {
        packageQuestionId: 'pkg-q1',
        promptKey: 'signals.q1',
        dimensionId: 'behaviour_style',
      },
      options: [
        {
          id: 'question-1-option-1',
          optionKey: 'rarely',
          optionText: 'Rarely',
          displayOrder: 1,
          numericValue: 1,
          mappings: [{ signalCode: 'Core_Analyst', signalWeight: 1, layerKey: 'behaviour_style' }],
        },
        {
          id: 'question-1-option-2',
          optionKey: 'sometimes',
          optionText: 'Sometimes',
          displayOrder: 2,
          numericValue: 2,
          mappings: [{ signalCode: 'Core_Analyst', signalWeight: 2, layerKey: 'behaviour_style' }],
        },
        {
          id: 'question-1-option-3',
          optionKey: 'often',
          optionText: 'Often',
          displayOrder: 3,
          numericValue: 3,
          mappings: [{ signalCode: 'Core_Driver', signalWeight: 3, layerKey: 'behaviour_style' }],
        },
        {
          id: 'question-1-option-4',
          optionKey: 'always',
          optionText: 'Always',
          displayOrder: 4,
          numericValue: 4,
          mappings: [{ signalCode: 'Core_Driver', signalWeight: 4, layerKey: 'behaviour_style' }],
        },
      ],
    },
    {
      id: 'question-2',
      questionNumber: 2,
      questionKey: 'signals-q2',
      prompt: 'I look for patterns before I decide.',
      sectionKey: 'behaviour_style',
      sectionName: 'Behaviour Style',
      reverseScored: false,
      isActive: true,
      metadataJson: {
        packageQuestionId: 'pkg-q2',
        promptKey: 'signals.q2',
        dimensionId: 'behaviour_style',
      },
      options: [
        {
          id: 'question-2-option-1',
          optionKey: 'rarely',
          optionText: 'Rarely',
          displayOrder: 1,
          numericValue: 1,
          mappings: [{ signalCode: 'Core_Driver', signalWeight: 1, layerKey: 'behaviour_style' }],
        },
        {
          id: 'question-2-option-2',
          optionKey: 'sometimes',
          optionText: 'Sometimes',
          displayOrder: 2,
          numericValue: 2,
          mappings: [{ signalCode: 'Core_Driver', signalWeight: 2, layerKey: 'behaviour_style' }],
        },
        {
          id: 'question-2-option-3',
          optionKey: 'often',
          optionText: 'Often',
          displayOrder: 3,
          numericValue: 3,
          mappings: [{ signalCode: 'Core_Analyst', signalWeight: 3, layerKey: 'behaviour_style' }],
        },
        {
          id: 'question-2-option-4',
          optionKey: 'always',
          optionText: 'Always',
          displayOrder: 4,
          numericValue: 4,
          mappings: [{ signalCode: 'Core_Analyst', signalWeight: 4, layerKey: 'behaviour_style' }],
        },
      ],
    },
  ]
}

function createHarness(options?: {
  published?: boolean
  runtimeMaterialized?: boolean
  score?: (input: ScoringEngineInput) => ReturnType<typeof scoreAssessment>
}) {
  const runtimeQuestions = createRuntimeQuestions()
  const totalQuestions = runtimeQuestions.length
  const definition = {
    id: 'definition-signals',
    key: 'sonartra_signals',
    slug: 'sonartra-signals',
    lifecycleStatus: options?.published === false ? 'draft' : 'published',
    currentPublishedVersionId: options?.published === false ? null : 'version-signals-live',
  }
  const version = {
    id: 'version-signals-live',
    key: 'signals-mvp-v1',
    name: 'Signals MVP v1',
    totalQuestions,
    isActive: true,
    lifecycleStatus: options?.published === false ? 'draft' : 'published',
    assessmentDefinitionId: definition.id,
  }
  const questionSet = options?.runtimeMaterialized === false
    ? null
    : {
        id: 'question-set-signals-v1',
        assessmentVersionId: version.id,
        key: 'signals-runtime-v1',
        name: 'Signals Runtime v1',
        description: 'Runtime questions for the live Signals MVP flow.',
        isActive: true,
        createdAt: iso(0),
        updatedAt: iso(0),
      }

  const state = {
    definition,
    version,
    questionSet,
    runtimeQuestions,
    assessments: [] as AssessmentRow[],
    responses: [] as ResponseRow[],
    results: [] as AssessmentResultRow[],
    resultSignals: [] as AssessmentResultSignalRow[],
    nextAssessmentId: 1,
    nextResultId: 1,
  }

  const queryDb = async <T>(sql: string, params?: unknown[]) => {
    if (sql.includes('FROM assessment_definitions ad')) {
      const runtimeQuestionsCount = state.questionSet ? state.runtimeQuestions.filter((question) => question.isActive).length : 0
      const questionsWithRuntimeMetadata = state.questionSet
        ? state.runtimeQuestions.filter(
            (question) =>
              question.isActive &&
              question.metadataJson.packageQuestionId &&
              question.metadataJson.promptKey &&
              question.metadataJson.dimensionId,
          ).length
        : 0

      return {
        rows: [
          {
            assessment_definition_id: state.definition.id,
            assessment_definition_key: state.definition.key,
            assessment_definition_slug: state.definition.slug,
            current_published_version_id: state.definition.currentPublishedVersionId,
            assessment_version_id: state.definition.currentPublishedVersionId ? state.version.id : null,
            assessment_version_key: state.definition.currentPublishedVersionId ? state.version.key : null,
            assessment_version_name: state.definition.currentPublishedVersionId ? state.version.name : null,
            total_questions: state.definition.currentPublishedVersionId ? state.version.totalQuestions : null,
            is_active: state.definition.currentPublishedVersionId ? state.version.isActive : null,
            active_question_set_id: state.questionSet?.id ?? null,
            active_question_count: runtimeQuestionsCount,
            questions_with_runtime_metadata: questionsWithRuntimeMetadata,
          },
        ],
      }
    }

    if (sql.includes('FROM assessments a') && sql.includes("a.status IN ('not_started', 'in_progress')")) {
      const [userId, definitionId] = params as [string, string]
      const rows = state.assessments
        .filter((assessment) => {
          if (assessment.user_id !== userId) return false
          if (!['not_started', 'in_progress'].includes(assessment.status)) return false
          return definitionId === state.version.assessmentDefinitionId && assessment.assessment_version_id === state.version.id
        })
        .sort((a, b) => (b.last_activity_at ?? '').localeCompare(a.last_activity_at ?? ''))
        .slice(0, 1)
        .map((assessment) => ({
          id: assessment.id,
          version_id: state.version.id,
          version_key: state.version.key,
          version_name: state.version.name,
          total_questions: state.version.totalQuestions,
        }))

      return { rows }
    }

    if (sql.includes('FROM assessments') && sql.includes('WHERE id = $1') && !sql.includes('FOR UPDATE')) {
      const [assessmentId] = params as [string]
      const assessment = state.assessments.find((item) => item.id === assessmentId)
      return { rows: assessment ? [assessment] : [] }
    }

    if (sql.includes('FROM assessment_versions') && sql.includes('WHERE id = $1')) {
      const [versionId] = params as [string]
      if (versionId !== state.version.id || !state.definition.currentPublishedVersionId) {
        return { rows: [] }
      }

      return {
        rows: [
          {
            id: state.version.id,
            key: state.version.key,
            name: state.version.name,
            total_questions: state.version.totalQuestions,
            is_active: state.version.isActive,
          },
        ],
      }
    }

    if (sql.includes('FROM assessment_versions av') && sql.includes('INNER JOIN assessment_question_sets aqs')) {
      const [versionKey] = params as [string]
      if (!state.questionSet || versionKey !== state.version.key) {
        return { rows: [] }
      }

      return {
        rows: [
          {
            id: state.version.id,
            key: state.version.key,
            name: state.version.name,
            total_questions: state.version.totalQuestions,
            is_active: state.version.isActive,
            question_set_id: state.questionSet.id,
            assessment_version_id: state.questionSet.assessmentVersionId,
            question_set_key: state.questionSet.key,
            question_set_name: state.questionSet.name,
            description: state.questionSet.description,
            question_set_is_active: state.questionSet.isActive,
            created_at: state.questionSet.createdAt,
            updated_at: state.questionSet.updatedAt,
          },
        ],
      }
    }

    if (sql.includes('FROM assessment_questions q') && sql.includes('INNER JOIN assessment_question_options o')) {
      const [questionSetId] = params as [string]
      if (!state.questionSet || questionSetId !== state.questionSet.id) {
        return { rows: [] }
      }

      return {
        rows: state.runtimeQuestions.flatMap((question) =>
          question.options.map((option) => ({
            question_number: question.questionNumber,
            question_key: question.questionKey,
            prompt: question.prompt,
            section_key: question.sectionKey,
            section_name: question.sectionName,
            reverse_scored: question.reverseScored,
            option_key: option.optionKey,
            option_text: option.optionText,
            display_order: option.displayOrder,
            numeric_value: option.numericValue,
          })),
        ),
      }
    }

    if (sql.includes('FROM assessment_responses') && sql.includes('WHERE assessment_id = $1') && sql.includes('ORDER BY question_id ASC')) {
      const [assessmentId] = params as [string]
      return {
        rows: state.responses
          .filter((response) => response.assessment_id === assessmentId)
          .sort((a, b) => a.question_id - b.question_id),
      }
    }

    throw new Error(`Unhandled queryDb SQL: ${sql}`)
  }

  const withTransaction = async <T>(work: (client: { query: typeof queryDb }) => Promise<T>) => {
    const client = {
      query: async <T>(sql: string, params?: unknown[]) => {
        if (sql.includes('INSERT INTO assessments')) {
          const [userId, versionId, source] = params as [string, string, string]
          const id = `assessment-${state.nextAssessmentId++}`
          const now = iso(state.nextAssessmentId)
          const row: AssessmentRow = {
            id,
            user_id: userId,
            organisation_id: null,
            assessment_version_id: versionId,
            status: 'not_started',
            started_at: now,
            completed_at: null,
            last_activity_at: now,
            progress_count: 0,
            progress_percent: '0',
            current_question_index: 0,
            scoring_status: 'not_scored',
            source,
            metadata_json: null,
            created_at: now,
            updated_at: now,
          }
          state.assessments.push(row)
          return { rows: [{ id }] }
        }

        if (sql.includes('FROM assessments a') && sql.includes('INNER JOIN assessment_versions av') && sql.includes('FOR UPDATE')) {
          const [assessmentId] = params as [string]
          const assessment = state.assessments.find((item) => item.id === assessmentId)
          if (!assessment) return { rows: [] }

          return {
            rows: [
              {
                id: assessment.id,
                user_id: assessment.user_id,
                status: assessment.status,
                total_questions: state.version.totalQuestions,
                assessment_version_id: assessment.assessment_version_id,
                version_key: state.version.key,
                started_at: assessment.started_at,
                completed_at: assessment.completed_at,
                scoring_status: assessment.scoring_status,
              },
            ],
          }
        }

        if (sql.includes('WITH response_upsert AS')) {
          const [assessmentId, questionId, responseValue, responseTimeMs, totalQuestionsForSave] = params as [string, number, number, number | null, number]
          const assessment = state.assessments.find((item) => item.id === assessmentId)
          assert.ok(assessment)

          const now = iso(questionId + 10)
          const existing = state.responses.find((response) => response.assessment_id === assessmentId && response.question_id === questionId)
          const inserted = !existing

          if (existing) {
            existing.is_changed = existing.is_changed || existing.response_value !== responseValue
            existing.response_value = responseValue
            existing.response_time_ms = responseTimeMs
            existing.updated_at = now
          } else {
            state.responses.push({
              assessment_id: assessmentId,
              question_id: questionId,
              response_value: responseValue,
              response_time_ms: responseTimeMs,
              is_changed: false,
              created_at: now,
              updated_at: now,
            })
          }

          if (inserted) {
            assessment.progress_count = Math.min(assessment.progress_count + 1, totalQuestionsForSave)
          }
          assessment.progress_percent = String(Number(((assessment.progress_count * 100) / totalQuestionsForSave).toFixed(2)))
          assessment.current_question_index = Math.max(assessment.current_question_index, questionId)
          assessment.status = assessment.status === 'not_started' ? 'in_progress' : assessment.status
          assessment.last_activity_at = now
          assessment.updated_at = now

          return { rows: [{ progress_count: assessment.progress_count, progress_percent: assessment.progress_percent }] }
        }

        if (sql.includes('COUNT(*)::int AS response_count')) {
          const [assessmentId] = params as [string]
          return {
            rows: [{ response_count: String(state.responses.filter((response) => response.assessment_id === assessmentId).length) }],
          }
        }

        if (sql.includes("SET\n           status = 'completed'")) {
          const [assessmentId, totalQuestionsForCompletion] = params as [string, number]
          const assessment = state.assessments.find((item) => item.id === assessmentId)
          assert.ok(assessment)
          const completedAt = iso(40)
          assessment.status = 'completed'
          assessment.completed_at = completedAt
          assessment.last_activity_at = completedAt
          assessment.updated_at = completedAt
          assessment.progress_count = totalQuestionsForCompletion
          assessment.progress_percent = '100'
          assessment.current_question_index = Math.max(assessment.current_question_index, totalQuestionsForCompletion)
          assessment.scoring_status = 'pending'
          return { rows: [{ completed_at: completedAt }] }
        }

        if (sql.includes('SET scoring_status = $2')) {
          const [assessmentId, scoringStatus] = params as [string, AssessmentRow['scoring_status']]
          const assessment = state.assessments.find((item) => item.id === assessmentId)
          assert.ok(assessment)
          assessment.scoring_status = scoringStatus
          assessment.updated_at = iso(50)
          return { rows: [] }
        }

        return queryDb(sql, params)
      },
    }

    return work(client)
  }

  const fetchScoringInput = async (assessment: { id: string; assessment_version_id: string; version_key: string; completed_at: string | null; started_at: string | null }) => {
    const responses = state.responses
      .filter((response) => response.assessment_id === assessment.id)
      .sort((a, b) => a.question_id - b.question_id)

    const scoringResponses: AssessmentResponseInput[] = responses.map((response) => ({
      questionId: response.question_id,
      responseValue: response.response_value,
      responseTimeMs: response.response_time_ms,
    }))

    const mappings: SignalMappingInput[] = responses.flatMap((response) => {
      const question = state.runtimeQuestions.find((item) => item.questionNumber === response.question_id)
      assert.ok(question)
      const option = question.options.find((item) => item.numericValue === response.response_value)
      assert.ok(option)
      return option.mappings.map((mapping) => ({
        questionId: response.question_id,
        responseValue: response.response_value,
        signalCode: mapping.signalCode as SignalMappingInput['signalCode'],
        signalWeight: mapping.signalWeight,
        layerKey: mapping.layerKey,
      }))
    })

    return {
      assessmentId: assessment.id,
      assessmentVersionId: assessment.assessment_version_id,
      versionKey: assessment.version_key,
      scoringModelKey: WPLP80_SCORING_MODEL_KEY,
      snapshotVersion: 1,
      completedAt: assessment.completed_at,
      startedAt: assessment.started_at,
      responses: scoringResponses,
      mappings,
    }
  }

  const persistSuccess = async (input: PersistSuccessfulAssessmentResultInput) => {
    const assessmentResultId = `result-${state.nextResultId++}`
    const row: AssessmentResultRow = {
      id: assessmentResultId,
      assessment_id: input.assessmentId,
      assessment_version_id: input.assessmentVersionId,
      version_key: input.versionKey,
      scoring_model_key: input.scoringModelKey,
      snapshot_version: input.snapshotVersion,
      status: 'complete',
      result_payload: input.resultPayload as Record<string, unknown>,
      response_quality_payload: input.responseQualityPayload as Record<string, unknown>,
      completed_at: input.completedAt,
      scored_at: input.scoredAt,
      created_at: iso(45),
      updated_at: iso(45),
    }

    state.results = state.results.filter((result) => !(result.assessment_id === input.assessmentId && result.snapshot_version === input.snapshotVersion))
    state.results.push(row)
    state.resultSignals = state.resultSignals.filter((signal) => signal.assessment_result_id !== assessmentResultId)
    state.resultSignals.push(
      ...input.signalRows.map((signal, index) => ({
        id: `${assessmentResultId}-signal-${index + 1}`,
        assessment_result_id: assessmentResultId,
        layer_key: signal.layerKey,
        signal_key: signal.signalKey,
        raw_total: String(signal.rawTotal),
        max_possible: String(signal.maxPossible),
        normalised_score: String(signal.normalisedScore),
        relative_share: String(signal.relativeShare),
        rank_in_layer: signal.rankInLayer,
        is_primary: signal.isPrimary,
        is_secondary: signal.isSecondary,
        percentile_placeholder: null,
        confidence_flag: null,
        created_at: iso(45),
      })),
    )

    return { assessmentResultId }
  }

  const persistFailed = async (input: PersistFailedAssessmentResultInput) => {
    const assessmentResultId = `result-${state.nextResultId++}`
    const row: AssessmentResultRow = {
      id: assessmentResultId,
      assessment_id: input.assessmentId,
      assessment_version_id: input.assessmentVersionId,
      version_key: input.versionKey,
      scoring_model_key: input.scoringModelKey,
      snapshot_version: input.snapshotVersion,
      status: 'failed',
      result_payload: { failure: input.failure },
      response_quality_payload: null,
      completed_at: input.completedAt,
      scored_at: input.scoredAt,
      created_at: iso(46),
      updated_at: iso(46),
    }

    state.results = state.results.filter((result) => !(result.assessment_id === input.assessmentId && result.snapshot_version === input.snapshotVersion))
    state.results.push(row)
    state.resultSignals = state.resultSignals.filter((signal) => signal.assessment_result_id !== assessmentResultId)
    return { assessmentResultId }
  }

  const getLatestAssessmentForUser = async (userId: string) => {
    const assessment = [...state.assessments]
      .filter((item) => item.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0]

    return assessment
      ? {
          ...assessment,
          version_key: state.version.key,
          total_questions: state.version.totalQuestions,
        }
      : null
  }

  const getLatestResultForAssessment = async (assessmentId: string) => {
    return [...state.results]
      .filter((result) => result.assessment_id === assessmentId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  }

  const getLatestReadyResultForUser = async (userId: string) => {
    const ready = [...state.results]
      .filter((result) => result.status === 'complete')
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .find((result) => state.assessments.find((assessment) => assessment.id === result.assessment_id && assessment.user_id === userId))

    if (!ready) return null

    const assessment = state.assessments.find((item) => item.id === ready.assessment_id)
    assert.ok(assessment)

    return {
      ...ready,
      assessment_started_at: assessment.started_at,
      assessment_completed_at: assessment.completed_at,
      assessment_version_key: state.version.key,
    }
  }

  const getSignalsByResultId = async (resultId: string) => state.resultSignals.filter((signal) => signal.assessment_result_id === resultId)

  return {
    state,
    queryDb,
    withTransaction,
    fetchScoringInput,
    persistSuccess,
    persistFailed,
    score: options?.score ?? scoreAssessment,
    getLatestAssessmentForUser,
    getLatestResultForAssessment,
    getLatestReadyResultForUser,
    getSignalsByResultId,
  }
}

test('admin-to-live Signals MVP happy path flows from published runtime to renderable individual result', async () => {
  const harness = createHarness()

  const publishedVersion = await resolveLiveSignalsPublishedVersionState({ queryDb: harness.queryDb })
  assert.ok(publishedVersion.version)
  assert.equal(publishedVersion.version?.assessmentVersionId, harness.state.version.id)

  const started = await startLiveSignalsAssessment(
    { appUser, source: 'workspace' },
    {
      queryDb: harness.queryDb,
      withTransaction: harness.withTransaction as never,
      resolveLiveSignalsPublishedVersionState: async () => publishedVersion,
    },
  )

  assert.equal(started.kind, 'ok')
  if (started.kind !== 'ok') return

  const questions = await getQuestionsByAssessmentIdWithDependencies(started.body.assessmentId, { queryDb: harness.queryDb })
  assert.ok(questions)
  assert.equal(questions?.questions.length, 2)
  assert.equal(questions?.questionSet.key, 'signals-runtime-v1')
  assert.equal(questions?.responses.length, 0)

  const firstSave = await saveAssessmentResponse(
    {
      appUserId: appUser.dbUserId,
      assessmentId: started.body.assessmentId,
      questionId: 1,
      responseValue: 4,
      responseTimeMs: 1200,
    },
    { withTransaction: harness.withTransaction as never },
  )
  const secondSave = await saveAssessmentResponse(
    {
      appUserId: appUser.dbUserId,
      assessmentId: started.body.assessmentId,
      questionId: 2,
      responseValue: 4,
      responseTimeMs: 1600,
    },
    { withTransaction: harness.withTransaction as never },
  )

  assert.equal(firstSave.status, 200)
  assert.equal(secondSave.status, 200)
  assert.equal(secondSave.body.progressPercent, 100)
  assert.equal(harness.state.responses.length, 2)

  const completion = await completeAssessmentWithResults(
    started.body.assessmentId,
    {
      fetchScoringInput: harness.fetchScoringInput,
      score: harness.score,
      persistSuccess: harness.persistSuccess,
      persistFailed: harness.persistFailed,
    },
    {
      runInTransaction: harness.withTransaction as never,
      getLatestResultSnapshot: async () => null,
    },
  )

  assert.equal(completion.httpStatus, 200)
  assert.equal(completion.body.ok, true)
  if (!completion.body.ok) return
  assert.equal(completion.body.resultStatus, 'succeeded')
  assert.ok(completion.body.resultId)

  const readModel = await getAssessmentResultReadModel(started.body.assessmentId, appUser.dbUserId, {
    getAssessmentById: async (assessmentId, ownerUserId) =>
      harness.state.assessments.find((assessment) => assessment.id === assessmentId && assessment.user_id === ownerUserId) ?? null,
    getResultByAssessmentId: async (assessmentId) => harness.state.results.find((result) => result.assessment_id === assessmentId) ?? null,
    getSignalsByResultId: harness.getSignalsByResultId,
  })

  assert.equal(readModel.kind, 'ok')
  if (readModel.kind !== 'ok') return
  assert.equal(readModel.body.result.availability, 'available')
  if (readModel.body.result.availability !== 'available' || readModel.body.result.status !== 'complete') return
  assert.equal(readModel.body.result.signals.length, 2)
  assert.equal(readModel.body.result.signals[0]?.signalKey, 'Core_Analyst')

  const latestIndividualResult = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => appUser.dbUserId,
    getLatestAssessmentForUser: harness.getLatestAssessmentForUser,
    getLatestResultForAssessment: harness.getLatestResultForAssessment,
    getResultById: async (resultId) => harness.state.results.find((result) => result.id === resultId) ?? null,
    getLatestReadyResultForUser: harness.getLatestReadyResultForUser,
    getSignalsByResultId: harness.getSignalsByResultId,
  })

  assert.equal(latestIndividualResult.ok, true)
  assert.equal(latestIndividualResult.state, 'ready')
  if (latestIndividualResult.state !== 'ready') return

  const viewModel = buildReadyIndividualResultViewModel(latestIndividualResult.data, 'Ada')
  assert.equal(viewModel.presentation.assessments[0]?.title, 'Sonartra Signals')
  assert.equal(viewModel.presentation.intelligence.summaryHeadline, 'Baseline ready')
})

test('start flow stays unavailable when no published Signals version exists', async () => {
  const harness = createHarness({ published: false })

  const publishedVersion = await resolveLiveSignalsPublishedVersionState({ queryDb: harness.queryDb })
  assert.equal(publishedVersion.version, null)
  assert.equal(publishedVersion.diagnostic.code, 'no_published_version')

  const started = await startLiveSignalsAssessment(
    { appUser },
    {
      queryDb: harness.queryDb,
      withTransaction: harness.withTransaction as never,
      resolveLiveSignalsPublishedVersionState: async () => publishedVersion,
    },
  )

  assert.equal(started.kind, 'unavailable')
  if (started.kind === 'unavailable') {
    assert.equal(started.body.code, 'no_published_version')
  }
})

test('start flow stays unavailable when published Signals runtime is not executable', async () => {
  const harness = createHarness({ runtimeMaterialized: false })

  const publishedVersion = await resolveLiveSignalsPublishedVersionState({ queryDb: harness.queryDb })
  assert.equal(publishedVersion.version, null)
  assert.equal(publishedVersion.diagnostic.code, 'runtime_not_materialized')

  const started = await startLiveSignalsAssessment(
    { appUser },
    {
      queryDb: harness.queryDb,
      withTransaction: harness.withTransaction as never,
      resolveLiveSignalsPublishedVersionState: async () => publishedVersion,
    },
  )

  assert.equal(started.kind, 'unavailable')
  if (started.kind === 'unavailable') {
    assert.equal(started.body.code, 'runtime_not_materialized')
  }
})

test('final answer submit edge case succeeds when the last answer is persisted immediately before completion', async () => {
  const harness = createHarness()
  const publishedVersion = await resolveLiveSignalsPublishedVersionState({ queryDb: harness.queryDb })
  const started = await startLiveSignalsAssessment(
    { appUser },
    {
      queryDb: harness.queryDb,
      withTransaction: harness.withTransaction as never,
      resolveLiveSignalsPublishedVersionState: async () => publishedVersion,
    },
  )

  assert.equal(started.kind, 'ok')
  if (started.kind !== 'ok') return

  const firstSave = await saveAssessmentResponse(
    {
      appUserId: appUser.dbUserId,
      assessmentId: started.body.assessmentId,
      questionId: 1,
      responseValue: 3,
      responseTimeMs: 900,
    },
    { withTransaction: harness.withTransaction as never },
  )
  assert.equal(firstSave.status, 200)

  const finalSave = await saveAssessmentResponse(
    {
      appUserId: appUser.dbUserId,
      assessmentId: started.body.assessmentId,
      questionId: 2,
      responseValue: 4,
      responseTimeMs: 1100,
    },
    { withTransaction: harness.withTransaction as never },
  )
  assert.equal(finalSave.status, 200)
  assert.equal(finalSave.body.progressCount, 2)
  assert.equal(finalSave.body.progressPercent, 100)

  const completion = await completeAssessmentWithResults(
    started.body.assessmentId,
    {
      fetchScoringInput: harness.fetchScoringInput,
      score: harness.score,
      persistSuccess: harness.persistSuccess,
      persistFailed: harness.persistFailed,
    },
    {
      runInTransaction: harness.withTransaction as never,
      getLatestResultSnapshot: async () => null,
    },
  )

  assert.equal(completion.body.ok, true)
  if (completion.body.ok) {
    assert.equal(completion.body.resultStatus, 'succeeded')
  }
})

test('scoring failure leaves the assessment complete and exposes the individual result error state', async () => {
  const harness = createHarness({
    score: () => {
      throw new Error('Synthetic scoring failure for MVP flow coverage')
    },
  })
  const publishedVersion = await resolveLiveSignalsPublishedVersionState({ queryDb: harness.queryDb })
  const started = await startLiveSignalsAssessment(
    { appUser },
    {
      queryDb: harness.queryDb,
      withTransaction: harness.withTransaction as never,
      resolveLiveSignalsPublishedVersionState: async () => publishedVersion,
    },
  )

  assert.equal(started.kind, 'ok')
  if (started.kind !== 'ok') return

  await saveAssessmentResponse(
    {
      appUserId: appUser.dbUserId,
      assessmentId: started.body.assessmentId,
      questionId: 1,
      responseValue: 4,
      responseTimeMs: 1000,
    },
    { withTransaction: harness.withTransaction as never },
  )
  await saveAssessmentResponse(
    {
      appUserId: appUser.dbUserId,
      assessmentId: started.body.assessmentId,
      questionId: 2,
      responseValue: 4,
      responseTimeMs: 1000,
    },
    { withTransaction: harness.withTransaction as never },
  )

  const completion = await completeAssessmentWithResults(
    started.body.assessmentId,
    {
      fetchScoringInput: harness.fetchScoringInput,
      score: harness.score,
      persistSuccess: harness.persistSuccess,
      persistFailed: harness.persistFailed,
    },
    {
      runInTransaction: harness.withTransaction as never,
      getLatestResultSnapshot: async () => null,
    },
  )

  assert.equal(completion.httpStatus, 200)
  assert.equal(completion.body.ok, true)
  if (!completion.body.ok) return
  assert.equal(completion.body.resultStatus, 'failed')
  assert.ok(completion.body.warning)

  const latestIndividualResult = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => appUser.dbUserId,
    getLatestAssessmentForUser: harness.getLatestAssessmentForUser,
    getLatestResultForAssessment: harness.getLatestResultForAssessment,
    getResultById: async (resultId) => harness.state.results.find((result) => result.id === resultId) ?? null,
    getLatestReadyResultForUser: async () => null,
    getSignalsByResultId: harness.getSignalsByResultId,
  })

  assert.equal(latestIndividualResult.ok, false)
  assert.equal(latestIndividualResult.state, 'error')

  const failedReadModel = await getAssessmentResultReadModel(started.body.assessmentId, appUser.dbUserId, {
    getAssessmentById: async (assessmentId, ownerUserId) =>
      harness.state.assessments.find((assessment) => assessment.id === assessmentId && assessment.user_id === ownerUserId) ?? null,
    getResultByAssessmentId: async (assessmentId) => harness.state.results.find((result) => result.assessment_id === assessmentId) ?? null,
    getSignalsByResultId: harness.getSignalsByResultId,
  })

  assert.equal(failedReadModel.kind, 'ok')
  if (failedReadModel.kind !== 'ok') return
  assert.equal(failedReadModel.body.result.availability, 'available')
  if (failedReadModel.body.result.availability !== 'available' || failedReadModel.body.result.status !== 'failed') return
  assert.equal(failedReadModel.body.result.failure?.code, 'RESULT_GENERATION_FAILED')
})

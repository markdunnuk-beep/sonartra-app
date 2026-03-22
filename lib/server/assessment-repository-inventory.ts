import { assessmentAvailabilityConfig } from '@/lib/assessment/assessment-availability-config'
import { assessmentCatalogueDefinitions } from '@/lib/assessment/assessment-catalogue-config'
import {
  buildAccessRows,
  buildOperationalDetailRows,
  buildOutputRows,
  buildStatusNote,
} from '@/lib/assessment/assessment-repository-selectors'
import type {
  AssessmentRepositoryItem,
  AssessmentRepositoryLifecycleState,
  AssessmentRepositoryStatus,
} from '@/lib/assessment/assessment-repository-types'
import type { AssessmentResultRow, AssessmentRow } from '@/lib/assessment-types'
import { queryDb } from '@/lib/db'
import { getCurrentAssessmentRepositoryContext } from '@/lib/assessment/assessment-repository-context'
import {
  resolveLiveSignalsPublishedVersionState,
  type LiveSignalsPublishedVersionState,
} from '@/lib/server/live-signals-runtime'

const LIVE_SIGNALS_REPOSITORY_ID = 'signals'

interface AssessmentInventoryAssessmentRow extends AssessmentRow {
  version_key: string | null
  version_name: string | null
  total_questions: number | null
}

interface AssessmentInventoryReadyResultRow extends AssessmentResultRow {
  assessment_started_at: string | null
  assessment_completed_at: string | null
}

interface InventoryDependencies {
  queryDb: typeof queryDb
  resolveLiveSignalsPublishedVersionState: () => Promise<LiveSignalsPublishedVersionState>
}

const defaultDependencies: InventoryDependencies = {
  queryDb,
  resolveLiveSignalsPublishedVersionState,
}

function getSignalsDefinition() {
  const definition = assessmentCatalogueDefinitions.find((item) => item.id === LIVE_SIGNALS_REPOSITORY_ID)

  if (!definition) {
    throw new Error('Signals repository definition is missing.')
  }

  return definition
}

function getSignalsAvailability() {
  const availability = assessmentAvailabilityConfig.find((item) => item.assessmentId === LIVE_SIGNALS_REPOSITORY_ID)

  if (!availability) {
    throw new Error('Signals repository availability config is missing.')
  }

  return availability
}

function normaliseProgressPercent(value: string): number {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(0, Math.min(100, Math.round(parsed)))
}

function isEffectivelyCompleted(assessment: AssessmentInventoryAssessmentRow): boolean {
  if (assessment.status === 'completed') {
    return true
  }

  const progressPercent = normaliseProgressPercent(assessment.progress_percent)
  const hasCompleteCount = typeof assessment.total_questions === 'number' && assessment.total_questions > 0
    ? assessment.progress_count >= assessment.total_questions
    : false

  return progressPercent >= 100 || hasCompleteCount
}

function resolveLifecycleState(args: {
  latestAssessment: AssessmentInventoryAssessmentRow | null
  latestAssessmentResult: AssessmentResultRow | null
  latestAssessmentSignalCount: number
}): AssessmentRepositoryLifecycleState {
  const { latestAssessment, latestAssessmentResult, latestAssessmentSignalCount } = args

  if (!latestAssessment) {
    return 'not_started'
  }

  if (!isEffectivelyCompleted(latestAssessment)) {
    return 'in_progress'
  }

  if (!latestAssessmentResult) {
    return 'completed_processing'
  }

  if (latestAssessmentResult.status === 'failed') {
    return 'error'
  }

  if (latestAssessmentResult.status === 'complete' && latestAssessmentSignalCount > 0) {
    return 'ready'
  }

  return 'completed_processing'
}

function mapLifecycleToStatus(lifecycleState: AssessmentRepositoryLifecycleState): AssessmentRepositoryStatus {
  switch (lifecycleState) {
    case 'in_progress':
      return 'in_progress'
    case 'completed_processing':
      return 'processing'
    case 'ready':
      return 'complete'
    case 'error':
      return 'error'
    case 'not_started':
    default:
      return 'not_started'
  }
}

async function getLatestSignalsAssessmentForUser(
  query: typeof queryDb,
  userId: string,
  assessmentDefinitionId: string,
): Promise<AssessmentInventoryAssessmentRow | null> {
  const result = await query<AssessmentInventoryAssessmentRow>(
    `SELECT a.id, a.user_id, a.organisation_id, a.assessment_version_id, a.status, a.started_at,
            a.completed_at, a.last_activity_at, a.progress_count, a.progress_percent,
            a.current_question_index, a.scoring_status, a.source, a.metadata_json,
            a.created_at, a.updated_at,
            av.key AS version_key,
            av.name AS version_name,
            av.total_questions
     FROM assessments a
     INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
     WHERE a.user_id = $1
       AND a.organisation_id IS NULL
       AND av.assessment_definition_id = $2
     ORDER BY a.created_at DESC
     LIMIT 1`,
    [userId, assessmentDefinitionId],
  )

  return result.rows[0] ?? null
}

async function getLatestResultForAssessment(
  query: typeof queryDb,
  assessmentId: string,
): Promise<AssessmentResultRow | null> {
  const result = await query<AssessmentResultRow>(
    `SELECT id, assessment_id, assessment_version_id, version_key, scoring_model_key, snapshot_version, status,
            result_payload, response_quality_payload, completed_at, scored_at, created_at, updated_at
     FROM assessment_results
     WHERE assessment_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [assessmentId],
  )

  return result.rows[0] ?? null
}

async function getLatestReadyResultForUser(
  query: typeof queryDb,
  userId: string,
  assessmentDefinitionId: string,
): Promise<AssessmentInventoryReadyResultRow | null> {
  const result = await query<AssessmentInventoryReadyResultRow>(
    `SELECT ar.id, ar.assessment_id, ar.assessment_version_id, ar.version_key, ar.scoring_model_key, ar.snapshot_version,
            ar.status, ar.result_payload, ar.response_quality_payload, ar.completed_at, ar.scored_at, ar.created_at, ar.updated_at,
            a.started_at AS assessment_started_at,
            a.completed_at AS assessment_completed_at
     FROM assessment_results ar
     INNER JOIN assessments a ON a.id = ar.assessment_id
     INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
     WHERE a.user_id = $1
       AND a.organisation_id IS NULL
       AND av.assessment_definition_id = $2
       AND ar.status = 'complete'
       AND EXISTS (
         SELECT 1 FROM assessment_result_signals ars WHERE ars.assessment_result_id = ar.id
       )
     ORDER BY a.completed_at DESC NULLS LAST, ar.created_at DESC
     LIMIT 1`,
    [userId, assessmentDefinitionId],
  )

  return result.rows[0] ?? null
}

async function getSignalCountByResultId(query: typeof queryDb, resultId: string): Promise<number> {
  const result = await query<{ signal_count: string }>(
    `SELECT COUNT(*)::int AS signal_count
     FROM assessment_result_signals
     WHERE assessment_result_id = $1`,
    [resultId],
  )

  return Number(result.rows[0]?.signal_count ?? 0)
}

function buildStatusNoteForLifecycle(
  lifecycleState: AssessmentRepositoryLifecycleState,
  defaultStatusNote: string | undefined,
): string | undefined {
  switch (lifecycleState) {
    case 'in_progress':
      return 'Your latest Signals attempt is active. Resume from the last autosaved response to keep continuity.'
    case 'completed_processing':
      return 'The latest Signals attempt is complete, but results are still processing. Start is withheld until the run settles.'
    case 'error':
      return 'The latest completed Signals attempt did not produce a ready result. Please retry after processing stabilises.'
    case 'ready':
      return defaultStatusNote
    case 'not_started':
    default:
      return undefined
  }
}

export async function loadLiveAssessmentRepositoryInventory(
  userId: string,
  dependencies: Partial<InventoryDependencies> = {},
): Promise<AssessmentRepositoryItem[]> {
  const deps = { ...defaultDependencies, ...dependencies }
  const publishedVersionState = await deps.resolveLiveSignalsPublishedVersionState()
  const publishedVersion = publishedVersionState.version

  if (!publishedVersion?.isActive) {
    if (publishedVersionState.diagnostic.code !== 'no_published_version') {
      console.warn('[signals.inventory] live Signals version hidden because runtime is not executable', publishedVersionState.diagnostic)
    }
    return []
  }

  const definition = getSignalsDefinition()
  const availability = getSignalsAvailability()
  const context = getCurrentAssessmentRepositoryContext()

  const latestAssessment = await getLatestSignalsAssessmentForUser(
    deps.queryDb,
    userId,
    publishedVersion.assessmentDefinitionId,
  )

  const latestAssessmentResult = latestAssessment
    ? await getLatestResultForAssessment(deps.queryDb, latestAssessment.id)
    : null
  const latestAssessmentSignalCount = latestAssessmentResult
    ? await getSignalCountByResultId(deps.queryDb, latestAssessmentResult.id)
    : 0
  const latestReadyResult = await getLatestReadyResultForUser(
    deps.queryDb,
    userId,
    publishedVersion.assessmentDefinitionId,
  )

  const lifecycleState = resolveLifecycleState({
    latestAssessment,
    latestAssessmentResult,
    latestAssessmentSignalCount,
  })
  const status = mapLifecycleToStatus(lifecycleState)
  const defaultStatusNote = buildStatusNote(definition, status)
  const questionCount = latestAssessment?.total_questions ?? publishedVersion.totalQuestions

  const item: AssessmentRepositoryItem = {
    id: definition.id,
    slug: definition.slug,
    title: definition.title,
    category: definition.category,
    description: definition.shortDescription,
    longDescription: definition.longDescription,
    status,
    lifecycleState,
    inventorySource: 'server',
    availability: {
      definitionId: publishedVersion.assessmentDefinitionId,
      definitionKey: publishedVersion.assessmentDefinitionKey,
      definitionSlug: publishedVersion.assessmentDefinitionSlug,
      versionId: publishedVersion.assessmentVersionId,
      versionKey: publishedVersion.assessmentVersionKey,
      versionName: publishedVersion.assessmentVersionName,
    },
    hasAdvancedOutputs: definition.hasAdvancedOutputs,
    questionCount,
    estimatedMinutes: definition.estimatedMinutes,
    progressPercent: latestAssessment && lifecycleState === 'in_progress'
      ? normaliseProgressPercent(latestAssessment.progress_percent)
      : undefined,
    startedAt: latestAssessment?.started_at ?? null,
    lastSavedAt: latestAssessment?.last_activity_at ?? null,
    completedAt: latestAssessment?.completed_at ?? latestReadyResult?.assessment_completed_at ?? null,
    resultsAvailable: lifecycleState === 'ready',
    isRetakeAllowed: lifecycleState === 'ready' ? definition.isRetakeAllowed : false,
    measures: [...definition.measures],
    operationalDetails: buildOperationalDetailRows(
      {
        ...definition,
        questionCount,
        defaultOperationalDetails: [
          { label: 'Live version', value: `${publishedVersion.assessmentVersionName} (${publishedVersion.assessmentVersionKey})` },
          ...definition.defaultOperationalDetails.slice(1),
        ],
      },
      latestAssessment
        ? {
            assessmentId: definition.id,
            subjectType: 'user',
            subjectId: userId,
            hasActiveAttempt: lifecycleState === 'in_progress',
            hasCompletedResult: lifecycleState === 'ready',
            progressPercent: normaliseProgressPercent(latestAssessment.progress_percent),
            startedAt: latestAssessment.started_at,
            lastSavedAt: latestAssessment.last_activity_at,
            completedAt: latestAssessment.completed_at,
            latestResultId: latestAssessmentResult?.id ?? latestReadyResult?.id ?? null,
            latestAttemptId: latestAssessment.id,
            resultsAvailable: lifecycleState === 'ready',
          }
        : null,
      status,
    ),
    accessRows: buildAccessRows(definition, availability, context),
    outputRows: buildOutputRows(definition, availability, false),
    statusNote: buildStatusNoteForLifecycle(lifecycleState, defaultStatusNote),
    assessmentHref: lifecycleState === 'not_started' || lifecycleState === 'in_progress' || lifecycleState === 'ready'
      ? definition.assessmentHref
      : undefined,
    resultsHref: lifecycleState === 'ready' ? definition.resultsHref : undefined,
    productOrder: definition.displayOrder,
    latestAttemptId: latestAssessment?.id ?? null,
    latestResultId: latestAssessmentResult?.id ?? latestReadyResult?.id ?? null,
    latestResultStatus: latestAssessmentResult?.status ?? latestReadyResult?.status ?? null,
  }

  return [item]
}

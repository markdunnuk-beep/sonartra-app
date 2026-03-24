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
import { SIGNALS_ASSESSMENT_WORKSPACE_PATH } from '@/lib/server/assessment-entry-routing'
import type { AssessmentResultRow, AssessmentRow } from '@/lib/assessment-types'
import { queryDb } from '@/lib/db'
import { hasUserFacingV2Summary, isPackageContractV2Result } from '@/lib/server/live-assessment-user-result'
import { isHybridMvpReadyResult } from '@/lib/server/hybrid-mvp-result'
import { getCurrentAssessmentRepositoryContext } from '@/lib/assessment/assessment-repository-context'
import { getAssessmentResultReportArtifactSelectProjection } from '@/lib/server/assessment-result-schema-capabilities'
import { parseAssessmentReportArtifactRecord } from '@/lib/reports/assessment-report-v2'

interface AssignmentStateRow {
  id: string
  status: 'assigned' | 'in_progress' | 'completed_processing' | 'results_ready' | 'failed' | 'cancelled'
  assessment_definition_id: string
  assessment_definition_key: string
  assessment_definition_slug: string
  assessment_definition_name: string
  assessment_definition_description: string | null
  assessment_definition_category: string
  current_published_version_id: string | null
  assessment_version_id: string
  assessment_version_key: string
  assessment_version_name: string
  total_questions: number
  package_schema_version: string | null
  is_active: boolean
  assigned_at: string
}

interface AssessmentInventoryAssessmentRow extends AssessmentRow {
  total_questions: number | null
}

interface AssessmentInventoryReadyResultRow extends AssessmentResultRow {
  assessment_started_at: string | null
  assessment_completed_at: string | null
}

interface InventoryDependencies {
  queryDb: typeof queryDb
}

const defaultDependencies: InventoryDependencies = {
  queryDb,
}

function resolveDisplayMetadata(assignment: AssignmentStateRow) {
  const catalogueDefinition = assessmentCatalogueDefinitions.find((item) => item.slug === assignment.assessment_definition_slug)
  const availability = catalogueDefinition
    ? assessmentAvailabilityConfig.find((item) => item.assessmentId === catalogueDefinition.id)
    : null

  const title = catalogueDefinition?.title ?? assignment.assessment_definition_name
  const description = catalogueDefinition?.shortDescription ?? assignment.assessment_definition_description ?? 'Assigned assessment.'
  const longDescription = catalogueDefinition?.longDescription ?? description
  const measures = catalogueDefinition?.measures?.length
    ? [...catalogueDefinition.measures]
    : ['Assigned assessment']

  return {
    id: catalogueDefinition?.id ?? assignment.assessment_definition_slug,
    slug: assignment.assessment_definition_slug,
    category: catalogueDefinition?.category ?? 'individual',
    title,
    description,
    longDescription,
    estimatedMinutes: catalogueDefinition?.estimatedMinutes ?? Math.max(5, Math.ceil(assignment.total_questions / 8)),
    hasAdvancedOutputs: catalogueDefinition?.hasAdvancedOutputs ?? false,
    isRetakeAllowed: catalogueDefinition?.isRetakeAllowed ?? true,
    resultsHref: catalogueDefinition?.resultsHref,
    assessmentHref: `${SIGNALS_ASSESSMENT_WORKSPACE_PATH}?definitionId=${encodeURIComponent(assignment.assessment_definition_id)}`,
    displayOrder: catalogueDefinition?.displayOrder ?? 10_000,
    definition: catalogueDefinition,
    availability,
    measures,
  }
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
  latestAssignmentStatus: AssignmentStateRow['status']
}): AssessmentRepositoryLifecycleState {
  const { latestAssessment, latestAssessmentResult, latestAssessmentSignalCount, latestAssignmentStatus } = args

  if (!latestAssessment) {
    if (latestAssignmentStatus === 'assigned') return 'not_started'
    if (latestAssignmentStatus === 'in_progress') return 'in_progress'
    if (latestAssignmentStatus === 'completed_processing') return 'completed_processing'
    if (latestAssignmentStatus === 'results_ready') return 'ready'
    if (latestAssignmentStatus === 'failed') return 'error'

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

  const hasReadyArtifact = parseAssessmentReportArtifactRecord(latestAssessmentResult.report_artifact_json)?.state === 'available'
  if (
    latestAssessmentResult.status === 'complete'
    && (
      latestAssessmentSignalCount > 0
      || (isPackageContractV2Result(latestAssessmentResult) && hasUserFacingV2Summary(latestAssessmentResult))
      || isHybridMvpReadyResult(latestAssessmentResult)
      || hasReadyArtifact
      || latestAssignmentStatus === 'results_ready'
    )
  ) {
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

async function getLatestAssignmentStatesForUser(
  query: typeof queryDb,
  userId: string,
): Promise<AssignmentStateRow[]> {
  const result = await query<AssignmentStateRow>(
    `SELECT DISTINCT ON (ara.assessment_definition_id)
            ara.id,
            ara.status,
            ad.id AS assessment_definition_id,
            ad.key AS assessment_definition_key,
            ad.slug AS assessment_definition_slug,
            ad.name AS assessment_definition_name,
            ad.description AS assessment_definition_description,
            ad.category AS assessment_definition_category,
            ad.current_published_version_id,
            av.id AS assessment_version_id,
            av.key AS assessment_version_key,
            av.name AS assessment_version_name,
            av.total_questions,
            av.package_schema_version,
            av.is_active,
            ara.assigned_at
     FROM assessment_repository_assignments ara
     INNER JOIN assessment_definitions ad ON ad.id = ara.assessment_definition_id
     INNER JOIN assessment_versions av ON av.id = ara.assessment_version_id
     WHERE ara.target_user_id = $1
       AND ara.status <> 'cancelled'
       AND av.lifecycle_status = 'published'
     ORDER BY ara.assessment_definition_id, ara.assigned_at DESC, ara.created_at DESC`,
    [userId],
  )

  return result.rows
}

async function getLatestAssessmentForUserByDefinition(
  query: typeof queryDb,
  userId: string,
  assessmentDefinitionId: string,
): Promise<AssessmentInventoryAssessmentRow | null> {
  const result = await query<AssessmentInventoryAssessmentRow>(
    `SELECT a.id, a.user_id, a.organisation_id, a.assessment_version_id, a.status, a.started_at,
            a.completed_at, a.last_activity_at, a.progress_count, a.progress_percent,
            a.current_question_index, a.scoring_status, a.source, a.metadata_json,
            a.created_at, a.updated_at,
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
  const reportArtifactProjection = await getAssessmentResultReportArtifactSelectProjection('report_artifact_json', { queryDb: query })
  const result = await query<AssessmentResultRow>(
    `SELECT id, assessment_id, assessment_version_id, version_key, scoring_model_key, snapshot_version, status,
            result_payload, response_quality_payload, ${reportArtifactProjection}, completed_at, scored_at, created_at, updated_at
     FROM assessment_results
     WHERE assessment_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [assessmentId],
  )

  return result.rows[0] ?? null
}

async function getLatestReadyResultForUserByDefinition(
  query: typeof queryDb,
  userId: string,
  assessmentDefinitionId: string,
): Promise<AssessmentInventoryReadyResultRow | null> {
  const reportArtifactProjection = await getAssessmentResultReportArtifactSelectProjection('ar.report_artifact_json', { queryDb: query })
  const result = await query<AssessmentInventoryReadyResultRow>(
    `SELECT ar.id, ar.assessment_id, ar.assessment_version_id, ar.version_key, ar.scoring_model_key, ar.snapshot_version,
            ar.status, ar.result_payload, ar.response_quality_payload, ${reportArtifactProjection}, ar.completed_at, ar.scored_at, ar.created_at, ar.updated_at,
            a.started_at AS assessment_started_at,
            a.completed_at AS assessment_completed_at
     FROM assessment_results ar
     INNER JOIN assessments a ON a.id = ar.assessment_id
     INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
     WHERE a.user_id = $1
       AND a.organisation_id IS NULL
       AND av.assessment_definition_id = $2
       AND ar.status = 'complete'
       AND (
         EXISTS (
           SELECT 1 FROM assessment_result_signals ars WHERE ars.assessment_result_id = ar.id
         )
         OR COALESCE(ar.result_payload->>'contractVersion', '') IN ('package_contract_v2', 'hybrid_mvp_v1')
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
      return 'Your latest attempt is active. Resume from the last autosaved response to keep continuity.'
    case 'completed_processing':
      return 'The latest attempt is complete, but results are still processing. Start is withheld until the run settles.'
    case 'error':
      return 'The latest completed attempt did not produce a ready result. Please retry after processing stabilises.'
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
  const assignments = await getLatestAssignmentStatesForUser(deps.queryDb, userId)

  const context = getCurrentAssessmentRepositoryContext()
  const inventory = await Promise.all(assignments.map(async (assignment) => {
    const meta = resolveDisplayMetadata(assignment)

    const latestAssessment = await getLatestAssessmentForUserByDefinition(
      deps.queryDb,
      userId,
      assignment.assessment_definition_id,
    )

    const latestAssessmentResult = latestAssessment
      ? await getLatestResultForAssessment(deps.queryDb, latestAssessment.id)
      : null

    const latestAssessmentSignalCount = latestAssessmentResult
      ? await getSignalCountByResultId(deps.queryDb, latestAssessmentResult.id)
      : 0

    const latestReadyResult = await getLatestReadyResultForUserByDefinition(
      deps.queryDb,
      userId,
      assignment.assessment_definition_id,
    )

    const lifecycleState = resolveLifecycleState({
      latestAssessment,
      latestAssessmentResult,
      latestAssessmentSignalCount,
      latestAssignmentStatus: assignment.status,
    })
    const status = mapLifecycleToStatus(lifecycleState)
    const defaultStatusNote = meta.definition
      ? buildStatusNote(meta.definition, status)
      : undefined
    const questionCount = latestAssessment?.total_questions ?? assignment.total_questions

    const operationalDetails = meta.definition
      ? buildOperationalDetailRows(
          {
            ...meta.definition,
            questionCount,
            defaultOperationalDetails: [
              { label: 'Live version', value: `${assignment.assessment_version_name} (${assignment.assessment_version_key})` },
              ...meta.definition.defaultOperationalDetails.slice(1),
            ],
          },
          latestAssessment
            ? {
                assessmentId: meta.id,
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
        )
      : [
          { label: 'Live version', value: `${assignment.assessment_version_name} (${assignment.assessment_version_key})` },
          { label: 'Question set', value: `${questionCount} scored items` },
        ]

    const accessRows = meta.definition && meta.availability
      ? buildAccessRows(meta.definition, meta.availability, context)
      : [{ label: 'Access', value: 'Assigned to this user via Admin assessment governance.' }]

    const outputRows = meta.definition && meta.availability
      ? buildOutputRows(meta.definition, meta.availability, false)
      : [{ label: 'Output', value: 'Results appear once scoring and report generation are complete.' }]

    const item: AssessmentRepositoryItem = {
      id: meta.id,
      slug: meta.slug,
      title: meta.title,
      category: meta.category === 'team' ? 'team' : 'individual',
      description: meta.description,
      longDescription: meta.longDescription,
      status,
      lifecycleState,
      inventorySource: 'server',
      availability: {
        definitionId: assignment.assessment_definition_id,
        definitionKey: assignment.assessment_definition_key,
        definitionSlug: assignment.assessment_definition_slug,
        versionId: assignment.assessment_version_id,
        versionKey: assignment.assessment_version_key,
        versionName: assignment.assessment_version_name,
      },
      hasAdvancedOutputs: meta.hasAdvancedOutputs,
      questionCount,
      estimatedMinutes: meta.estimatedMinutes,
      progressPercent: latestAssessment && lifecycleState === 'in_progress'
        ? normaliseProgressPercent(latestAssessment.progress_percent)
        : undefined,
      startedAt: latestAssessment?.started_at ?? null,
      lastSavedAt: latestAssessment?.last_activity_at ?? null,
      completedAt: latestAssessment?.completed_at ?? latestReadyResult?.assessment_completed_at ?? null,
      resultsAvailable: lifecycleState === 'ready',
      isRetakeAllowed: lifecycleState === 'ready' ? meta.isRetakeAllowed : false,
      measures: meta.measures,
      operationalDetails,
      accessRows,
      outputRows,
      statusNote: buildStatusNoteForLifecycle(lifecycleState, defaultStatusNote),
      assessmentHref: lifecycleState === 'not_started' || lifecycleState === 'in_progress' || lifecycleState === 'ready'
        ? meta.assessmentHref
        : undefined,
      resultsHref: lifecycleState === 'ready' && meta.resultsHref
        ? `${meta.resultsHref}?definitionId=${encodeURIComponent(assignment.assessment_definition_id)}`
        : undefined,
      productOrder: meta.displayOrder,
      latestAttemptId: latestAssessment?.id ?? null,
      latestResultId: latestAssessmentResult?.id ?? latestReadyResult?.id ?? null,
      latestResultStatus: latestAssessmentResult?.status ?? latestReadyResult?.status ?? null,
    }

    return item
  }))

  return inventory
}

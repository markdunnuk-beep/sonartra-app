import type { AssessmentResultRow } from '@/lib/assessment-types'
import type { AssessmentRepositoryItem } from '@/lib/assessment/assessment-repository-types'
import { loadLiveAssessmentRepositoryInventory } from '@/lib/server/assessment-repository-inventory'
import { queryDb } from '@/lib/db'
import { buildIndividualResultsCategorySqlPredicate } from '@/lib/assessment/assessment-category-taxonomy'

export type IndividualAssessmentPrimaryAction = 'start' | 'resume' | 'view_status'

export interface IndividualAssessmentItemViewModel {
  definitionId: string
  title: string
  description: string
  assignmentState: 'assigned' | 'in_progress' | 'completed_processing' | 'results_ready' | 'failed'
  latestAttemptId: string | null
  attemptStatus: 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error'
  startedAt: string | null
  completedAt: string | null
  nextPrimaryAction: IndividualAssessmentPrimaryAction
  primaryActionHref: string | null
}

export interface IndividualResultListItemViewModel {
  resultId: string
  definitionId: string
  assessmentTitle: string
  completedAt: string | null
  readinessState: 'processing' | 'ready' | 'failed'
  summaryLabel: string
  detailHref: string
}

interface IndividualResultListRow extends AssessmentResultRow {
  definition_id: string
  definition_name: string
}

interface IndividualAreaDependencies {
  loadInventory: typeof loadLiveAssessmentRepositoryInventory
  queryDb: typeof queryDb
}

const defaultDependencies: IndividualAreaDependencies = {
  loadInventory: loadLiveAssessmentRepositoryInventory,
  queryDb,
}

function resolveAssignmentState(item: AssessmentRepositoryItem): IndividualAssessmentItemViewModel['assignmentState'] {
  switch (item.lifecycleState) {
    case 'in_progress':
      return 'in_progress'
    case 'completed_processing':
      return 'completed_processing'
    case 'ready':
      return 'results_ready'
    case 'error':
      return 'failed'
    case 'not_started':
    default:
      return 'assigned'
  }
}

function resolvePrimaryAction(item: AssessmentRepositoryItem): Pick<IndividualAssessmentItemViewModel, 'nextPrimaryAction' | 'primaryActionHref'> {
  if (item.lifecycleState === 'in_progress') {
    return { nextPrimaryAction: 'resume', primaryActionHref: item.assessmentHref ?? null }
  }

  if (item.lifecycleState === 'ready' || item.lifecycleState === 'completed_processing' || item.lifecycleState === 'error') {
    return { nextPrimaryAction: 'view_status', primaryActionHref: '/individual/results' }
  }

  return { nextPrimaryAction: 'start', primaryActionHref: item.assessmentHref ?? null }
}

export async function loadIndividualAssessmentsViewModel(
  userId: string,
  dependencies: Partial<IndividualAreaDependencies> = {},
): Promise<IndividualAssessmentItemViewModel[]> {
  const deps = { ...defaultDependencies, ...dependencies }
  const inventory = await deps.loadInventory(userId)

  return inventory
    .filter((item) => item.category === 'individual')
    .sort((a, b) => a.productOrder - b.productOrder)
    .map((item) => {
      const primaryAction = resolvePrimaryAction(item)
      return {
        definitionId: item.availability?.definitionId ?? item.slug,
        title: item.title,
        description: item.description,
        assignmentState: resolveAssignmentState(item),
        latestAttemptId: item.latestAttemptId ?? null,
        attemptStatus: item.lifecycleState ?? 'not_started',
        startedAt: item.startedAt ?? null,
        completedAt: item.completedAt ?? null,
        nextPrimaryAction: primaryAction.nextPrimaryAction,
        primaryActionHref: primaryAction.primaryActionHref,
      }
    })
}

function mapResultStatus(status: AssessmentResultRow['status']): IndividualResultListItemViewModel['readinessState'] {
  if (status === 'complete') return 'ready'
  if (status === 'failed') return 'failed'
  return 'processing'
}

export async function loadIndividualResultsViewModel(
  userId: string,
  dependencies: Partial<IndividualAreaDependencies> = {},
): Promise<IndividualResultListItemViewModel[]> {
  const deps = { ...defaultDependencies, ...dependencies }
  const result = await deps.queryDb<IndividualResultListRow>(
    `SELECT ar.id, ar.assessment_id, ar.assessment_version_id, ar.version_key, ar.scoring_model_key, ar.snapshot_version,
            ar.status, ar.result_payload, ar.response_quality_payload, ar.completed_at, ar.scored_at, ar.created_at, ar.updated_at,
            ad.id AS definition_id,
            ad.name AS definition_name
     FROM assessment_results ar
     INNER JOIN assessments a ON a.id = ar.assessment_id
     INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
     INNER JOIN assessment_definitions ad ON ad.id = av.assessment_definition_id
     WHERE a.user_id = $1
       AND a.organisation_id IS NULL
       AND (
         ${buildIndividualResultsCategorySqlPredicate('ad.category')}
       )
     ORDER BY ar.created_at DESC`,
    [userId],
  )

  return result.rows.map((row) => ({
    resultId: row.id,
    definitionId: row.definition_id,
    assessmentTitle: row.definition_name,
    completedAt: row.completed_at,
    readinessState: mapResultStatus(row.status),
    summaryLabel:
      row.status === 'complete'
        ? 'Result ready to review'
        : row.status === 'failed'
          ? 'Processing failed'
          : 'Processing in progress',
    detailHref: `/individual/results/${row.id}`,
  }))
}

export type AssessmentRepositoryCategory = 'individual' | 'team'

export type AssessmentRepositoryStatus = 'not_started' | 'in_progress' | 'processing' | 'complete' | 'error' | 'coming_soon'

export type AssessmentRepositoryLifecycleState = 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error'

export type AssessmentRepositoryScopeFilter = 'all' | 'individual' | 'team'

export type AssessmentRepositoryProgressFilter = 'all' | 'in_progress' | 'completed'

export interface AssessmentRepositoryFilterState {
  scope: AssessmentRepositoryScopeFilter
  progress: AssessmentRepositoryProgressFilter
}

export interface AssessmentRepositoryDetailRow {
  label: string
  value: string
}

export interface AssessmentRepositoryAvailabilityMeta {
  definitionId: string
  definitionKey: string
  definitionSlug: string
  versionId: string
  versionKey: string
  versionName: string
}

export interface AssessmentRepositoryItem {
  id: string
  slug: string
  title: string
  category: AssessmentRepositoryCategory
  description: string
  longDescription: string
  status: AssessmentRepositoryStatus
  hasAdvancedOutputs: boolean
  questionCount: number
  estimatedMinutes: number
  progressPercent?: number
  startedAt?: string | null
  lastSavedAt?: string | null
  completedAt?: string | null
  resultsAvailable: boolean
  isRetakeAllowed: boolean
  measures: string[]
  operationalDetails: AssessmentRepositoryDetailRow[]
  accessRows: AssessmentRepositoryDetailRow[]
  outputRows: AssessmentRepositoryDetailRow[]
  statusNote?: string
  assessmentHref?: string
  resultsHref?: string
  productOrder: number
  lifecycleState?: AssessmentRepositoryLifecycleState
  inventorySource?: 'static' | 'server'
  availability?: AssessmentRepositoryAvailabilityMeta
  latestAttemptId?: string | null
  latestResultId?: string | null
  latestResultStatus?: 'pending' | 'complete' | 'failed' | null
}

export interface AssessmentRepositorySectionModel {
  category: AssessmentRepositoryCategory
  title: string
  description: string
  note?: string
  items: AssessmentRepositoryItem[]
}

export interface AssessmentSummaryMetric {
  label: 'Ready to Start' | 'In Progress' | 'Results Ready' | 'Release Pending'
  value: string
  detail: string
}

export interface AssessmentRepositoryAction {
  label: string
  href?: string
  action: 'launch' | 'resume' | 'view_results' | 'retake'
}

export interface AssessmentPassiveState {
  label: string
  detail: string
}

export interface AssessmentActionState {
  label: string
  detail: string
}

export type AssessmentRecommendationKind =
  | 'resume_in_progress'
  | 'review_results'
  | 'launch_baseline'
  | 'launch_individual_follow_up'
  | 'launch_team_follow_up'

export interface AssessmentRepositoryRecommendation {
  kind: AssessmentRecommendationKind
  eyebrow: string
  title: string
  rationale: string
  cta: AssessmentRepositoryAction
  metadata: string[]
  itemId: string
}

export interface AssessmentFilterOption<TValue extends string> {
  value: TValue
  label: string
}

export interface AssessmentFilterGroup<TValue extends string> {
  key: 'scope' | 'progress'
  label: string
  description: string
  options: AssessmentFilterOption<TValue>[]
}

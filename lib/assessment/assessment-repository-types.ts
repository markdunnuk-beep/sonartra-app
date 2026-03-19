export type AssessmentRepositoryCategory = 'individual' | 'team'

export type AssessmentRepositoryStatus = 'not_started' | 'in_progress' | 'complete' | 'coming_soon'

export type AssessmentRepositoryFilter = 'all' | 'individual' | 'team' | 'in_progress' | 'completed'

export interface AssessmentRepositoryDetailRow {
  label: string
  value: string
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
}

export interface AssessmentRepositorySectionModel {
  category: AssessmentRepositoryCategory
  title: string
  description: string
  note?: string
  items: AssessmentRepositoryItem[]
}

export interface AssessmentSummaryMetric {
  label: 'Total Assessments' | 'In Progress' | 'Completed' | 'Team Assessments'
  value: string
  detail: string
}

export interface AssessmentRepositoryAction {
  label: string
  href?: string
  action: 'launch' | 'resume' | 'view_results' | 'retake'
}

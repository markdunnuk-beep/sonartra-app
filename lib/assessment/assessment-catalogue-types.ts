import type { AssessmentRepositoryCategory, AssessmentRepositoryDetailRow, AssessmentRepositoryItem, AssessmentRepositoryStatus } from './assessment-repository-types'

export type AssessmentReleaseState = 'live' | 'coming_soon' | 'archived'
export type AssessmentAvailabilityScope = 'all' | 'workspace' | 'role' | 'user'
export type AssessmentProgressSubjectType = 'user' | 'team'
export type AssessmentPlanRequirement = 'starter' | 'growth' | 'enterprise'
export type AssessmentRepositoryVisibilityState = 'visible' | 'hidden' | 'disabled' | 'archived'

export interface AssessmentCatalogueDefinition {
  id: string
  slug: string
  title: string
  category: AssessmentRepositoryCategory
  shortDescription: string
  longDescription: string
  measures: string[]
  estimatedMinutes: number
  questionCount: number
  hasAdvancedOutputs: boolean
  defaultAccessRows: AssessmentRepositoryDetailRow[]
  defaultOperationalDetails: AssessmentRepositoryDetailRow[]
  defaultStatusNotes: Partial<Record<AssessmentRepositoryStatus, string>>
  isRetakeAllowed: boolean
  displayOrder: number
  isPublished: boolean
  isVisibleInRepository: boolean
  releaseState: AssessmentReleaseState
  assessmentHref?: string
  resultsHref?: string
}

export interface AssessmentAvailabilityConfig {
  assessmentId: string
  availabilityScope: AssessmentAvailabilityScope
  allowedWorkspaceIds: string[]
  allowedUserIds: string[]
  allowedRoles: string[]
  isEnabled: boolean
  isHidden: boolean
  advancedOutputsPlanRequirement?: AssessmentPlanRequirement
  fullAccessPlanRequirement?: AssessmentPlanRequirement
}

export interface AssessmentProgressState {
  assessmentId: string
  subjectType: AssessmentProgressSubjectType
  subjectId: string
  hasActiveAttempt: boolean
  progressPercent: number
  startedAt: string | null
  lastSavedAt: string | null
  hasCompletedResult: boolean
  completedAt: string | null
  latestResultId: string | null
  latestAttemptId: string | null
  resultsAvailable: boolean
}

export interface AssessmentRepositoryContext {
  currentUserId: string
  currentWorkspaceId: string
  currentRole: string
  currentPlan: AssessmentPlanRequirement
  currentTeamIds: string[]
}

export interface AssessmentCatalogueSnapshot {
  definitions: AssessmentCatalogueDefinition[]
  availability: AssessmentAvailabilityConfig[]
  progress: AssessmentProgressState[]
}

export interface DerivedAssessmentRepositoryItem extends AssessmentRepositoryItem {
  definitionId: string
  releaseState: AssessmentReleaseState
  visibilityState: AssessmentRepositoryVisibilityState
  isPublished: boolean
  isVisibleInRepository: boolean
  availabilityScope: AssessmentAvailabilityScope
  isEnabled: boolean
  isHidden: boolean
  fullAccessPlanRequirement?: AssessmentPlanRequirement
  advancedOutputsPlanRequirement?: AssessmentPlanRequirement
  subjectType: AssessmentProgressSubjectType
  subjectId: string
  latestResultId?: string | null
  latestAttemptId?: string | null
}

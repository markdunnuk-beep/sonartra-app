export enum AssessmentCategory {
  BehaviouralIntelligence = 'behavioural_intelligence',
  TeamDynamics = 'team_dynamics',
  OrganisationalPerformance = 'organisational_performance',
}

export enum AssessmentStatus {
  Active = 'active',
  Maintenance = 'maintenance',
  Retired = 'retired',
}

export enum AssessmentVersionStatus {
  Draft = 'draft',
  InReview = 'in_review',
  Validated = 'validated',
  Live = 'live',
  Archived = 'archived',
}

export enum PublishStatus {
  Unpublished = 'unpublished',
  Scheduled = 'scheduled',
  Published = 'published',
  Paused = 'paused',
  RolledBack = 'rolled_back',
}

export enum PublishTargetType {
  Global = 'global',
  Organisation = 'organisation',
  Plan = 'plan',
}

export interface PublishTarget {
  type: PublishTargetType
  organisationId?: string
  organisationPlan?: string
  description: string
}

export interface ActorMetadata {
  userId: string
  displayName: string
}

export interface Assessment {
  id: string
  key: string
  slug: string
  title: string
  description: string
  category: AssessmentCategory
  status: AssessmentStatus
  ownerUserId: string
  currentLiveVersionId: string | null
  enabledOrganisationIds: string[]
  createdAt: string
  updatedAt: string
}

export interface AssessmentVersion {
  id: string
  assessmentId: string
  versionNumber: string
  status: AssessmentVersionStatus
  publishStatus: PublishStatus
  changelogSummary: string
  questionCount: number
  scoringModelVersion: string
  outputModelVersion: string
  validationSummary: {
    ruleErrors: number
    ruleWarnings: number
    previewReady: boolean
  }
  publishTarget: PublishTarget
  createdBy: ActorMetadata
  updatedBy: ActorMetadata
  publishedBy: ActorMetadata | null
  createdAt: string
  updatedAt: string
  submittedForReviewAt: string | null
  validatedAt: string | null
  publishedAt: string | null
  archivedAt: string | null
}

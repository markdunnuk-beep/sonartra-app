import { assessmentAvailabilityConfig } from './assessment-availability-config'
import { assessmentCatalogueDefinitions } from './assessment-catalogue-config'
import {
  type AssessmentAvailabilityConfig,
  type AssessmentCatalogueDefinition,
  type AssessmentCatalogueSnapshot,
  type AssessmentProgressState,
  type AssessmentRepositoryContext,
  type AssessmentRepositoryVisibilityState,
  type DerivedAssessmentRepositoryItem,
} from './assessment-catalogue-types'
import { getCurrentAssessmentRepositoryContext } from './assessment-repository-context'
import { assessmentProgressState } from './assessment-progress-state'
import type {
  AssessmentFilterGroup,
  AssessmentPassiveState,
  AssessmentRepositoryAction,
  AssessmentRepositoryDetailRow,
  AssessmentRepositoryFilter,
  AssessmentRepositoryItem,
  AssessmentRepositorySectionModel,
  AssessmentRepositoryStatus,
  AssessmentSummaryMetric,
} from './assessment-repository-types'

const STATUS_ORDER: Record<AssessmentRepositoryStatus, number> = {
  in_progress: 0,
  not_started: 1,
  complete: 2,
  coming_soon: 3,
}

const PLAN_ORDER = {
  starter: 0,
  growth: 1,
  enterprise: 2,
} as const

function cloneRows(rows: AssessmentRepositoryDetailRow[]): AssessmentRepositoryDetailRow[] {
  return rows.map((row) => ({ ...row }))
}

function planMeetsRequirement(context: AssessmentRepositoryContext, requiredPlan?: keyof typeof PLAN_ORDER): boolean {
  if (!requiredPlan) {
    return true
  }

  return PLAN_ORDER[context.currentPlan] >= PLAN_ORDER[requiredPlan]
}

function matchesAvailabilityScope(config: AssessmentAvailabilityConfig, context: AssessmentRepositoryContext): boolean {
  switch (config.availabilityScope) {
    case 'workspace':
      return config.allowedWorkspaceIds.includes(context.currentWorkspaceId)
    case 'role':
      return config.allowedRoles.includes(context.currentRole)
    case 'user':
      return config.allowedUserIds.includes(context.currentUserId)
    case 'all':
    default:
      return true
  }
}

function resolveProgressState(definition: AssessmentCatalogueDefinition, context: AssessmentRepositoryContext, progress: AssessmentProgressState[]): AssessmentProgressState | null {
  const expectedSubjectType = definition.category === 'team' ? 'team' : 'user'
  const validSubjectIds = expectedSubjectType === 'team' ? context.currentTeamIds : [context.currentUserId]

  return progress.find(
    (entry) =>
      entry.assessmentId === definition.id &&
      entry.subjectType === expectedSubjectType &&
      validSubjectIds.includes(entry.subjectId),
  ) ?? null
}

export function resolveRepositoryItemStatus(progress: Pick<AssessmentProgressState, 'hasActiveAttempt' | 'hasCompletedResult'> | null, definition: Pick<AssessmentCatalogueDefinition, 'releaseState'>): AssessmentRepositoryStatus {
  if (definition.releaseState === 'coming_soon') {
    return 'coming_soon'
  }

  if (progress?.hasActiveAttempt) {
    return 'in_progress'
  }

  if (progress?.hasCompletedResult) {
    return 'complete'
  }

  return 'not_started'
}

export function resolveRepositoryVisibilityState(definition: Pick<AssessmentCatalogueDefinition, 'isPublished' | 'isVisibleInRepository' | 'releaseState'>, availability: Pick<AssessmentAvailabilityConfig, 'isEnabled' | 'isHidden'>): AssessmentRepositoryVisibilityState {
  if (definition.releaseState === 'archived') {
    return 'archived'
  }

  if (!availability.isEnabled || !definition.isPublished) {
    return 'disabled'
  }

  if (availability.isHidden || !definition.isVisibleInRepository) {
    return 'hidden'
  }

  return 'visible'
}

export function createAssessmentCatalogueSnapshot(): AssessmentCatalogueSnapshot {
  return {
    definitions: assessmentCatalogueDefinitions,
    availability: assessmentAvailabilityConfig,
    progress: assessmentProgressState,
  }
}

export function getVisibleAssessmentDefinitions(
  context: AssessmentRepositoryContext = getCurrentAssessmentRepositoryContext(),
  snapshot: AssessmentCatalogueSnapshot = createAssessmentCatalogueSnapshot(),
): AssessmentCatalogueDefinition[] {
  return snapshot.definitions.filter((definition) => {
    const availability = snapshot.availability.find((entry) => entry.assessmentId === definition.id)

    if (!availability) {
      return false
    }

    const visibilityState = resolveRepositoryVisibilityState(definition, availability)
    if (visibilityState !== 'visible') {
      return false
    }

    if (!matchesAvailabilityScope(availability, context)) {
      return false
    }

    return planMeetsRequirement(context, availability.fullAccessPlanRequirement)
  })
}

export function deriveAssessmentRepositoryItem(
  definition: AssessmentCatalogueDefinition,
  availability: AssessmentAvailabilityConfig,
  progress: AssessmentProgressState | null,
  context: AssessmentRepositoryContext,
): DerivedAssessmentRepositoryItem {
  const status = resolveRepositoryItemStatus(progress, definition)
  const visibilityState = resolveRepositoryVisibilityState(definition, availability)
  const advancedOutputsUnlocked = definition.hasAdvancedOutputs && planMeetsRequirement(context, availability.advancedOutputsPlanRequirement)
  const subjectType = definition.category === 'team' ? 'team' : 'user'
  const subjectId = progress?.subjectId ?? (subjectType === 'team' ? context.currentTeamIds[0] ?? context.currentWorkspaceId : context.currentUserId)

  return {
    id: definition.id,
    definitionId: definition.id,
    slug: definition.slug,
    title: definition.title,
    category: definition.category,
    description: definition.shortDescription,
    longDescription: definition.longDescription,
    status,
    hasAdvancedOutputs: definition.hasAdvancedOutputs,
    questionCount: definition.questionCount,
    estimatedMinutes: definition.estimatedMinutes,
    progressPercent: progress?.hasActiveAttempt ? progress.progressPercent : undefined,
    startedAt: progress?.startedAt ?? null,
    lastSavedAt: progress?.lastSavedAt ?? null,
    completedAt: progress?.completedAt ?? null,
    resultsAvailable: progress?.resultsAvailable ?? false,
    isRetakeAllowed: definition.isRetakeAllowed,
    measures: [...definition.measures],
    operationalDetails: buildOperationalDetailRows(definition, progress, status),
    accessRows: buildAccessRows(definition, availability, context),
    outputRows: buildOutputRows(definition, availability, advancedOutputsUnlocked),
    statusNote: buildStatusNote(definition, status),
    assessmentHref: status === 'coming_soon' ? undefined : definition.assessmentHref,
    resultsHref: progress?.resultsAvailable ? definition.resultsHref : definition.resultsHref,
    productOrder: definition.displayOrder,
    releaseState: definition.releaseState,
    visibilityState,
    isPublished: definition.isPublished,
    isVisibleInRepository: definition.isVisibleInRepository,
    availabilityScope: availability.availabilityScope,
    isEnabled: availability.isEnabled,
    isHidden: availability.isHidden,
    fullAccessPlanRequirement: availability.fullAccessPlanRequirement,
    advancedOutputsPlanRequirement: availability.advancedOutputsPlanRequirement,
    subjectType,
    subjectId,
    latestResultId: progress?.latestResultId ?? null,
    latestAttemptId: progress?.latestAttemptId ?? null,
  }
}

export function getAssessmentRepositoryInventory(
  context: AssessmentRepositoryContext = getCurrentAssessmentRepositoryContext(),
  snapshot: AssessmentCatalogueSnapshot = createAssessmentCatalogueSnapshot(),
): DerivedAssessmentRepositoryItem[] {
  return getVisibleAssessmentDefinitions(context, snapshot)
    .map((definition) => {
      const availability = snapshot.availability.find((entry) => entry.assessmentId === definition.id)
      if (!availability) {
        return null
      }

      const progress = resolveProgressState(definition, context, snapshot.progress)
      return deriveAssessmentRepositoryItem(definition, availability, progress, context)
    })
    .filter((item): item is DerivedAssessmentRepositoryItem => item !== null)
}

export function sortAssessments(items: AssessmentRepositoryItem[]): AssessmentRepositoryItem[] {
  return [...items].sort((left, right) => {
    const statusDelta = STATUS_ORDER[left.status] - STATUS_ORDER[right.status]

    if (statusDelta !== 0) {
      return statusDelta
    }

    return left.productOrder - right.productOrder
  })
}

export function buildAssessmentSummaryMetrics(items: AssessmentRepositoryItem[]): AssessmentSummaryMetric[] {
  const readyToStart = items.filter((item) => item.status === 'not_started').length
  const inProgress = items.filter((item) => item.status === 'in_progress').length
  const resultsReady = items.filter((item) => item.status === 'complete').length
  const releasePending = items.filter((item) => item.status === 'coming_soon').length

  return [
    {
      label: 'Ready to Start',
      value: String(readyToStart),
      detail: 'Live assessments with launch access and no active attempt.',
    },
    {
      label: 'In Progress',
      value: String(inProgress),
      detail: 'Active attempts with saved progress available to resume.',
    },
    {
      label: 'Results Ready',
      value: String(resultsReady),
      detail: 'Latest completed assessments with results available now.',
    },
    {
      label: 'Release Pending',
      value: String(releasePending),
      detail: 'Configured diagnostics that are visible in the repository but not launchable yet.',
    },
  ]
}

export function matchesFilter(item: AssessmentRepositoryItem, filter: AssessmentRepositoryFilter): boolean {
  switch (filter) {
    case 'individual':
      return item.category === 'individual'
    case 'team':
      return item.category === 'team'
    case 'in_progress':
      return item.status === 'in_progress'
    case 'completed':
      return item.status === 'complete'
    case 'all':
    default:
      return true
  }
}

export function getRepositoryItemsByCategory(items: AssessmentRepositoryItem[], category: AssessmentRepositorySectionModel['category']): AssessmentRepositoryItem[] {
  return sortAssessments(items.filter((item) => item.category === category))
}

export function buildAssessmentSections(items: AssessmentRepositoryItem[], filter: AssessmentRepositoryFilter): AssessmentRepositorySectionModel[] {
  const individualItems = getRepositoryItemsByCategory(items, 'individual').filter((item) => matchesFilter(item, filter))
  const teamItems = getRepositoryItemsByCategory(items, 'team').filter((item) => matchesFilter(item, filter))

  return [
    {
      category: 'individual' as const,
      title: 'Individual Assessments',
      description: 'Diagnostics for individual insight, behavior, and work-pattern analysis.',
      items: individualItems,
    },
    {
      category: 'team' as const,
      title: 'Team Assessments',
      description: 'Shared diagnostics for team conditions, management dynamics, and organizational signals.',
      note: 'Eligible team diagnostics include advanced organizational reporting on supported plans.',
      items: teamItems,
    },
  ].filter((section) => section.items.length > 0)
}

export function formatStatusLabel(status: AssessmentRepositoryStatus): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress'
    case 'complete':
      return 'Complete'
    case 'coming_soon':
      return 'Coming Soon'
    case 'not_started':
    default:
      return 'Not Started'
  }
}

export function getCollapsedMetadata(item: AssessmentRepositoryItem): string[] {
  const base = [item.category === 'team' ? 'Team diagnostic' : 'Individual diagnostic', `${item.questionCount} questions`, `${item.estimatedMinutes} min`]

  if (item.status === 'in_progress' && typeof item.progressPercent === 'number') {
    return [...base, `${item.progressPercent}% complete`]
  }

  if (item.status === 'complete' && item.resultsAvailable) {
    return [...base, 'Results ready']
  }

  if (item.status === 'coming_soon') {
    return [...base, 'Release pending']
  }

  return base
}

export function getCollapsedAction(item: AssessmentRepositoryItem): AssessmentRepositoryAction | null {
  switch (item.status) {
    case 'not_started':
      return item.assessmentHref ? { label: 'Start', href: item.assessmentHref, action: 'launch' } : null
    case 'in_progress':
      return item.assessmentHref ? { label: 'Resume', href: item.assessmentHref, action: 'resume' } : null
    case 'complete':
      return item.resultsHref ? { label: 'View Results', href: item.resultsHref, action: 'view_results' } : null
    case 'coming_soon':
    default:
      return null
  }
}

export function getExpandedActions(item: AssessmentRepositoryItem): AssessmentRepositoryAction[] {
  switch (item.status) {
    case 'not_started':
      return item.assessmentHref ? [{ label: 'Start Assessment', href: item.assessmentHref, action: 'launch' }] : []
    case 'in_progress':
      return item.assessmentHref ? [{ label: 'Resume Assessment', href: item.assessmentHref, action: 'resume' }] : []
    case 'complete': {
      const actions: AssessmentRepositoryAction[] = []

      if (item.resultsHref) {
        actions.push({ label: 'View Results', href: item.resultsHref, action: 'view_results' })
      }

      if (item.isRetakeAllowed && item.assessmentHref) {
        actions.push({ label: 'Retake Assessment', href: item.assessmentHref, action: 'retake' })
      }

      return actions.slice(0, 2)
    }
    case 'coming_soon':
    default:
      return []
  }
}

export function getPassiveState(item: AssessmentRepositoryItem): AssessmentPassiveState | null {
  if (item.status === 'coming_soon') {
    return {
      label: 'Release pending',
      detail: 'This assessment is visible for planning, but launch stays locked until release readiness is confirmed.',
    }
  }

  if (!getCollapsedAction(item) && getExpandedActions(item).length === 0) {
    return {
      label: 'Unavailable',
      detail: 'This assessment is not actionable in the current repository state.',
    }
  }

  return null
}

export function getAssessmentFilterGroups(): AssessmentFilterGroup[] {
  return [
    {
      label: 'Repository scope',
      description: 'Browse the full inventory or focus on a catalogue grouping.',
      options: [
        { value: 'all', label: 'All assessments' },
        { value: 'individual', label: 'Individual' },
        { value: 'team', label: 'Team' },
      ],
    },
    {
      label: 'Progress state',
      description: 'Surface assessments that already need follow-up.',
      options: [
        { value: 'in_progress', label: 'In progress' },
        { value: 'completed', label: 'Results ready' },
      ],
    },
  ]
}

export function buildOperationalDetailRows(
  definition: AssessmentCatalogueDefinition,
  progress: AssessmentProgressState | null,
  status: AssessmentRepositoryStatus,
): AssessmentRepositoryDetailRow[] {
  const rows = cloneRows(definition.defaultOperationalDetails)

  if (status === 'in_progress' && progress?.hasActiveAttempt) {
    return rows.map((row) =>
      row.label === 'Typical runtime'
        ? { label: 'Current progress', value: `${progress.progressPercent}% complete with autosave on latest response set` }
        : row,
    )
  }

  return rows
}

export function buildAccessRows(
  definition: AssessmentCatalogueDefinition,
  availability: AssessmentAvailabilityConfig,
  context: AssessmentRepositoryContext,
): AssessmentRepositoryDetailRow[] {
  const rows = cloneRows(definition.defaultAccessRows)

  if (availability.fullAccessPlanRequirement && !planMeetsRequirement(context, availability.fullAccessPlanRequirement)) {
    rows.unshift({ label: 'Plan requirement', value: `${availability.fullAccessPlanRequirement} plan required for launch access` })
  }

  return rows
}

export function buildOutputRows(
  definition: AssessmentCatalogueDefinition,
  availability: AssessmentAvailabilityConfig,
  advancedOutputsUnlocked: boolean,
): AssessmentRepositoryDetailRow[] {
  const rows: AssessmentRepositoryDetailRow[] = []

  if (definition.category === 'individual') {
    rows.push(
      { label: 'Outputs', value: definition.id === 'signals' ? 'Individual results snapshot with narrative, domain interpretation, and signal distribution' : 'Assessment-specific summary and recommended focus areas after completion' },
      { label: definition.id === 'signals' ? 'Availability' : 'Exports', value: definition.id === 'signals' ? 'Latest completed snapshot is available immediately after submission' : 'Results summary can be reviewed in-platform after completion' },
    )

    if (definition.id === 'burnout-risk') {
      return [
        { label: 'Outputs', value: 'Risk tiering, pressure drivers, and recovery recommendations' },
        { label: 'Sharing', value: 'Results can be reviewed privately unless manager sharing is enabled' },
      ]
    }

    if (definition.id === 'conflict-style') {
      return [
        { label: 'Outputs', value: 'Conflict pattern readout with practical de-escalation guidance' },
        { label: 'Usage', value: 'Supports coaching conversations and manager review sessions' },
      ]
    }

    if (definition.releaseState === 'coming_soon') {
      return [
        { label: 'Outputs', value: 'Decision operating profile and evidence-use interpretation' },
        { label: 'Availability', value: 'Results will surface in-platform after release and completion' },
      ]
    }

    return rows
  }

  const teamOutputsById: Record<string, AssessmentRepositoryDetailRow[]> = {
    'team-dynamics': [
      { label: 'Outputs', value: 'Team condition summary, participation metrics, and flagged operating risks' },
      { label: 'Reporting tier', value: advancedOutputsUnlocked ? 'Includes comparative team patterning and manager-ready reporting on supported plans' : 'Advanced organizational reporting unlocks on supported plans' },
    ],
    'team-alignment': [
      { label: 'Outputs', value: 'Alignment heatmap, participation summary, and action-focused findings' },
      { label: 'Review mode', value: 'Results are reviewed at the team workspace level after collection closes' },
    ],
    'manager-effectiveness': [
      { label: 'Outputs', value: 'Manager effectiveness readout with priority themes and response distribution' },
      { label: 'Reporting tier', value: advancedOutputsUnlocked ? 'Includes cohort comparisons and expanded reporting on supported plans' : 'Advanced organizational reporting unlocks on supported plans' },
    ],
    'culture-risk': [
      { label: 'Outputs', value: 'Risk-pattern summary, intervention cues, and organisational reporting' },
      { label: 'Reporting tier', value: advancedOutputsUnlocked ? 'Includes advanced organisational reporting on supported plans' : 'Advanced organizational reporting unlocks on supported plans' },
    ],
    'decision-friction-mapping': [
      { label: 'Outputs', value: 'Decision bottleneck analysis and operating cadence findings' },
      { label: 'Availability', value: 'Outputs will publish after the instrument is released and completed' },
    ],
  }

  const configuredRows = teamOutputsById[definition.id]
  if (configuredRows) {
    return configuredRows
  }

  return rows
}

export function buildStatusNote(definition: AssessmentCatalogueDefinition, status: AssessmentRepositoryStatus): string | undefined {
  return definition.defaultStatusNotes[status]
}

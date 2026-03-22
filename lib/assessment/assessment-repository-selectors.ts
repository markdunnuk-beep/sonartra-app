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
  AssessmentActionState,
  AssessmentFilterGroup,
  AssessmentPassiveState,
  AssessmentRepositoryAction,
  AssessmentRepositoryDetailRow,
  AssessmentRepositoryFilterState,
  AssessmentRepositoryItem,
  AssessmentRepositoryProgressFilter,
  AssessmentRepositoryRecommendation,
  AssessmentRepositoryScopeFilter,
  AssessmentRepositorySectionModel,
  AssessmentRepositoryStatus,
  AssessmentSummaryMetric,
} from './assessment-repository-types'

const STATUS_ORDER: Record<AssessmentRepositoryStatus, number> = {
  in_progress: 0,
  processing: 1,
  not_started: 2,
  complete: 3,
  error: 4,
  coming_soon: 5,
}

const PLAN_ORDER = {
  starter: 0,
  growth: 1,
  enterprise: 2,
} as const

const BASELINE_ASSESSMENT_ID = 'signals'
const RECOMMENDATION_EYEBROW = 'Recommended next action'
const RECOMMENDATION_PRIORITY_BY_KIND: Record<AssessmentRepositoryRecommendation['kind'], number> = {
  resume_in_progress: 0,
  review_results: 1,
  launch_baseline: 2,
  launch_individual_follow_up: 3,
  launch_team_follow_up: 4,
}

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
  const resultsReady = items.filter((item) => item.resultsAvailable || item.lifecycleState === 'ready').length
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

export function matchesScopeFilter(item: AssessmentRepositoryItem, filter: AssessmentRepositoryScopeFilter): boolean {
  switch (filter) {
    case 'individual':
      return item.category === 'individual'
    case 'team':
      return item.category === 'team'
    case 'all':
    default:
      return true
  }
}

export function matchesProgressFilter(item: AssessmentRepositoryItem, filter: AssessmentRepositoryProgressFilter): boolean {
  switch (filter) {
    case 'in_progress':
      return item.status === 'in_progress'
    case 'completed':
      return item.resultsAvailable || item.lifecycleState === 'ready'
    case 'all':
    default:
      return true
  }
}

export function matchesFilter(item: AssessmentRepositoryItem, filter: AssessmentRepositoryFilterState): boolean {
  return matchesScopeFilter(item, filter.scope) && matchesProgressFilter(item, filter.progress)
}

export function getRepositoryItemsByCategory(items: AssessmentRepositoryItem[], category: AssessmentRepositorySectionModel['category']): AssessmentRepositoryItem[] {
  return sortAssessments(items.filter((item) => item.category === category))
}

export function buildAssessmentSections(items: AssessmentRepositoryItem[], filter: AssessmentRepositoryFilterState): AssessmentRepositorySectionModel[] {
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

export function formatStatusLabel(status: AssessmentRepositoryStatus, lifecycleState?: AssessmentRepositoryItem['lifecycleState']): string {
  switch (status) {
    case 'in_progress':
      return 'In Progress'
    case 'processing':
      return lifecycleState === 'completed_processing' ? 'Processing' : 'Processing'
    case 'complete':
      return lifecycleState === 'ready' ? 'Results Ready' : 'Complete'
    case 'error':
      return 'Attention Needed'
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

  if (item.status === 'processing') {
    return [...base, 'Results processing']
  }

  if (item.status === 'complete' && item.resultsAvailable) {
    return [...base, 'Results ready']
  }

  if (item.status === 'error') {
    return [...base, 'Follow-up needed']
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
    case 'processing':
    case 'error':
      return null
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
    case 'processing':
    case 'error':
      return []
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
  if (item.status === 'processing') {
    return {
      label: 'Results processing',
      detail: 'Your latest completed attempt is still being scored. Results will appear here once processing finishes.',
    }
  }

  if (item.status === 'error') {
    return {
      label: 'Processing issue',
      detail: 'The latest completed attempt could not be turned into a ready result yet. Please try again shortly.',
    }
  }

  if (item.status === 'coming_soon') {
    return {
      label: 'Release pending',
      detail: 'Visible for planning only until release readiness is confirmed.',
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

export function getActionState(item: AssessmentRepositoryItem): AssessmentActionState | null {
  switch (item.status) {
    case 'not_started':
      return {
        label: 'Launch now',
        detail: 'Begin a new run from the assessment workspace.',
      }
    case 'in_progress':
      return {
        label: 'Resume now',
        detail: 'Continue from the latest autosaved response set.',
      }
    case 'processing':
    case 'error':
      return null
    case 'complete':
      return {
        label: 'Results ready',
        detail: 'Open the latest completed snapshot and interpretation.',
      }
    case 'coming_soon':
    default:
      return null
  }
}


function isActionableLaunchCandidate(item: AssessmentRepositoryItem): boolean {
  return item.status === 'not_started' && Boolean(item.assessmentHref)
}

function isActionableResultsCandidate(item: AssessmentRepositoryItem): boolean {
  return item.status === 'complete' && item.resultsAvailable && Boolean(item.resultsHref)
}

function getOperationalMetadata(item: AssessmentRepositoryItem): string[] {
  const metadata = [item.category === 'team' ? 'Team diagnostic' : 'Individual diagnostic', `${item.estimatedMinutes} min`, formatStatusLabel(item.status, item.lifecycleState)]

  if (item.status === 'in_progress' && typeof item.progressPercent === 'number') {
    return [metadata[0], `${item.progressPercent}% complete`, metadata[1]]
  }

  return metadata
}

function compareRecommendationPriority(left: AssessmentRepositoryRecommendation, right: AssessmentRepositoryRecommendation): number {
  const kindDelta = RECOMMENDATION_PRIORITY_BY_KIND[left.kind] - RECOMMENDATION_PRIORITY_BY_KIND[right.kind]

  if (kindDelta !== 0) {
    return kindDelta
  }

  return 0
}

function createRecommendationFromItem(item: AssessmentRepositoryItem, recommendation: Omit<AssessmentRepositoryRecommendation, 'itemId' | 'metadata'>): AssessmentRepositoryRecommendation {
  return {
    ...recommendation,
    itemId: item.id,
    metadata: getOperationalMetadata(item),
  }
}

function getProgressionLaunchCandidates(items: AssessmentRepositoryItem[]): AssessmentRepositoryItem[] {
  return sortAssessments(items.filter((item) => isActionableLaunchCandidate(item) && item.status !== 'coming_soon'))
}

export function getAssessmentRepositoryRecommendation(items: AssessmentRepositoryItem[]): AssessmentRepositoryRecommendation | null {
  if (items.length === 0) {
    return null
  }

  const actionableInventory = sortAssessments(items.filter((item) => item.status !== 'coming_soon'))

  const inProgressCandidates = actionableInventory.filter((item) => item.status === 'in_progress' && Boolean(item.assessmentHref))
  if (inProgressCandidates.length > 0) {
    const item = inProgressCandidates[0]

    return createRecommendationFromItem(item, {
      kind: 'resume_in_progress',
      eyebrow: RECOMMENDATION_EYEBROW,
      title: `Continue ${item.title}`,
      rationale: 'You already have an active attempt in progress. Finishing the current diagnostic preserves continuity before opening another assessment track.',
      cta: { label: 'Resume Assessment', href: item.assessmentHref, action: 'resume' },
    })
  }

  const baselineItem = actionableInventory.find((item) => item.id === BASELINE_ASSESSMENT_ID)
  if (baselineItem && isActionableResultsCandidate(baselineItem)) {
    return createRecommendationFromItem(baselineItem, {
      kind: 'review_results',
      eyebrow: RECOMMENDATION_EYEBROW,
      title: `Review ${baselineItem.title} results`,
      rationale: 'The baseline diagnostic is complete and ready for interpretation. Reviewing those results first provides the clearest reference point for any follow-on assessment.',
      cta: { label: 'View Results', href: baselineItem.resultsHref, action: 'view_results' },
    })
  }

  const launchCandidates = getProgressionLaunchCandidates(actionableInventory)
  if (launchCandidates.length === 0) {
    return null
  }

  const launchRecommendationCandidates = launchCandidates.map((item): AssessmentRepositoryRecommendation => {
    if (item.id === BASELINE_ASSESSMENT_ID) {
      return createRecommendationFromItem(item, {
        kind: 'launch_baseline',
        eyebrow: RECOMMENDATION_EYEBROW,
        title: `Start ${item.title}`,
        rationale: 'This is the baseline individual diagnostic for the repository. Completing it establishes the reference profile used to sequence deeper individual and team diagnostics.',
        cta: { label: 'Start Assessment', href: item.assessmentHref, action: 'launch' },
      })
    }

    if (item.category === 'individual') {
      return createRecommendationFromItem(item, {
        kind: 'launch_individual_follow_up',
        eyebrow: RECOMMENDATION_EYEBROW,
        title: `Start ${item.title}`,
        rationale: 'Baseline coverage is already established, so the next best step is to deepen individual-level insight before moving into broader team conditions.',
        cta: { label: 'Start Assessment', href: item.assessmentHref, action: 'launch' },
      })
    }

    return createRecommendationFromItem(item, {
      kind: 'launch_team_follow_up',
      eyebrow: RECOMMENDATION_EYEBROW,
      title: `Launch ${item.title}`,
      rationale: 'Individual-level context is in place, making this the strongest next team-level diagnostic to extend visibility into shared operating conditions.',
      cta: { label: 'Launch Assessment', href: item.assessmentHref, action: 'launch' },
    })
  })

  return launchRecommendationCandidates.sort(compareRecommendationPriority)[0] ?? null
}

export function getAssessmentFilterGroups(): [AssessmentFilterGroup<AssessmentRepositoryScopeFilter>, AssessmentFilterGroup<AssessmentRepositoryProgressFilter>] {
  return [
    {
      key: 'scope',
      label: 'Repository scope',
      description: 'Browse the full inventory or focus on a catalogue grouping.',
      options: [
        { value: 'all', label: 'All assessments' },
        { value: 'individual', label: 'Individual' },
        { value: 'team', label: 'Team' },
      ],
    },
    {
      key: 'progress',
      label: 'Progress state',
      description: 'Narrow to assessments that already need follow-up.',
      options: [
        { value: 'all', label: 'Any status' },
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
      { label: 'Reporting scope', value: advancedOutputsUnlocked ? 'Includes comparative team patterning and manager-ready reporting on supported plans' : 'Advanced organizational reporting unlocks on supported plans' },
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

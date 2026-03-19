import { assessmentRepositoryMockData } from './assessment-repository-mock-data'
import type {
  AssessmentRepositoryAction,
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

export function getAssessmentRepositoryInventory(): AssessmentRepositoryItem[] {
  return assessmentRepositoryMockData.map((item) => ({
    ...item,
    operationalDetails: [...item.operationalDetails],
    accessRows: [...item.accessRows],
    outputRows: [...item.outputRows],
    measures: [...item.measures],
  }))
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
  const totalAssessments = items.length
  const inProgress = items.filter((item) => item.status === 'in_progress').length
  const completed = items.filter((item) => item.status === 'complete').length
  const teamAssessments = items.filter((item) => item.category === 'team').length

  return [
    {
      label: 'Total Assessments',
      value: String(totalAssessments),
      detail: 'Combined repository across individual and team workflows.',
    },
    {
      label: 'In Progress',
      value: String(inProgress),
      detail: 'Active attempts currently underway.',
    },
    {
      label: 'Completed',
      value: String(completed),
      detail: 'Assessments with a completed latest state.',
    },
    {
      label: 'Team Assessments',
      value: String(teamAssessments),
      detail: 'Shared diagnostics for managers and teams.',
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

export function buildAssessmentSections(items: AssessmentRepositoryItem[], filter: AssessmentRepositoryFilter): AssessmentRepositorySectionModel[] {
  const individualItems = sortAssessments(items.filter((item) => item.category === 'individual' && matchesFilter(item, filter)))
  const teamItems = sortAssessments(items.filter((item) => item.category === 'team' && matchesFilter(item, filter)))

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
      note: 'Includes advanced organizational outputs on eligible plans.',
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
  const base = [`${item.questionCount} questions`, `${item.estimatedMinutes} min`]

  if (item.status === 'in_progress' && typeof item.progressPercent === 'number') {
    return [...base, `${item.progressPercent}% complete`]
  }

  if (item.status === 'complete' && item.resultsAvailable) {
    return [...base, 'Latest snapshot available']
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

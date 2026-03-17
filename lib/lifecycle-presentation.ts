import { IndividualLifecycleState } from '@/lib/server/assessment-readiness'

export interface LifecyclePresentation {
  dashboardStatusLabel: string
  dashboardActionLabel: string | null
  dashboardActionHref: string | null
  dashboardDetailTitle: string
  dashboardDetailBody: string
  dashboardDetailMetaLabel: string
  dashboardDetailFootnote: string
}

const lifecyclePresentationMap: Record<IndividualLifecycleState, LifecyclePresentation> = {
  not_started: {
    dashboardStatusLabel: 'Not started',
    dashboardActionLabel: 'Start assessment',
    dashboardActionHref: '/assessment',
    dashboardDetailTitle: 'Assessment not started',
    dashboardDetailBody: 'Complete the assessment to unlock Individual Results.',
    dashboardDetailMetaLabel: 'Assessment status',
    dashboardDetailFootnote: 'Complete the assessment to unlock behavioural, leadership, and operating insights.',
  },
  in_progress: {
    dashboardStatusLabel: 'In progress',
    dashboardActionLabel: 'Resume assessment',
    dashboardActionHref: '/assessment',
    dashboardDetailTitle: 'Assessment in progress',
    dashboardDetailBody: 'Continue the assessment to complete your profile.',
    dashboardDetailMetaLabel: 'Live status',
    dashboardDetailFootnote: 'Continue assessment to unlock behavioural, leadership, and operating insights.',
  },
  completed_processing: {
    dashboardStatusLabel: 'Completed — results pending',
    dashboardActionLabel: null,
    dashboardActionHref: null,
    dashboardDetailTitle: 'Assessment completed',
    dashboardDetailBody: 'Your responses have been recorded. Results are not available yet.',
    dashboardDetailMetaLabel: 'Processing',
    dashboardDetailFootnote: 'Check back shortly while Individual Results are prepared from your completed responses.',
  },
  ready: {
    dashboardStatusLabel: 'Results available',
    dashboardActionLabel: 'View Individual Results',
    dashboardActionHref: '/results/individual',
    dashboardDetailTitle: 'Results available',
    dashboardDetailBody: 'Your latest completed profile is ready to view.',
    dashboardDetailMetaLabel: 'Latest cycle',
    dashboardDetailFootnote: 'Open Individual Results to review your latest behavioural, leadership, and operating signal profile.',
  },
  error: {
    dashboardStatusLabel: 'Results unavailable',
    dashboardActionLabel: 'Return to dashboard',
    dashboardActionHref: '/dashboard',
    dashboardDetailTitle: 'Results unavailable',
    dashboardDetailBody: 'The assessment completed, but results could not be loaded.',
    dashboardDetailMetaLabel: 'Attention required',
    dashboardDetailFootnote: 'Try again from the dashboard. If this persists, contact support.',
  },
}

export function mapLifecyclePresentation(state: IndividualLifecycleState): LifecyclePresentation {
  return lifecyclePresentationMap[state] ?? lifecyclePresentationMap.error
}

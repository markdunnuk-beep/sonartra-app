import { IndividualLifecycleState } from '@/lib/server/assessment-readiness'

export interface LifecyclePresentation {
  dashboardStatusLabel: string
  dashboardActionLabel: string | null
  dashboardActionHref: string | null
  dashboardDetailTitle: string
  dashboardDetailBody: string
  dashboardDetailMetaLabel: string
  dashboardDetailFootnote: string
  assessmentEyebrow: string
  assessmentTitle: string
  assessmentBody: string
  assessmentPrimaryActionLabel: string
  assessmentPrimaryActionHref: string | null
  assessmentSecondaryActionLabel: string | null
  assessmentSecondaryActionHref: string | null
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
    assessmentEyebrow: 'Readiness',
    assessmentTitle: 'Begin your signal capture session',
    assessmentBody: '80 questions. Approximately 10–12 minutes. Structured behavioural output.',
    assessmentPrimaryActionLabel: 'Begin Assessment',
    assessmentPrimaryActionHref: null,
    assessmentSecondaryActionLabel: 'Return to Dashboard',
    assessmentSecondaryActionHref: '/dashboard',
  },
  in_progress: {
    dashboardStatusLabel: 'In progress',
    dashboardActionLabel: 'Resume assessment',
    dashboardActionHref: '/assessment',
    dashboardDetailTitle: 'Assessment in progress',
    dashboardDetailBody: 'Continue the assessment to complete your profile.',
    dashboardDetailMetaLabel: 'Live status',
    dashboardDetailFootnote: 'Continue assessment to unlock behavioural, leadership, and operating insights.',
    assessmentEyebrow: 'In progress',
    assessmentTitle: 'Resume your signal capture session',
    assessmentBody: 'Your latest assessment is still in progress. Resume from the latest saved point to complete the capture.',
    assessmentPrimaryActionLabel: 'Resume Assessment',
    assessmentPrimaryActionHref: null,
    assessmentSecondaryActionLabel: 'Return to Dashboard',
    assessmentSecondaryActionHref: '/dashboard',
  },
  completed_processing: {
    dashboardStatusLabel: 'Completed — results pending',
    dashboardActionLabel: null,
    dashboardActionHref: null,
    dashboardDetailTitle: 'Assessment completed',
    dashboardDetailBody: 'Results are processing and will be available shortly.',
    dashboardDetailMetaLabel: 'Processing',
    dashboardDetailFootnote: 'Results are processing and will be available shortly.',
    assessmentEyebrow: 'Complete',
    assessmentTitle: 'Assessment complete',
    assessmentBody: 'Results are processing and will be available shortly.',
    assessmentPrimaryActionLabel: 'Return to Dashboard',
    assessmentPrimaryActionHref: '/dashboard',
    assessmentSecondaryActionLabel: null,
    assessmentSecondaryActionHref: null,
  },
  ready: {
    dashboardStatusLabel: 'Results available',
    dashboardActionLabel: 'View Results',
    dashboardActionHref: '/results/individual',
    dashboardDetailTitle: 'Results available',
    dashboardDetailBody: 'Your latest completed profile is ready to view.',
    dashboardDetailMetaLabel: 'Latest cycle',
    dashboardDetailFootnote: 'Open Individual Results to review your latest behavioural, leadership, and operating signal profile.',
    assessmentEyebrow: 'Complete',
    assessmentTitle: 'Assessment complete',
    assessmentBody: 'Your latest behavioural signal capture is complete.',
    assessmentPrimaryActionLabel: 'View Results',
    assessmentPrimaryActionHref: '/results/individual',
    assessmentSecondaryActionLabel: 'Return to Dashboard',
    assessmentSecondaryActionHref: '/dashboard',
  },
  error: {
    dashboardStatusLabel: 'Results unavailable',
    dashboardActionLabel: 'Return to dashboard',
    dashboardActionHref: '/dashboard',
    dashboardDetailTitle: 'Results unavailable',
    dashboardDetailBody: 'The assessment completed, but results could not be loaded.',
    dashboardDetailMetaLabel: 'Attention required',
    dashboardDetailFootnote: 'Try again from the dashboard. If this persists, contact support.',
    assessmentEyebrow: 'Status',
    assessmentTitle: 'Assessment status unavailable',
    assessmentBody: 'We could not load the latest assessment outcome. Return to the dashboard and try again shortly.',
    assessmentPrimaryActionLabel: 'Return to Dashboard',
    assessmentPrimaryActionHref: '/dashboard',
    assessmentSecondaryActionLabel: null,
    assessmentSecondaryActionHref: null,
  },
}

export function mapLifecyclePresentation(state: IndividualLifecycleState): LifecyclePresentation {
  return lifecyclePresentationMap[state] ?? lifecyclePresentationMap.error
}

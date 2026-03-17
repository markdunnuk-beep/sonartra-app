import { IndividualLifecycleState } from '@/lib/server/assessment-readiness'

export interface LifecyclePresentation {
  dashboardStatusLabel: string
  dashboardActionLabel: string
}

const lifecyclePresentationMap: Record<IndividualLifecycleState, LifecyclePresentation> = {
  not_started: {
    dashboardStatusLabel: 'Not started',
    dashboardActionLabel: 'Start assessment',
  },
  in_progress: {
    dashboardStatusLabel: 'In progress',
    dashboardActionLabel: 'Resume assessment',
  },
  completed_processing: {
    dashboardStatusLabel: 'Completed — results pending',
    dashboardActionLabel: 'Resume assessment',
  },
  ready: {
    dashboardStatusLabel: 'Results available',
    dashboardActionLabel: 'Resume assessment',
  },
  error: {
    dashboardStatusLabel: 'Results unavailable',
    dashboardActionLabel: 'Resume assessment',
  },
}

export function mapLifecyclePresentation(state: IndividualLifecycleState): LifecyclePresentation {
  return lifecyclePresentationMap[state] ?? lifecyclePresentationMap.error
}


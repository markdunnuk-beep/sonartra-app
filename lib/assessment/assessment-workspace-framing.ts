import { assessmentCatalogueDefinitions } from './assessment-catalogue-config'
import type { AssessmentRepositoryRecommendation } from './assessment-repository-types'
import type { IndividualLifecycleState } from '@/lib/server/assessment-readiness'

export type AssessmentWorkspaceEntryState =
  | 'start'
  | 'resume'
  | 'results_ready'
  | 'results_processing'
  | 'attention_required'

export interface AssessmentWorkspaceFramingDefinition {
  title?: string
  subtitle?: string
  whyItMatters?: string
  outputExpectation?: string
  measurementFocus?: string[]
  classification?: string
  helperTextByState?: Partial<Record<AssessmentWorkspaceEntryState, string>>
}

export interface AssessmentWorkspaceRecommendationCue {
  eyebrow: string
  detail: string
}

export interface AssessmentWorkspaceFramingModel {
  title: string
  subtitle: string
  whyItMatters: string
  outputExpectation: string
  measurementFocus: string[]
  classification: string
  estimatedMinutesLabel: string
  questionCountLabel: string
  currentActionLabel: string
  currentActionDetail: string
  recommendationCue: AssessmentWorkspaceRecommendationCue | null
}

const DEFAULT_CLASSIFICATION_BY_CATEGORY = {
  individual: 'Individual diagnostic',
  team: 'Team diagnostic',
} as const

const DEFAULT_STATE_DETAILS: Record<AssessmentWorkspaceEntryState, { label: string; detail: string }> = {
  start: {
    label: 'Start',
    detail: 'Begin the assessment to establish the next interpreted signal set.',
  },
  resume: {
    label: 'Resume',
    detail: 'Saved progress is available. Continue from the latest autosaved response set.',
  },
  results_ready: {
    label: 'View Results',
    detail: 'The latest completed output is available for review in the results workspace.',
  },
  results_processing: {
    label: 'Results Processing',
    detail: 'Submission is complete. Result generation is still being finalised.',
  },
  attention_required: {
    label: 'Attention Required',
    detail: 'The latest assessment state could not be resolved cleanly. Review status before taking further action.',
  },
}

export function resolveAssessmentWorkspaceEntryState(
  lifecycleState: IndividualLifecycleState,
): AssessmentWorkspaceEntryState {
  switch (lifecycleState) {
    case 'in_progress':
      return 'resume'
    case 'ready':
      return 'results_ready'
    case 'completed_processing':
      return 'results_processing'
    case 'error':
      return 'attention_required'
    case 'not_started':
    default:
      return 'start'
  }
}

function deriveFallbackWhyItMatters(shortDescription?: string, longDescription?: string): string {
  if (longDescription) {
    return longDescription
  }

  if (shortDescription) {
    return shortDescription
  }

  return 'Use this diagnostic to capture a structured operating signal that can be reviewed in context with adjacent assessment work.'
}

function deriveFallbackOutputExpectation(category: 'individual' | 'team', hasAdvancedOutputs: boolean): string {
  if (category === 'team') {
    return hasAdvancedOutputs
      ? 'Completing this assessment generates a team-level diagnostic summary with expanded reporting where plan access allows.'
      : 'Completing this assessment generates a team-level diagnostic summary for review in the shared workspace.'
  }

  return 'Completing this assessment generates an interpreted individual profile with actionable output ready for review after submission.'
}

function deriveMeasurementFocus(measures: string[], configuredFocus?: string[]): string[] {
  const focus = configuredFocus?.filter(Boolean) ?? []

  if (focus.length > 0) {
    return focus.slice(0, 4)
  }

  if (measures.length > 0) {
    return measures.slice(0, 4)
  }

  return ['Structured diagnostic coverage', 'Operational interpretation ready after completion']
}

export function deriveAssessmentWorkspaceRecommendationCue(
  assessmentId: string,
  recommendation: AssessmentRepositoryRecommendation | null | undefined,
): AssessmentWorkspaceRecommendationCue | null {
  if (!recommendation || recommendation.itemId !== assessmentId) {
    return null
  }

  switch (recommendation.kind) {
    case 'resume_in_progress':
      return {
        eyebrow: 'Suggested continuation',
        detail: 'This workspace is the active assessment already in progress for the current repository context.',
      }
    case 'review_results':
      return {
        eyebrow: 'Repository guidance',
        detail: 'This diagnostic remains the primary reference point for reviewing latest completed results before opening follow-on work.',
      }
    case 'launch_baseline':
      return {
        eyebrow: 'Recommended next diagnostic',
        detail: 'Repository sequencing currently treats this assessment as the baseline next step for the user.',
      }
    case 'launch_individual_follow_up':
      return {
        eyebrow: 'Recommended follow-up',
        detail: 'Repository sequencing currently treats this assessment as the strongest individual follow-on diagnostic.',
      }
    case 'launch_team_follow_up':
      return {
        eyebrow: 'Recommended team follow-up',
        detail: 'Repository sequencing currently treats this assessment as the next team-level extension of existing insight.',
      }
    default:
      return null
  }
}

export function deriveAssessmentWorkspaceFraming(
  assessmentId: string,
  entryState: AssessmentWorkspaceEntryState,
  recommendation?: AssessmentRepositoryRecommendation | null,
): AssessmentWorkspaceFramingModel {
  const definition = assessmentCatalogueDefinitions.find((item) => item.id === assessmentId)
  const framing = definition?.workspaceFraming
  const stateDetail = DEFAULT_STATE_DETAILS[entryState]

  const title = framing?.title ?? definition?.title ?? 'Assessment Workspace'
  const subtitle =
    framing?.subtitle ??
    definition?.shortDescription ??
    'Structured diagnostic workspace with operational context and saved-state support.'

  const whyItMatters = framing?.whyItMatters ?? deriveFallbackWhyItMatters(definition?.shortDescription, definition?.longDescription)
  const outputExpectation =
    framing?.outputExpectation ??
    deriveFallbackOutputExpectation(definition?.category ?? 'individual', definition?.hasAdvancedOutputs ?? false)

  return {
    title,
    subtitle,
    whyItMatters,
    outputExpectation,
    measurementFocus: deriveMeasurementFocus(definition?.measures ?? [], framing?.measurementFocus),
    classification: framing?.classification ?? DEFAULT_CLASSIFICATION_BY_CATEGORY[definition?.category ?? 'individual'],
    estimatedMinutesLabel: definition?.estimatedMinutes ? `${definition.estimatedMinutes} min` : 'Timing varies',
    questionCountLabel: definition?.questionCount ? `${definition.questionCount} questions` : 'Question count configured at runtime',
    currentActionLabel: stateDetail.label,
    currentActionDetail: framing?.helperTextByState?.[entryState] ?? stateDetail.detail,
    recommendationCue: deriveAssessmentWorkspaceRecommendationCue(assessmentId, recommendation),
  }
}

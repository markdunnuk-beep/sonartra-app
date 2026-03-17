export type AssessmentViewState = 'intro' | 'starting' | 'active'

export type AssessmentEntryPhase = 'ready' | 'starting' | 'active' | 'failed'

export function deriveAssessmentEntryPhase(viewState: AssessmentViewState, startError: string | null): AssessmentEntryPhase {
  if (viewState === 'active') {
    return 'active'
  }

  if (viewState === 'starting') {
    return 'starting'
  }

  if (startError) {
    return 'failed'
  }

  return 'ready'
}

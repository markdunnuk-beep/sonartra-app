export const SIGNALS_ASSESSMENT_WORKSPACE_PATH = '/assessment/workspace'
export const ASSESSMENT_ENTRY_PATH = '/assessment-entry'

export function getAssessmentEntryRedirectTarget(): string {
  return SIGNALS_ASSESSMENT_WORKSPACE_PATH
}

export function getAssessmentEntrySignInRedirect(): string {
  return `/sign-in?redirect_url=${encodeURIComponent(SIGNALS_ASSESSMENT_WORKSPACE_PATH)}`
}

export async function resolveAssessmentEntryRedirect(): Promise<string> {
  return getAssessmentEntryRedirectTarget()
}

import { getGenericAuthFallbackRedirectUrl } from '@/lib/auth-redirects'
import { type IndividualLifecycleState, resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness'

export const ASSESSMENT_ENTRY_PATH = '/assessment-entry'

export function getAssessmentEntryRedirectTarget(lifecycleState: IndividualLifecycleState): string {
  if (lifecycleState === 'not_started' || lifecycleState === 'in_progress') {
    return '/assessment/workspace'
  }

  return getGenericAuthFallbackRedirectUrl()
}

export function getAssessmentEntrySignInRedirect(): string {
  return `/sign-in?redirect_url=${encodeURIComponent(ASSESSMENT_ENTRY_PATH)}`
}

export async function resolveAssessmentEntryRedirect(
  resolveLifecycle: typeof resolveIndividualLifecycleState = resolveIndividualLifecycleState,
): Promise<string> {
  const resolved = await resolveLifecycle()

  if (resolved.authState === 'unauthenticated') {
    return getAssessmentEntrySignInRedirect()
  }

  return getAssessmentEntryRedirectTarget(resolved.lifecycle.state)
}

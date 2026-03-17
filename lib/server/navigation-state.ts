import { resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness';

export interface NavigationLifecycleState {
  hasCompletedAssessment: boolean;
  lifecycleState: 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error';
  message: string;
}

export async function getNavigationLifecycleState(
  dbUserId?: string,
  resolveLifecycle: typeof resolveIndividualLifecycleState = resolveIndividualLifecycleState,
): Promise<NavigationLifecycleState> {
  const resolved = await resolveLifecycle({
    resolveAuthenticatedUserId: async () => dbUserId ?? null,
  });

  if (resolved.authState === 'unauthenticated') {
    return {
      hasCompletedAssessment: false,
      lifecycleState: 'not_started',
      message: 'Authentication required.',
    };
  }

  return {
    hasCompletedAssessment: resolved.lifecycle.state === 'ready',
    lifecycleState: resolved.lifecycle.state,
    message: resolved.lifecycle.message,
  };
}

export async function doesUserHaveCompletedResult(dbUserId: string): Promise<boolean> {
  const state = await getNavigationLifecycleState(dbUserId);
  return state.hasCompletedAssessment;
}

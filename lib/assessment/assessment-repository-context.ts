import type { AssessmentRepositoryContext } from './assessment-catalogue-types'

export function getCurrentAssessmentRepositoryContext(): AssessmentRepositoryContext {
  return {
    currentUserId: 'user-current',
    currentWorkspaceId: 'workspace-alpha',
    currentRole: 'manager',
    currentPlan: 'enterprise',
    currentTeamIds: ['team-core'],
  }
}

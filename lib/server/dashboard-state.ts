import { AssessmentRow } from '@/lib/assessment-types'
import { queryDb } from '@/lib/db'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { getAuthenticatedIndividualIntelligenceResult, IndividualIntelligenceResultContract } from '@/lib/server/individual-intelligence-result'
import { doesUserHaveCompletedResult } from '@/lib/server/navigation-state'

type DashboardAssessmentStatus = 'not_started' | 'in_progress' | 'completed'

export interface DashboardAssessmentState {
  status: DashboardAssessmentStatus
  assessmentId: string | null
  progressPercent: number
  questionsCompleted: number
  questionsRemaining: number | null
}

export interface DashboardState {
  authStatus: 'authenticated' | 'unauthenticated'
  hasCompletedResult: boolean
  assessment: DashboardAssessmentState
  result: IndividualIntelligenceResultContract | null
}

interface DashboardStateDependencies {
  resolveAuthenticatedUserId: () => Promise<string | null>
  hasCompletedResult: (dbUserId: string) => Promise<boolean>
  getActiveAssessment: (dbUserId: string, activeAssessmentId?: string | null) => Promise<AssessmentRow | null>
  getResult: (dbUserId: string) => Promise<IndividualIntelligenceResultContract>
}

const fallbackAssessmentState: DashboardAssessmentState = {
  status: 'not_started',
  assessmentId: null,
  progressPercent: 0,
  questionsCompleted: 0,
  questionsRemaining: null,
}

const defaultDependencies: DashboardStateDependencies = {
  async resolveAuthenticatedUserId() {
    const user = await resolveAuthenticatedAppUser()
    return user?.dbUserId ?? null
  },
  hasCompletedResult: doesUserHaveCompletedResult,
  async getActiveAssessment(dbUserId, activeAssessmentId) {
    if (activeAssessmentId) {
      const explicitResult = await queryDb<AssessmentRow>(
        `SELECT id, user_id, organisation_id, assessment_version_id, status, started_at, completed_at,
                last_activity_at, progress_count, progress_percent, current_question_index, scoring_status,
                source, metadata_json, created_at, updated_at
         FROM assessments
         WHERE id = $1
           AND user_id = $2
           AND organisation_id IS NULL
         LIMIT 1`,
        [activeAssessmentId, dbUserId],
      )

      if (explicitResult.rows[0]) {
        return explicitResult.rows[0]
      }
    }

    const result = await queryDb<AssessmentRow>(
      `SELECT id, user_id, organisation_id, assessment_version_id, status, started_at, completed_at,
              last_activity_at, progress_count, progress_percent, current_question_index, scoring_status,
              source, metadata_json, created_at, updated_at
       FROM assessments
       WHERE user_id = $1
         AND organisation_id IS NULL
       ORDER BY
         CASE WHEN status IN ('not_started', 'in_progress') THEN 0 ELSE 1 END,
         COALESCE(last_activity_at, updated_at, created_at) DESC
       LIMIT 1`,
      [dbUserId],
    )

    return result.rows[0] ?? null
  },
  async getResult(dbUserId) {
    return getAuthenticatedIndividualIntelligenceResult({
      resolveAuthenticatedUserId: async () => dbUserId,
    })
  },
}

function mapAssessmentState(assessment: AssessmentRow | null): DashboardAssessmentState {
  if (!assessment) {
    return fallbackAssessmentState
  }

  const progressPercent = Number(assessment.progress_percent)
  const completed = Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, Math.round(progressPercent))) : 0
  const status: DashboardAssessmentStatus = assessment.status === 'completed' ? 'completed' : 'in_progress'
  const questionsCompleted = Math.max(0, assessment.progress_count)
  const totalEstimate = completed > 0 ? Math.max(questionsCompleted, Math.round(questionsCompleted / (completed / 100))) : null

  return {
    status,
    assessmentId: assessment.id,
    progressPercent: completed,
    questionsCompleted,
    questionsRemaining: totalEstimate !== null ? Math.max(0, totalEstimate - questionsCompleted) : null,
  }
}

export async function getAuthenticatedDashboardState(
  dependencies: Partial<DashboardStateDependencies> = {},
  options: { activeAssessmentId?: string | null } = {},
): Promise<DashboardState> {
  const deps = { ...defaultDependencies, ...dependencies }
  const userId = await deps.resolveAuthenticatedUserId()
  const activeAssessmentId = options.activeAssessmentId ?? null

  if (!userId) {
    return {
      authStatus: 'unauthenticated',
      hasCompletedResult: false,
      assessment: fallbackAssessmentState,
      result: null,
    }
  }

  try {
    const [assessment, navHasCompletedResult] = await Promise.all([
      deps.getActiveAssessment(userId, activeAssessmentId),
      deps.hasCompletedResult(userId),
    ])

    console.info('[assessment-id-check] dashboard-state', {
      userId,
      activeAssessmentId,
      resolvedAssessmentId: assessment?.id ?? null,
      resolvedAssessmentStatus: assessment?.status ?? 'not_started',
    })

    if (!navHasCompletedResult) {
      return {
        authStatus: 'authenticated',
        hasCompletedResult: false,
        assessment: mapAssessmentState(assessment),
        result: null,
      }
    }

    const result = await deps.getResult(userId)
    const canShowResult = result.resultStatus === 'complete' && result.hasResult

    return {
      authStatus: 'authenticated',
      hasCompletedResult: canShowResult,
      assessment: mapAssessmentState(assessment),
      result: canShowResult ? result : null,
    }
  } catch (error) {
    console.error('getAuthenticatedDashboardState failed, returning safe fallback:', error)

    return {
      authStatus: 'authenticated',
      hasCompletedResult: false,
      assessment: fallbackAssessmentState,
      result: null,
    }
  }
}

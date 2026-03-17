import { AssessmentRow } from '@/lib/assessment-types'
import { queryDb } from '@/lib/db'
import { resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { getAuthenticatedIndividualIntelligenceResult, IndividualIntelligenceResultContract } from '@/lib/server/individual-intelligence-result'

type DashboardAssessmentStatus = 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error'

export interface DashboardAssessmentState {
  status: DashboardAssessmentStatus
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
  getLatestAssessment: (dbUserId: string) => Promise<AssessmentRow | null>
  getResult: (dbUserId: string) => Promise<IndividualIntelligenceResultContract>
  resolveLifecycle: typeof resolveIndividualLifecycleState
}

const fallbackAssessmentState: DashboardAssessmentState = {
  status: 'not_started',
  progressPercent: 0,
  questionsCompleted: 0,
  questionsRemaining: null,
}

const defaultDependencies: DashboardStateDependencies = {
  async resolveAuthenticatedUserId() {
    const user = await resolveAuthenticatedAppUser()
    return user?.dbUserId ?? null
  },
  async getLatestAssessment(dbUserId) {
    const result = await queryDb<AssessmentRow>(
      `SELECT id, user_id, organisation_id, assessment_version_id, status, started_at, completed_at,
              last_activity_at, progress_count, progress_percent, current_question_index, scoring_status,
              source, metadata_json, created_at, updated_at
       FROM assessments
       WHERE user_id = $1
         AND organisation_id IS NULL
       ORDER BY updated_at DESC
       LIMIT 1`,
      [dbUserId],
    )

    return result.rows[0] ?? null
  },
  resolveLifecycle: resolveIndividualLifecycleState,
  async getResult(dbUserId) {
    return getAuthenticatedIndividualIntelligenceResult({
      resolveAuthenticatedUserId: async () => dbUserId,
    })
  },
}

function mapAssessmentState(assessment: AssessmentRow | null, lifecycleStatus: DashboardAssessmentStatus): DashboardAssessmentState {
  if (!assessment) {
    return { ...fallbackAssessmentState, status: lifecycleStatus }
  }

  const progressPercent = Number(assessment.progress_percent)
  const completed = Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, Math.round(progressPercent))) : 0
  const questionsCompleted = Math.max(0, assessment.progress_count)
  const totalEstimate = completed > 0 ? Math.max(questionsCompleted, Math.round(questionsCompleted / (completed / 100))) : null

  return {
    status: lifecycleStatus,
    progressPercent: completed,
    questionsCompleted,
    questionsRemaining: totalEstimate !== null ? Math.max(0, totalEstimate - questionsCompleted) : null,
  }
}

export async function getAuthenticatedDashboardState(dependencies: Partial<DashboardStateDependencies> = {}): Promise<DashboardState> {
  const deps = { ...defaultDependencies, ...dependencies }
  const userId = await deps.resolveAuthenticatedUserId()

  if (!userId) {
    return {
      authStatus: 'unauthenticated',
      hasCompletedResult: false,
      assessment: fallbackAssessmentState,
      result: null,
    }
  }

  try {
    const [assessment, lifecycle] = await Promise.all([
      deps.getLatestAssessment(userId),
      deps.resolveLifecycle({ resolveAuthenticatedUserId: async () => userId }),
    ])

    const lifecycleStatus: DashboardAssessmentStatus = lifecycle.authState === 'authenticated' ? lifecycle.lifecycle.state : 'not_started'

    if (lifecycleStatus !== 'ready') {
      return {
        authStatus: 'authenticated',
        hasCompletedResult: false,
        assessment: mapAssessmentState(assessment, lifecycleStatus),
        result: null,
      }
    }

    const result = await deps.getResult(userId)
    const canShowResult = result.resultStatus === 'complete' && result.hasResult

    return {
      authStatus: 'authenticated',
      hasCompletedResult: canShowResult,
      assessment: mapAssessmentState(assessment, canShowResult ? 'ready' : lifecycleStatus),
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

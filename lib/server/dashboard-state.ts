import { AssessmentRow } from '@/lib/assessment-types'
import { queryDb } from '@/lib/db'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { getAuthenticatedIndividualIntelligenceResult, IndividualIntelligenceResultContract } from '@/lib/server/individual-intelligence-result'
import { doesUserHaveCompletedResult } from '@/lib/server/navigation-state'
import { logAssessmentDiagnostic } from '@/lib/server/assessment-diagnostics'

type DashboardAssessmentStatus = 'not_started' | 'in_progress' | 'completed'

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
  hasCompletedResult: (dbUserId: string) => Promise<boolean>
  getLatestAssessment: (dbUserId: string) => Promise<AssessmentRow | null>
  getResult: (dbUserId: string) => Promise<IndividualIntelligenceResultContract>
}

export function selectDashboardAssessment(assessments: AssessmentRow[]): AssessmentRow | null {
  if (assessments.length === 0) return null

  const inProgress = assessments.find((assessment) => assessment.status === 'not_started' || assessment.status === 'in_progress')
  return inProgress ?? assessments[0] ?? null
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
  hasCompletedResult: doesUserHaveCompletedResult,
  async getLatestAssessment(dbUserId) {
    const result = await queryDb<AssessmentRow>(
      `SELECT id, user_id, organisation_id, assessment_version_id, status, started_at, completed_at,
              last_activity_at, progress_count, progress_percent, current_question_index, scoring_status,
              source, metadata_json, created_at, updated_at
       FROM assessments
       WHERE user_id = $1
         AND organisation_id IS NULL
       ORDER BY last_activity_at DESC NULLS LAST, updated_at DESC, created_at DESC
       LIMIT 20`,
      [dbUserId],
    )

    return selectDashboardAssessment(result.rows)
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
    const [assessment, navHasCompletedResult] = await Promise.all([deps.getLatestAssessment(userId), deps.hasCompletedResult(userId)])

    if (assessment) {
      const persistedCountResult = await queryDb<{ response_count: string }>(
        `SELECT COUNT(*)::int AS response_count
         FROM assessment_responses
         WHERE assessment_id = $1`,
        [assessment.id],
      )
      const persistedResponseCount = Number(persistedCountResult.rows[0]?.response_count ?? 0)
      logAssessmentDiagnostic('dashboard.load', {
        assessmentId: assessment.id,
        appUserId: userId,
        assessmentStatus: assessment.status,
        assessmentProgressCount: assessment.progress_count,
        persistedResponseCount,
      })
    } else {
      logAssessmentDiagnostic('dashboard.load', {
        assessmentId: null,
        appUserId: userId,
        assessmentStatus: 'none',
        assessmentProgressCount: 0,
        persistedResponseCount: 0,
      })
    }

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

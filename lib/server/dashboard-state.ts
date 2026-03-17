import { AssessmentRow } from '@/lib/assessment-types'
import { queryDb } from '@/lib/db'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { getAuthenticatedIndividualIntelligenceResult, IndividualIntelligenceResultContract } from '@/lib/server/individual-intelligence-result'
import { derivePersistedAssessmentProgress } from '@/lib/server/assessment-progress'
import { doesUserHaveCompletedResult } from '@/lib/server/navigation-state'

type DashboardAssessmentStatus = 'not_started' | 'in_progress' | 'completed'

interface DashboardAssessmentRow extends AssessmentRow {
  total_questions: number
  persisted_response_count: number
}

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
  getLatestAssessment: (dbUserId: string) => Promise<DashboardAssessmentRow | null>
  getResult: (dbUserId: string) => Promise<IndividualIntelligenceResultContract>
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
    const result = await queryDb<DashboardAssessmentRow>(
      `SELECT a.id, a.user_id, a.organisation_id, a.assessment_version_id, a.status, a.started_at, a.completed_at,
              a.last_activity_at, a.progress_count, a.progress_percent, a.current_question_index, a.scoring_status,
              a.source, a.metadata_json, a.created_at, a.updated_at,
              av.total_questions,
              COALESCE(response_counts.response_count, 0) AS persisted_response_count
       FROM assessments a
       INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
       LEFT JOIN (
         SELECT assessment_id, COUNT(*)::int AS response_count
         FROM assessment_responses
         GROUP BY assessment_id
       ) response_counts ON response_counts.assessment_id = a.id
       WHERE a.user_id = $1
         AND a.organisation_id IS NULL
       ORDER BY a.updated_at DESC
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

function mapAssessmentState(assessment: DashboardAssessmentRow | null): DashboardAssessmentState {
  if (!assessment) {
    return fallbackAssessmentState
  }

  const persistedProgress = derivePersistedAssessmentProgress(assessment.persisted_response_count, assessment.total_questions)
  const completed = Math.round(persistedProgress.progressPercent)
  const status: DashboardAssessmentStatus = assessment.status === 'completed' ? 'completed' : 'in_progress'
  const questionsCompleted = persistedProgress.progressCount

  return {
    status,
    progressPercent: completed,
    questionsCompleted,
    questionsRemaining: Math.max(0, assessment.total_questions - questionsCompleted),
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

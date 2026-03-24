import { AssessmentRow } from '@/lib/assessment-types'
import type { AssessmentRepositoryItem } from '@/lib/assessment/assessment-repository-types'
import { queryDb } from '@/lib/db'
import { loadLiveAssessmentRepositoryInventory } from '@/lib/server/assessment-repository-inventory'
import { resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness'
import { DatabaseUserResolutionError, resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { checkDatabaseHealth, DbHealthCheckResult } from '@/lib/server/db-health'
import { getAuthenticatedIndividualIntelligenceResult, IndividualIntelligenceResultContract } from '@/lib/server/individual-intelligence-result'

type DashboardAssessmentStatus = 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error'

export interface DashboardAssessmentState {
  status: DashboardAssessmentStatus
  progressPercent: number
  questionsCompleted: number
  questionsRemaining: number | null
}

export interface DashboardState {
  status?: 'ready' | 'error'
  authStatus: 'authenticated' | 'unauthenticated'
  hasCompletedResult: boolean
  assessment: DashboardAssessmentState
  result: IndividualIntelligenceResultContract | null
}

interface DashboardStateDependencies {
  resolveAuthenticatedUserId: () => Promise<string | null>
  getAssessmentInventory: (dbUserId: string) => Promise<AssessmentRepositoryItem[]>
  getLatestAssessment: (dbUserId: string) => Promise<AssessmentRow | null>
  getResult: (dbUserId: string) => Promise<IndividualIntelligenceResultContract>
  resolveLifecycle: typeof resolveIndividualLifecycleState
  checkDatabaseHealth: () => Promise<DbHealthCheckResult>
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
  async getAssessmentInventory(dbUserId) {
    return loadLiveAssessmentRepositoryInventory(dbUserId)
  },
  resolveLifecycle: resolveIndividualLifecycleState,
  async getResult(dbUserId) {
    return getAuthenticatedIndividualIntelligenceResult({
      resolveAuthenticatedUserId: async () => dbUserId,
    })
  },
  checkDatabaseHealth,
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

function deriveStatusFromAssessment(assessment: AssessmentRow | null): DashboardAssessmentStatus {
  if (!assessment) return 'not_started'
  if (assessment.status === 'completed') return 'completed_processing'

  const progressPercent = Number(assessment.progress_percent)
  const normalisedPercent = Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, Math.round(progressPercent))) : 0
  if (normalisedPercent >= 100) return 'completed_processing'

  return 'in_progress'
}

function mapInventoryLifecycleStatus(item: AssessmentRepositoryItem | null): DashboardAssessmentStatus | null {
  if (!item?.lifecycleState) return null
  if (item.lifecycleState === 'ready') return 'ready'
  if (item.lifecycleState === 'completed_processing') return 'completed_processing'
  if (item.lifecycleState === 'in_progress') return 'in_progress'
  if (item.lifecycleState === 'error') return 'error'
  return 'not_started'
}

function buildUnauthenticatedDashboardState(): DashboardState {
  return {
    status: 'ready',
    authStatus: 'unauthenticated',
    hasCompletedResult: false,
    assessment: fallbackAssessmentState,
    result: null,
  }
}

function buildInfrastructureFailureDashboardState(): DashboardState {
  return {
    status: 'error',
    authStatus: 'authenticated',
    hasCompletedResult: false,
    assessment: {
      ...fallbackAssessmentState,
      status: 'error',
    },
    result: null,
  }
}

async function logDatabaseHealthDiagnostic(checkHealth: () => Promise<DbHealthCheckResult>) {
  try {
    const health = await checkHealth()
    if (health.ok) {
      console.error('getAuthenticatedDashboardState user resolution failed even though the database health check succeeded.')
      return
    }

    console.error(`getAuthenticatedDashboardState user resolution failed because the database is unavailable: ${health.message}`)
  } catch (error) {
    console.error('getAuthenticatedDashboardState could not complete database health check:', error)
  }
}

export async function getAuthenticatedDashboardState(dependencies: Partial<DashboardStateDependencies> = {}): Promise<DashboardState> {
  const deps = { ...defaultDependencies, ...dependencies }

  let userId: string | null
  try {
    userId = await deps.resolveAuthenticatedUserId()
  } catch (error) {
    if (error instanceof DatabaseUserResolutionError) {
      await logDatabaseHealthDiagnostic(deps.checkDatabaseHealth)
      return buildInfrastructureFailureDashboardState()
    }

    throw error
  }

  if (!userId) {
    return buildUnauthenticatedDashboardState()
  }

  let assessment: AssessmentRow | null = null
  let inventoryItem: AssessmentRepositoryItem | null = null

  try {
    const inventory = await deps.getAssessmentInventory(userId)
    inventoryItem = inventory[0] ?? null
  } catch (error) {
    console.error('getAuthenticatedDashboardState inventory lookup failed:', error)
  }

  try {
    assessment = await deps.getLatestAssessment(userId)
  } catch (error) {
    console.error('getAuthenticatedDashboardState latest assessment lookup failed:', error)
  }

  let lifecycleStatus: DashboardAssessmentStatus = mapInventoryLifecycleStatus(inventoryItem) ?? deriveStatusFromAssessment(assessment)
  try {
    if (!inventoryItem) {
      const lifecycle = await deps.resolveLifecycle({ resolveAuthenticatedUserId: async () => userId })
      lifecycleStatus = lifecycle.authState === 'authenticated' ? lifecycle.lifecycle.state : lifecycleStatus
    }
  } catch (error) {
    console.error('getAuthenticatedDashboardState lifecycle resolution failed; preserving assessment metrics:', error)
  }

  if (lifecycleStatus !== 'ready') {
    return {
      status: 'ready',
      authStatus: 'authenticated',
      hasCompletedResult: false,
      assessment: mapAssessmentState(assessment, lifecycleStatus),
      result: null,
    }
  }

  try {
    const result = await deps.getResult(userId)
    const canShowResult = result.resultStatus === 'complete' && result.hasResult

    return {
      status: 'ready',
      authStatus: 'authenticated',
      hasCompletedResult: true,
      assessment: mapAssessmentState(assessment, 'ready'),
      result: canShowResult ? result : null,
    }
  } catch (error) {
    console.error('getAuthenticatedDashboardState result lookup failed; preserving ready-state metrics:', error)

    return {
      status: 'ready',
      authStatus: 'authenticated',
      hasCompletedResult: true,
      assessment: mapAssessmentState(assessment, 'ready'),
      result: null,
    }
  }
}

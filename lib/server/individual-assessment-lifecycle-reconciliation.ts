import type { AssessmentResultRow } from '@/lib/assessment-types'
import { isHybridMvpReadyResult } from '@/lib/server/hybrid-mvp-result'
import { hasUserFacingV2Summary, isPackageContractV2Result } from '@/lib/server/live-assessment-user-result'
import { parseAssessmentReportArtifactRecord } from '@/lib/reports/assessment-report-v2'
import type { AssessmentAssignmentStatus } from '@/lib/server/assessment-assignments'

export type CanonicalIndividualLifecycleState = 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'failed'
export type LifecycleRepairAction = 'mark_assignment_ready' | 'mark_assignment_failed' | null

interface ReconciliationInput {
  hasAssessment: boolean
  isAssessmentEffectivelyCompleted: boolean
  assessmentCompletedAt: string | null
  latestAssessmentResult: AssessmentResultRow | null
  latestAssessmentSignalCount: number
  latestReadyResult: AssessmentResultRow | null
  latestReadyResultSignalCount?: number
  assignmentStatus: AssessmentAssignmentStatus | null
  staleProcessingThresholdMinutes?: number
  now?: Date
}

export interface LifecycleReconciliationResolution {
  state: CanonicalIndividualLifecycleState
  readyEvidence: 'latest_assessment_result' | 'persisted_ready_result' | null
  needsAssignmentRepair: LifecycleRepairAction
  inconsistencyCode: 'assignment_ready_without_retrievable_result' | null
}

function hasAvailableReportArtifact(result: AssessmentResultRow | null): boolean {
  if (!result) return false
  const parsed = parseAssessmentReportArtifactRecord(result.report_artifact_json)
  return parsed?.state === 'available'
}

function isResultProductReady(result: AssessmentResultRow | null, signalCount: number): boolean {
  if (!result || result.status !== 'complete') {
    return false
  }

  return (
    signalCount > 0
    || (isPackageContractV2Result(result) && hasUserFacingV2Summary(result))
    || isHybridMvpReadyResult(result)
    || hasAvailableReportArtifact(result)
  )
}

function isPastStaleBoundary(completedAtIso: string | null, now: Date, thresholdMinutes: number): boolean {
  if (!completedAtIso) return false
  const completedAt = new Date(completedAtIso)
  if (Number.isNaN(completedAt.getTime())) return false
  const elapsedMs = now.getTime() - completedAt.getTime()
  return elapsedMs >= thresholdMinutes * 60_000
}

export function reconcileIndividualLifecycle(input: ReconciliationInput): LifecycleReconciliationResolution {
  const {
    hasAssessment,
    isAssessmentEffectivelyCompleted,
    assessmentCompletedAt,
    latestAssessmentResult,
    latestAssessmentSignalCount,
    latestReadyResult,
    latestReadyResultSignalCount = latestAssessmentSignalCount,
    assignmentStatus,
    staleProcessingThresholdMinutes = 30,
    now = new Date(),
  } = input

  const latestAssessmentReady = isResultProductReady(latestAssessmentResult, latestAssessmentSignalCount)
  const latestPersistedReady = isResultProductReady(latestReadyResult, latestReadyResultSignalCount)
  const readyEvidence = latestAssessmentReady
    ? 'latest_assessment_result'
    : latestPersistedReady
      ? 'persisted_ready_result'
      : null

  const assignmentClaimsReady = assignmentStatus === 'results_ready'
  const assignmentReadyWithoutRetrievableResult = assignmentClaimsReady && !readyEvidence

  let state: CanonicalIndividualLifecycleState
  if (!hasAssessment) {
    if (readyEvidence) {
      state = 'ready'
    } else if (assignmentStatus === 'in_progress') {
      state = 'in_progress'
    } else if (assignmentStatus === 'completed_processing' || assignmentStatus === 'results_ready') {
      state = 'completed_processing'
    } else if (assignmentStatus === 'failed') {
      state = 'failed'
    } else {
      state = 'not_started'
    }
  } else if (!isAssessmentEffectivelyCompleted) {
    state = readyEvidence ? 'ready' : 'in_progress'
  } else if (readyEvidence) {
    state = 'ready'
  } else if (latestAssessmentResult?.status === 'failed' || assignmentStatus === 'failed') {
    state = 'failed'
  } else if (isPastStaleBoundary(assessmentCompletedAt, now, staleProcessingThresholdMinutes)) {
    state = 'failed'
  } else {
    state = 'completed_processing'
  }

  const needsAssignmentRepair: LifecycleRepairAction = state === 'ready'
    && assignmentStatus
    && assignmentStatus !== 'results_ready'
      ? 'mark_assignment_ready'
      : state === 'failed'
        && assignmentStatus
        && assignmentStatus !== 'failed'
          ? 'mark_assignment_failed'
          : null

  return {
    state,
    readyEvidence,
    needsAssignmentRepair,
    inconsistencyCode: assignmentReadyWithoutRetrievableResult ? 'assignment_ready_without_retrievable_result' : null,
  }
}

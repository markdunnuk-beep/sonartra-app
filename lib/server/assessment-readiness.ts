import { AssessmentResultRow, AssessmentRow } from '@/lib/assessment-types';
import { queryDb } from '@/lib/db';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { getAssessmentResultReportArtifactSelectProjection } from '@/lib/server/assessment-result-schema-capabilities';
import type { AssessmentAssignmentStatus } from '@/lib/server/assessment-assignments';
import { markAssignmentFailed, markAssignmentResultReady } from '@/lib/server/assessment-assignments';
import { reconcileIndividualLifecycle } from '@/lib/server/individual-assessment-lifecycle-reconciliation';
import { parseRuntimeV2ReadyPayload } from '@/lib/server/runtime-v2-readiness';

export type IndividualLifecycleState = 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error';

interface AssessmentContextRow extends AssessmentRow {
  version_key: string | null;
  total_questions: number | null;
}

interface ReadyResultContextRow extends AssessmentResultRow {
  assessment_started_at: string | null;
  assessment_completed_at: string | null;
  assessment_version_key: string | null;
}

export interface IndividualLifecycleAssessmentSummary {
  assessmentId: string;
  status: AssessmentRow['status'];
  versionKey: string | null;
  startedAt: string | null;
  completedAt: string | null;
  progressCount: number;
  progressPercent: number;
  totalQuestions: number | null;
}

export interface IndividualLifecycleSnapshotSummary {
  resultId: string;
  assessmentId: string;
  status: AssessmentResultRow['status'];
  versionKey: string;
  assessmentStartedAt: string | null;
  assessmentCompletedAt: string | null;
  scoringModelKey: string;
  snapshotVersion: number;
  createdAt: string;
  updatedAt: string;
  scoredAt: string | null;
  signalCount: number;
}

export interface IndividualLifecycleResolution {
  state: IndividualLifecycleState;
  latestAssessment: IndividualLifecycleAssessmentSummary | null;
  latestAssessmentResult: IndividualLifecycleSnapshotSummary | null;
  latestReadyResult: IndividualLifecycleSnapshotSummary | null;
  message: string;
}

interface LifecycleDependencies {
  resolveAuthenticatedUserId: () => Promise<string | null>;
  getLatestAssessmentForUser: (userId: string, definitionId?: string | null) => Promise<AssessmentContextRow | null>;
  getLatestResultForAssessment: (assessmentId: string) => Promise<AssessmentResultRow | null>;
  getSignalCountByResultId: (resultId: string) => Promise<number>;
  getLatestReadyResultForUser: (userId: string, definitionId?: string | null) => Promise<ReadyResultContextRow | null>;
  getLatestAssignmentStatusForUser: (userId: string, definitionId?: string | null) => Promise<AssessmentAssignmentStatus | null>;
  markAssignmentResultReady: typeof markAssignmentResultReady;
  markAssignmentFailed: typeof markAssignmentFailed;
}
interface LifecycleResolutionOptions {
  definitionId?: string | null
  staleProcessingThresholdMinutes?: number
}

const defaultDependencies: LifecycleDependencies = {
  async resolveAuthenticatedUserId() {
    const appUser = await resolveAuthenticatedAppUser();
    return appUser?.dbUserId ?? null;
  },
  async getLatestAssessmentForUser(userId, definitionId) {
    const result = await queryDb<AssessmentContextRow>(
      `SELECT a.id, a.user_id, a.organisation_id, a.assessment_version_id, a.status, a.started_at,
              a.completed_at, a.last_activity_at, a.progress_count, a.progress_percent,
              a.current_question_index, a.scoring_status, a.source, a.metadata_json,
              a.created_at, a.updated_at, av.key AS version_key, av.total_questions
       FROM assessments a
       LEFT JOIN assessment_versions av ON av.id = a.assessment_version_id
       WHERE a.user_id = $1 AND a.organisation_id IS NULL
         AND ($2::uuid IS NULL OR av.assessment_definition_id = $2::uuid)
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [userId, definitionId ?? null],
    );

    return result.rows[0] ?? null;
  },
  async getLatestResultForAssessment(assessmentId) {
    const reportArtifactProjection = await getAssessmentResultReportArtifactSelectProjection('report_artifact_json')
    const result = await queryDb<AssessmentResultRow>(
      `SELECT id, assessment_id, assessment_version_id, version_key, scoring_model_key, snapshot_version, status,
              result_payload, response_quality_payload, ${reportArtifactProjection}, completed_at, scored_at, created_at, updated_at
       FROM assessment_results
       WHERE assessment_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [assessmentId],
    );

    return result.rows[0] ?? null;
  },
  async getSignalCountByResultId(resultId) {
    const result = await queryDb<{ signal_count: string }>(
      `SELECT COUNT(*)::int AS signal_count
       FROM assessment_result_signals
       WHERE assessment_result_id = $1`,
      [resultId],
    );

    return Number(result.rows[0]?.signal_count ?? 0);
  },
  async getLatestReadyResultForUser(userId, definitionId) {
    const reportArtifactProjection = await getAssessmentResultReportArtifactSelectProjection('ar.report_artifact_json')
    const result = await queryDb<ReadyResultContextRow>(
      `SELECT ar.id, ar.assessment_id, ar.assessment_version_id, ar.version_key, ar.scoring_model_key, ar.snapshot_version,
              ar.status, ar.result_payload, ar.response_quality_payload, ${reportArtifactProjection}, ar.completed_at, ar.scored_at, ar.created_at, ar.updated_at,
              a.started_at AS assessment_started_at, a.completed_at AS assessment_completed_at, av.key AS assessment_version_key
       FROM assessment_results ar
       INNER JOIN assessments a ON a.id = ar.assessment_id
       LEFT JOIN assessment_versions av ON av.id = a.assessment_version_id
       WHERE a.user_id = $1
         AND a.organisation_id IS NULL
         AND ($2::uuid IS NULL OR av.assessment_definition_id = $2::uuid)
         AND ar.status = 'complete'
         AND (
           EXISTS (
             SELECT 1 FROM assessment_result_signals ars WHERE ars.assessment_result_id = ar.id
           )
           OR COALESCE(ar.result_payload->>'contractVersion', '') IN ('package_contract_v2', 'hybrid_mvp_v1')
         )
       ORDER BY a.completed_at DESC NULLS LAST, ar.created_at DESC
       LIMIT 1`,
      [userId, definitionId ?? null],
    );

    return result.rows[0] ?? null;
  },
  async getLatestAssignmentStatusForUser(userId, definitionId) {
    const result = await queryDb<{ status: AssessmentAssignmentStatus }>(
      `SELECT ara.status
       FROM assessment_repository_assignments ara
       WHERE ara.target_user_id = $1
         AND ($2::uuid IS NULL OR ara.assessment_definition_id = $2::uuid)
         AND ara.status <> 'cancelled'
       ORDER BY ara.assigned_at DESC, ara.created_at DESC
       LIMIT 1`,
      [userId, definitionId ?? null],
    );

    return result.rows[0]?.status ?? null;
  },
  markAssignmentResultReady,
  markAssignmentFailed,
};

function toAssessmentSummary(assessment: AssessmentContextRow): IndividualLifecycleAssessmentSummary {
  return {
    assessmentId: assessment.id,
    status: assessment.status,
    versionKey: assessment.version_key,
    startedAt: assessment.started_at,
    completedAt: assessment.completed_at,
    progressCount: assessment.progress_count,
    progressPercent: Math.max(0, Math.min(100, Math.round(Number(assessment.progress_percent) || 0))),
    totalQuestions: assessment.total_questions,
  };
}

function toSnapshotSummary(
  snapshot: AssessmentResultRow | ReadyResultContextRow,
  signalCount: number
): IndividualLifecycleSnapshotSummary {
  return {
    resultId: snapshot.id,
    assessmentId: snapshot.assessment_id,
    status: snapshot.status,
    versionKey: snapshot.version_key,
    assessmentStartedAt: 'assessment_started_at' in snapshot ? snapshot.assessment_started_at : null,
    assessmentCompletedAt: 'assessment_completed_at' in snapshot ? snapshot.assessment_completed_at : snapshot.completed_at,
    scoringModelKey: snapshot.scoring_model_key,
    snapshotVersion: snapshot.snapshot_version,
    createdAt: snapshot.created_at,
    updatedAt: snapshot.updated_at,
    scoredAt: snapshot.scored_at,
    signalCount,
  };
}

function isEffectivelyCompleted(assessment: AssessmentContextRow): boolean {
  if (assessment.status === 'completed') return true;

  const progressPercent = Number(assessment.progress_percent);
  const normalisedPercent = Number.isFinite(progressPercent) ? Math.max(0, Math.min(100, Math.round(progressPercent))) : 0;
  const hasCompletePercent = normalisedPercent >= 100;
  const hasCompleteCount =
    typeof assessment.total_questions === 'number' && assessment.total_questions > 0
      ? assessment.progress_count >= assessment.total_questions
      : false;

  return hasCompletePercent || hasCompleteCount;
}

export async function resolveIndividualLifecycleState(
  optionsOrDependencies: LifecycleResolutionOptions | Partial<LifecycleDependencies> = {},
  dependencies: Partial<LifecycleDependencies> = {},
): Promise<{ authState: 'unauthenticated' } | { authState: 'authenticated'; userId: string; lifecycle: IndividualLifecycleResolution }> {
  const isDependencyBag = typeof optionsOrDependencies === 'object'
    && optionsOrDependencies !== null
    && (
      'resolveAuthenticatedUserId' in optionsOrDependencies
      || 'getLatestAssessmentForUser' in optionsOrDependencies
      || 'getLatestReadyResultForUser' in optionsOrDependencies
    )

  const options: LifecycleResolutionOptions = isDependencyBag ? {} : (optionsOrDependencies as LifecycleResolutionOptions)
  const mergedDependencies = isDependencyBag
    ? (optionsOrDependencies as Partial<LifecycleDependencies>)
    : dependencies
  const deps = { ...defaultDependencies, ...mergedDependencies };
  const definitionId = options.definitionId ?? null;
  const userId = await deps.resolveAuthenticatedUserId();

  if (!userId) return { authState: 'unauthenticated' };

  const latestAssessment = await deps.getLatestAssessmentForUser(userId, definitionId);
  const latestReadyResult = await deps.getLatestReadyResultForUser(userId, definitionId);
  let latestAssignmentStatus: AssessmentAssignmentStatus | null = null
  try {
    latestAssignmentStatus = await deps.getLatestAssignmentStatusForUser(userId, definitionId);
  } catch (error) {
    console.error('[assessment-readiness] assignment status lookup failed; continuing with result evidence only', {
      userId,
      definitionId,
      message: error instanceof Error ? error.message : 'unknown error',
    })
  }

  const latestRuntimeV2ReadyState = latestReadyResult ? parseRuntimeV2ReadyPayload(latestReadyResult.result_payload) : null
  if (latestReadyResult && (latestReadyResult.result_payload as Record<string, unknown> | null)?.resultFormat === 'runtime_v2' && latestRuntimeV2ReadyState?.state !== 'ready') {
    console.warn('[assessment-readiness] runtime-v2 ready snapshot rejected', {
      resultId: latestReadyResult.id,
      reason: latestRuntimeV2ReadyState?.reason,
    })
  }

  const latestReadyIsUsable = latestReadyResult
    ? ((latestReadyResult.result_payload as Record<string, unknown> | null)?.resultFormat === 'runtime_v2'
      ? latestRuntimeV2ReadyState?.state === 'ready'
      : true)
    : false

  const latestReadySignalCount = latestReadyResult && latestReadyIsUsable ? await deps.getSignalCountByResultId(latestReadyResult.id) : 0;
  const readySummary = latestReadyResult && latestReadyIsUsable
    ? toSnapshotSummary(latestReadyResult, latestReadySignalCount)
    : null;

  if (!latestAssessment) {
    const reconciled = reconcileIndividualLifecycle({
      hasAssessment: false,
      isAssessmentEffectivelyCompleted: false,
      assessmentCompletedAt: null,
      latestAssessmentResult: null,
      latestAssessmentSignalCount: 0,
      latestReadyResult,
      latestReadyResultSignalCount: latestReadySignalCount,
      assignmentStatus: latestAssignmentStatus,
      staleProcessingThresholdMinutes: options.staleProcessingThresholdMinutes,
    })
    return {
      authState: 'authenticated',
      userId,
      lifecycle: {
        state: reconciled.state === 'failed' ? 'error' : reconciled.state,
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: readySummary,
        message: readySummary ? 'A persisted ready result exists.' : 'No assessment found for this user.',
      },
    };
  }

  const assessmentSummary = toAssessmentSummary(latestAssessment);

  if (!isEffectivelyCompleted(latestAssessment)) {
    const reconciled = reconcileIndividualLifecycle({
      hasAssessment: true,
      isAssessmentEffectivelyCompleted: false,
      assessmentCompletedAt: latestAssessment.completed_at,
      latestAssessmentResult: null,
      latestAssessmentSignalCount: 0,
      latestReadyResult,
      latestReadyResultSignalCount: latestReadySignalCount,
      assignmentStatus: latestAssignmentStatus,
      staleProcessingThresholdMinutes: options.staleProcessingThresholdMinutes,
    })
    return {
      authState: 'authenticated',
      userId,
      lifecycle: {
        state: reconciled.state === 'failed' ? 'error' : reconciled.state,
        latestAssessment: assessmentSummary,
        latestAssessmentResult: null,
        latestReadyResult: readySummary,
        message: readySummary
          ? 'A newer attempt is in progress, but a prior ready result is available.'
          : 'Latest assessment is not completed yet.',
      },
    };
  }

  const latestAssessmentResult = await deps.getLatestResultForAssessment(latestAssessment.id);

  if (!latestAssessmentResult) {
    const reconciled = reconcileIndividualLifecycle({
      hasAssessment: true,
      isAssessmentEffectivelyCompleted: true,
      assessmentCompletedAt: latestAssessment.completed_at,
      latestAssessmentResult: null,
      latestAssessmentSignalCount: 0,
      latestReadyResult,
      latestReadyResultSignalCount: latestReadySignalCount,
      assignmentStatus: latestAssignmentStatus,
      staleProcessingThresholdMinutes: options.staleProcessingThresholdMinutes,
    })
    return {
      authState: 'authenticated',
      userId,
      lifecycle: {
        state: reconciled.state === 'failed' ? 'error' : reconciled.state,
        latestAssessment: assessmentSummary,
        latestAssessmentResult: null,
        latestReadyResult: readySummary,
        message: readySummary
          ? 'Latest attempt is complete; using the latest ready persisted result.'
          : 'Assessment is completed but persisted result is not available yet.',
      },
    };
  }

  const signalCount = await deps.getSignalCountByResultId(latestAssessmentResult.id);
  const latestSnapshotSummary = toSnapshotSummary(latestAssessmentResult, signalCount);
  const reconciled = reconcileIndividualLifecycle({
    hasAssessment: true,
    isAssessmentEffectivelyCompleted: true,
    assessmentCompletedAt: latestAssessment.completed_at,
    latestAssessmentResult,
    latestAssessmentSignalCount: signalCount,
    latestReadyResult,
    latestReadyResultSignalCount: latestReadySignalCount,
    assignmentStatus: latestAssignmentStatus,
    staleProcessingThresholdMinutes: options.staleProcessingThresholdMinutes,
  })

  if (reconciled.needsAssignmentRepair === 'mark_assignment_ready') {
    try {
      await deps.markAssignmentResultReady({ assessmentId: latestAssessment.id, resultId: latestAssessmentResult.id })
    } catch (error) {
      console.error('[assessment-readiness] assignment repair failed (mark ready)', { assessmentId: latestAssessment.id, message: error instanceof Error ? error.message : 'unknown error' })
    }
  } else if (reconciled.needsAssignmentRepair === 'mark_assignment_failed') {
    try {
      await deps.markAssignmentFailed({ assessmentId: latestAssessment.id, resultId: latestAssessmentResult.id })
    } catch (error) {
      console.error('[assessment-readiness] assignment repair failed (mark failed)', { assessmentId: latestAssessment.id, message: error instanceof Error ? error.message : 'unknown error' })
    }
  }

  if (reconciled.state === 'ready') {
    return {
      authState: 'authenticated',
      userId,
      lifecycle: {
        state: 'ready',
        latestAssessment: assessmentSummary,
        latestAssessmentResult: latestSnapshotSummary,
        latestReadyResult: readySummary ?? latestSnapshotSummary,
        message: 'Result snapshot is ready.',
      },
    };
  }

  return {
    authState: 'authenticated',
    userId,
    lifecycle: {
      state: reconciled.state === 'failed' ? 'error' : 'completed_processing',
      latestAssessment: assessmentSummary,
      latestAssessmentResult: latestSnapshotSummary,
      latestReadyResult: readySummary,
      message: reconciled.state === 'failed'
        ? 'Result processing exceeded the recovery window without retrievable outputs.'
        : readySummary
          ? 'Latest completed attempt is still processing; showing latest ready snapshot.'
          : 'Completed assessment is waiting for a valid persisted result.',
    },
  };
}

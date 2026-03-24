import { AssessmentResultRow, AssessmentResultSignalRow, AssessmentRow } from '@/lib/assessment-types';
import { queryDb } from '@/lib/db';
import { ASSESSMENT_LAYER_KEYS } from '@/lib/scoring/constants';
import { resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness';
import { parseHybridMvpResultPayload, type HybridMvpResultPayloadViewModel } from '@/lib/server/hybrid-mvp-result';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { getAssessmentResultReportArtifactSelectProjection } from '@/lib/server/assessment-result-schema-capabilities';
import {
  buildLiveAssessmentUserResultContract,
  isPackageContractV2Result,
  type LiveAssessmentUserResultContract,
} from '@/lib/server/live-assessment-user-result';

export type IndividualResultsState =
  | 'unauthenticated'
  | 'empty'
  | 'in_progress'
  | 'completed_processing'
  | 'results_unavailable'
  | 'ready'
  | 'ready_v2'
  | 'ready_hybrid'
  | 'error';

export interface IndividualResultAssessmentMetadata {
  assessmentId: string;
  versionKey: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

export interface IndividualResultSnapshotMetadata {
  resultId: string;
  status: AssessmentResultRow['status'];
  scoringModelKey: string;
  snapshotVersion: number;
  createdAt: string;
  updatedAt: string;
  scoredAt: string | null;
}

export interface IndividualResultLayerSummary {
  layerKey: string;
  totalRawValue: number;
  signalCount: number;
  primarySignalKey: string | null;
  secondarySignalKey: string | null;
  rankedSignalKeys: string[];
}

export interface IndividualResultSignalSummary {
  signalKey: string;
  layerKey: string;
  signalTotal: number;
  normalisedScore: number;
  relativeShare: number;
  rank: number | null;
  isPrimary: boolean;
  isSecondary: boolean;
}


export interface IndividualHybridResultReadyData {
  assessment: IndividualResultAssessmentMetadata;
  snapshot: IndividualResultSnapshotMetadata;
  hybrid: HybridMvpResultPayloadViewModel;
}

export interface IndividualResultReadyData {
  assessment: IndividualResultAssessmentMetadata;
  snapshot: IndividualResultSnapshotMetadata;
  layers: IndividualResultLayerSummary[];
  signals: IndividualResultSignalSummary[];
  summaryJson: Record<string, unknown> | null;
}

export type IndividualResultApiResponse =
  | { ok: false; state: 'unauthenticated'; message: string }
  | { ok: true; state: 'empty'; message: string }
  | {
      ok: true;
      state: 'in_progress' | 'completed_processing' | 'results_unavailable';
      message: string;
      data?: Partial<IndividualResultReadyData>;
      userResult?: LiveAssessmentUserResultContract;
    }
  | { ok: true; state: 'ready'; data: IndividualResultReadyData }
  | { ok: true; state: 'ready_v2'; data: LiveAssessmentUserResultContract }
  | { ok: true; state: 'ready_hybrid'; data: IndividualHybridResultReadyData }
  | { ok: false; state: 'error'; message: string };

interface AssessmentContextRow extends AssessmentRow {
  version_key: string | null;
  total_questions: number | null;
}

interface ReadyResultContextRow extends AssessmentResultRow {
  assessment_started_at: string | null;
  assessment_completed_at: string | null;
  assessment_version_key: string | null;
}

interface IndividualResultsDependencies {
  resolveAuthenticatedUserId: () => Promise<string | null>;
  getLatestAssessmentForUser: (userId: string, definitionId?: string | null) => Promise<AssessmentContextRow | null>;
  getLatestResultForAssessment: (assessmentId: string) => Promise<AssessmentResultRow | null>;
  getResultById: (resultId: string) => Promise<AssessmentResultRow | null>;
  getLatestReadyResultForUser: (userId: string, definitionId?: string | null) => Promise<ReadyResultContextRow | null>;
  getSignalsByResultId: (resultId: string) => Promise<AssessmentResultSignalRow[]>;
}

const LAYER_ORDER = new Map<string, number>(ASSESSMENT_LAYER_KEYS.map((layerKey, index) => [layerKey, index]));

const defaultDependencies: IndividualResultsDependencies = {
  async resolveAuthenticatedUserId() {
    const appUser = await resolveAuthenticatedAppUser();
    return appUser?.dbUserId ?? null;
  },
  async getLatestAssessmentForUser(userId) {
    const result = await queryDb<AssessmentContextRow>(
      `SELECT a.id, a.user_id, a.organisation_id, a.assessment_version_id, a.status, a.started_at,
              a.completed_at, a.last_activity_at, a.progress_count, a.progress_percent,
              a.current_question_index, a.scoring_status, a.source, a.metadata_json,
              a.created_at, a.updated_at, av.key AS version_key, av.total_questions
       FROM assessments a
       LEFT JOIN assessment_versions av ON av.id = a.assessment_version_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [userId],
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
  async getResultById(resultId) {
    const reportArtifactProjection = await getAssessmentResultReportArtifactSelectProjection('report_artifact_json')
    const result = await queryDb<AssessmentResultRow>(
      `SELECT id, assessment_id, assessment_version_id, version_key, scoring_model_key, snapshot_version, status,
              result_payload, response_quality_payload, ${reportArtifactProjection}, completed_at, scored_at, created_at, updated_at
       FROM assessment_results
       WHERE id = $1
       LIMIT 1`,
      [resultId],
    );

    return result.rows[0] ?? null;
  },
  async getLatestReadyResultForUser(userId) {
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
         AND ar.status = 'complete'
         AND (
           EXISTS (
             SELECT 1 FROM assessment_result_signals ars WHERE ars.assessment_result_id = ar.id
           )
           OR COALESCE(ar.result_payload->>'contractVersion', '') IN ('package_contract_v2', 'hybrid_mvp_v1')
         )
       ORDER BY a.completed_at DESC NULLS LAST, ar.created_at DESC
       LIMIT 1`,
      [userId],
    );

    return result.rows[0] ?? null;
  },
  async getSignalsByResultId(resultId) {
    const result = await queryDb<AssessmentResultSignalRow>(
      `SELECT id, assessment_result_id, layer_key, signal_key, raw_total, max_possible,
              normalised_score, relative_share, rank_in_layer, is_primary, is_secondary,
              percentile_placeholder, confidence_flag, created_at
       FROM assessment_result_signals
       WHERE assessment_result_id = $1`,
      [resultId],
    );

    return result.rows;
  },
};

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortSignals(signals: AssessmentResultSignalRow[]): AssessmentResultSignalRow[] {
  return [...signals].sort((a, b) => {
    const layerOrderA = LAYER_ORDER.get(a.layer_key) ?? Number.MAX_SAFE_INTEGER;
    const layerOrderB = LAYER_ORDER.get(b.layer_key) ?? Number.MAX_SAFE_INTEGER;
    if (layerOrderA !== layerOrderB) return layerOrderA - layerOrderB;

    const rankA = a.rank_in_layer ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank_in_layer ?? Number.MAX_SAFE_INTEGER;
    if (rankA !== rankB) return rankA - rankB;

    return a.signal_key.localeCompare(b.signal_key);
  });
}

function buildLayerSummaries(signals: IndividualResultSignalSummary[]): IndividualResultLayerSummary[] {
  const grouped = new Map<string, IndividualResultSignalSummary[]>();

  for (const signal of signals) {
    const bucket = grouped.get(signal.layerKey) ?? [];
    bucket.push(signal);
    grouped.set(signal.layerKey, bucket);
  }

  return [...grouped.entries()]
    .sort(([layerA], [layerB]) => {
      const orderA = LAYER_ORDER.get(layerA) ?? Number.MAX_SAFE_INTEGER;
      const orderB = LAYER_ORDER.get(layerB) ?? Number.MAX_SAFE_INTEGER;
      return orderA - orderB;
    })
    .map(([layerKey, layerSignals]) => {
      const sortedByRank = [...layerSignals].sort((a, b) => {
        const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
        const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return a.signalKey.localeCompare(b.signalKey);
      });

      return {
        layerKey,
        totalRawValue: layerSignals.reduce((total, signal) => total + signal.signalTotal, 0),
        signalCount: layerSignals.length,
        primarySignalKey: sortedByRank.find((signal) => signal.isPrimary)?.signalKey ?? sortedByRank[0]?.signalKey ?? null,
        secondarySignalKey: sortedByRank.find((signal) => signal.isSecondary)?.signalKey ?? sortedByRank[1]?.signalKey ?? null,
        rankedSignalKeys: sortedByRank.map((signal) => signal.signalKey),
      };
    });
}

function toAssessmentMetadata(
  readySnapshot: {
    versionKey: string | null
    assessmentStartedAt: string | null
    assessmentCompletedAt: string | null
  } | null,
  snapshot: AssessmentResultRow,
): IndividualResultAssessmentMetadata {
  return {
    assessmentId: snapshot.assessment_id,
    versionKey: readySnapshot?.versionKey ?? snapshot.version_key,
    startedAt: readySnapshot?.assessmentStartedAt ?? null,
    completedAt: readySnapshot?.assessmentCompletedAt ?? snapshot.completed_at,
  };
}

export async function getLatestIndividualResultForUser(
  optionsOrDependencies: { definitionId?: string | null } | Partial<IndividualResultsDependencies> = {},
  dependencies: Partial<IndividualResultsDependencies> = {},
): Promise<IndividualResultApiResponse> {
  const isDependencyBag = typeof optionsOrDependencies === 'object'
    && optionsOrDependencies !== null
    && (
      'resolveAuthenticatedUserId' in optionsOrDependencies
      || 'getLatestAssessmentForUser' in optionsOrDependencies
      || 'getLatestReadyResultForUser' in optionsOrDependencies
    )

  const options = isDependencyBag ? {} : (optionsOrDependencies as { definitionId?: string | null })
  const resolvedDependencies = {
    ...defaultDependencies,
    ...(isDependencyBag ? (optionsOrDependencies as Partial<IndividualResultsDependencies>) : dependencies),
  };

  try {
    const lifecycle = await resolveIndividualLifecycleState(
      { definitionId: options.definitionId ?? null },
      {
        resolveAuthenticatedUserId: resolvedDependencies.resolveAuthenticatedUserId,
        getLatestAssessmentForUser: resolvedDependencies.getLatestAssessmentForUser,
        getLatestResultForAssessment: resolvedDependencies.getLatestResultForAssessment,
        getSignalCountByResultId: async (resultId) => (await resolvedDependencies.getSignalsByResultId(resultId)).length,
        getLatestReadyResultForUser: resolvedDependencies.getLatestReadyResultForUser,
      },
    );

    if (lifecycle.authState === 'unauthenticated') {
      return { ok: false, state: 'unauthenticated', message: 'Authentication required.' };
    }

    const assessment = lifecycle.lifecycle.latestAssessment;
    const readySnapshot = lifecycle.lifecycle.latestReadyResult;

    if (!assessment && !readySnapshot) {
      return { ok: true, state: 'empty', message: 'No assessment found for this user.' };
    }

    if (!readySnapshot) {
      if (lifecycle.lifecycle.state === 'error') {
        return { ok: false, state: 'error', message: lifecycle.lifecycle.message };
      }

      return {
        ok: true,
        state: lifecycle.lifecycle.state === 'completed_processing' ? 'completed_processing' : 'in_progress',
        message: lifecycle.lifecycle.message,
        data: {
          assessment: assessment
            ? {
                assessmentId: assessment.assessmentId,
                versionKey: assessment.versionKey,
                startedAt: assessment.startedAt,
                completedAt: assessment.completedAt,
              }
            : undefined,
        },
      };
    }

    const snapshot = await resolvedDependencies.getResultById(readySnapshot.resultId);
    if (!snapshot || snapshot.status !== 'complete') {
      return { ok: false, state: 'error', message: 'Ready result metadata could not be loaded.' };
    }

    const hybridPayload = parseHybridMvpResultPayload(snapshot.result_payload);
    if (hybridPayload) {
      return {
        ok: true,
        state: 'ready_hybrid',
        data: {
          assessment: toAssessmentMetadata(readySnapshot, snapshot),
          snapshot: {
            resultId: snapshot.id,
            status: snapshot.status,
            scoringModelKey: snapshot.scoring_model_key,
            snapshotVersion: snapshot.snapshot_version,
            createdAt: snapshot.created_at,
            updatedAt: snapshot.updated_at,
            scoredAt: snapshot.scored_at,
          },
          hybrid: hybridPayload,
        },
      };
    }

    if (isPackageContractV2Result(snapshot)) {
      const contract = buildLiveAssessmentUserResultContract({
        assessment: {
          id: readySnapshot.assessmentId,
          user_id: lifecycle.userId,
          organisation_id: null,
          assessment_version_id: snapshot.assessment_version_id,
          status: 'completed',
          started_at: readySnapshot.assessmentStartedAt,
          completed_at: readySnapshot.assessmentCompletedAt,
          last_activity_at: readySnapshot.assessmentCompletedAt,
          progress_count: 0,
          progress_percent: '100',
          current_question_index: 0,
          scoring_status: 'scored',
          source: 'web',
          metadata_json: null,
          created_at: snapshot.created_at,
          updated_at: snapshot.updated_at,
        },
        result: snapshot,
      });

      if (contract.status === 'completed') {
        return { ok: true, state: 'ready_v2', data: contract };
      }

      return {
        ok: true,
        state: contract.status === 'pending' ? 'completed_processing' : 'results_unavailable',
        message: contract.statusMessage,
        userResult: contract,
      };
    }

    const orderedSignals = sortSignals(await resolvedDependencies.getSignalsByResultId(snapshot.id));
    if (orderedSignals.length === 0) {
      return {
        ok: true,
        state: 'completed_processing',
        message: 'Result snapshot exists but no signal rows are available yet.',
        data: {
          assessment: toAssessmentMetadata(readySnapshot, snapshot),
          snapshot: {
            resultId: snapshot.id,
            status: snapshot.status,
            scoringModelKey: snapshot.scoring_model_key,
            snapshotVersion: snapshot.snapshot_version,
            createdAt: snapshot.created_at,
            updatedAt: snapshot.updated_at,
            scoredAt: snapshot.scored_at,
          },
        },
      };
    }

    const signalSummaries = orderedSignals.map((signal) => ({
      signalKey: signal.signal_key,
      layerKey: signal.layer_key,
      signalTotal: toNumber(signal.raw_total),
      normalisedScore: toNumber(signal.normalised_score),
      relativeShare: toNumber(signal.relative_share),
      rank: signal.rank_in_layer,
      isPrimary: signal.is_primary,
      isSecondary: signal.is_secondary,
    }));

    const summaryJson = snapshot.result_payload;

    return {
      ok: true,
      state: 'ready',
      data: {
        assessment: toAssessmentMetadata(readySnapshot, snapshot),
        snapshot: {
          resultId: snapshot.id,
          status: snapshot.status,
          scoringModelKey: snapshot.scoring_model_key,
          snapshotVersion: snapshot.snapshot_version,
          createdAt: snapshot.created_at,
          updatedAt: snapshot.updated_at,
          scoredAt: snapshot.scored_at,
        },
        layers: buildLayerSummaries(signalSummaries),
        signals: signalSummaries,
        summaryJson,
      },
    };
  } catch (error) {
    console.error('getLatestIndividualResultForUser failed:', error);
    return {
      ok: false,
      state: 'error',
      message: 'Unable to load the latest individual results right now.',
    };
  }
}

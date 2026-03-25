import type { AssessmentResultRow, AssessmentResultSignalRow } from '@/lib/assessment-types'
import { queryDb } from '@/lib/db'
import { buildIndividualResultsCategorySqlPredicate } from '@/lib/assessment/assessment-category-taxonomy'
import { ASSESSMENT_LAYER_KEYS } from '@/lib/scoring/constants'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { INDIVIDUAL_ASSESSMENT_DEFINITION_CATEGORY_SQL } from '@/lib/server/assessment-definition-category'
import { parseHybridMvpResultPayload } from '@/lib/server/hybrid-mvp-result'
import {
  buildLiveAssessmentUserResultContract,
  isPackageContractV2Result,
} from '@/lib/server/live-assessment-user-result'
import type {
  IndividualResultApiResponse,
  IndividualResultLayerSummary,
  IndividualResultSignalSummary,
} from '@/lib/server/individual-results'

interface ResultDetailRow extends AssessmentResultRow {
  assessment_started_at: string | null
  assessment_completed_at: string | null
  assessment_version_key: string | null
}

interface IndividualResultDetailDependencies {
  resolveAuthenticatedAppUser: typeof resolveAuthenticatedAppUser
  queryDb: typeof queryDb
}

const defaultDependencies: IndividualResultDetailDependencies = {
  resolveAuthenticatedAppUser,
  queryDb,
}

const LAYER_ORDER = new Map<string, number>(ASSESSMENT_LAYER_KEYS.map((layerKey, index) => [layerKey, index]))

function toNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function sortSignals(signals: AssessmentResultSignalRow[]): AssessmentResultSignalRow[] {
  return [...signals].sort((a, b) => {
    const layerOrderA = LAYER_ORDER.get(a.layer_key) ?? Number.MAX_SAFE_INTEGER
    const layerOrderB = LAYER_ORDER.get(b.layer_key) ?? Number.MAX_SAFE_INTEGER
    if (layerOrderA !== layerOrderB) return layerOrderA - layerOrderB

    const rankA = a.rank_in_layer ?? Number.MAX_SAFE_INTEGER
    const rankB = b.rank_in_layer ?? Number.MAX_SAFE_INTEGER
    if (rankA !== rankB) return rankA - rankB

    return a.signal_key.localeCompare(b.signal_key)
  })
}

function buildLayerSummaries(signals: IndividualResultSignalSummary[]): IndividualResultLayerSummary[] {
  const grouped = new Map<string, IndividualResultSignalSummary[]>()

  for (const signal of signals) {
    const bucket = grouped.get(signal.layerKey) ?? []
    bucket.push(signal)
    grouped.set(signal.layerKey, bucket)
  }

  return [...grouped.entries()]
    .sort(([layerA], [layerB]) => {
      const orderA = LAYER_ORDER.get(layerA) ?? Number.MAX_SAFE_INTEGER
      const orderB = LAYER_ORDER.get(layerB) ?? Number.MAX_SAFE_INTEGER
      return orderA - orderB
    })
    .map(([layerKey, layerSignals]) => {
      const sortedByRank = [...layerSignals].sort((a, b) => {
        const rankA = a.rank ?? Number.MAX_SAFE_INTEGER
        const rankB = b.rank ?? Number.MAX_SAFE_INTEGER
        if (rankA !== rankB) return rankA - rankB
        return a.signalKey.localeCompare(b.signalKey)
      })

      return {
        layerKey,
        totalRawValue: layerSignals.reduce((total, signal) => total + signal.signalTotal, 0),
        signalCount: layerSignals.length,
        primarySignalKey: sortedByRank.find((signal) => signal.isPrimary)?.signalKey ?? sortedByRank[0]?.signalKey ?? null,
        secondarySignalKey: sortedByRank.find((signal) => signal.isSecondary)?.signalKey ?? sortedByRank[1]?.signalKey ?? null,
        rankedSignalKeys: sortedByRank.map((signal) => signal.signalKey),
      }
    })
}

export async function loadIndividualResultDetailById(
  resultId: string,
  dependencies: Partial<IndividualResultDetailDependencies> = {},
): Promise<IndividualResultApiResponse> {
  const deps = { ...defaultDependencies, ...dependencies }
  const appUser = await deps.resolveAuthenticatedAppUser()
  if (!appUser) {
    return { ok: false, state: 'unauthenticated', message: 'Authentication required.' }
  }

  const resultRow = await deps.queryDb<ResultDetailRow>(
    `SELECT ar.id, ar.assessment_id, ar.assessment_version_id, ar.version_key, ar.scoring_model_key, ar.snapshot_version,
            ar.status, ar.result_payload, ar.response_quality_payload, ar.completed_at, ar.scored_at, ar.created_at, ar.updated_at,
            a.started_at AS assessment_started_at,
            a.completed_at AS assessment_completed_at,
            av.key AS assessment_version_key
     FROM assessment_results ar
     INNER JOIN assessments a ON a.id = ar.assessment_id
     LEFT JOIN assessment_versions av ON av.id = COALESCE(ar.assessment_version_id, a.assessment_version_id)
     LEFT JOIN assessment_definitions ad ON ad.id = av.assessment_definition_id
     WHERE ar.id = $1
       AND a.user_id = $2
       AND a.organisation_id IS NULL
       AND (
         ${buildIndividualResultsCategorySqlPredicate('ad.category')}
       )
     LIMIT 1`,
    [resultId, appUser.dbUserId],
  )

  const snapshot = resultRow.rows[0]
  if (!snapshot) {
    return { ok: false, state: 'error', message: 'Result not found for this user.' }
  }

  if (snapshot.status === 'pending') {
    return { ok: true, state: 'completed_processing', message: 'This result is still processing.' }
  }

  if (snapshot.status === 'failed') {
    return { ok: false, state: 'error', message: 'This result failed during processing.' }
  }

  const hybridPayload = parseHybridMvpResultPayload(snapshot.result_payload)
  if (hybridPayload) {
    return {
      ok: true,
      state: 'ready_hybrid',
      data: {
        assessment: {
          assessmentId: snapshot.assessment_id,
          versionKey: snapshot.assessment_version_key,
          startedAt: snapshot.assessment_started_at,
          completedAt: snapshot.assessment_completed_at,
        },
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
    }
  }

  if (isPackageContractV2Result(snapshot)) {
    const contract = buildLiveAssessmentUserResultContract({
      assessment: {
        id: snapshot.assessment_id,
        user_id: appUser.dbUserId,
        organisation_id: null,
        assessment_version_id: snapshot.assessment_version_id,
        status: 'completed',
        started_at: snapshot.assessment_started_at,
        completed_at: snapshot.assessment_completed_at,
        last_activity_at: snapshot.assessment_completed_at,
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
    })

    if (contract.status === 'completed') {
      return { ok: true, state: 'ready_v2', data: contract }
    }

    return {
      ok: true,
      state: contract.status === 'pending' ? 'completed_processing' : 'results_unavailable',
      message: contract.statusMessage,
      userResult: contract,
    }
  }

  const signalsResult = await deps.queryDb<AssessmentResultSignalRow>(
    `SELECT id, assessment_result_id, layer_key, signal_key, raw_total, max_possible,
            normalised_score, relative_share, rank_in_layer, is_primary, is_secondary,
            percentile_placeholder, confidence_flag, created_at
     FROM assessment_result_signals
     WHERE assessment_result_id = $1`,
    [snapshot.id],
  )

  const orderedSignals = sortSignals(signalsResult.rows)
  if (orderedSignals.length === 0) {
    return {
      ok: true,
      state: 'completed_processing',
      message: 'Result snapshot exists but no signal rows are available yet.',
    }
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
  }))

  return {
    ok: true,
    state: 'ready',
    data: {
      assessment: {
        assessmentId: snapshot.assessment_id,
        versionKey: snapshot.assessment_version_key,
        startedAt: snapshot.assessment_started_at,
        completedAt: snapshot.assessment_completed_at,
      },
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
      summaryJson: snapshot.result_payload,
    },
  }
}

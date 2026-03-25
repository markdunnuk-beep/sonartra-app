import type { AssessmentResultRow, AssessmentRow } from '@/lib/assessment-types'
import { parseHybridMvpResultPayload, type HybridMvpResultPayloadViewModel } from '@/lib/server/hybrid-mvp-result'
import {
  buildLiveAssessmentUserResultContract,
  isPackageContractV2Result,
  type LiveAssessmentUserResultContract,
} from '@/lib/server/live-assessment-user-result'

export type CanonicalIndividualResultContract =
  | { kind: 'canonical_v2'; contract: LiveAssessmentUserResultContract }
  | { kind: 'historic_hybrid'; payload: HybridMvpResultPayloadViewModel }
  | { kind: 'historic_signals' }

/**
 * Single result-shape gateway for individual results.
 *
 * - canonical_v2: authoritative path for new runs.
 * - historic_hybrid + historic_signals: explicit compatibility for persisted legacy records.
 */
export function classifyIndividualResultContract(result: AssessmentResultRow): CanonicalIndividualResultContract {
  if (isPackageContractV2Result(result)) {
    return {
      kind: 'canonical_v2',
      contract: buildLiveAssessmentUserResultContract({
        assessment: toCompletedAssessmentStub(result),
        result,
      }),
    }
  }

  const hybridPayload = parseHybridMvpResultPayload(result.result_payload)
  if (hybridPayload) {
    return { kind: 'historic_hybrid', payload: hybridPayload }
  }

  return { kind: 'historic_signals' }
}

function toCompletedAssessmentStub(result: AssessmentResultRow): AssessmentRow {
  const completedAt = result.completed_at ?? result.updated_at

  return {
    id: result.assessment_id,
    user_id: 'individual-result-owner',
    organisation_id: null,
    assessment_version_id: result.assessment_version_id,
    status: 'completed',
    started_at: completedAt,
    completed_at: completedAt,
    last_activity_at: completedAt,
    progress_count: 0,
    progress_percent: '100',
    current_question_index: 0,
    scoring_status: 'scored',
    source: 'web',
    metadata_json: null,
    created_at: result.created_at,
    updated_at: result.updated_at,
  }
}

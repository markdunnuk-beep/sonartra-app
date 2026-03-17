import { PoolClient } from 'pg';

import { queryDb, withTransaction } from '@/lib/db';
import { PersistAssessmentResultInput } from '@/lib/scoring/types';

interface AssessmentResultRow {
  id: string;
}

export async function createAssessmentResultSnapshot(
  input: PersistAssessmentResultInput,
  client?: PoolClient
): Promise<{ assessmentResultId: string }> {
  const execute = async (dbClient: PoolClient) => {
    const parentInsert = await dbClient.query<AssessmentResultRow>(
      `INSERT INTO assessment_results (
         assessment_id,
         assessment_version_id,
         version_key,
         scoring_model_key,
         snapshot_version,
         status,
         result_payload,
         response_quality_payload,
         completed_at,
         scored_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id`,
      [
        input.assessmentId,
        input.assessmentVersionId,
        input.versionKey,
        input.scoringModelKey,
        input.snapshotVersion,
        input.status,
        input.resultPayload,
        input.responseQualityPayload,
        input.completedAt,
        input.scoredAt,
      ]
    );

    const assessmentResultId = parentInsert.rows[0]?.id;

    if (!assessmentResultId) {
      throw new Error('Failed to create assessment result snapshot row.');
    }

    if (input.signalRows.length > 0) {
      const values: unknown[] = [];
      const tuples: string[] = [];

      input.signalRows.forEach((signal, index) => {
        const base = index * 10;
        tuples.push(
          `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`
        );

        values.push(
          assessmentResultId,
          signal.layerKey,
          signal.signalKey,
          signal.rawTotal,
          signal.maxPossible,
          signal.normalisedScore,
          signal.relativeShare,
          signal.rankInLayer,
          signal.isPrimary,
          signal.isSecondary
        );
      });

      await dbClient.query(
        `INSERT INTO assessment_result_signals (
           assessment_result_id,
           layer_key,
           signal_key,
           raw_total,
           max_possible,
           normalised_score,
           relative_share,
           rank_in_layer,
           is_primary,
           is_secondary
         ) VALUES ${tuples.join(',')}`,
        values
      );
    }

    return { assessmentResultId };
  };

  if (client) {
    return execute(client);
  }

  return withTransaction(execute);
}

export async function getAssessmentResultSnapshotsByAssessmentId(assessmentId: string) {
  return queryDb(
    `SELECT id, assessment_id, assessment_version_id, version_key, scoring_model_key, snapshot_version, status,
            result_payload, response_quality_payload, completed_at, scored_at, created_at, updated_at
     FROM assessment_results
     WHERE assessment_id = $1
     ORDER BY created_at DESC`,
    [assessmentId]
  );
}

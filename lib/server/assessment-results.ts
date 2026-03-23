import { PoolClient } from 'pg';

import { queryDb, withTransaction } from '@/lib/db';
import { AssessmentResultRow as AssessmentResultSnapshotRow, AssessmentResultSignalRow } from '@/lib/assessment-types';
import {
  FailedAssessmentResultPayload,
  PersistAssessmentResultInput,
  PersistFailedAssessmentResultInput,
  PersistSuccessfulAssessmentResultInput,
  ResultStatus,
} from '@/lib/scoring/types';

interface AssessmentResultIdRow {
  id: string;
  status: ResultStatus;
}

async function upsertAssessmentResultParent(
  input: {
    assessmentId: string;
    assessmentVersionId: string;
    versionKey: string;
    scoringModelKey: string;
    snapshotVersion: number;
    status: ResultStatus;
    resultPayload: Record<string, unknown> | null;
    responseQualityPayload: Record<string, unknown> | null;
    completedAt: string | null;
    scoredAt: string | null;
  },
  dbClient: PoolClient
) {
  const existing = await dbClient.query<AssessmentResultIdRow>(
    `SELECT id, status
     FROM assessment_results
     WHERE assessment_id = $1 AND snapshot_version = $2
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE`,
    [input.assessmentId, input.snapshotVersion]
  );

  const existingRow = existing.rows[0];

  if (existingRow) {
    const update = await dbClient.query<AssessmentResultIdRow>(
      `UPDATE assessment_results
       SET
         assessment_version_id = $2,
         version_key = $3,
         scoring_model_key = $4,
         status = $5,
         result_payload = $6,
         response_quality_payload = $7,
         completed_at = $8,
         scored_at = $9,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, status`,
      [
        existingRow.id,
        input.assessmentVersionId,
        input.versionKey,
        input.scoringModelKey,
        input.status,
        input.resultPayload,
        input.responseQualityPayload,
        input.completedAt,
        input.scoredAt,
      ]
    );

    return update.rows[0];
  }

  const inserted = await dbClient.query<AssessmentResultIdRow>(
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
     RETURNING id, status`,
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

  return inserted.rows[0];
}

export async function createAssessmentResultSnapshot(
  input: PersistAssessmentResultInput,
  client?: PoolClient
): Promise<{ assessmentResultId: string }> {
  return persistSuccessfulAssessmentResult(input, client);
}

export async function persistSuccessfulAssessmentResult(
  input: PersistSuccessfulAssessmentResultInput,
  client?: PoolClient
): Promise<{ assessmentResultId: string }> {
  const execute = async (dbClient: PoolClient) => {
    const parent = await upsertAssessmentResultParent(
      {
        assessmentId: input.assessmentId,
        assessmentVersionId: input.assessmentVersionId,
        versionKey: input.versionKey,
        scoringModelKey: input.scoringModelKey,
        snapshotVersion: input.snapshotVersion,
        status: 'complete',
        resultPayload: input.resultPayload as unknown as Record<string, unknown>,
        responseQualityPayload: input.responseQualityPayload as unknown as Record<string, unknown>,
        completedAt: input.completedAt,
        scoredAt: input.scoredAt,
      },
      dbClient
    );

    if (!parent?.id) {
      throw new Error('Failed to upsert assessment result snapshot row.');
    }

    await dbClient.query('DELETE FROM assessment_result_signals WHERE assessment_result_id = $1', [parent.id]);

    if (input.signalRows.length > 0) {
      const values: unknown[] = [];
      const tuples: string[] = [];

      input.signalRows.forEach((signal, index) => {
        const base = index * 10;
        tuples.push(
          `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9},$${base + 10})`
        );

        values.push(
          parent.id,
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

    return { assessmentResultId: parent.id };
  };

  if (client) {
    return execute(client);
  }

  return withTransaction(execute);
}

export async function persistFailedAssessmentResult(
  input: PersistFailedAssessmentResultInput,
  client?: PoolClient
): Promise<{ assessmentResultId: string }> {
  const execute = async (dbClient: PoolClient) => {
    const payload: FailedAssessmentResultPayload = { failure: input.failure };

    const parent = await upsertAssessmentResultParent(
      {
        assessmentId: input.assessmentId,
        assessmentVersionId: input.assessmentVersionId,
        versionKey: input.versionKey,
        scoringModelKey: input.scoringModelKey,
        snapshotVersion: input.snapshotVersion,
        status: 'failed',
        resultPayload: payload as unknown as Record<string, unknown>,
        responseQualityPayload: null,
        completedAt: input.completedAt,
        scoredAt: input.scoredAt,
      },
      dbClient
    );

    if (!parent?.id) {
      throw new Error('Failed to persist failed assessment result row.');
    }

    await dbClient.query('DELETE FROM assessment_result_signals WHERE assessment_result_id = $1', [parent.id]);

    return { assessmentResultId: parent.id };
  };

  if (client) {
    return execute(client);
  }

  return withTransaction(execute);
}


export async function persistStructuredAssessmentResult(
  input: {
    assessmentId: string;
    assessmentVersionId: string;
    versionKey: string;
    scoringModelKey: string;
    snapshotVersion: number;
    status: ResultStatus;
    resultPayload: Record<string, unknown> | null;
    responseQualityPayload: Record<string, unknown> | null;
    completedAt: string | null;
    scoredAt: string | null;
  },
  client?: PoolClient
): Promise<{ assessmentResultId: string }> {
  const execute = async (dbClient: PoolClient) => {
    const parent = await upsertAssessmentResultParent(
      {
        assessmentId: input.assessmentId,
        assessmentVersionId: input.assessmentVersionId,
        versionKey: input.versionKey,
        scoringModelKey: input.scoringModelKey,
        snapshotVersion: input.snapshotVersion,
        status: input.status,
        resultPayload: input.resultPayload,
        responseQualityPayload: input.responseQualityPayload,
        completedAt: input.completedAt,
        scoredAt: input.scoredAt,
      },
      dbClient
    );

    if (!parent?.id) {
      throw new Error('Failed to persist structured assessment result row.');
    }

    await dbClient.query('DELETE FROM assessment_result_signals WHERE assessment_result_id = $1', [parent.id]);

    return { assessmentResultId: parent.id };
  };

  if (client) {
    return execute(client);
  }

  return withTransaction(execute);
}

export async function getLatestAssessmentResultSnapshot(assessmentId: string, client?: PoolClient) {
  const dbClient = client ?? null;
  const query = `SELECT id, status
                 FROM assessment_results
                 WHERE assessment_id = $1
                 ORDER BY created_at DESC
                 LIMIT 1`;

  if (dbClient) {
    const result = await dbClient.query<AssessmentResultIdRow>(query, [assessmentId]);
    return result.rows[0] ?? null;
  }

  const result = await queryDb<AssessmentResultIdRow>(query, [assessmentId]);
  return result.rows[0] ?? null;
}

export async function getAssessmentResultByAssessmentId(
  assessmentId: string,
  client?: PoolClient
): Promise<AssessmentResultSnapshotRow | null> {
  const query = `SELECT id, assessment_id, assessment_version_id, version_key, scoring_model_key, snapshot_version, status,
                        result_payload, response_quality_payload, completed_at, scored_at, created_at, updated_at
                 FROM assessment_results
                 WHERE assessment_id = $1
                 ORDER BY created_at DESC
                 LIMIT 1`;

  if (client) {
    const result = await client.query<AssessmentResultSnapshotRow>(query, [assessmentId]);
    return result.rows[0] ?? null;
  }

  const result = await queryDb<AssessmentResultSnapshotRow>(query, [assessmentId]);
  return result.rows[0] ?? null;
}

export async function getAssessmentResultSignalsByResultId(
  assessmentResultId: string,
  client?: PoolClient
): Promise<AssessmentResultSignalRow[]> {
  const query = `SELECT id, assessment_result_id, layer_key, signal_key, raw_total, max_possible,
                        normalised_score, relative_share, rank_in_layer, is_primary, is_secondary,
                        percentile_placeholder, confidence_flag, created_at
                 FROM assessment_result_signals
                 WHERE assessment_result_id = $1`;

  if (client) {
    const result = await client.query<AssessmentResultSignalRow>(query, [assessmentResultId]);
    return result.rows;
  }

  const result = await queryDb<AssessmentResultSignalRow>(query, [assessmentResultId]);
  return result.rows;
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

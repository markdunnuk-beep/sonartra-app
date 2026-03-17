import assert from 'node:assert/strict';
import test from 'node:test';

import { completeAssessmentWithResults } from '../lib/server/assessment-completion';
import { doesUserHaveCompletedResult } from '../lib/server/navigation-state';

type FakeClient = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
};

test('completion succeeds when response count matches version total and latest snapshot table lookup is unavailable', async () => {
  let transactionCall = 0;
  let scoringStatusUpdates = 0;

  const lifecycleClient: FakeClient = {
    async query(text: string) {
      if (text.includes('FROM assessments a') && text.includes('assessment_versions')) {
        return {
          rows: [
            {
              id: 'assessment-1',
              status: 'in_progress',
              total_questions: 80,
              assessment_version_id: 'version-1',
              version_key: 'wplp80-v1',
              started_at: '2026-01-01T10:00:00.000Z',
              completed_at: null,
              scoring_status: 'not_scored',
            },
          ],
        };
      }

      if (text.includes('COUNT(*)::int AS response_count')) {
        return { rows: [{ response_count: '80' }] };
      }

      if (text.includes("SET\n           status = 'completed'")) {
        return { rows: [{ completed_at: '2026-01-01T10:05:00.000Z' }] };
      }

      throw new Error(`Unexpected lifecycle query: ${text}`);
    },
  };

  const scoringClient: FakeClient = {
    async query(text: string) {
      if (text.includes('SET scoring_status = $2')) {
        scoringStatusUpdates += 1;
        return { rows: [] };
      }

      throw new Error(`Unexpected scoring query: ${text}`);
    },
  };

  const result = await completeAssessmentWithResults(
    'assessment-1',
    {
      fetchScoringInput: async () => ({
        assessmentId: 'assessment-1',
        assessmentVersionId: 'version-1',
        versionKey: 'wplp80-v1',
        scoringModelKey: 'wplp80-signal-model-v1',
        snapshotVersion: 1,
        completedAt: '2026-01-01T10:05:00.000Z',
        startedAt: '2026-01-01T10:00:00.000Z',
        responses: [],
        mappings: [],
      }),
      score: () => ({
        snapshot: {
          assessmentId: 'assessment-1',
          assessmentVersionId: 'version-1',
          versionKey: 'wplp80-v1',
          scoringModelKey: 'wplp80-signal-model-v1',
          snapshotVersion: 1,
          scoredAt: '2026-01-01T10:05:10.000Z',
          layers: [],
          responseQuality: {
            completionDurationSeconds: 300,
            responseQualityStatus: 'normal',
            responseQualityFlags: [],
            timingSummary: { hasResponseTimings: false, timedResponseCount: 0 },
          },
        },
        responseQuality: {
          completionDurationSeconds: 300,
          responseQualityStatus: 'normal',
          responseQualityFlags: [],
          timingSummary: { hasResponseTimings: false, timedResponseCount: 0 },
        },
        signals: [],
      }),
      persistSuccess: async () => ({ assessmentResultId: 'result-1' }),
      persistFailed: async () => ({ assessmentResultId: 'result-failed-1' }),
    },
    {
      runInTransaction: async (work) => {
        transactionCall += 1;

        if (transactionCall === 1) {
          return work(lifecycleClient as never);
        }

        return work(scoringClient as never);
      },
      getLatestResultSnapshot: async () => {
        const missingRelation = new Error('relation "assessment_results" does not exist') as Error & { code?: string };
        missingRelation.code = '42P01';
        throw missingRelation;
      },
    }
  );

  assert.equal(result.httpStatus, 200);
  assert.equal(result.body.ok, true);
  if (!result.body.ok) return;

  assert.equal(result.body.resultStatus, 'succeeded');
  assert.equal(result.body.resultId, 'result-1');
  assert.equal(scoringStatusUpdates, 1);
});

test('completion validation uses version total_questions and reports mismatch', async () => {
  const result = await completeAssessmentWithResults(
    'assessment-1',
    {
      fetchScoringInput: async () => {
        throw new Error('should not score when responses are incomplete');
      },
      score: () => {
        throw new Error('should not score when responses are incomplete');
      },
      persistSuccess: async () => ({ assessmentResultId: 'unused' }),
      persistFailed: async () => ({ assessmentResultId: 'unused' }),
    },
    {
      runInTransaction: async (work) =>
        work({
          query: async (text: string) => {
            if (text.includes('FROM assessments a') && text.includes('assessment_versions')) {
              return {
                rows: [
                  {
                    id: 'assessment-1',
                    status: 'in_progress',
                    total_questions: 80,
                    assessment_version_id: 'version-1',
                    version_key: 'wplp80-v1',
                    started_at: '2026-01-01T10:00:00.000Z',
                    completed_at: null,
                    scoring_status: 'not_scored',
                  },
                ],
              };
            }

            if (text.includes('COUNT(*)::int AS response_count')) {
              return { rows: [{ response_count: '79' }] };
            }

            throw new Error(`Unexpected query: ${text}`);
          },
        } as never),
      getLatestResultSnapshot: async () => null,
    }
  );

  assert.equal(result.httpStatus, 400);
  assert.deepEqual(result.body, {
    ok: false,
    error: 'Assessment cannot be completed. Expected 80 responses, found 79.',
  });
});

test('navigation-state returns true when completed result exists', async () => {
  const hasCompleted = await doesUserHaveCompletedResult('user-1', {
    query: async () => ({ rows: [{ has_completed_result: true }] } as never),
  });

  assert.equal(hasCompleted, true);
});

test('navigation-state tolerates missing assessment_results relation and returns false', async () => {
  const hasCompleted = await doesUserHaveCompletedResult('user-1', {
    query: async () => {
      const missingRelation = new Error('relation "assessment_results" does not exist') as Error & { code?: string };
      missingRelation.code = '42P01';
      throw missingRelation;
    },
  });

  assert.equal(hasCompleted, false);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { GET } from '../app/api/assessments/[id]/result/route';

async function callRoute(id: string) {
  const response = await GET(new Request('http://localhost/api/assessments/result'), { params: { id } });
  return {
    status: response.status,
    body: (await response.json()) as Record<string, unknown>,
  };
}

test('route returns 404 when assessment does not exist', async (t) => {
  t.mock.method(await import('../lib/server/assessment-result-read'), 'getAssessmentResultReadModel', async () => ({ kind: 'not_found' as const }));

  const response = await callRoute('missing-assessment');

  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Assessment not found.');
});

test('route returns 200 with unavailable when assessment is incomplete', async (t) => {
  t.mock.method(await import('../lib/server/assessment-result-read'), 'getAssessmentResultReadModel', async () => ({
    kind: 'ok' as const,
    body: {
      ok: true,
      assessmentId: 'assessment-1',
      assessmentStatus: 'in_progress',
      scoringStatus: 'not_scored',
      result: {
        availability: 'unavailable' as const,
        reason: 'assessment_incomplete' as const,
        message: 'Assessment has not been completed yet.',
      },
    },
  }));

  const response = await callRoute('assessment-1');
  assert.equal(response.status, 200);
  assert.equal((response.body.result as { availability: string }).availability, 'unavailable');
});

test('route returns 200 for persisted success result', async (t) => {
  t.mock.method(await import('../lib/server/assessment-result-read'), 'getAssessmentResultReadModel', async () => ({
    kind: 'ok' as const,
    body: {
      ok: true,
      assessmentId: 'assessment-1',
      assessmentStatus: 'completed',
      scoringStatus: 'scored',
      result: {
        availability: 'available' as const,
        status: 'complete' as const,
        id: 'result-1',
        assessmentVersionId: 'version-1',
        versionKey: 'wplp80-v1',
        scoringModelKey: 'wplp80-signal-model-v1',
        snapshotVersion: 1,
        completedAt: null,
        scoredAt: null,
        createdAt: '2026-01-01T10:05:11.000Z',
        updatedAt: '2026-01-01T10:05:11.000Z',
        snapshot: null,
        responseQuality: null,
        signals: [],
      },
    },
  }));

  const response = await callRoute('assessment-1');
  assert.equal(response.status, 200);
  assert.equal((response.body.result as { availability: string }).availability, 'available');
});

test('route returns 200 for persisted failed result', async (t) => {
  t.mock.method(await import('../lib/server/assessment-result-read'), 'getAssessmentResultReadModel', async () => ({
    kind: 'ok' as const,
    body: {
      ok: true,
      assessmentId: 'assessment-1',
      assessmentStatus: 'completed',
      scoringStatus: 'failed',
      result: {
        availability: 'available' as const,
        status: 'failed' as const,
        id: 'result-1',
        assessmentVersionId: 'version-1',
        versionKey: 'wplp80-v1',
        scoringModelKey: 'wplp80-signal-model-v1',
        snapshotVersion: 1,
        completedAt: null,
        scoredAt: null,
        createdAt: '2026-01-01T10:05:11.000Z',
        updatedAt: '2026-01-01T10:05:11.000Z',
        failure: null,
        signals: [],
      },
    },
  }));

  const response = await callRoute('assessment-1');
  assert.equal(response.status, 200);
  assert.equal((response.body.result as { availability: string; status: string }).status, 'failed');
});

test('route returns 200 when completed assessment has no result snapshot', async (t) => {
  t.mock.method(await import('../lib/server/assessment-result-read'), 'getAssessmentResultReadModel', async () => ({
    kind: 'ok' as const,
    body: {
      ok: true,
      assessmentId: 'assessment-1',
      assessmentStatus: 'completed',
      scoringStatus: 'pending',
      result: {
        availability: 'unavailable' as const,
        reason: 'result_missing' as const,
        message: 'Assessment is complete but no persisted result snapshot is available yet.',
      },
    },
  }));

  const response = await callRoute('assessment-1');
  assert.equal(response.status, 200);
  assert.equal((response.body.result as { reason: string }).reason, 'result_missing');
});

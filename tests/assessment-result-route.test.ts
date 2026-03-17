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

test('route returns 401 when user is not authenticated', async (t) => {
  t.mock.method(await import('../lib/server/auth'), 'resolveAuthenticatedAppUser', async () => null);

  const response = await callRoute('assessment-1');
  assert.equal(response.status, 401);
});

test('route returns 404 when assessment does not exist', async (t) => {
  t.mock.method(await import('../lib/server/auth'), 'resolveAuthenticatedAppUser', async () => ({ clerkUserId: 'clerk-1', dbUserId: 'user-1', email: 'user@example.com' }));
  t.mock.method(await import('../lib/server/assessment-result-read'), 'getAssessmentResultReadModel', async () => ({ kind: 'not_found' as const }));

  const response = await callRoute('missing-assessment');

  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Assessment not found.');
});

test('route returns 200 with unavailable when assessment is incomplete', async (t) => {
  t.mock.method(await import('../lib/server/auth'), 'resolveAuthenticatedAppUser', async () => ({ clerkUserId: 'clerk-1', dbUserId: 'user-1', email: 'user@example.com' }));
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

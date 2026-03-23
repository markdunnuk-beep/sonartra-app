import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveAssessmentReportRoute } from '../app/api/assessment-results/[resultId]/report/route-handler'

async function callRoute(
  url = 'http://localhost/api/assessment-results/result-1/report',
  deps?: Parameters<typeof resolveAssessmentReportRoute>[2],
) {
  const response = await resolveAssessmentReportRoute(new Request(url), { resultId: 'result-1' }, deps)
  return {
    status: response.status,
    headers: Object.fromEntries(response.headers.entries()),
    body: response.headers.get('content-type')?.includes('application/json') ? await response.json() : await response.text(),
  }
}

test('report route returns 401 when unauthenticated', async () => {
  const response = await callRoute(undefined, {
    resolveAuthenticatedUser: async () => null,
    getArtifact: async () => ({ kind: 'not_found' }),
  })

  assert.equal(response.status, 401)
})

test('report route streams html inline when an artifact is available', async () => {
  const response = await callRoute(undefined, {
    resolveAuthenticatedUser: async () => ({ clerkUserId: 'clerk-1', dbUserId: 'user-1', email: 'user@example.com' }),
    getArtifact: async () => ({
      kind: 'available' as const,
      body: '<html><body>report</body></html>',
      fileName: 'adaptive-balance-report.html',
      mediaType: 'text/html; charset=utf-8' as const,
      view: {
        state: 'available' as const,
        format: 'html' as const,
        generatedAt: '2026-03-23T12:00:00.000Z',
        label: 'Report available',
        message: 'Your downloadable assessment report is ready.',
        downloadHref: '/api/assessment-results/result-1/report?download=1',
        viewHref: '/api/assessment-results/result-1/report',
      },
    }),
  })

  assert.equal(response.status, 200)
  assert.match(response.headers['content-type'] ?? '', /text\/html/)
  assert.match(response.headers['content-disposition'] ?? '', /inline/)
  assert.match(response.body as string, /report/)
})

test('report route returns a safe unavailable payload when report generation fails safely', async () => {
  const response = await callRoute(undefined, {
    resolveAuthenticatedUser: async () => ({ clerkUserId: 'clerk-1', dbUserId: 'user-1', email: 'user@example.com' }),
    getArtifact: async () => ({
      kind: 'unavailable' as const,
      view: {
        state: 'failed' as const,
        format: null,
        generatedAt: null,
        label: 'Report unavailable',
        message: 'The report could not be prepared safely right now. Please try again later.',
        downloadHref: '/api/assessment-results/result-1/report?download=1',
        viewHref: '/api/assessment-results/result-1/report',
      },
    }),
  })

  assert.equal(response.status, 409)
  assert.equal((response.body as { report: { state: string } }).report.state, 'failed')
})

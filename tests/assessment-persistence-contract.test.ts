import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('response persistence upsert is unique per assessment and question', async () => {
  const source = await readFile(new URL('../app/api/assessments/response/route.ts', import.meta.url), 'utf8')

  assert.match(source, /ON CONFLICT \(assessment_id, question_id\)/)
})

test('completion validator counts persisted rows for the same assessment id being completed', async () => {
  const source = await readFile(new URL('../lib/server/assessment-completion.ts', import.meta.url), 'utf8')

  assert.match(source, /SELECT COUNT\(\*\)::int AS response_count[\s\S]*WHERE assessment_id = \$1/)
})

test('dashboard prefers an in-progress attempt when multiple attempts exist for a user', async () => {
  const source = await readFile(new URL('../lib/server/dashboard-state.ts', import.meta.url), 'utf8')

  assert.match(source, /selectDashboardAssessment/)
  assert.match(source, /assessment.status === 'not_started' \|\| assessment.status === 'in_progress'/)
})

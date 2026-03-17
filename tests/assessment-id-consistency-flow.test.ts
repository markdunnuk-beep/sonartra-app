import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('assessment flow keeps explicit assessment_id across start/save/complete/dashboard contracts', async () => {
  const startRoute = await readFile(new URL('../app/api/assessments/start/route.ts', import.meta.url), 'utf8')
  const responseRoute = await readFile(new URL('../app/api/assessments/response/route.ts', import.meta.url), 'utf8')
  const completeRoute = await readFile(new URL('../app/api/assessments/complete/route.ts', import.meta.url), 'utf8')
  const dashboardState = await readFile(new URL('../lib/server/dashboard-state.ts', import.meta.url), 'utf8')

  assert.match(startRoute, /assessmentId: result\.id/)
  assert.match(startRoute, /assessmentId: existingAssessment\.rows\[0\]\.id/)

  assert.match(responseRoute, /assessmentId is required\./)
  assert.match(responseRoute, /WHERE a\.id = \$1/)
  assert.match(responseRoute, /\[body\.assessmentId, body\.questionId, body\.responseValue/)
  assert.match(responseRoute, /assessmentId: body\.assessmentId/)

  assert.match(completeRoute, /assessmentId is required\./)
  assert.match(completeRoute, /WHERE id = \$1 AND user_id = \$2/)
  assert.match(completeRoute, /completeAssessmentWithResults\(body\.assessmentId\)/)

  assert.match(dashboardState, /getActiveAssessment\(dbUserId, activeAssessmentId\)/)
  assert.match(dashboardState, /CASE WHEN status IN \('not_started', 'in_progress'\) THEN 0 ELSE 1 END/)
  assert.match(dashboardState, /const activeAssessmentId = options\.activeAssessmentId \?\? null/)
  assert.doesNotMatch(dashboardState, /ORDER BY updated_at DESC/)
})

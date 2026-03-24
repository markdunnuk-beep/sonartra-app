import assert from 'node:assert/strict'
import test from 'node:test'

import hybridFixture from './fixtures/assessments/hybrid/dashboard-visibility-test-hybrid.json'
import { validateHybridMvpDefinitionPayload } from '../lib/admin/domain/hybrid-mvp-definition'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import { type HybridMvpAssessmentDefinition, scoreHybridMvpAssessment } from '../lib/assessment/hybrid-mvp-scoring'

const hybridFixtureDefinition = hybridFixture as HybridMvpAssessmentDefinition

test('dashboard visibility hybrid fixture is validator-accurate and import/publish ready', () => {
  const validated = validateHybridMvpDefinitionPayload(hybridFixture)

  assert.equal(validated.ok, true)
  assert.equal(validated.status, 'valid')
  assert.equal(validated.errors.length, 0)
  assert.equal(validated.normalizedDefinition?.assessmentKey, 'hybrid-dashboard-visibility')

  const imported = importAssessmentPackagePayload(hybridFixture)
  assert.equal(imported.validationSummary.success, true)
  assert.equal(imported.detectedVersion, 'hybrid_mvp_v1')
  assert.equal(imported.readiness.importable, true)
  assert.equal(imported.readiness.publishable, true)
  assert.equal(imported.readiness.runtimeExecutable, true)
})

test('dashboard visibility hybrid fixture scores deterministically and renders report sections', () => {
  const scored = scoreHybridMvpAssessment(hybridFixtureDefinition, {
    q_decision_approach: 'q_decision_approach_opt_fast_call',
    q_team_discussion: 'q_team_discussion_opt_drive_outcome',
    q_ambiguity_response: 'q_ambiguity_response_opt_choose_path',
  })

  assert.equal(scored.ok, true)
  if (!scored.ok) return

  assert.equal(scored.result.rankedSignals[0]?.signalId, 'sig_decisive')
  assert.equal(scored.result.report.sections.length, 5)
  assert.deepEqual(
    scored.result.report.sections.map((section) => section.id),
    ['overview', 'strengths', 'watchouts', 'development_focus', 'domain_summaries'],
  )
})

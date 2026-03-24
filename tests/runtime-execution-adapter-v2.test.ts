import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import {
  executePreparedRuntimeExecutionBundleV2,
  normalizeAssessmentResponsesForRuntimeExecution,
  preparePackageExecutionBundleForAssessmentVersion,
} from '../lib/admin/domain/runtime-execution-adapter-v2'

test('prepare bundle resolves canonical package v2 to compiled runtime artifact and plan', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const prepared = preparePackageExecutionBundleForAssessmentVersion({
    storedPackage: imported.definitionPayload,
    analysis: imported.analysis,
  })

  assert.equal(prepared.ok, true)
  assert.equal(prepared.bundle?.source, 'canonical_contract_v2')
  assert.ok(prepared.bundle?.compiledRuntimePlan)
  assert.ok(prepared.bundle?.runtimeArtifact)
})

test('prepare bundle resolves runtime contract v2 directly and executes deterministically', () => {
  const canonical = importAssessmentPackagePayload(examplePackage)
  const runtime = importAssessmentPackagePayload(canonical.analysis.compiledRuntimeArtifact!)

  const prepared = preparePackageExecutionBundleForAssessmentVersion({ storedPackage: runtime.definitionPayload })
  assert.equal(prepared.ok, true)
  assert.equal(prepared.bundle?.source, 'runtime_contract_v2')

  const normalized = normalizeAssessmentResponsesForRuntimeExecution({ responses: { 'q-energy-level': 'often' } })
  const executed = executePreparedRuntimeExecutionBundleV2({
    bundle: prepared.bundle!,
    responses: normalized.responsesByQuestionId,
    evaluationTimestamp: '2026-03-24T01:00:00.000Z',
  })

  assert.equal(executed.executionResult?.summary.timestamp, '2026-03-24T01:00:00.000Z')
  assert.ok(executed.executionResult?.stages.scoring)
})

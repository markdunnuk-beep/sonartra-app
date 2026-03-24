import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import { executeLiveRuntimeBundleWithCompatibility } from '../lib/server/live-runtime-execution-adapter'
import { mapLiveRuntimeExecutionToPersistedCompatibilityPayload } from '../lib/server/live-runtime-result-compat'

test('mapLiveRuntimeExecutionToPersistedCompatibilityPayload keeps compatibility and runtime-v2 metadata explicit', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const executed = executeLiveRuntimeBundleWithCompatibility({
    storedDefinitionPayload: imported.definitionPayload,
    packageValidationReport: {
      analysis: {
        classifier: 'runtime_contract_v2',
        readinessState: {
          capabilities: {
            liveRuntimeSupported: true,
          },
        },
      },
    },
    responses: {
      q1: 'always',
      q2: 'rarely',
      q3: 'always',
      q4: 'often',
    },
    evaluationId: 'compat-map-test',
    evaluationTimestamp: '2026-03-24T05:00:00.000Z',
  })

  const runtimeExecution = executed.executionResult.executionResult
  assert.ok(runtimeExecution)
  if (!runtimeExecution) return

  const payload = mapLiveRuntimeExecutionToPersistedCompatibilityPayload({
    bundle: executed.bundle,
    execution: runtimeExecution,
    evaluation: executed.compatibility.evaluation,
    materializedOutputs: executed.compatibility.materializedOutputs,
    completedAt: '2026-03-24T04:59:00.000Z',
    scoredAt: '2026-03-24T05:00:00.000Z',
  })

  assert.equal(payload.compatibilityShape, 'live_runtime_v2_persisted_compat/v1')
  assert.ok(payload.materializedOutputs.webSummaryOutputs.length > 0)
  assert.equal(payload.runtimeExecution.status, payload.runtimeV2.execution.status)
  assert.equal(payload.runtimeExecution.summary.timestamp, '2026-03-24T05:00:00.000Z')
})

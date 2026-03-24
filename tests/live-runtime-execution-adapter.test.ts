import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import {
  executeLiveRuntimeBundleWithCompatibility,
  resolveLiveRuntimeRoutingDecision,
} from '../lib/server/live-runtime-execution-adapter'

test('resolveLiveRuntimeRoutingDecision keeps unsupported v2 routes blocked when classifier semantics are explicit', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const decision = resolveLiveRuntimeRoutingDecision({
    packageSchemaVersion: imported.schemaVersion,
    storedDefinitionPayload: imported.definitionPayload,
    packageValidationReport: {
      analysis: {
        classifier: 'canonical_contract_v2',
        readinessState: {
          capabilities: {
            liveRuntimeSupported: false,
          },
        },
      },
      readiness: {
        liveRuntimeEnabled: false,
      },
    },
  })

  assert.equal(decision.contractVersion, 'package_contract_v2')
  assert.equal(decision.liveRuntimeSupported, false)
  assert.match(decision.reason ?? '', /not runtime-contract classified/i)
})

test('resolveLiveRuntimeRoutingDecision allows v2 live execution through explicit runtime support semantics', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const decision = resolveLiveRuntimeRoutingDecision({
    packageSchemaVersion: imported.schemaVersion,
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
      readiness: {
        liveRuntimeEnabled: true,
      },
    },
  })

  assert.equal(decision.liveRuntimeSupported, true)
  assert.equal(decision.reason, null)
})

test('executeLiveRuntimeBundleWithCompatibility runs prepared runtime bundle and returns compatibility artifacts', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const executed = executeLiveRuntimeBundleWithCompatibility({
    storedDefinitionPayload: imported.definitionPayload,
    packageValidationReport: null,
    responses: {
      q1: 'always',
      q2: 'rarely',
      q3: 'always',
      q4: 'often',
    },
    evaluationId: 'live-assessment-test',
    evaluationTimestamp: '2026-03-24T03:00:00.000Z',
  })

  assert.equal(executed.executionResult.executionResult?.summary.timestamp, '2026-03-24T03:00:00.000Z')
  assert.ok(executed.compatibility.materializedOutputs.webSummaryOutputs.length > 0)
})

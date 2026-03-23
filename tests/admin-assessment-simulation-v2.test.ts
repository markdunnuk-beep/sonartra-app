import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { materializeAssessmentOutputsV2 } from '../lib/admin/domain/assessment-package-v2-materialization'
import { evaluateAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-evaluator'
import {
  buildAdminAssessmentSimulationScenarioForPackage,
  executeAdminAssessmentSimulationForPackage,
  getAdminAssessmentSimulationWorkspaceStatus,
  parseAdminAssessmentSimulationPayloadForPackage,
} from '../lib/admin/domain/assessment-simulation'

function getValidatedFixture() {
  const validation = validateSonartraAssessmentPackageV2(examplePackage)
  assert.equal(validation.ok, true)
  return validation.normalizedPackage!
}

test('evaluatable v2 package can be simulated safely through the admin service path', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const scenario = buildAdminAssessmentSimulationScenarioForPackage(imported.definitionPayload, 'high')
  assert.ok(scenario)

  const simulation = executeAdminAssessmentSimulationForPackage(imported.definitionPayload, imported.schemaVersion, scenario!)

  assert.equal(simulation.ok, true)
  assert.equal(simulation.result?.contractVersion, 'package_contract_v2')
  assert.equal(simulation.result?.readiness?.simulatable, true)
  assert.ok((simulation.result?.materializedOutputs?.webSummaryOutputs.length ?? 0) > 0)
  assert.ok((simulation.result?.materializedOutputs?.reportDocument.sections.length ?? 0) > 0)
  assert.equal(simulation.result?.readiness?.liveRuntimeEnabled, false)
})

test('non-simulatable v2 package returns a normalized not-ready response without crashing', () => {
  const broken = {
    ...examplePackage,
    report: {
      content: [],
    },
    outputs: {
      rules: [{
        ...examplePackage.outputs.rules[0],
        metadata: {
          ...examplePackage.outputs.rules[0].metadata,
          narrativeKey: 'missing-binding',
        },
      }],
    },
  }
  const imported = importAssessmentPackagePayload(broken)
  const simulation = executeAdminAssessmentSimulationForPackage(imported.definitionPayload, imported.schemaVersion, {
    answers: [],
    responses: { q1: 'often' },
    locale: 'en-US',
    source: 'manual_json',
    scenarioKey: null,
  })

  assert.equal(simulation.ok, false)
  assert.equal(simulation.result?.readinessStatus, 'not_ready')
  assert.equal(simulation.result?.materializedOutputs, null)
  assert.ok((simulation.result?.errors?.length ?? 0) > 0)
})

test('output materializer produces stable web summary outputs and report-oriented structures from evaluation results', () => {
  const validated = getValidatedFixture()
  const compiled = compileAssessmentPackageV2(validated)
  assert.equal(compiled.ok, true)
  const evaluation = evaluateAssessmentPackageV2(compiled.executablePackage!, {
    q1: 'often',
    q2: 'rarely',
    q3: 'often',
    q4: 'often',
  })

  const materialized = materializeAssessmentOutputsV2(compiled.executablePackage!, evaluation)

  assert.ok(materialized.webSummaryOutputs.some((entry) => entry.id === 'summary:derived_dimension:adaptive-balance'))
  assert.ok(materialized.webSummaryOutputs.some((entry) => entry.id === 'output:adaptive-balance-summary'))
  assert.ok(materialized.reportDocument.sections.some((entry) => entry.key === 'triggered-outputs'))
  assert.ok(materialized.reportDocument.sections.some((entry) => entry.key === 'integrity'))
})

test('integrity findings and missing-data limitations materialize into visible notices and safe admin payloads', () => {
  const validated = getValidatedFixture()
  const compiled = compileAssessmentPackageV2(validated)
  assert.equal(compiled.ok, true)

  const warningEvaluation = evaluateAssessmentPackageV2(compiled.executablePackage!, {
    q1: 'always',
    q2: 'always',
    q3: 'often',
    q4: 'often',
  })
  const warningMaterialized = materializeAssessmentOutputsV2(compiled.executablePackage!, warningEvaluation)
  assert.ok(warningMaterialized.integrityNotices.some((entry) => /inconsistent/i.test(entry.message)))

  const limitedEvaluation = evaluateAssessmentPackageV2(compiled.executablePackage!, {
    q1: 'often',
    q3: 'often',
    q4: 'often',
  })
  const limitedMaterialized = materializeAssessmentOutputsV2(compiled.executablePackage!, limitedEvaluation)
  assert.ok(limitedMaterialized.reportDocument.sections.find((entry) => entry.key === 'limitations')?.blocks[0]?.items.some((item) => /Insufficient data/i.test(item)))
})

test('invalid simulation inputs for v2 return useful diagnostics safely', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const parsed = parseAdminAssessmentSimulationPayloadForPackage(imported.definitionPayload, imported.schemaVersion, '{"responses":"bad"}')

  assert.equal(parsed.ok, false)
  assert.match(parsed.errors[0]?.message ?? '', /responses object/i)
})

test('readiness state reflects simulatable in admin versus live runtime-enabled for v2 packages', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const status = getAdminAssessmentSimulationWorkspaceStatus({
    packageInfo: {
      status: imported.packageStatus,
      schemaVersion: imported.schemaVersion,
      sourceType: 'manual_import',
      importedAt: null,
      importedByName: null,
      sourceFilename: null,
      summary: imported.summary,
      errors: imported.errors,
      warnings: imported.warnings,
    },
    normalizedPackage: imported.definitionPayload as never,
  })

  assert.equal(status.canRunSimulation, true)
  assert.match(status.summary, /does not imply live runtime or publish readiness/i)
  assert.equal(imported.readiness.simulatable, true)
  assert.equal(imported.readiness.liveRuntimeEnabled, false)
  assert.equal(imported.readiness.publishable, false)
})

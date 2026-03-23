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

test('output materializer produces stable domain outputs without admin-only debug fields', () => {
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
  assert.ok(!('adminDebug' in materialized))
  assert.ok(!materialized.webSummaryOutputs.some((entry) => 'narrativeBindingKey' in entry.explanation || 'reportBindingKey' in entry.explanation))
})

test('integrity findings and technical diagnostics remain separated in materialized outputs', () => {
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
  assert.equal(warningMaterialized.technicalDiagnostics.length, 0)

  const limitedEvaluation = evaluateAssessmentPackageV2(compiled.executablePackage!, {
    q1: 'often',
    q3: 'often',
    q4: 'often',
  })
  const limitedMaterialized = materializeAssessmentOutputsV2(compiled.executablePackage!, limitedEvaluation)
  assert.ok(limitedMaterialized.reportDocument.sections.find((entry) => entry.key === 'limitations')?.blocks[0]?.items.some((item) => /Insufficient data/i.test(item)))
  assert.ok(limitedMaterialized.technicalDiagnostics.some((entry) => entry.stage === 'evaluation' && entry.code === 'minimum_answer_threshold_not_met'))
  assert.equal(limitedMaterialized.integrityNotices.some((entry) => /minimum answer threshold/i.test(entry.message)), false)
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

test('manual and persisted v2 scenario payload validation use the same normalization rules', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const payload = JSON.stringify({ responses: { q1: 'often', q2: 'rarely' }, locale: 'en-US', source: 'manual_json', scenarioKey: 'balanced' })

  const parsed = parseAdminAssessmentSimulationPayloadForPackage(imported.definitionPayload, imported.schemaVersion, payload)
  assert.equal(parsed.ok, true)

  const simulation = executeAdminAssessmentSimulationForPackage(imported.definitionPayload, imported.schemaVersion, parsed.normalizedRequest!)
  assert.equal(simulation.ok, true)
  assert.deepEqual(simulation.result?.debug.responsePayload, { q1: 'often', q2: 'rarely' })
  assert.equal(simulation.result?.request.locale, 'en-US')
  assert.equal(simulation.result?.request.source, 'manual_json')
})

test('admin v2 view-model adapters retain debug details outside the materialized domain contract', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const scenario = buildAdminAssessmentSimulationScenarioForPackage(imported.definitionPayload, 'balanced')
  const simulation = executeAdminAssessmentSimulationForPackage(imported.definitionPayload, imported.schemaVersion, scenario!)

  assert.equal(simulation.ok, true)
  assert.ok((simulation.result?.viewModel?.materializationDebug.triggeredOutputKeys.length ?? 0) >= 0)
  assert.equal((simulation.result?.materializedOutputs as unknown as Record<string, unknown>)?.adminDebug, undefined)
  assert.deepEqual(
    simulation.result?.viewModel?.materializedReportSections,
    simulation.result?.materializedOutputs?.reportDocument.sections,
  )
})

test('report document contract stays renderer-agnostic and avoids preview-specific copy', () => {
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
  const limitationText = materialized.reportDocument.sections.find((entry) => entry.key === 'limitations')?.blocks[0]?.text ?? ''

  assert.doesNotMatch(JSON.stringify(materialized.reportDocument), /admin preview/i)
  assert.doesNotMatch(JSON.stringify(materialized.reportDocument), /renderer readiness/i)
  assert.doesNotMatch(limitationText, /overclaim live readiness/i)
})


test('admin v2 simulation reuses the compiled runtime cache without caching simulation outputs themselves', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const infoCalls: unknown[][] = []
  const originalInfo = console.info
  console.info = (...args: unknown[]) => {
    infoCalls.push(args)
  }

  try {
    const first = executeAdminAssessmentSimulationForPackage(imported.definitionPayload, imported.schemaVersion, {
      answers: [],
      responses: { q1: 'often', q2: 'rarely', q3: 'often', q4: 'often' },
      locale: 'en-US',
      source: 'manual_json',
      scenarioKey: null,
    })
    const second = executeAdminAssessmentSimulationForPackage(imported.definitionPayload, imported.schemaVersion, {
      answers: [],
      responses: { q1: 'always', q2: 'rarely', q3: 'always', q4: 'often' },
      locale: 'en-US',
      source: 'manual_json',
      scenarioKey: null,
    })

    assert.equal(first.ok, true)
    assert.equal(second.ok, true)
    assert.notDeepEqual(first.result?.debug.responsePayload, second.result?.debug.responsePayload)
    assert.ok(infoCalls.some((call) => String(call[0]).includes('[admin-assessment-simulation-v2]') && JSON.stringify(call[1]).includes('"event":"hit"')))
  } finally {
    console.info = originalInfo
  }
})

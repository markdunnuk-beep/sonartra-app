import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { normalizeAdminAssessmentPackageImportState } from '../lib/admin/domain/assessment-management'
import { extractAssessmentPackageIdentity, importAssessmentPackagePayload, detectAssessmentPackageVersion } from '../lib/admin/server/assessment-package-import'

const hybridFixture = {
  contractVersion: 'hybrid_mvp_v1',
  assessmentId: 'hybrid-foundation-v1',
  assessmentKey: 'hybrid-foundation',
  signals: [
    { id: 's1', key: 'adaptability', label: 'Adaptability', domainId: 'd1' },
    { id: 's2', key: 'execution', label: 'Execution', domainId: 'd1' },
  ],
  domains: [
    { id: 'd1', key: 'delivery', label: 'Delivery' },
  ],
  questions: [
    {
      id: 'q1',
      prompt: 'When priorities shift quickly, I usually:',
      responseModel: 'single_select',
      options: [
        { id: 'q1_a', label: 'Re-plan quickly', signalWeights: [{ signalId: 's1', weight: 2 }] },
        { id: 'q1_b', label: 'Stay rigid', signalWeights: [{ signalId: 's2', weight: 1 }] },
      ],
    },
  ],
  outputTemplates: {
    overview: {
      default: 'Hybrid summary available.',
    },
    signalNarratives: {
      s1: { high: 'Strong adaptability signal.' },
    },
  },
}

test('v2 package detection identifies Package Contract v2 payloads', () => {
  const detected = detectAssessmentPackageVersion(examplePackage)

  assert.equal(detected.detectedVersion, 'package_contract_v2')
  assert.equal(detected.classifier, 'canonical_contract_v2')
  assert.equal(detected.schemaVersion, 'sonartra-assessment-package/v2')
  assert.equal(detected.packageName, 'Adaptive Workstyle Sample')
  assert.equal(detected.versionLabel, '2.0.0')
})

test('valid v2 package import artifact produces admin-compatible summary and readiness flags', () => {
  const result = importAssessmentPackagePayload(examplePackage)

  assert.equal(result.validationSummary.success, true)
  assert.equal(result.detectedVersion, 'package_contract_v2')
  assert.equal(result.classifier, 'canonical_contract_v2')
  assert.equal(result.analysis.payloadKind, 'canonical_authoring_payload')
  assert.equal(result.analysis.compileRequired, true)
  assert.equal(result.analysis.compiledRuntimeArtifactProduced, true)
  assert.equal(result.summary?.questionsCount, 4)
  assert.equal(result.summary?.dimensionsCount, 2)
  assert.equal(result.summary?.sectionCount, 2)
  assert.equal(result.summary?.derivedDimensionCount, 1)
  assert.equal(result.summary?.packageName, 'Adaptive Workstyle Sample')
  assert.equal(result.readiness.importable, true)
  assert.equal(result.readiness.compilable, true)
  assert.equal(result.analysis.readinessState.milestone, 'preview_simulation_ready')
  assert.equal(result.readiness.runtimeExecutable, false)
  assert.equal(result.readiness.publishable, false)
})

test('hybrid_mvp_v1 payload detection classifies the fixed hybrid contract', () => {
  const detected = detectAssessmentPackageVersion(hybridFixture)

  assert.equal(detected.detectedVersion, 'hybrid_mvp_v1')
  assert.equal(detected.classifier, 'hybrid_mvp_contract_v1')
  assert.equal(detected.schemaVersion, 'hybrid_mvp_v1')
})

test('valid hybrid import yields publishable readiness and deterministic summary metadata', () => {
  const result = importAssessmentPackagePayload(hybridFixture)

  assert.equal(result.validationSummary.success, true)
  assert.equal(result.detectedVersion, 'hybrid_mvp_v1')
  assert.equal(result.classifier, 'hybrid_mvp_contract_v1')
  assert.equal(result.analysis.contractFamily, 'hybrid')
  assert.equal(result.analysis.payloadKind, 'hybrid_definition_payload')
  assert.equal(result.readiness.importable, true)
  assert.equal(result.readiness.runtimeExecutable, true)
  assert.equal(result.readiness.publishable, true)
  assert.equal(result.summary?.questionsCount, 1)
  assert.equal(result.summary?.dimensionsCount, 1)
})

test('hybrid import rejects out-of-scope generic-engine fields and broken references', () => {
  const result = importAssessmentPackagePayload({
    ...hybridFixture,
    scripts: [{ key: 'unsafe' }],
    questions: [{
      id: 'q1',
      prompt: 'Broken',
      responseModel: 'single_select',
      options: [{ id: 'q1_a', label: 'A', signalWeights: [{ signalId: 'unknown', weight: 1 }] }],
    }],
  })

  assert.equal(result.validationSummary.success, false)
  assert.equal(result.packageStatus, 'invalid')
  assert.ok(result.errors.some((issue) => issue.path === 'scripts'))
  assert.ok(result.errors.some((issue) => issue.path.includes('signalId')))
})

test('runtime v2 payloads classify and validate as executable runtime packages without canonical transform assumptions', () => {
  const validated = validateSonartraAssessmentPackageV2(examplePackage)
  assert.equal(validated.ok, true)
  const compiled = compileAssessmentPackageV2(validated.normalizedPackage!)
  assert.equal(compiled.ok, true)

  const result = importAssessmentPackagePayload(compiled.executablePackage)
  assert.equal(result.detectedVersion, 'package_contract_v2')
  assert.equal(result.classifier, 'runtime_contract_v2')
  assert.equal(result.analysis.payloadKind, 'runtime_executable_payload')
  assert.equal(result.analysis.compileRequired, false)
  assert.equal(result.analysis.compilePerformed, false)
  assert.equal(result.readiness.runtimeExecutable, true)
  assert.equal(result.analysis.executableReady, true)
  assert.equal(result.analysis.readinessState.milestone, 'live_runtime_supported')
})

test('malformed v2 package returns normalized validation errors', () => {
  const result = importAssessmentPackagePayload({
    ...examplePackage,
    questions: [],
    sections: [],
  })

  assert.equal(result.validationSummary.success, false)
  assert.equal(result.packageStatus, 'invalid')
  assert.ok(result.errors.some((issue) => issue.path === 'questions'))
  assert.ok(result.errors.some((issue) => issue.path === 'sections'))
})

test('unknown package version fails safely with useful messaging', () => {
  const result = importAssessmentPackagePayload({
    schemaVersion: 'sonartra-assessment-package/v9',
    metadata: { assessmentName: 'Broken package' },
  })

  assert.equal(result.validationSummary.success, false)
  assert.equal(result.detectedVersion, 'unknown')
  assert.match(result.errors[0]?.message ?? '', /unknown or unsupported package contract version/i)
})

test('client-facing import payload normalization remains safe when optional metadata is absent', () => {
  const state = normalizeAdminAssessmentPackageImportState({
    status: 'error',
    message: 'Import failed.',
    validationResult: {
      success: false,
      detectedVersion: 'package_contract_v2',
      schemaVersion: 'sonartra-assessment-package/v2',
      packageName: undefined as never,
      versionLabel: undefined as never,
      summary: null,
      readiness: undefined as never,
      errors: [{ path: 'questions', message: 'At least one question is required.' }],
      warnings: undefined as never,
    },
  })

  assert.equal(state.validationResult?.detectedVersion, 'package_contract_v2')
  assert.equal(state.validationResult?.packageName, null)
  assert.equal(state.validationResult?.versionLabel, null)
  assert.deepEqual(state.validationResult?.errors, [{ path: 'questions', message: 'At least one question is required.' }])
  assert.deepEqual(state.validationResult?.warnings, [])
})

test('package identity extraction derives stable package-first metadata safely for legacy compatibility', () => {
  const extracted = extractAssessmentPackageIdentity(examplePackage)

  assert.equal(extracted.identity?.assessmentKey, 'adaptive-workstyle')
  assert.equal(extracted.identity?.assessmentName, 'Adaptive Workstyle Sample')
  assert.equal(extracted.identity?.slug, 'adaptive-workstyle')
  assert.equal(extracted.identity?.category, 'leadership')
  assert.equal(extracted.conflicts.length, 0)
})

test('package identity extraction reports missing required identity metadata clearly', () => {
  const extracted = extractAssessmentPackageIdentity({
    schemaVersion: 'sonartra-assessment-package/v2',
    packageVersion: '2',
    metadata: {
      assessmentName: '',
      locales: { defaultLocale: 'en', supportedLocales: ['en'] },
      authoring: {},
      compatibility: { packageSemver: '1.0.0', contractVersion: '2' },
    },
  })

  assert.equal(extracted.identity, null)
  assert.ok(extracted.conflicts.some((conflict) => conflict.code === 'missing_identity_metadata' && conflict.field === 'assessmentKey'))
})

test('package identity extraction requires slug and category in the preferred v2 package-first path', () => {
  const extracted = extractAssessmentPackageIdentity({
    ...examplePackage,
    metadata: {
      ...examplePackage.metadata,
      slug: '',
      category: '',
    },
  })

  assert.equal(extracted.identity, null)
  assert.ok(extracted.conflicts.some((conflict) => conflict.code === 'missing_identity_metadata' && conflict.field === 'slug'))
  assert.ok(extracted.conflicts.some((conflict) => conflict.code === 'missing_identity_metadata' && conflict.field === 'category'))
})

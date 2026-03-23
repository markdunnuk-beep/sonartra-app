import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'

function getValidatedExamplePackage() {
  const validation = validateSonartraAssessmentPackageV2(examplePackage)
  assert.equal(validation.ok, true)
  return validation.normalizedPackage!
}

test('valid v2 package compiles into an executable runtime artifact', () => {
  const result = compileAssessmentPackageV2(getValidatedExamplePackage())

  assert.equal(result.ok, true)
  assert.equal(result.executablePackage?.executionPlan.questionIds.length, 4)
  assert.equal(result.executablePackage?.dimensionsById.stability.itemBindings.length, 2)
  assert.deepEqual(result.executablePackage?.derivedDimensionsById['adaptive-balance']?.dependencies.sort(), ['adaptability', 'stability'])
  assert.equal(result.executablePackage?.outputRulesById['adaptive-balance-summary']?.targetReportKeys[0], 'adaptive-balance-summary')
})

test('derived dimensions compile in dependency-safe order', () => {
  const pkg = getValidatedExamplePackage()
  pkg.derivedDimensions = [
    {
      id: 'composite-a',
      label: 'Composite A',
      computation: {
        method: 'formula',
        formula: '(adaptive-balance + stability) / 2',
        sourceDimensionIds: ['stability'],
      },
    },
    ...pkg.derivedDimensions,
  ]

  const result = compileAssessmentPackageV2(pkg)

  assert.equal(result.ok, true)
  assert.deepEqual(result.executablePackage?.executionPlan.derivedDimensionIds, ['adaptive-balance', 'composite-a'])
})

test('circular derived dimension dependencies fail with useful diagnostics', () => {
  const pkg = getValidatedExamplePackage()
  pkg.derivedDimensions = [
    {
      id: 'cycle-a',
      label: 'Cycle A',
      computation: {
        method: 'formula',
        formula: 'cycle-b + stability',
        sourceDimensionIds: ['stability'],
      },
    },
    {
      id: 'cycle-b',
      label: 'Cycle B',
      computation: {
        method: 'formula',
        formula: 'cycle-a + adaptability',
        sourceDimensionIds: ['adaptability'],
      },
    },
  ]

  const result = compileAssessmentPackageV2(pkg)

  assert.equal(result.ok, false)
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'circular_derived_dimension_dependency'))
  assert.match(result.diagnostics.find((diagnostic) => diagnostic.code === 'circular_derived_dimension_dependency')?.message ?? '', /cycle-a, cycle-b/)
})

test('reverse-scored and weighted item transforms compile into normalized runtime forms', () => {
  const pkg = getValidatedExamplePackage()
  pkg.scoring.transforms.push({
    id: 'weight-q3',
    kind: 'weight_multiplier',
    target: {
      level: 'item',
      questionId: 'q3',
    },
    config: {
      multiplier: 1.75,
    },
  })
  pkg.questions.find((question) => question.id === 'q3')?.scoring?.[0]?.transformIds?.push('weight-q3')

  const result = compileAssessmentPackageV2(pkg)

  assert.equal(result.ok, true)
  assert.deepEqual(result.executablePackage?.transformsById['reverse-q2'], {
    id: 'reverse-q2',
    kind: 'reverse_scale',
    target: { level: 'item', questionId: 'q2', dimensionId: null },
    config: { min: 1, max: 5 },
    predicate: null,
  })
  assert.deepEqual(result.executablePackage?.transformsById['weight-q3'], {
    id: 'weight-q3',
    kind: 'weight_multiplier',
    target: { level: 'item', questionId: 'q3', dimensionId: null },
    config: { multiplier: 1.75 },
    predicate: null,
  })
})

test('integrity rules compile structurally into executable nodes', () => {
  const result = compileAssessmentPackageV2(getValidatedExamplePackage())
  const integrityRule = result.executablePackage?.integrityRulesById['stability-contradiction']

  assert.equal(result.ok, true)
  assert.equal(integrityRule?.severity, 'warning')
  assert.deepEqual(integrityRule?.affectedQuestionIds.sort(), ['q1', 'q2'])
  assert.equal(integrityRule?.predicate.kind, 'group')
})

test('output rules compile structurally into executable nodes', () => {
  const result = compileAssessmentPackageV2(getValidatedExamplePackage())
  const outputRule = result.executablePackage?.outputRulesById['integrity-warning']

  assert.equal(result.ok, true)
  assert.equal(outputRule?.severity, 'warning')
  assert.deepEqual(outputRule?.narrativeBindingKeys, ['integrity-warning'])
  assert.deepEqual(outputRule?.targetReportKeys, ['integrity-warning'])
})

test('report metadata bindings resolve or fail cleanly', () => {
  const pkg = getValidatedExamplePackage()
  pkg.report.content = [
    ...pkg.report.content,
    {
      key: 'orphan-content',
      label: 'Orphan Content',
      contentRef: 'report.orphan',
      severity: 'info',
    },
  ]

  const result = compileAssessmentPackageV2(pkg)

  assert.equal(result.ok, false)
  assert.ok(result.diagnostics.some((diagnostic) => diagnostic.code === 'orphan_report_binding'))
})

test('compile diagnostics are normalized and stable', () => {
  const pkg = getValidatedExamplePackage()
  pkg.report.content = [
    {
      key: 'orphan-content',
      label: 'Orphan Content',
      contentRef: null,
    },
  ]

  const result = compileAssessmentPackageV2(pkg)

  assert.equal(result.ok, false)
  assert.deepEqual(result.diagnostics, [
    {
      severity: 'error',
      code: 'unresolved_report_binding',
      path: 'outputs.rules[0].metadata.narrativeKey',
      message: 'Output rule "adaptive-balance-summary" references missing report binding "adaptive-balance-summary".',
    },
    {
      severity: 'error',
      code: 'unresolved_report_binding',
      path: 'outputs.rules[1].metadata.narrativeKey',
      message: 'Output rule "integrity-warning" references missing report binding "integrity-warning".',
    },
    {
      severity: 'error',
      code: 'orphan_report_binding',
      path: 'report.content.orphan-content',
      message: 'Report binding "orphan-content" does not map to any output rule.',
    },
    {
      severity: 'warning',
      code: 'missing_report_content_ref',
      path: 'report.content[0].contentRef',
      message: 'Report binding "orphan-content" has no contentRef and may not be renderable.',
    },
  ])
})

test('readiness reflects compilable versus merely importable v2 packages', () => {
  const importableOnly = importAssessmentPackagePayload({
    ...examplePackage,
    report: {
      content: [
        ...examplePackage.report.content,
        {
          key: 'orphan-content',
          label: 'Orphan Content',
          contentRef: 'report.orphan',
        },
      ],
    },
  })
  const compilable = importAssessmentPackagePayload(examplePackage)

  assert.equal(importableOnly.readiness.structurallyValid, true)
  assert.equal(importableOnly.readiness.importable, true)
  assert.equal(importableOnly.readiness.compilable, false)
  assert.equal(importableOnly.readiness.runtimeExecutable, false)
  assert.equal(compilable.readiness.compilable, true)
  assert.equal(compilable.readiness.publishable, false)
})

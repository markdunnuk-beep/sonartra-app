import type { AdminAssessmentPackageReadinessFlags } from '@/lib/admin/server/assessment-package-import'
import type { AdminAssessmentSimulationInputMode, AdminAssessmentSimulationIssue, AdminAssessmentSimulationScenarioKey } from '@/lib/admin/domain/assessment-simulation'
import { compileAssessmentPackageV2, type ExecutableAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import { evaluateAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-evaluator'
import {
  materializeAssessmentOutputsV2,
  type MaterializationTechnicalDiagnosticV2,
  type MaterializedAssessmentOutputsV2,
} from '@/lib/admin/domain/assessment-package-v2-materialization'
import { parseStoredValidatedAssessmentPackageV2, type SonartraAssessmentPackageV2ValidatedImport } from '@/lib/admin/domain/assessment-package-v2'

export type SimulationReadinessStatus = 'not_ready' | 'simulatable' | 'simulatable_with_warnings'
export type V2SimulationCompileStatus = 'ready' | 'failed'
export type V2SimulationEvaluationStatus = 'success' | 'completed_with_warnings' | 'failed' | 'not_run'

export interface AdminAssessmentSimulationRequestV2 {
  responses: Record<string, unknown>
  locale?: string | null
  source: AdminAssessmentSimulationInputMode | 'seeded_scenario'
  scenarioKey?: AdminAssessmentSimulationScenarioKey | null
}

export interface AssessmentSimulationSummaryMetricsV2 {
  answeredCount: number
  totalQuestions: number
  scoredDimensions: number
  insufficientDimensions: number
  triggeredOutputCount: number
  triggeredIntegrityCount: number
}

export interface AdminSimulationViewModelV2 {
  packageSummary: {
    assessmentKey: string
    assessmentName: string
    packageSemver: string
    questionCount: number
  }
  responseSummary: {
    answeredCount: number
    totalQuestions: number
    answeredQuestionIds: string[]
    missingQuestionIds: string[]
  }
  rawDimensions: Array<{
    id: string
    label: string
    status: string
    rawScore: number | null
    answeredCount: number
    expectedCount: number
  }>
  derivedDimensions: Array<{
    id: string
    label: string
    status: string
    rawScore: number | null
  }>
  normalizedValues: Array<{
    targetId: string
    targetKind: 'dimension' | 'derived_dimension'
    status: string
    normalizedScore: number | null
    band: string | null
    label: string | null
  }>
  integrityFindings: Array<{
    ruleId: string
    status: string
    severity: string
    message: string
  }>
  outputRules: Array<{
    ruleId: string
    key: string
    status: string
    severity: string | null
    band: string | null
  }>
  materializedWebSummaryOutputs: MaterializedAssessmentOutputsV2['webSummaryOutputs']
  materializedReportSections: MaterializedAssessmentOutputsV2['reportDocument']['sections']
  technicalDiagnostics: MaterializedAssessmentOutputsV2['technicalDiagnostics']
  materializationDebug: {
    triggeredOutputKeys: string[]
    nonTriggeredOutputKeys: string[]
  }
}

export interface AssessmentSimulationResultV2 {
  contractVersion: 'package_contract_v2'
  readiness: AdminAssessmentPackageReadinessFlags
  readinessStatus: SimulationReadinessStatus
  compileStatus: V2SimulationCompileStatus
  evaluationStatus: V2SimulationEvaluationStatus
  errors: AdminAssessmentSimulationIssue[]
  warnings: AdminAssessmentSimulationIssue[]
  summaryMetrics: AssessmentSimulationSummaryMetricsV2
  materializedOutputs: MaterializedAssessmentOutputsV2 | null
  viewModel: AdminSimulationViewModelV2 | null
  debug: {
    compiledPackageKey: string | null
    evaluationId: string | null
    responsePayload: Record<string, unknown>
  }
}

export interface ExecuteAdminAssessmentSimulationV2Result {
  ok: boolean
  result: AssessmentSimulationResultV2
}

function toIssue(path: string, message: string): AdminAssessmentSimulationIssue {
  return { path, message }
}

function detectReadiness(
  pkg: SonartraAssessmentPackageV2ValidatedImport | null,
  executablePackage: ExecutableAssessmentPackageV2 | null,
  compileErrors: AdminAssessmentSimulationIssue[],
): AdminAssessmentPackageReadinessFlags {
  const structurallyValid = Boolean(pkg)
  const compilable = Boolean(executablePackage) && compileErrors.length === 0
  return {
    structurallyValid,
    importable: structurallyValid,
    compilable,
    evaluatable: compilable,
    simulatable: compilable,
    runtimeExecutable: false,
    liveRuntimeEnabled: false,
    publishable: false,
  }
}

function selectScenarioResponse(questionId: string, optionIds: string[], key: AdminAssessmentSimulationScenarioKey) {
  if (optionIds.length === 0) {
    return null
  }
  if (key === 'high') {
    return optionIds[optionIds.length - 1] ?? null
  }
  if (key === 'low' || key === 'sensible_defaults') {
    return optionIds[0] ?? null
  }
  return optionIds[Math.floor((optionIds.length - 1) / 2)] ?? optionIds[0] ?? null
}

export function buildAdminAssessmentSimulationScenarioV2(
  pkg: SonartraAssessmentPackageV2ValidatedImport,
  scenarioKey: AdminAssessmentSimulationScenarioKey,
): AdminAssessmentSimulationRequestV2 {
  const responses = Object.fromEntries(pkg.questions.map((question) => {
    const model = pkg.responseModels.models.find((entry) => entry.id === question.responseModelId)
    const options = [
      ...(model?.optionSetId ? (pkg.responseModels.optionSets ?? []).find((entry) => entry.id === model.optionSetId)?.options ?? [] : []),
      ...(model?.options ?? []),
    ]

    let value: unknown = null
    if (model?.type === 'boolean') {
      value = scenarioKey === 'low' ? false : true
    } else if (model?.type === 'numeric') {
      const min = model.numericRange?.min ?? 0
      const max = model.numericRange?.max ?? 10
      value = scenarioKey === 'high' ? max : scenarioKey === 'low' ? min : min + (max - min) / 2
    } else {
      const selected = selectScenarioResponse(question.id, options.map((option) => option.id), scenarioKey)
      value = selected
    }

    return [question.id, value]
  }))

  return {
    responses,
    locale: pkg.metadata.locales.defaultLocale,
    source: scenarioKey === 'sensible_defaults' ? 'generated_form' : 'seeded_scenario',
    scenarioKey,
  }
}

function normalizeAdminAssessmentSimulationRequestV2(
  input: unknown,
  fallbackSource: AdminAssessmentSimulationRequestV2['source'],
): { errors: AdminAssessmentSimulationIssue[]; warnings: AdminAssessmentSimulationIssue[]; normalizedRequest: AdminAssessmentSimulationRequestV2 | null } {
  const errors: AdminAssessmentSimulationIssue[] = []
  const warnings: AdminAssessmentSimulationIssue[] = []

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    errors.push(toIssue('responsePayload.responses', 'Simulation payload must include a responses object or a question-value map.'))
    return { errors, warnings, normalizedRequest: null }
  }

  const candidate = input as Record<string, unknown>
  let responses: Record<string, unknown> | null = null

  if ('responses' in candidate) {
    if (candidate.responses && typeof candidate.responses === 'object' && !Array.isArray(candidate.responses)) {
      responses = { ...(candidate.responses as Record<string, unknown>) }
    } else {
      errors.push(toIssue('responsePayload.responses', 'Simulation payload must include a responses object or a question-value map.'))
    }
  } else {
    responses = Object.fromEntries(Object.entries(candidate).filter(([key]) => !['locale', 'source', 'scenarioKey'].includes(key)))
  }

  if (!responses || Object.keys(responses).length === 0) {
    errors.push(toIssue('responsePayload.responses', 'Simulation payload must include a responses object or a question-value map.'))
    return { errors, warnings, normalizedRequest: null }
  }

  return {
    errors,
    warnings,
    normalizedRequest: {
      responses,
      locale: typeof candidate.locale === 'string' && candidate.locale.trim() ? candidate.locale.trim() : null,
      source: candidate.source === 'generated_form' || candidate.source === 'manual_json' || candidate.source === 'seeded_scenario'
        ? candidate.source
        : fallbackSource,
      scenarioKey: candidate.scenarioKey === 'sensible_defaults' || candidate.scenarioKey === 'high' || candidate.scenarioKey === 'low' || candidate.scenarioKey === 'balanced'
        ? candidate.scenarioKey
        : null,
    },
  }
}

function toIssuesFromTechnicalDiagnostics(diagnostics: MaterializationTechnicalDiagnosticV2[]): AdminAssessmentSimulationIssue[] {
  return diagnostics.map((diagnostic) => toIssue(diagnostic.path, diagnostic.message))
}

export function parseAdminAssessmentSimulationPayloadV2(
  input: string,
  fallbackSource: AdminAssessmentSimulationRequestV2['source'] = 'manual_json',
): { ok: boolean; errors: AdminAssessmentSimulationIssue[]; warnings: AdminAssessmentSimulationIssue[]; normalizedRequest: AdminAssessmentSimulationRequestV2 | null } {
  const trimmed = input.trim()

  if (!trimmed) {
    const errors = [toIssue('responsePayload', 'Provide a simulation response payload before running the simulation.')]
    return { ok: false, errors, warnings: [], normalizedRequest: null }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(trimmed)
  } catch {
    const errors = [toIssue('responsePayload', 'Simulation payload must be valid JSON.')]
    return { ok: false, errors, warnings: [], normalizedRequest: null }
  }

  const normalized = normalizeAdminAssessmentSimulationRequestV2(parsed, fallbackSource)
  return {
    ok: normalized.errors.length === 0,
    errors: normalized.errors,
    warnings: normalized.warnings,
    normalizedRequest: normalized.errors.length === 0 ? normalized.normalizedRequest : null,
  }
}

export function executeAdminAssessmentSimulationV2(
  storedPackage: unknown,
  request: AdminAssessmentSimulationRequestV2,
): ExecuteAdminAssessmentSimulationV2Result {
  const pkg = parseStoredValidatedAssessmentPackageV2(storedPackage)
  const pkgErrors: AdminAssessmentSimulationIssue[] = []
  const compileErrors: AdminAssessmentSimulationIssue[] = []

  if (!pkg) {
    pkgErrors.push(toIssue('package', 'Package Contract v2 simulation is unavailable because the stored package is missing or invalid.'))
  }

  const compileResult = pkg ? compileAssessmentPackageV2(pkg) : null
  if (compileResult && !compileResult.ok) {
    for (const diagnostic of compileResult.diagnostics.filter((entry) => entry.severity === 'error')) {
      compileErrors.push(toIssue(diagnostic.path, diagnostic.message))
    }
  }

  const readiness = detectReadiness(pkg, compileResult?.executablePackage ?? null, compileErrors)
  const notReady = !readiness.simulatable
  if (!pkg || !compileResult?.executablePackage || notReady) {
    return {
      ok: false,
      result: {
        contractVersion: 'package_contract_v2',
        readiness,
        readinessStatus: 'not_ready',
        compileStatus: 'failed',
        evaluationStatus: 'not_run',
        errors: [...pkgErrors, ...compileErrors],
        warnings: [],
        summaryMetrics: {
          answeredCount: Object.keys(request.responses).length,
          totalQuestions: pkg?.questions.length ?? 0,
          scoredDimensions: 0,
          insufficientDimensions: 0,
          triggeredOutputCount: 0,
          triggeredIntegrityCount: 0,
        },
        materializedOutputs: null,
        viewModel: null,
        debug: {
          compiledPackageKey: null,
          evaluationId: null,
          responsePayload: { ...request.responses },
        },
      },
    }
  }

  const evaluation = evaluateAssessmentPackageV2(compileResult.executablePackage, request.responses, {
    includeTrace: true,
    evaluationId: 'admin-simulation-v2',
  })

  const materializedOutputs = materializeAssessmentOutputsV2(compileResult.executablePackage, evaluation)
  const warnings = toIssuesFromTechnicalDiagnostics(materializedOutputs.technicalDiagnostics.filter((entry) => entry.severity === 'warning'))
  const errors = toIssuesFromTechnicalDiagnostics(materializedOutputs.technicalDiagnostics.filter((entry) => entry.severity === 'error'))

  const answeredQuestionIds = Object.keys(request.responses).filter((questionId) => request.responses[questionId] !== undefined)
  const missingQuestionIds = compileResult.executablePackage.executionPlan.questionIds.filter((questionId) => !answeredQuestionIds.includes(questionId))

  const viewModel: AdminSimulationViewModelV2 = {
    packageSummary: {
      assessmentKey: compileResult.executablePackage.metadata.assessmentKey,
      assessmentName: compileResult.executablePackage.metadata.assessmentName,
      packageSemver: compileResult.executablePackage.metadata.compatibility.packageSemver,
      questionCount: compileResult.executablePackage.executionPlan.questionIds.length,
    },
    responseSummary: {
      answeredCount: answeredQuestionIds.length,
      totalQuestions: compileResult.executablePackage.executionPlan.questionIds.length,
      answeredQuestionIds,
      missingQuestionIds,
    },
    rawDimensions: Object.values(evaluation.rawDimensions).map((result) => ({
      id: result.dimensionId,
      label: result.label,
      status: result.status,
      rawScore: result.rawScore,
      answeredCount: result.answeredCount,
      expectedCount: result.expectedCount,
    })),
    derivedDimensions: Object.values(evaluation.derivedDimensions).map((result) => ({
      id: result.derivedDimensionId,
      label: result.label,
      status: result.status,
      rawScore: result.rawScore,
    })),
    normalizedValues: evaluation.normalizedResults.map((result) => ({
      targetId: result.targetId,
      targetKind: result.targetKind,
      status: result.status,
      normalizedScore: result.normalizedScore,
      band: result.band,
      label: result.label,
    })),
    integrityFindings: evaluation.integrityFindings.map((finding) => ({
      ruleId: finding.ruleId,
      status: finding.status,
      severity: finding.severity,
      message: finding.message,
    })),
    outputRules: evaluation.outputRuleFindings.map((finding) => ({
      ruleId: finding.ruleId,
      key: finding.key,
      status: finding.status,
      severity: finding.severity,
      band: finding.band,
    })),
    materializedWebSummaryOutputs: materializedOutputs.webSummaryOutputs,
    materializedReportSections: materializedOutputs.reportDocument.sections,
    technicalDiagnostics: materializedOutputs.technicalDiagnostics,
    materializationDebug: {
      triggeredOutputKeys: evaluation.outputRuleFindings.filter((finding) => finding.status === 'triggered').map((finding) => finding.key),
      nonTriggeredOutputKeys: evaluation.outputRuleFindings.filter((finding) => finding.status !== 'triggered').map((finding) => finding.key),
    },
  }

  return {
    ok: evaluation.status !== 'failed' && errors.length === 0,
    result: {
      contractVersion: 'package_contract_v2',
      readiness,
      readinessStatus: warnings.length > 0 ? 'simulatable_with_warnings' : 'simulatable',
      compileStatus: 'ready',
      evaluationStatus: evaluation.status,
      errors,
      warnings,
      summaryMetrics: {
        answeredCount: answeredQuestionIds.length,
        totalQuestions: compileResult.executablePackage.executionPlan.questionIds.length,
        scoredDimensions: Object.values(evaluation.rawDimensions).filter((entry) => entry.status === 'scored').length,
        insufficientDimensions: Object.values(evaluation.rawDimensions).filter((entry) => entry.status !== 'scored').length,
        triggeredOutputCount: evaluation.outputRuleFindings.filter((entry) => entry.status === 'triggered').length,
        triggeredIntegrityCount: evaluation.integrityFindings.filter((entry) => entry.status === 'triggered').length,
      },
      materializedOutputs,
      viewModel,
      debug: {
        compiledPackageKey: compileResult.executablePackage.metadata.assessmentKey,
        evaluationId: evaluation.executionMetadata.evaluationId,
        responsePayload: { ...request.responses },
      },
    },
  }
}

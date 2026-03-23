import type { AdminAssessmentPackageReadinessFlags } from '@/lib/admin/server/assessment-package-import'
import type { AdminAssessmentSimulationInputMode, AdminAssessmentSimulationIssue, AdminAssessmentSimulationScenarioKey } from '@/lib/admin/domain/assessment-simulation'
import { compileAssessmentPackageV2, type ExecutableAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import type {
  MaterializationTechnicalDiagnosticV2,
  MaterializedAssessmentOutputsV2,
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

export function detectReadiness(
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

export function toIssuesFromTechnicalDiagnostics(diagnostics: MaterializationTechnicalDiagnosticV2[]): AdminAssessmentSimulationIssue[] {
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

export function getV2SimulationReadiness(storedPackage: unknown): {
  pkg: SonartraAssessmentPackageV2ValidatedImport | null
  readiness: AdminAssessmentPackageReadinessFlags
  compileErrors: AdminAssessmentSimulationIssue[]
} {
  const pkg = parseStoredValidatedAssessmentPackageV2(storedPackage)
  const compileErrors: AdminAssessmentSimulationIssue[] = []
  const compileResult = pkg ? compileAssessmentPackageV2(pkg) : null

  if (compileResult && !compileResult.ok) {
    for (const diagnostic of compileResult.diagnostics.filter((entry) => entry.severity === 'error')) {
      compileErrors.push(toIssue(diagnostic.path, diagnostic.message))
    }
  }

  return {
    pkg,
    readiness: detectReadiness(pkg, compileResult?.executablePackage ?? null, compileErrors),
    compileErrors,
  }
}

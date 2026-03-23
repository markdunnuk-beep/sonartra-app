import type { AdminAssessmentGeneratedReportOutput } from '@/lib/admin/domain/assessment-report-output'
import { generateAdminAssessmentReportOutput } from '@/lib/admin/domain/assessment-report-output'
import type { AdminAssessmentSimulationExecutionResult, AdminAssessmentSimulationIssue, AdminAssessmentSimulationRequest, AdminAssessmentSimulationResult } from '@/lib/admin/domain/assessment-simulation'
import {
  executeAdminAssessmentSimulationForPackage,
  parseAdminAssessmentSimulationPayloadForPackage,
} from '@/lib/admin/domain/assessment-simulation'
import type { AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'

export type AdminAssessmentScenarioType = 'baseline' | 'edge_case' | 'regression' | 'stress' | 'custom'
export type AdminAssessmentScenarioStatus = 'active' | 'archived'
export type AdminAssessmentRegressionComparisonStatus = 'no_change' | 'changed_expected' | 'changed_review_required' | 'blocked'
export type AdminAssessmentRegressionBaselineType = 'published' | 'previous_version' | 'source_version' | 'none'

export interface AdminSavedAssessmentScenarioRecord {
  id: string
  assessmentDefinitionId: string
  assessmentVersionId: string
  name: string
  description: string | null
  scenarioType: AdminAssessmentScenarioType
  status: AdminAssessmentScenarioStatus
  locale: string | null
  sampleResponsePayload: string
  createdByIdentityId: string | null
  updatedByIdentityId: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminAssessmentScenarioValidationResult {
  ok: boolean
  issues: AdminAssessmentSimulationIssue[]
  warnings: AdminAssessmentSimulationIssue[]
  normalizedRequest: AdminAssessmentSimulationRequest | null
}

export interface AdminAssessmentScenarioSummary extends AdminSavedAssessmentScenarioRecord {
  answeredCount: number | null
  questionCoverage: string | null
  quickStatus: 'ready' | 'invalid_payload' | 'archived'
  validationSummary: string
}

export interface AdminAssessmentRegressionBaselineSelection {
  type: AdminAssessmentRegressionBaselineType
  versionId: string | null
  versionLabel: string | null
  summary: string
}

export interface AdminAssessmentScenarioExecutionTarget {
  versionId: string
  versionLabel: string
  packageStatus: AdminAssessmentVersionRecord['packageInfo']['status']
  status: 'ok' | 'blocked' | 'invalid_scenario'
  message: string
  simulation: AdminAssessmentSimulationResult | null
  simulationWarnings: AdminAssessmentSimulationIssue[]
  reportOutput: AdminAssessmentGeneratedReportOutput | null
}

export interface AdminAssessmentRegressionChangeSummary {
  normalizedScoreChanges: Array<{
    dimensionId: string
    versionScore: number | null
    baselineScore: number | null
    versionBand: string | null
    baselineBand: string | null
  }>
  outputRuleChanges: {
    added: string[]
    removed: string[]
  }
  qualityVerdictChanged: {
    from: string | null
    to: string | null
  } | null
  contentFallbackShift: {
    versionFallbackCount: number
    baselineFallbackCount: number
    delta: number
  } | null
  warningDelta: {
    versionWarnings: number
    baselineWarnings: number
    delta: number
  }
  summaries: string[]
}

export interface AdminAssessmentScenarioRegressionResult {
  scenario: AdminAssessmentScenarioSummary
  baseline: AdminAssessmentRegressionBaselineSelection
  current: AdminAssessmentScenarioExecutionTarget
  comparison: {
    status: AdminAssessmentRegressionComparisonStatus
    summary: string
    changeSummary: AdminAssessmentRegressionChangeSummary
  }
  baselineResult: AdminAssessmentScenarioExecutionTarget | null
}

export interface AdminAssessmentRegressionSuiteSummary {
  baseline: AdminAssessmentRegressionBaselineSelection
  totals: {
    totalScenarios: number
    noChange: number
    changedExpected: number
    reviewRequired: number
    blocked: number
  }
  status: 'clean' | 'review_required' | 'blocked'
  summary: string
  results: AdminAssessmentScenarioRegressionResult[]
}

function countFallbackBlocks(output: AdminAssessmentGeneratedReportOutput | null): number {
  if (!output) {
    return 0
  }

  return output.pdfBlocks.filter((block) => block.metadata.provenance === 'system_fallback').length
}

function getTriggeredOutputKeys(simulation: AdminAssessmentSimulationResult | null): string[] {
  return simulation?.outputs.filter((entry) => entry.triggered).map((entry) => entry.key).sort() ?? []
}

function getNormalizedDimensionKeys(simulation: AdminAssessmentSimulationResult | null): string[] {
  return simulation?.normalizedScores.map((entry) => entry.dimensionId).sort() ?? []
}

function toSet(values: string[]): Set<string> {
  return new Set(values)
}

function listDifference(left: string[], right: string[]): string[] {
  const rightSet = toSet(right)
  return left.filter((value) => !rightSet.has(value))
}

function describeBaseline(type: AdminAssessmentRegressionBaselineType, versionLabel: string | null): string {
  switch (type) {
    case 'published':
      return versionLabel ? `Comparing against published baseline v${versionLabel}.` : 'Comparing against the published baseline.'
    case 'previous_version':
      return versionLabel ? `Comparing against previous version v${versionLabel}.` : 'Comparing against the previous version baseline.'
    case 'source_version':
      return versionLabel ? `No stronger baseline exists, so scenario source version v${versionLabel} is used.` : 'No stronger baseline exists, so the scenario source version is used.'
    default:
      return 'No baseline version is available yet; results are shown without comparison.'
  }
}

export function validateSavedAssessmentScenarioPayload(
  payloadText: string,
  version: Pick<AdminAssessmentVersionRecord, 'normalizedPackage' | 'packageInfo'>,
): AdminAssessmentScenarioValidationResult {
  const parsed = parseAdminAssessmentSimulationPayloadForPackage(
    version.normalizedPackage,
    version.packageInfo.schemaVersion,
    payloadText,
  )

  if (!parsed.ok || !parsed.normalizedRequest) {
    return {
      ok: false,
      issues: parsed.errors,
      warnings: parsed.warnings,
      normalizedRequest: null,
    }
  }

  if (!version.normalizedPackage) {
    return {
      ok: false,
      issues: [{ path: 'responsePayload', message: 'A normalized package is required before scenario payloads can be validated.' }],
      warnings: [],
      normalizedRequest: null,
    }
  }

  const execution = executeAdminAssessmentSimulationForPackage(
    version.normalizedPackage,
    version.packageInfo.schemaVersion,
    parsed.normalizedRequest,
  )
  return {
    ok: execution.ok,
    issues: execution.errors,
    warnings: execution.warnings,
    normalizedRequest: execution.ok ? parsed.normalizedRequest : null,
  }
}

export function summarizeSavedAssessmentScenario(
  scenario: AdminSavedAssessmentScenarioRecord,
  version: Pick<AdminAssessmentVersionRecord, 'normalizedPackage' | 'packageInfo'>,
): AdminAssessmentScenarioSummary {
  const validation = validateSavedAssessmentScenarioPayload(scenario.sampleResponsePayload, version)
  const totalQuestions = version.normalizedPackage?.questions.length ?? null
  const answeredCount = validation.normalizedRequest?.answers.length ?? null
  const quickStatus = scenario.status === 'archived'
    ? 'archived'
    : validation.ok
      ? 'ready'
      : 'invalid_payload'

  return {
    ...scenario,
    answeredCount,
    questionCoverage: totalQuestions !== null && answeredCount !== null ? `${answeredCount}/${totalQuestions}` : null,
    quickStatus,
    validationSummary: validation.ok
      ? `Payload validated for ${answeredCount ?? 0} answer(s).`
      : validation.issues[0]?.message ?? 'Scenario payload is invalid.',
  }
}

export function selectAssessmentRegressionBaseline(
  version: AdminAssessmentVersionRecord,
  allVersions: AdminAssessmentVersionRecord[],
  scenarioSourceVersionId?: string | null,
): AdminAssessmentRegressionBaselineSelection {
  const published = allVersions.find((entry) => entry.lifecycleStatus === 'published' && entry.id !== version.id) ?? null
  if (published) {
    return {
      type: 'published',
      versionId: published.id,
      versionLabel: published.versionLabel,
      summary: describeBaseline('published', published.versionLabel),
    }
  }

  const previous = [...allVersions]
    .filter((entry) => entry.id !== version.id)
    .sort((left, right) => right.versionLabel.localeCompare(left.versionLabel, undefined, { numeric: true }))
    .find(Boolean) ?? null

  if (previous) {
    return {
      type: 'previous_version',
      versionId: previous.id,
      versionLabel: previous.versionLabel,
      summary: describeBaseline('previous_version', previous.versionLabel),
    }
  }

  if (scenarioSourceVersionId ?? version.id) {
    return {
      type: 'source_version',
      versionId: scenarioSourceVersionId ?? version.id,
      versionLabel: version.versionLabel,
      summary: describeBaseline('source_version', version.versionLabel),
    }
  }

  return {
    type: 'none',
    versionId: null,
    versionLabel: null,
    summary: describeBaseline('none', null),
  }
}

export function executeAssessmentScenarioForVersion(
  scenario: AdminSavedAssessmentScenarioRecord,
  version: AdminAssessmentVersionRecord,
): AdminAssessmentScenarioExecutionTarget {
  if (!version.normalizedPackage || (version.packageInfo.status !== 'valid' && version.packageInfo.status !== 'valid_with_warnings')) {
    return {
      versionId: version.id,
      versionLabel: version.versionLabel,
      packageStatus: version.packageInfo.status,
      status: 'blocked',
      message: 'This version cannot run regression scenarios until a valid normalized package is attached.',
      simulation: null,
      simulationWarnings: [],
      reportOutput: null,
    }
  }

  const validation = validateSavedAssessmentScenarioPayload(scenario.sampleResponsePayload, version)
  if (!validation.ok || !validation.normalizedRequest) {
    return {
      versionId: version.id,
      versionLabel: version.versionLabel,
      packageStatus: version.packageInfo.status,
      status: 'invalid_scenario',
      message: validation.issues[0]?.message ?? 'Scenario payload is invalid.',
      simulation: null,
      simulationWarnings: validation.warnings,
      reportOutput: null,
    }
  }

  const execution: AdminAssessmentSimulationExecutionResult = executeAdminAssessmentSimulationForPackage(version.normalizedPackage, version.packageInfo.schemaVersion, validation.normalizedRequest)
  if (!execution.ok || !execution.result) {
    return {
      versionId: version.id,
      versionLabel: version.versionLabel,
      packageStatus: version.packageInfo.status,
      status: 'invalid_scenario',
      message: execution.errors[0]?.message ?? 'Scenario could not be executed.',
      simulation: null,
      simulationWarnings: execution.warnings,
      reportOutput: null,
    }
  }

  return {
    versionId: version.id,
    versionLabel: version.versionLabel,
    packageStatus: version.packageInfo.status,
    status: 'ok',
    message: execution.warnings.length > 0
      ? `Scenario executed with ${execution.warnings.length} warning(s).`
      : 'Scenario executed successfully.',
    simulation: execution.result,
    simulationWarnings: execution.warnings,
    reportOutput: execution.result.contractVersion === 'package_contract_v2' ? null : generateAdminAssessmentReportOutput(version.normalizedPackage, execution.result),
  }
}

export function compareAssessmentScenarioExecutions(
  scenario: AdminAssessmentScenarioSummary,
  current: AdminAssessmentScenarioExecutionTarget,
  baseline: AdminAssessmentScenarioExecutionTarget | null,
  baselineSelection: AdminAssessmentRegressionBaselineSelection,
): AdminAssessmentScenarioRegressionResult {
  if (!baseline || baselineSelection.type === 'none') {
    return {
      scenario,
      baseline: baselineSelection,
      current,
      baselineResult: baseline,
      comparison: {
        status: current.status === 'ok' ? 'changed_expected' : 'blocked',
        summary: current.status === 'ok'
          ? 'No baseline exists yet, so this scenario result is recorded as current-version evidence only.'
          : current.message,
        changeSummary: {
          normalizedScoreChanges: [],
          outputRuleChanges: { added: [], removed: [] },
          qualityVerdictChanged: null,
          contentFallbackShift: null,
          warningDelta: { versionWarnings: current.simulationWarnings.length + (current.reportOutput?.warnings.length ?? 0), baselineWarnings: 0, delta: current.simulationWarnings.length + (current.reportOutput?.warnings.length ?? 0) },
          summaries: [baselineSelection.summary],
        },
      },
    }
  }

  if (current.status !== 'ok' || baseline.status !== 'ok' || !current.simulation || !baseline.simulation || !current.reportOutput || !baseline.reportOutput) {
    return {
      scenario,
      baseline: baselineSelection,
      current,
      baselineResult: baseline,
      comparison: {
        status: 'blocked',
        summary: current.status !== 'ok' ? current.message : baseline.message,
        changeSummary: {
          normalizedScoreChanges: [],
          outputRuleChanges: { added: [], removed: [] },
          qualityVerdictChanged: null,
          contentFallbackShift: null,
          warningDelta: {
            versionWarnings: current.simulationWarnings.length + (current.reportOutput?.warnings.length ?? 0),
            baselineWarnings: baseline.simulationWarnings.length + (baseline.reportOutput?.warnings.length ?? 0),
            delta: (current.simulationWarnings.length + (current.reportOutput?.warnings.length ?? 0)) - (baseline.simulationWarnings.length + (baseline.reportOutput?.warnings.length ?? 0)),
          },
          summaries: [current.status !== 'ok' ? current.message : baseline.message],
        },
      },
    }
  }

  const normalizedScoreChanges = getNormalizedDimensionKeys(current.simulation).flatMap((dimensionId) => {
    const currentScore = current.simulation?.normalizedScores.find((entry) => entry.dimensionId === dimensionId) ?? null
    const baselineScore = baseline.simulation?.normalizedScores.find((entry) => entry.dimensionId === dimensionId) ?? null

    if (!currentScore || !baselineScore) {
      return []
    }

    const sameScore = currentScore.normalizedScore === baselineScore.normalizedScore
    const sameBand = currentScore.band?.key === baselineScore.band?.key
    return sameScore && sameBand ? [] : [{
      dimensionId,
      versionScore: currentScore.normalizedScore,
      baselineScore: baselineScore.normalizedScore,
      versionBand: currentScore.band?.key ?? null,
      baselineBand: baselineScore.band?.key ?? null,
    }]
  })

  const currentOutputs = getTriggeredOutputKeys(current.simulation)
  const baselineOutputs = getTriggeredOutputKeys(baseline.simulation)
  const outputRuleChanges = {
    added: listDifference(currentOutputs, baselineOutputs),
    removed: listDifference(baselineOutputs, currentOutputs),
  }

  const currentQuality = current.reportOutput.quality.verdict
  const baselineQuality = baseline.reportOutput.quality.verdict
  const qualityVerdictChanged = currentQuality === baselineQuality
    ? null
    : { from: baselineQuality, to: currentQuality }

  const currentFallbackCount = countFallbackBlocks(current.reportOutput)
  const baselineFallbackCount = countFallbackBlocks(baseline.reportOutput)
  const contentFallbackShift = currentFallbackCount === baselineFallbackCount
    ? null
    : { versionFallbackCount: currentFallbackCount, baselineFallbackCount, delta: currentFallbackCount - baselineFallbackCount }

  const currentWarningCount = current.simulationWarnings.length + current.reportOutput.warnings.length
  const baselineWarningCount = baseline.simulationWarnings.length + baseline.reportOutput.warnings.length
  const warningDelta = {
    versionWarnings: currentWarningCount,
    baselineWarnings: baselineWarningCount,
    delta: currentWarningCount - baselineWarningCount,
  }

  const summaries: string[] = []
  if (normalizedScoreChanges.length > 0) {
    summaries.push(`Normalized score changed for ${normalizedScoreChanges.length} dimension${normalizedScoreChanges.length === 1 ? '' : 's'}.`)
  }
  if (outputRuleChanges.added.length || outputRuleChanges.removed.length) {
    summaries.push(`Output verdict changed: +${outputRuleChanges.added.length} / -${outputRuleChanges.removed.length} triggered rule(s).`)
  }
  if (qualityVerdictChanged) {
    summaries.push(`Quality verdict changed from ${qualityVerdictChanged.from} to ${qualityVerdictChanged.to}.`)
  }
  if (contentFallbackShift) {
    summaries.push(`${Math.abs(contentFallbackShift.delta)} content block${Math.abs(contentFallbackShift.delta) === 1 ? '' : 's'} shifted ${contentFallbackShift.delta > 0 ? 'to system fallback' : 'back to authored content'}.`)
  }
  if (warningDelta.delta !== 0) {
    summaries.push(`Warning count changed by ${warningDelta.delta > 0 ? '+' : ''}${warningDelta.delta}.`)
  }
  if (summaries.length === 0) {
    summaries.push('No material regression differences detected.')
  }

  let status: AdminAssessmentRegressionComparisonStatus = 'no_change'
  if (qualityVerdictChanged || (contentFallbackShift?.delta ?? 0) > 0 || warningDelta.delta > 0 || outputRuleChanges.added.length > 0 || outputRuleChanges.removed.length > 0 || normalizedScoreChanges.some((entry) => entry.versionBand !== entry.baselineBand)) {
    status = 'changed_review_required'
  } else if (normalizedScoreChanges.length > 0 || warningDelta.delta < 0 || (contentFallbackShift?.delta ?? 0) < 0) {
    status = 'changed_expected'
  }

  return {
    scenario,
    baseline: baselineSelection,
    current,
    baselineResult: baseline,
    comparison: {
      status,
      summary: summaries.join(' '),
      changeSummary: {
        normalizedScoreChanges,
        outputRuleChanges,
        qualityVerdictChanged,
        contentFallbackShift,
        warningDelta,
        summaries,
      },
    },
  }
}

export function summarizeAssessmentRegressionSuite(
  results: AdminAssessmentScenarioRegressionResult[],
  baseline: AdminAssessmentRegressionBaselineSelection,
): AdminAssessmentRegressionSuiteSummary {
  const totals = {
    totalScenarios: results.length,
    noChange: results.filter((entry) => entry.comparison.status === 'no_change').length,
    changedExpected: results.filter((entry) => entry.comparison.status === 'changed_expected').length,
    reviewRequired: results.filter((entry) => entry.comparison.status === 'changed_review_required').length,
    blocked: results.filter((entry) => entry.comparison.status === 'blocked').length,
  }

  const status = totals.blocked > 0 ? 'blocked' : totals.reviewRequired > 0 ? 'review_required' : 'clean'
  const summary = totals.totalScenarios === 0
    ? 'No active saved scenarios exist yet.'
    : `${totals.totalScenarios} scenario${totals.totalScenarios === 1 ? '' : 's'} executed · ${totals.noChange} unchanged · ${totals.changedExpected} expected change · ${totals.reviewRequired} review required · ${totals.blocked} blocked.`

  return { baseline, totals, status, summary, results }
}

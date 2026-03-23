import type { ExecutableAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import type {
  AssessmentEvaluationDiagnostic,
  AssessmentEvaluationResultV2,
  DerivedDimensionEvaluationResult,
  NormalizedDimensionResult,
  RawDimensionEvaluationResult,
} from '@/lib/admin/domain/assessment-package-v2-evaluator'

export type MaterializedOutputSeverity = 'info' | 'warning' | 'error'
export type WebSummaryOutputStatusV2 = 'available' | 'warning' | 'limited'
export type ReportOutputSectionKindV2 = 'overview' | 'dimension_summary' | 'triggered_outputs' | 'integrity' | 'limitations' | 'debug'
export type ReportOutputBlockKindV2 = 'metric' | 'narrative' | 'notice' | 'list' | 'table'

export interface EvaluationMaterializationDiagnostic {
  severity: 'warning' | 'error'
  code: string
  message: string
  path: string
  relatedKey?: string | null
}

export interface WebSummaryOutputV2 {
  id: string
  key: string
  title: string
  label: string
  status: WebSummaryOutputStatusV2
  severity: MaterializedOutputSeverity | null
  band: string | null
  value: {
    score: number | null
    rawScore: number | null
    percentile: number | null
    descriptor: string | null
  }
  explanation: {
    text: string | null
    narrativeBindingKey: string | null
    reportBindingKey: string | null
    source: 'report_binding' | 'output_rule_metadata' | 'system_fallback'
  }
  visibleInProduct: boolean
}

export interface IntegrityOutputNoticeV2 {
  id: string
  severity: MaterializedOutputSeverity
  title: string
  message: string
  source: 'integrity_rule' | 'evaluation_warning' | 'evaluation_error'
  affectedIds: string[]
}

export interface ReportOutputBlockV2 {
  id: string
  kind: ReportOutputBlockKindV2
  title: string
  text: string | null
  items: string[]
  metadata: Record<string, string | number | boolean | null>
}

export interface ReportOutputSectionV2 {
  id: string
  key: string
  title: string
  kind: ReportOutputSectionKindV2
  blocks: ReportOutputBlockV2[]
}

export interface ReportOutputDocumentV2 {
  id: string
  title: string
  subtitle: string | null
  sections: ReportOutputSectionV2[]
  warnings: IntegrityOutputNoticeV2[]
}

export interface MaterializedAssessmentOutputsV2 {
  webSummaryOutputs: WebSummaryOutputV2[]
  reportDocument: ReportOutputDocumentV2
  integrityNotices: IntegrityOutputNoticeV2[]
  diagnostics: EvaluationMaterializationDiagnostic[]
  adminDebug: {
    triggeredOutputKeys: string[]
    nonTriggeredOutputKeys: string[]
    missingNarrativeBindingKeys: string[]
  }
}

function toSeverity(value: string | null | undefined): MaterializedOutputSeverity | null {
  if (value === 'warning' || value === 'error' || value === 'info') {
    return value
  }
  return null
}

function pushDiagnostic(
  diagnostics: EvaluationMaterializationDiagnostic[],
  severity: 'warning' | 'error',
  code: string,
  path: string,
  message: string,
  relatedKey?: string | null,
) {
  diagnostics.push({ severity, code, path, message, relatedKey: relatedKey ?? null })
}

function toNoticeFromDiagnostic(diagnostic: AssessmentEvaluationDiagnostic): IntegrityOutputNoticeV2 {
  return {
    id: `${diagnostic.code}:${diagnostic.path}`,
    severity: diagnostic.severity === 'error' ? 'error' : 'warning',
    title: diagnostic.severity === 'error' ? 'Evaluation error' : 'Evaluation warning',
    message: diagnostic.message,
    source: diagnostic.severity === 'error' ? 'evaluation_error' : 'evaluation_warning',
    affectedIds: [diagnostic.entityId ?? diagnostic.path].filter(Boolean),
  }
}

function buildDescriptor(
  normalized: NormalizedDimensionResult | null,
  raw: RawDimensionEvaluationResult | DerivedDimensionEvaluationResult | null,
): string | null {
  if (normalized?.label) {
    return normalized.label
  }
  if (normalized?.band) {
    return normalized.band
  }
  if (raw?.status === 'insufficient_data') {
    return 'Insufficient data'
  }
  if (raw?.status === 'missing_dependencies') {
    return 'Missing dependencies'
  }
  if (raw?.status === 'invalid') {
    return 'Invalid'
  }
  return null
}

function getDimensionTitle(raw: RawDimensionEvaluationResult | DerivedDimensionEvaluationResult | null, id: string) {
  if (!raw) {
    return id
  }
  return raw.label || id
}

export function materializeAssessmentOutputsV2(
  executablePackage: ExecutableAssessmentPackageV2,
  evaluationResult: AssessmentEvaluationResultV2,
): MaterializedAssessmentOutputsV2 {
  const diagnostics: EvaluationMaterializationDiagnostic[] = []
  const webSummaryOutputs: WebSummaryOutputV2[] = []

  for (const normalized of evaluationResult.normalizedResults) {
    const raw = normalized.targetKind === 'dimension'
      ? evaluationResult.rawDimensions[normalized.targetId] ?? null
      : evaluationResult.derivedDimensions[normalized.targetId] ?? null
    const title = getDimensionTitle(raw, normalized.targetId)

    webSummaryOutputs.push({
      id: `summary:${normalized.targetKind}:${normalized.targetId}`,
      key: normalized.targetId,
      title,
      label: title,
      status: normalized.status === 'applied' ? 'available' : normalized.status === 'failed' ? 'limited' : 'warning',
      severity: null,
      band: normalized.band,
      value: {
        score: normalized.normalizedScore,
        rawScore: raw?.rawScore ?? null,
        percentile: normalized.percentile,
        descriptor: buildDescriptor(normalized, raw),
      },
      explanation: {
        text: normalized.method === 'band_table'
          ? 'Materialized from normalized band mapping.'
          : `Materialized from ${normalized.method}.`,
        narrativeBindingKey: null,
        reportBindingKey: null,
        source: 'system_fallback',
      },
      visibleInProduct: true,
    })
  }

  const triggeredOutputKeys: string[] = []
  const nonTriggeredOutputKeys: string[] = []
  const missingNarrativeBindingKeys = new Set<string>()

  for (const output of evaluationResult.outputRuleFindings) {
    const bindingKey = output.narrativeBindingKeys[0] ?? output.targetReportKeys[0] ?? null
    const binding = bindingKey ? executablePackage.reportBindingsByKey[bindingKey] ?? null : null

    if (bindingKey && !binding) {
      missingNarrativeBindingKeys.add(bindingKey)
      pushDiagnostic(
        diagnostics,
        'warning',
        'missing_report_binding',
        `outputRuleFindings.${output.ruleId}`,
        `Output rule "${output.ruleId}" references missing report binding "${bindingKey}" during materialization.`,
        bindingKey,
      )
    }

    if (output.status === 'triggered') {
      triggeredOutputKeys.push(output.key)
      webSummaryOutputs.push({
        id: `output:${output.key}`,
        key: output.key,
        title: binding?.label ?? output.key,
        label: binding?.label ?? output.key,
        status: output.severity === 'warning' ? 'warning' : 'available',
        severity: toSeverity(output.severity),
        band: output.band,
        value: {
          score: null,
          rawScore: null,
          percentile: null,
          descriptor: binding?.contentRef ?? output.type,
        },
        explanation: {
          text: binding?.explanation ?? executablePackage.outputRulesById[output.ruleId]?.severity ?? null,
          narrativeBindingKey: bindingKey,
          reportBindingKey: binding?.key ?? null,
          source: binding ? 'report_binding' : 'output_rule_metadata',
        },
        visibleInProduct: true,
      })
    } else {
      nonTriggeredOutputKeys.push(output.key)
    }
  }

  const integrityNotices: IntegrityOutputNoticeV2[] = [
    ...evaluationResult.integrityFindings
      .filter((finding) => finding.status === 'triggered')
      .map((finding) => ({
        id: `integrity:${finding.ruleId}`,
        severity: toSeverity(finding.severity) ?? 'warning',
        title: finding.kind.replace(/_/g, ' '),
        message: finding.message,
        source: 'integrity_rule' as const,
        affectedIds: [
          ...finding.affectedQuestionIds,
          ...finding.affectedDimensionIds,
          ...finding.affectedDerivedDimensionIds,
        ],
      })),
    ...evaluationResult.warnings.map(toNoticeFromDiagnostic),
    ...evaluationResult.errors.map(toNoticeFromDiagnostic),
  ]

  const overviewSection: ReportOutputSectionV2 = {
    id: 'overview',
    key: 'overview',
    title: 'Overview',
    kind: 'overview',
    blocks: [
      {
        id: 'overview-metrics',
        kind: 'metric',
        title: 'Evaluation summary',
        text: evaluationResult.status === 'success'
          ? 'Evaluation completed successfully.'
          : evaluationResult.status === 'completed_with_warnings'
            ? 'Evaluation completed with warnings.'
            : 'Evaluation failed or produced invalid inputs.',
        items: [],
        metadata: {
          questionCount: evaluationResult.executionMetadata.questionCount,
          rawDimensionCount: evaluationResult.executionMetadata.rawDimensionCount,
          derivedDimensionCount: evaluationResult.executionMetadata.derivedDimensionCount,
        },
      },
    ],
  }

  const dimensionSection: ReportOutputSectionV2 = {
    id: 'dimension-summary',
    key: 'dimension-summary',
    title: 'Dimension summary',
    kind: 'dimension_summary',
    blocks: webSummaryOutputs
      .filter((entry) => entry.id.startsWith('summary:'))
      .map((entry) => ({
        id: `report-${entry.id}`,
        kind: 'metric' as const,
        title: entry.title,
        text: entry.explanation.text,
        items: [
          `Normalized score: ${entry.value.score ?? 'n/a'}`,
          `Raw score: ${entry.value.rawScore ?? 'n/a'}`,
          `Band: ${entry.band ?? 'n/a'}`,
          `Descriptor: ${entry.value.descriptor ?? 'n/a'}`,
        ],
        metadata: {
          key: entry.key,
          visibleInProduct: entry.visibleInProduct,
        },
      })),
  }

  const triggeredOutputSection: ReportOutputSectionV2 = {
    id: 'triggered-outputs',
    key: 'triggered-outputs',
    title: 'Triggered outputs',
    kind: 'triggered_outputs',
    blocks: webSummaryOutputs
      .filter((entry) => entry.id.startsWith('output:'))
      .map((entry) => ({
        id: `report-${entry.id}`,
        kind: 'narrative' as const,
        title: entry.title,
        text: entry.explanation.text,
        items: [
          `Severity: ${entry.severity ?? 'n/a'}`,
          `Band: ${entry.band ?? 'n/a'}`,
          `Narrative binding: ${entry.explanation.narrativeBindingKey ?? 'n/a'}`,
          `Report binding: ${entry.explanation.reportBindingKey ?? 'n/a'}`,
        ],
        metadata: {
          key: entry.key,
          source: entry.explanation.source,
        },
      })),
  }

  const integritySection: ReportOutputSectionV2 = {
    id: 'integrity',
    key: 'integrity',
    title: 'Integrity and warnings',
    kind: 'integrity',
    blocks: integrityNotices.map((notice) => ({
      id: `report-${notice.id}`,
      kind: 'notice',
      title: notice.title,
      text: notice.message,
      items: notice.affectedIds,
      metadata: {
        severity: notice.severity,
        source: notice.source,
      },
    })),
  }

  const limitationItems = [
    ...evaluationResult.rawDimensions ? Object.values(evaluationResult.rawDimensions)
      .filter((result) => result.status !== 'scored')
      .map((result) => `${result.label}: ${result.status.replace(/_/g, ' ')}`) : [],
    ...Array.from(missingNarrativeBindingKeys).map((key) => `Missing narrative/report binding: ${key}`),
  ]

  const limitationSection: ReportOutputSectionV2 = {
    id: 'limitations',
    key: 'limitations',
    title: 'Limitations',
    kind: 'limitations',
    blocks: limitationItems.length
      ? [{
          id: 'limitations-list',
          kind: 'list',
          title: 'Simulation limitations',
          text: 'These limits are surfaced explicitly so admin preview does not overclaim live readiness.',
          items: limitationItems,
          metadata: {},
        }]
      : [],
  }

  const document: ReportOutputDocumentV2 = {
    id: `report:${evaluationResult.executionMetadata.packageKey}:${evaluationResult.executionMetadata.evaluationId ?? 'simulation'}`,
    title: executablePackage.metadata.assessmentName,
    subtitle: `Package ${evaluationResult.executionMetadata.packageSemver}`,
    sections: [overviewSection, dimensionSection, triggeredOutputSection, integritySection, limitationSection],
    warnings: integrityNotices,
  }

  return {
    webSummaryOutputs,
    reportDocument: document,
    integrityNotices,
    diagnostics,
    adminDebug: {
      triggeredOutputKeys,
      nonTriggeredOutputKeys,
      missingNarrativeBindingKeys: Array.from(missingNarrativeBindingKeys),
    },
  }
}

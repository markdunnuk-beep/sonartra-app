import type { AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import type { SonartraAssessmentPackageNormalizationScale, SonartraAssessmentPackageOutputRule, SonartraAssessmentPackageV1 } from '@/lib/admin/domain/assessment-package'
import {
  resolveAssessmentPackageAuthoredContent,
  resolveAssessmentPackageLocaleContext,
  type SonartraAssessmentPackageAuthoredContentReference,
  type SonartraAssessmentPackageAuthoredSectionContent,
  type SonartraAssessmentPackageOutputDimensionNarrative,
  type SonartraAssessmentPackageOutputRuleNarrative,
  type SonartraPackageContentProvenance,
} from '@/lib/admin/domain/assessment-package-content'
import { getAdminAssessmentSimulationWorkspaceStatus, type AdminAssessmentSimulationResult } from '@/lib/admin/domain/assessment-simulation'
import { preparePackageExecutionBundleForAssessmentVersion } from '@/lib/admin/domain/runtime-execution-adapter-v2'
import { classifyPackageContract } from '@/lib/admin/server/assessment-package-import'

export type AdminAssessmentReportPreviewAvailability = 'available' | 'blocked'
export type AdminAssessmentReportQualityVerdict = 'strong' | 'usable_with_gaps' | 'blocked'
export type AdminAssessmentReportSectionType = 'headline' | 'summary' | 'dimension_card' | 'strengths' | 'watchouts' | 'recommendations' | 'output_rule' | 'pdf_block' | 'warning'
export type AdminAssessmentPdfBlockType = 'title' | 'intro_summary' | 'dimension_profile' | 'strengths' | 'risk_watchout' | 'recommendation_action' | 'explanatory_text' | 'table'
export type AdminAssessmentReportContentProvenance = SonartraPackageContentProvenance

export interface AdminAssessmentReportPreviewWorkspaceStatus {
  availability: AdminAssessmentReportPreviewAvailability
  statusLabel: string
  summary: string
  blockingReason: string | null
  canGeneratePreview: boolean
}

export interface AdminAssessmentReportTraceabilityReference {
  type: 'rule' | 'language_key' | 'dimension' | 'score' | 'fallback' | 'warning' | 'provenance' | 'locale'
  value: string
  detail: string
}

export interface AdminAssessmentReportSectionTrace {
  sectionId: string
  sectionType: AdminAssessmentReportSectionType
  title: string
  ruleKeys: string[]
  languageKeys: string[]
  dimensionIds: string[]
  locale: string | null
  provenance: AdminAssessmentReportContentProvenance
  fallbackPath: string[]
  scoreEvidence: Array<{
    dimensionId: string
    rawScore: number | null
    normalizedScore: number | null
    bandKey: string | null
  }>
  fallbacks: string[]
  warnings: string[]
  references: AdminAssessmentReportTraceabilityReference[]
}

export interface AdminAssessmentWebSummaryBadge {
  id: string
  label: string
  tone: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate'
}

export interface AdminAssessmentWebSummaryDimensionCard {
  id: string
  label: string
  score: number | null
  rawScore: number | null
  bandLabel: string | null
  scaleId: string | null
  narrative: string
  provenance: AdminAssessmentReportContentProvenance
  localeUsed: string | null
  fallbackPath: string[]
  badges: AdminAssessmentWebSummaryBadge[]
  traceSectionId: string
}

export interface AdminAssessmentWebSummarySection {
  id: string
  title: string
  kind: 'summary' | 'strengths' | 'watchouts' | 'recommendations' | 'outputs'
  narrative: string | null
  items: string[]
  provenance: AdminAssessmentReportContentProvenance
  localeUsed: string | null
  fallbackPath: string[]
  traceSectionId: string
}

export interface AdminAssessmentWebSummaryModel {
  headline: {
    text: string | null
    source: AdminAssessmentReportContentProvenance
    localeUsed: string | null
    fallbackPath: string[]
    traceSectionId: string
  }
  verdict: {
    label: string
    tone: 'emerald' | 'amber' | 'rose'
  }
  overview: string
  badges: AdminAssessmentWebSummaryBadge[]
  dimensionCards: AdminAssessmentWebSummaryDimensionCard[]
  sections: AdminAssessmentWebSummarySection[]
}

export interface AdminAssessmentPdfContentBlock {
  id: string
  sectionId: string
  sectionIdentifier: string
  type: AdminAssessmentPdfBlockType
  order: number
  title: string
  text: string | null
  items?: string[]
  table?: {
    columns: string[]
    rows: string[][]
  }
  metadata: {
    ruleKeys: string[]
    languageKeys: string[]
    dimensionIds: string[]
    fallbackUsed: boolean
    provenance: AdminAssessmentReportContentProvenance
    localeUsed: string | null
    fallbackPath: string[]
  }
}

export interface AdminAssessmentReportOutputWarning {
  code: string
  severity: 'warning' | 'error'
  message: string
  sectionId?: string
  relatedKeys: string[]
}

export interface AdminAssessmentReportQualityCheck {
  key: string
  label: string
  status: 'pass' | 'warning' | 'fail'
  detail: string
}

export interface AdminAssessmentReportOutputQuality {
  verdict: AdminAssessmentReportQualityVerdict
  summary: string
  checks: AdminAssessmentReportQualityCheck[]
  authoredSectionCount: number
  fallbackSectionCount: number
  localeFallbackCount: number
}

export interface AdminAssessmentGeneratedReportOutput {
  locale: string
  localeFallbackUsed: boolean
  localeFallbackPath: string[]
  webSummary: AdminAssessmentWebSummaryModel
  pdfBlocks: AdminAssessmentPdfContentBlock[]
  traceability: AdminAssessmentReportSectionTrace[]
  warnings: AdminAssessmentReportOutputWarning[]
  quality: AdminAssessmentReportOutputQuality
}

interface DimensionContext {
  dimensionId: string
  label: string
  rawScore: number | null
  normalizedScore: number | null
  bandKey: string | null
  bandLabel: string | null
  scaleId: string | null
  rangeText: string
  relatedOutputKeys: string[]
}

interface TriggeredOutputContext {
  rule: SonartraAssessmentPackageOutputRule
  result: NonNullable<AdminAssessmentSimulationResult['outputs'][number]>
  matchedBandKey: string | null
}

interface ResolvedNarrativeContent {
  text: string
  provenance: AdminAssessmentReportContentProvenance
  localeUsed: string | null
  languageKeys: string[]
  fallbackPath: string[]
  warnings: string[]
}

function roundMetric(value: number, precision = 2): number {
  const multiplier = 10 ** precision
  return Math.round(value * multiplier) / multiplier
}

function getLanguageValue(text: Record<string, string>, key: string): string | null {
  return text[key]?.trim() || null
}

function pushWarning(collection: AdminAssessmentReportOutputWarning[], warning: AdminAssessmentReportOutputWarning) {
  if (collection.some((entry) => entry.code === warning.code && entry.message === warning.message && entry.sectionId === warning.sectionId)) {
    return
  }

  collection.push(warning)
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function getDimensionScale(pkg: SonartraAssessmentPackageV1, dimensionId: string, preferredScaleId?: string | null): SonartraAssessmentPackageNormalizationScale | null {
  if (preferredScaleId) {
    return pkg.normalization.scales.find((scale) => scale.id === preferredScaleId && scale.dimensionIds.includes(dimensionId)) ?? null
  }

  return pkg.normalization.scales.find((scale) => scale.dimensionIds.includes(dimensionId)) ?? null
}

function getDimensionContext(
  pkg: SonartraAssessmentPackageV1,
  simulation: AdminAssessmentSimulationResult,
  localeText: Record<string, string>,
  warnings: AdminAssessmentReportOutputWarning[],
): DimensionContext[] {
  return pkg.dimensions.map((dimension) => {
    const raw = simulation.rawScores.find((entry) => entry.dimensionId === dimension.id) ?? null
    const normalized = simulation.normalizedScores.find((entry) => entry.dimensionId === dimension.id) ?? null
    const label = getLanguageValue(localeText, dimension.labelKey)

    if (!label) {
      pushWarning(warnings, {
        code: `missing_language.dimension.${dimension.id}`,
        severity: 'warning',
        message: `Missing language text for dimension label key "${dimension.labelKey}".`,
        relatedKeys: [dimension.labelKey],
      })
    }

    if (dimension.descriptionKey && !getLanguageValue(localeText, dimension.descriptionKey)) {
      pushWarning(warnings, {
        code: `missing_language.dimension_description.${dimension.id}`,
        severity: 'warning',
        message: `Missing language text for dimension description key "${dimension.descriptionKey}".`,
        relatedKeys: [dimension.descriptionKey],
      })
    }

    const normalizedBand = normalized?.band ?? null
    if (normalized && normalizedBand && normalizedBand.label === normalizedBand.key) {
      const scale = getDimensionScale(pkg, dimension.id, normalized.scaleId)
      const bandKey = scale?.bands.find((band) => band.key === normalizedBand.key)?.labelKey
      if (bandKey) {
        pushWarning(warnings, {
          code: `missing_language.band.${dimension.id}.${normalizedBand.key}`,
          severity: 'warning',
          message: `Missing language text for normalization band key "${bandKey}".`,
          relatedKeys: [bandKey],
        })
      }
    }

    return {
      dimensionId: dimension.id,
      label: label ?? `Missing language: ${dimension.labelKey}`,
      rawScore: raw?.rawScore ?? null,
      normalizedScore: normalized?.normalizedScore ?? null,
      bandKey: normalized?.band?.key ?? null,
      bandLabel: normalized?.band?.label && normalized.band.label !== normalized.band.key ? normalized.band.label : normalized?.band?.key ? `Missing language: ${normalized.band.label}` : null,
      scaleId: normalized?.scaleId ?? null,
      rangeText: raw ? `${raw.minimumPossibleScore} → ${raw.maximumPossibleScore}` : 'n/a',
      relatedOutputKeys: simulation.outputs.filter((output) => output.referencedDimensions.includes(dimension.id)).map((output) => output.key),
    }
  }).sort((left, right) => (right.normalizedScore ?? Number.NEGATIVE_INFINITY) - (left.normalizedScore ?? Number.NEGATIVE_INFINITY))
}

function getOutputDisplayLabel(rule: SonartraAssessmentPackageOutputRule, localeText: Record<string, string>, warnings: AdminAssessmentReportOutputWarning[], sectionId?: string): string {
  const label = getLanguageValue(localeText, rule.labelKey)
  if (!label) {
    pushWarning(warnings, {
      code: `missing_language.output.${rule.key}`,
      severity: 'warning',
      message: `Missing language text for output label key "${rule.labelKey}".`,
      sectionId,
      relatedKeys: [rule.labelKey, rule.key],
    })

    return `Missing language: ${rule.labelKey}`
  }

  return label
}

function getHeadlineTone(topDimension: DimensionContext | undefined): 'emerald' | 'amber' | 'rose' {
  if (!topDimension || topDimension.normalizedScore === null) {
    return 'rose'
  }

  if (topDimension.normalizedScore >= 70) {
    return 'emerald'
  }

  if (topDimension.normalizedScore >= 40) {
    return 'amber'
  }

  return 'rose'
}

function buildTrace(input: Omit<AdminAssessmentReportSectionTrace, 'references'>): AdminAssessmentReportSectionTrace {
  return {
    ...input,
    references: [
      ...input.ruleKeys.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'rule', value, detail: `Triggered or referenced output rule ${value}.` })),
      ...input.languageKeys.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'language_key', value, detail: `Language key ${value} was used or expected here.` })),
      ...input.dimensionIds.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'dimension', value, detail: `Dimension ${value} contributes evidence to this section.` })),
      ...input.scoreEvidence.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'score', value: value.dimensionId, detail: `${value.dimensionId} raw ${value.rawScore ?? 'n/a'} · normalized ${value.normalizedScore ?? 'n/a'} · band ${value.bandKey ?? 'n/a'}.` })),
      { type: 'provenance', value: input.provenance, detail: `Content provenance resolved as ${input.provenance.replace(/_/g, ' ')}.` },
      ...(input.locale ? [{ type: 'locale', value: input.locale, detail: `Content resolved using locale ${input.locale}.` } satisfies AdminAssessmentReportTraceabilityReference] : []),
      ...input.fallbacks.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'fallback', value, detail: value })),
      ...input.warnings.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'warning', value, detail: value })),
    ],
  }
}

function createResolvedNarrativeContent(
  fallbackText: string,
  fallbackReason: string,
  sectionId: string,
  warnings: AdminAssessmentReportOutputWarning[],
  relatedKeys: string[],
  fallbackCode: string,
): ResolvedNarrativeContent {
  pushWarning(warnings, {
    code: fallbackCode,
    severity: 'warning',
    message: fallbackReason,
    sectionId,
    relatedKeys,
  })

  return {
    text: fallbackText,
    provenance: 'system_fallback',
    localeUsed: null,
    languageKeys: [],
    fallbackPath: [fallbackReason],
    warnings: [fallbackReason],
  }
}

function resolveNarrativeReference(
  reference: SonartraAssessmentPackageAuthoredContentReference | null | undefined,
  sectionId: string,
  warnings: AdminAssessmentReportOutputWarning[],
  relatedKeys: string[],
  missingReferenceMessage: string,
  missingContentCode: string,
): Omit<ResolvedNarrativeContent, 'text'> | null {
  if (!reference) {
    pushWarning(warnings, {
      code: missingContentCode,
      severity: 'warning',
      message: missingReferenceMessage,
      sectionId,
      relatedKeys,
    })
    return null
  }

  return null
}

function resolveSectionContent(
  authored: SonartraAssessmentPackageAuthoredContentReference | null | undefined,
  localeContext: ReturnType<typeof resolveAssessmentPackageLocaleContext>,
  sectionId: string,
  warnings: AdminAssessmentReportOutputWarning[],
  relatedKeys: string[],
  fallbackText: string,
  fallbackReason: string,
  fallbackCode: string,
): ResolvedNarrativeContent {
  const missing = resolveNarrativeReference(authored, sectionId, warnings, relatedKeys, fallbackReason, fallbackCode)
  if (missing) {
    return { text: fallbackText, ...missing }
  }

  if (authored) {
    const resolved = resolveAssessmentPackageAuthoredContent(authored, localeContext)
    if (resolved.text) {
      if (resolved.provenance === 'package_authored_default_locale') {
        pushWarning(warnings, {
          code: `${fallbackCode}.default_locale`,
          severity: 'warning',
          message: `${fallbackReason} Localized authored content was unavailable, so the default locale authored content was used.`,
          sectionId,
          relatedKeys: unique([...relatedKeys, ...resolved.languageKeys]),
        })
      }
      return {
        text: resolved.text,
        provenance: resolved.provenance,
        localeUsed: resolved.localeUsed,
        languageKeys: resolved.languageKeys,
        fallbackPath: resolved.fallbackPath,
        warnings: resolved.provenance === 'package_authored_default_locale'
          ? ['Default locale authored content was used because locale-specific narrative content was unavailable.']
          : [],
      }
    }

    pushWarning(warnings, {
      code: `${fallbackCode}.missing_authored`,
      severity: 'warning',
      message: `${fallbackReason} Package-authored content could not be resolved from language or inline content.`,
      sectionId,
      relatedKeys: unique([...relatedKeys, ...resolved.languageKeys]),
    })
  }

  return createResolvedNarrativeContent(fallbackText, fallbackReason, sectionId, warnings, relatedKeys, fallbackCode)
}

function getTriggeredOutputContexts(
  pkg: SonartraAssessmentPackageV1,
  simulation: AdminAssessmentSimulationResult,
  dimensions: DimensionContext[],
): TriggeredOutputContext[] {
  return (pkg.outputs?.reportRules ?? []).map((rule) => {
    const result = simulation.outputs.find((entry) => entry.key === rule.key) ?? null
    if (!result?.triggered) {
      return null
    }

    const matchingDimension = dimensions.find((dimension) => rule.dimensionIds.includes(dimension.dimensionId)) ?? null
    return {
      rule,
      result,
      matchedBandKey: matchingDimension?.bandKey ?? null,
    }
  }).filter((entry): entry is TriggeredOutputContext => Boolean(entry))
}

function getMatchedNarrative(rule: SonartraAssessmentPackageOutputRule, matchedBandKey: string | null): SonartraAssessmentPackageOutputRuleNarrative | null {
  if (!rule.narrative) {
    return null
  }

  if (!matchedBandKey || !rule.narrative.variants?.length) {
    return rule.narrative
  }

  const matchedVariant = rule.narrative.variants.find((entry) => entry.bandKey === matchedBandKey)
  if (!matchedVariant) {
    return rule.narrative
  }

  return {
    ...rule.narrative,
    ...matchedVariant,
  }
}

function getDimensionNarrative(
  firedOutputs: TriggeredOutputContext[],
  dimensionId: string,
  bandKey: string | null,
): { rule: SonartraAssessmentPackageOutputRule, narrative: SonartraAssessmentPackageOutputDimensionNarrative } | null {
  for (const firedOutput of firedOutputs) {
    const ruleNarrative = getMatchedNarrative(firedOutput.rule, firedOutput.matchedBandKey)
    const dimensionNarrative = ruleNarrative?.dimensionNarratives?.find((entry) => entry.dimensionId === dimensionId)
    if (!dimensionNarrative) {
      continue
    }

    if (bandKey) {
      const matchedBandNarrative = dimensionNarrative.bandNarratives?.find((entry) => entry.bandKey === bandKey)
      if (matchedBandNarrative) {
        return {
          rule: firedOutput.rule,
          narrative: {
            ...dimensionNarrative,
            ...matchedBandNarrative,
          },
        }
      }
    }

    return { rule: firedOutput.rule, narrative: dimensionNarrative }
  }

  return null
}

export function getAdminAssessmentReportPreviewWorkspaceStatus(version: Pick<AdminAssessmentVersionRecord, 'packageInfo' | 'normalizedPackage'>): AdminAssessmentReportPreviewWorkspaceStatus {
  const classifier = classifyPackageContract(version.normalizedPackage)
  if (classifier.classifier === 'canonical_contract_v2' || classifier.classifier === 'runtime_contract_v2') {
    const prepared = preparePackageExecutionBundleForAssessmentVersion({ storedPackage: version.normalizedPackage })
    if (!prepared.bundle || !prepared.readiness.simulatable) {
      return {
        availability: 'blocked',
        statusLabel: 'Unavailable',
        summary: 'Report preview is unavailable because the runtime-v2 execution bundle cannot be prepared from the currently stored package payload.',
        blockingReason: prepared.errors[0]?.message ?? 'Resolve structural, compile, or execution-plan issues to enable preview/simulation flows.',
        canGeneratePreview: false,
      }
    }

    return {
      availability: 'available',
      statusLabel: 'Ready after simulation',
      summary: 'Report preview is available through the shared runtime-v2 preparation + execution foundation. Run a simulation payload to materialize preview evidence.',
      blockingReason: null,
      canGeneratePreview: true,
    }
  }

  const simulationStatus = getAdminAssessmentSimulationWorkspaceStatus(version)

  if (!simulationStatus.canRunSimulation) {
    return {
      availability: 'blocked',
      statusLabel: 'Unavailable',
      summary: 'Report preview is unavailable for the current package state because it depends on a simulation that can run truthfully against the normalized package.',
      blockingReason: simulationStatus.blockingReason,
      canGeneratePreview: false,
    }
  }

  return {
    availability: 'available',
    statusLabel: 'Ready after simulation',
    summary: 'No simulation run yet for this version. Run a simulation to generate report preview evidence from the normalized package. Nothing is persisted as an end-user report in v1.',
    blockingReason: null,
    canGeneratePreview: true,
  }
}

export function generateAdminAssessmentReportOutput(
  pkg: SonartraAssessmentPackageV1,
  simulation: AdminAssessmentSimulationResult,
): AdminAssessmentGeneratedReportOutput {
  const localeContext = resolveAssessmentPackageLocaleContext(pkg, simulation.responseSummary.locale)
  const warnings: AdminAssessmentReportOutputWarning[] = simulation.warnings.map((warning) => ({
    code: `simulation.${warning.path}`,
    severity: 'warning',
    message: warning.message,
    relatedKeys: [warning.path],
  }))

  if (localeContext.localeFallbackUsed) {
    pushWarning(warnings, {
      code: 'locale.fallback',
      severity: 'warning',
      message: localeContext.localeFallbackPath.join(' '),
      relatedKeys: [simulation.responseSummary.locale],
    })
  }

  const dimensions = getDimensionContext(pkg, simulation, localeContext.localeText, warnings)
  const firedOutputs = getTriggeredOutputContexts(pkg, simulation, dimensions)
  const topDimension = dimensions[0]
  const lowDimensions = dimensions.filter((dimension) => dimension.normalizedScore !== null && dimension.normalizedScore < 40)
  const unresolvedDimensions = dimensions.filter((dimension) => dimension.normalizedScore === null)
  const headlineSectionId = 'headline'
  const summarySectionId = 'summary'
  const traceability: AdminAssessmentReportSectionTrace[] = []
  const primaryOutput = firedOutputs[0] ?? null
  const primaryNarrative = primaryOutput ? getMatchedNarrative(primaryOutput.rule, primaryOutput.matchedBandKey) : null

  const headline = primaryNarrative?.summaryHeadline
    ? resolveSectionContent(
      primaryNarrative.summaryHeadline,
      localeContext,
      headlineSectionId,
      warnings,
      [primaryOutput.rule.key, primaryOutput.rule.labelKey],
      getOutputDisplayLabel(primaryOutput.rule, localeContext.localeText, warnings, headlineSectionId),
      'Package-authored summary headline was unavailable, so the report headline fell back to the rule label.',
      'fallback.headline',
    )
    : primaryOutput
      ? {
        text: getOutputDisplayLabel(primaryOutput.rule, localeContext.localeText, warnings, headlineSectionId),
        provenance: 'package_authored_localized' as const,
        localeUsed: localeContext.locale,
        languageKeys: [primaryOutput.rule.labelKey],
        fallbackPath: [],
        warnings: [],
      }
      : topDimension
        ? createResolvedNarrativeContent(
          `${topDimension.label} leads this sample profile${topDimension.bandLabel ? ` · ${topDimension.bandLabel}` : ''}`,
          'No triggered output rule supplied authored headline content, so the preview headline fell back to score-derived wording.',
          headlineSectionId,
          warnings,
          topDimension.relatedOutputKeys,
          'fallback.headline.score',
        )
        : {
          text: null as never,
          provenance: 'blocked' as const,
          localeUsed: null,
          languageKeys: [],
          fallbackPath: ['No normalized dimension evidence exists, so the preview headline could not be generated.'],
          warnings: ['No normalized dimension evidence exists, so the preview headline could not be generated.'],
        }

  if (!headline.text && headline.provenance === 'blocked') {
    pushWarning(warnings, {
      code: 'blocked.headline',
      severity: 'error',
      message: headline.warnings[0] ?? 'No headline could be generated.',
      sectionId: headlineSectionId,
      relatedKeys: [],
    })
  }

  traceability.push(buildTrace({
    sectionId: headlineSectionId,
    sectionType: 'headline',
    title: 'Headline',
    ruleKeys: primaryOutput ? [primaryOutput.rule.key] : [],
    languageKeys: headline.languageKeys,
    dimensionIds: topDimension ? [topDimension.dimensionId] : [],
    locale: headline.localeUsed,
    provenance: headline.provenance,
    fallbackPath: headline.fallbackPath,
    scoreEvidence: topDimension ? [{
      dimensionId: topDimension.dimensionId,
      rawScore: topDimension.rawScore,
      normalizedScore: topDimension.normalizedScore,
      bandKey: topDimension.bandKey,
    }] : [],
    fallbacks: headline.provenance === 'system_fallback' || headline.provenance === 'blocked' ? headline.fallbackPath : [],
    warnings: headline.warnings,
  }))

  const summaryNarrative = resolveSectionContent(
    primaryNarrative?.summaryBody,
    localeContext,
    summarySectionId,
    warnings,
    unique([...(primaryOutput ? [primaryOutput.rule.key, primaryOutput.rule.labelKey] : []), ...firedOutputs.flatMap((entry) => [entry.rule.key])]),
    topDimension
      ? `Sample scenario ${simulation.responseSummary.scenarioKey?.replace(/_/g, ' ') ?? 'custom'} resolved ${firedOutputs.length} triggered output${firedOutputs.length === 1 ? '' : 's'} across ${dimensions.length} dimension${dimensions.length === 1 ? '' : 's'}. Highest observed signal: ${topDimension.label}${topDimension.normalizedScore !== null ? ` at ${roundMetric(topDimension.normalizedScore)}.` : '.'}`
      : 'Sample scenario could not resolve enough score evidence to build a report-output preview.',
    'Package-authored summary body was unavailable, so the summary overview fell back to system-generated wording.',
    'fallback.summary',
  )

  traceability.push(buildTrace({
    sectionId: summarySectionId,
    sectionType: 'summary',
    title: 'Summary overview',
    ruleKeys: firedOutputs.map((entry) => entry.rule.key),
    languageKeys: summaryNarrative.languageKeys,
    dimensionIds: dimensions.map((dimension) => dimension.dimensionId),
    locale: summaryNarrative.localeUsed,
    provenance: summaryNarrative.provenance,
    fallbackPath: summaryNarrative.fallbackPath,
    scoreEvidence: dimensions.map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: summaryNarrative.provenance === 'system_fallback' ? summaryNarrative.fallbackPath : [],
    warnings: summaryNarrative.warnings,
  }))

  const dimensionCards: AdminAssessmentWebSummaryDimensionCard[] = dimensions.map((dimension) => {
    const sectionId = `dimension.${dimension.dimensionId}`
    const dimensionNarrativeSource = getDimensionNarrative(firedOutputs, dimension.dimensionId, dimension.bandKey)
    const authoredDimensionNarrative = resolveSectionContent(
      dimensionNarrativeSource?.narrative.body,
      localeContext,
      sectionId,
      warnings,
      unique([dimension.dimensionId, ...(dimensionNarrativeSource ? [dimensionNarrativeSource.rule.key] : []), ...dimension.relatedOutputKeys]),
      dimension.normalizedScore === null
        ? `${dimension.label} did not resolve to a normalized score in this sample preview.`
        : `${dimension.label} resolved at ${roundMetric(dimension.normalizedScore)}${dimension.bandLabel ? ` in the ${dimension.bandLabel} band` : ''}. Raw score ${dimension.rawScore ?? 'n/a'} across range ${dimension.rangeText}.`,
      'Package-authored dimension narrative was unavailable, so the dimension card fell back to score-derived wording.',
      `fallback.dimension.${dimension.dimensionId}`,
    )

    const cardWarnings = [...authoredDimensionNarrative.warnings]
    if (dimension.normalizedScore === null) {
      cardWarnings.push('No normalized score was available for this dimension.')
    }

    const languageKeys = unique([
      ...authoredDimensionNarrative.languageKeys,
      ...(dimension.label.startsWith('Missing language:') ? [] : [pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)?.labelKey].filter(Boolean) as string[]),
    ])

    traceability.push(buildTrace({
      sectionId,
      sectionType: 'dimension_card',
      title: `${dimension.label} card`,
      ruleKeys: unique([...(dimensionNarrativeSource ? [dimensionNarrativeSource.rule.key] : []), ...dimension.relatedOutputKeys]),
      languageKeys,
      dimensionIds: [dimension.dimensionId],
      locale: authoredDimensionNarrative.localeUsed,
      provenance: authoredDimensionNarrative.provenance,
      fallbackPath: authoredDimensionNarrative.fallbackPath,
      scoreEvidence: [{
        dimensionId: dimension.dimensionId,
        rawScore: dimension.rawScore,
        normalizedScore: dimension.normalizedScore,
        bandKey: dimension.bandKey,
      }],
      fallbacks: authoredDimensionNarrative.provenance === 'system_fallback' ? authoredDimensionNarrative.fallbackPath : [],
      warnings: cardWarnings,
    }))

    return {
      id: dimension.dimensionId,
      label: dimension.label,
      score: dimension.normalizedScore,
      rawScore: dimension.rawScore,
      bandLabel: dimension.bandLabel,
      scaleId: dimension.scaleId,
      narrative: authoredDimensionNarrative.text,
      provenance: authoredDimensionNarrative.provenance,
      localeUsed: authoredDimensionNarrative.localeUsed,
      fallbackPath: authoredDimensionNarrative.fallbackPath,
      badges: [
        { id: `${dimension.dimensionId}-band`, label: dimension.bandLabel ?? 'No band', tone: dimension.normalizedScore === null ? 'rose' : dimension.normalizedScore >= 70 ? 'emerald' : dimension.normalizedScore >= 40 ? 'amber' : 'rose' },
        { id: `${dimension.dimensionId}-outputs`, label: `${dimension.relatedOutputKeys.length} output refs`, tone: dimension.relatedOutputKeys.length ? 'sky' : 'slate' },
        { id: `${dimension.dimensionId}-provenance`, label: authoredDimensionNarrative.provenance.replace(/_/g, ' '), tone: authoredDimensionNarrative.provenance === 'package_authored_localized' ? 'emerald' : authoredDimensionNarrative.provenance === 'package_authored_default_locale' ? 'amber' : 'slate' },
      ],
      traceSectionId: sectionId,
    }
  })

  const strengthsItems = dimensions
    .filter((dimension) => dimension.normalizedScore !== null)
    .slice(0, Math.min(2, dimensions.length))
    .map((dimension) => `${dimension.label}${dimension.bandLabel ? ` · ${dimension.bandLabel}` : ''} (${roundMetric(dimension.normalizedScore ?? 0)})`)
  const watchoutItems = lowDimensions.map((dimension) => `${dimension.label}${dimension.bandLabel ? ` · ${dimension.bandLabel}` : ''} (${roundMetric(dimension.normalizedScore ?? 0)})`)
  const recommendationItems = (lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => dimension.normalizedScore === null
    ? `Review why ${dimension.label} did not resolve to a normalized result in this sample scenario before publish.`
    : `Review the report language and downstream advice for ${dimension.label} because this sample preview resolved in the ${dimension.bandLabel ?? dimension.bandKey ?? 'lower'} band.`)
  const outputItems = firedOutputs.map(({ rule, result }) => `${getOutputDisplayLabel(rule, localeContext.localeText, warnings, 'outputs')} · ${result.reasons[0] ?? 'Triggered by referenced score evidence.'}`)

  const strengthsNarrative = resolveSectionContent(
    primaryNarrative?.strengths?.body,
    localeContext,
    'strengths',
    warnings,
    unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...dimensions.slice(0, 2).flatMap((dimension) => dimension.relatedOutputKeys)]),
    strengthsItems.length ? 'Highest-scoring dimensions in this sample preview.' : 'No strength narrative could be assembled from the current sample evidence.',
    'Package-authored strengths body was unavailable, so strengths copy fell back to system wording.',
    'fallback.strengths',
  )

  const watchoutsNarrative = resolveSectionContent(
    primaryNarrative?.watchouts?.body,
    localeContext,
    'watchouts',
    warnings,
    unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...lowDimensions.flatMap((dimension) => dimension.relatedOutputKeys)]),
    watchoutItems.length ? 'Lower-band dimensions that may require careful wording or recommendations.' : 'No low-band watchouts were triggered in this sample preview.',
    'Package-authored watchout body was unavailable, so watchout copy fell back to system wording.',
    'fallback.watchouts',
  )

  const recommendationsNarrative = resolveSectionContent(
    primaryNarrative?.recommendations?.body,
    localeContext,
    'recommendations',
    warnings,
    unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...(lowDimensions.length ? lowDimensions : unresolvedDimensions).flatMap((dimension) => dimension.relatedOutputKeys)]),
    recommendationItems.length ? 'System-generated recommendations are being used where package-authored recommendation language is not yet available.' : 'No recommendation block was required by this sample preview.',
    'Package-authored recommendation body was unavailable, so recommendation copy fell back to system wording.',
    'fallback.recommendations',
  )

  const sections: AdminAssessmentWebSummarySection[] = [
    {
      id: 'summary-output',
      title: primaryNarrative?.summaryHeadline ? headline.text : 'Top-line summary',
      kind: 'summary',
      narrative: summaryNarrative.text,
      items: firedOutputs.length ? outputItems.slice(0, 3) : ['No triggered outputs supplied resolved copy for this sample scenario.'],
      provenance: summaryNarrative.provenance,
      localeUsed: summaryNarrative.localeUsed,
      fallbackPath: summaryNarrative.fallbackPath,
      traceSectionId: summarySectionId,
    },
    {
      id: 'strengths-output',
      title: 'Strengths',
      kind: 'strengths',
      narrative: strengthsNarrative.text,
      items: strengthsItems.length ? strengthsItems : ['No high-signal dimensions were available.'],
      provenance: strengthsNarrative.provenance,
      localeUsed: strengthsNarrative.localeUsed,
      fallbackPath: strengthsNarrative.fallbackPath,
      traceSectionId: 'strengths',
    },
    {
      id: 'watchouts-output',
      title: 'Risks / watchouts',
      kind: 'watchouts',
      narrative: watchoutsNarrative.text,
      items: watchoutItems.length ? watchoutItems : ['No explicit watchouts were triggered.'],
      provenance: watchoutsNarrative.provenance,
      localeUsed: watchoutsNarrative.localeUsed,
      fallbackPath: watchoutsNarrative.fallbackPath,
      traceSectionId: 'watchouts',
    },
    {
      id: 'recommendations-output',
      title: 'Recommendations',
      kind: 'recommendations',
      narrative: recommendationsNarrative.text,
      items: recommendationItems.length ? recommendationItems : ['No recommendations were required for this sample preview.'],
      provenance: recommendationsNarrative.provenance,
      localeUsed: recommendationsNarrative.localeUsed,
      fallbackPath: recommendationsNarrative.fallbackPath,
      traceSectionId: 'recommendations',
    },
    {
      id: 'triggered-output-rules',
      title: 'Triggered outputs',
      kind: 'outputs',
      narrative: firedOutputs.length ? 'Triggered output rules that would feed later report-delivery layers.' : 'No output rules triggered for this sample scenario.',
      items: firedOutputs.length ? outputItems : ['No triggered outputs.'],
      provenance: firedOutputs.length ? 'package_authored_localized' : 'system_fallback',
      localeUsed: firedOutputs.length ? localeContext.locale : null,
      fallbackPath: firedOutputs.length ? [] : ['No output-rule content fired, so the outputs block remains informational only.'],
      traceSectionId: 'outputs',
    },
  ]

  traceability.push(buildTrace({
    sectionId: 'strengths',
    sectionType: 'strengths',
    title: 'Strengths block',
    ruleKeys: unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...dimensions.slice(0, 2).flatMap((dimension) => dimension.relatedOutputKeys)]),
    languageKeys: strengthsNarrative.languageKeys,
    dimensionIds: dimensions.slice(0, 2).map((dimension) => dimension.dimensionId),
    locale: strengthsNarrative.localeUsed,
    provenance: strengthsNarrative.provenance,
    fallbackPath: strengthsNarrative.fallbackPath,
    scoreEvidence: dimensions.slice(0, 2).map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: strengthsNarrative.provenance === 'system_fallback' ? strengthsNarrative.fallbackPath : [],
    warnings: strengthsNarrative.warnings.length ? strengthsNarrative.warnings : strengthsItems.length ? [] : ['No dimensions resolved strongly enough to populate the strengths block beyond fallback copy.'],
  }))

  traceability.push(buildTrace({
    sectionId: 'watchouts',
    sectionType: 'watchouts',
    title: 'Watchouts block',
    ruleKeys: unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...lowDimensions.flatMap((dimension) => dimension.relatedOutputKeys)]),
    languageKeys: watchoutsNarrative.languageKeys,
    dimensionIds: lowDimensions.map((dimension) => dimension.dimensionId),
    locale: watchoutsNarrative.localeUsed,
    provenance: watchoutsNarrative.provenance,
    fallbackPath: watchoutsNarrative.fallbackPath,
    scoreEvidence: lowDimensions.map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: watchoutsNarrative.provenance === 'system_fallback' ? watchoutsNarrative.fallbackPath : [],
    warnings: unique([...watchoutsNarrative.warnings, ...(unresolvedDimensions.length ? ['One or more dimensions did not resolve, so watchout coverage may be incomplete.'] : [])]),
  }))

  traceability.push(buildTrace({
    sectionId: 'recommendations',
    sectionType: 'recommendations',
    title: 'Recommendations block',
    ruleKeys: unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...(lowDimensions.length ? lowDimensions : unresolvedDimensions).flatMap((dimension) => dimension.relatedOutputKeys)]),
    languageKeys: recommendationsNarrative.languageKeys,
    dimensionIds: (lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => dimension.dimensionId),
    locale: recommendationsNarrative.localeUsed,
    provenance: recommendationsNarrative.provenance,
    fallbackPath: recommendationsNarrative.fallbackPath,
    scoreEvidence: (lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: recommendationsNarrative.provenance === 'system_fallback' ? recommendationsNarrative.fallbackPath : [],
    warnings: recommendationsNarrative.warnings.length ? recommendationsNarrative.warnings : recommendationItems.length ? [] : ['No recommendations were required for the supplied sample scenario.'],
  }))

  traceability.push(buildTrace({
    sectionId: 'outputs',
    sectionType: 'output_rule',
    title: 'Triggered outputs block',
    ruleKeys: firedOutputs.map((entry) => entry.rule.key),
    languageKeys: firedOutputs.map((entry) => entry.rule.labelKey),
    dimensionIds: unique(firedOutputs.flatMap((entry) => entry.rule.dimensionIds)),
    locale: firedOutputs.length ? localeContext.locale : null,
    provenance: firedOutputs.length ? 'package_authored_localized' : 'system_fallback',
    fallbackPath: firedOutputs.length ? [] : ['No output-rule content fired, so the outputs block remains informational only.'],
    scoreEvidence: dimensions.filter((dimension) => firedOutputs.some((entry) => entry.rule.dimensionIds.includes(dimension.dimensionId))).map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: firedOutputs.length ? [] : ['No output-rule content fired, so the outputs block remains informational only.'],
    warnings: firedOutputs.flatMap((entry) => entry.result.warnings ?? []),
  }))

  const pdfBlocks: AdminAssessmentPdfContentBlock[] = []
  let order = 1
  const pushPdfBlock = (block: Omit<AdminAssessmentPdfContentBlock, 'order'>) => {
    pdfBlocks.push({ ...block, order })
    order += 1
  }

  pushPdfBlock({
    id: 'pdf.title',
    sectionId: headlineSectionId,
    sectionIdentifier: 'report.title',
    type: 'title',
    title: headline.text ?? 'Report preview blocked',
    text: `${pkg.meta.assessmentTitle} · sample preview`,
    metadata: {
      ruleKeys: primaryOutput ? [primaryOutput.rule.key] : [],
      languageKeys: headline.languageKeys,
      dimensionIds: topDimension ? [topDimension.dimensionId] : [],
      fallbackUsed: headline.provenance !== 'package_authored_localized',
      provenance: headline.provenance,
      localeUsed: headline.localeUsed,
      fallbackPath: headline.fallbackPath,
    },
  })

  pushPdfBlock({
    id: 'pdf.intro',
    sectionId: summarySectionId,
    sectionIdentifier: 'report.intro',
    type: 'intro_summary',
    title: 'Preview summary',
    text: summaryNarrative.text,
    items: [
      `Scenario: ${simulation.responseSummary.scenarioKey?.replace(/_/g, ' ') ?? 'custom'}`,
      `Triggered outputs: ${firedOutputs.length}`,
      `Locale: ${localeContext.locale}`,
    ],
    metadata: {
      ruleKeys: firedOutputs.map((entry) => entry.rule.key),
      languageKeys: summaryNarrative.languageKeys,
      dimensionIds: dimensions.map((dimension) => dimension.dimensionId),
      fallbackUsed: summaryNarrative.provenance !== 'package_authored_localized',
      provenance: summaryNarrative.provenance,
      localeUsed: summaryNarrative.localeUsed,
      fallbackPath: summaryNarrative.fallbackPath,
    },
  })

  dimensionCards.forEach((dimension) => {
    pushPdfBlock({
      id: `pdf.dimension.${dimension.id}`,
      sectionId: `dimension.${dimension.id}`,
      sectionIdentifier: `report.dimension.${dimension.id}`,
      type: 'dimension_profile',
      title: dimension.label,
      text: dimension.narrative,
      items: [
        `Raw score: ${dimension.rawScore ?? 'n/a'}`,
        `Scale: ${dimension.scaleId ?? 'n/a'}`,
        `Related outputs: ${dimensions.find((entry) => entry.dimensionId === dimension.id)?.relatedOutputKeys.length ? dimensions.find((entry) => entry.dimensionId === dimension.id)?.relatedOutputKeys.join(', ') : 'none'}`,
      ],
      metadata: {
        ruleKeys: dimensions.find((entry) => entry.dimensionId === dimension.id)?.relatedOutputKeys ?? [],
        languageKeys: unique([
          ...(pkg.dimensions.find((entry) => entry.id === dimension.id)?.labelKey ? [pkg.dimensions.find((entry) => entry.id === dimension.id)!.labelKey] : []),
        ]),
        dimensionIds: [dimension.id],
        fallbackUsed: dimension.provenance !== 'package_authored_localized',
        provenance: dimension.provenance,
        localeUsed: dimension.localeUsed,
        fallbackPath: dimension.fallbackPath,
      },
    })
  })

  pushPdfBlock({
    id: 'pdf.strengths',
    sectionId: 'strengths',
    sectionIdentifier: 'report.strengths',
    type: 'strengths',
    title: 'Strengths',
    text: strengthsNarrative.text,
    items: strengthsItems.length ? strengthsItems : ['No high-signal dimensions were available.'],
    metadata: {
      ruleKeys: unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...dimensions.slice(0, 2).flatMap((dimension) => dimension.relatedOutputKeys)]),
      languageKeys: strengthsNarrative.languageKeys,
      dimensionIds: dimensions.slice(0, 2).map((dimension) => dimension.dimensionId),
      fallbackUsed: strengthsNarrative.provenance !== 'package_authored_localized',
      provenance: strengthsNarrative.provenance,
      localeUsed: strengthsNarrative.localeUsed,
      fallbackPath: strengthsNarrative.fallbackPath,
    },
  })

  pushPdfBlock({
    id: 'pdf.watchouts',
    sectionId: 'watchouts',
    sectionIdentifier: 'report.watchouts',
    type: 'risk_watchout',
    title: 'Risks / watchouts',
    text: watchoutsNarrative.text,
    items: watchoutItems.length ? watchoutItems : ['No explicit watchouts were triggered.'],
    metadata: {
      ruleKeys: unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...lowDimensions.flatMap((dimension) => dimension.relatedOutputKeys)]),
      languageKeys: watchoutsNarrative.languageKeys,
      dimensionIds: lowDimensions.map((dimension) => dimension.dimensionId),
      fallbackUsed: watchoutsNarrative.provenance !== 'package_authored_localized',
      provenance: watchoutsNarrative.provenance,
      localeUsed: watchoutsNarrative.localeUsed,
      fallbackPath: watchoutsNarrative.fallbackPath,
    },
  })

  pushPdfBlock({
    id: 'pdf.recommendations',
    sectionId: 'recommendations',
    sectionIdentifier: 'report.recommendations',
    type: 'recommendation_action',
    title: 'Recommendations',
    text: recommendationsNarrative.text,
    items: recommendationItems.length ? recommendationItems : ['No recommendations were required for this sample preview.'],
    metadata: {
      ruleKeys: unique([...(primaryOutput ? [primaryOutput.rule.key] : []), ...(lowDimensions.length ? lowDimensions : unresolvedDimensions).flatMap((dimension) => dimension.relatedOutputKeys)]),
      languageKeys: recommendationsNarrative.languageKeys,
      dimensionIds: (lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => dimension.dimensionId),
      fallbackUsed: recommendationsNarrative.provenance !== 'package_authored_localized',
      provenance: recommendationsNarrative.provenance,
      localeUsed: recommendationsNarrative.localeUsed,
      fallbackPath: recommendationsNarrative.fallbackPath,
    },
  })

  pushPdfBlock({
    id: 'pdf.outputs',
    sectionId: 'outputs',
    sectionIdentifier: 'report.outputs',
    type: 'table',
    title: 'Triggered outputs',
    text: sections.find((section) => section.id === 'triggered-output-rules')?.narrative ?? null,
    table: {
      columns: ['Output rule', 'Triggered', 'Dimensions'],
      rows: (pkg.outputs?.reportRules ?? []).map((rule) => {
        const result = simulation.outputs.find((entry) => entry.key === rule.key)
        return [
          getOutputDisplayLabel(rule, localeContext.localeText, warnings, 'outputs'),
          result?.triggered ? 'Yes' : 'No',
          rule.dimensionIds.join(', '),
        ]
      }),
    },
    metadata: {
      ruleKeys: (pkg.outputs?.reportRules ?? []).map((rule) => rule.key),
      languageKeys: (pkg.outputs?.reportRules ?? []).map((rule) => rule.labelKey),
      dimensionIds: unique((pkg.outputs?.reportRules ?? []).flatMap((rule) => rule.dimensionIds)),
      fallbackUsed: false,
      provenance: 'package_authored_localized',
      localeUsed: localeContext.locale,
      fallbackPath: [],
    },
  })

  if (warnings.length > 0) {
    pushPdfBlock({
      id: 'pdf.warnings',
      sectionId: 'warnings',
      sectionIdentifier: 'report.warnings',
      type: 'explanatory_text',
      title: 'Preview warnings and fallbacks',
      text: 'This sample preview includes warnings, missing language references, locale fallbacks, or fallback-generated content that should be reviewed before publish.',
      items: warnings.map((warning) => warning.message),
      metadata: {
        ruleKeys: [],
        languageKeys: unique(warnings.flatMap((warning) => warning.relatedKeys)),
        dimensionIds: [],
        fallbackUsed: true,
        provenance: 'system_fallback',
        localeUsed: null,
        fallbackPath: unique(warnings.map((warning) => warning.message)),
      },
    })
  }

  const narrativeSections = [headline, summaryNarrative, strengthsNarrative, watchoutsNarrative, recommendationsNarrative, ...dimensionCards.map((card) => ({
    text: card.narrative,
    provenance: card.provenance,
    localeUsed: card.localeUsed,
    languageKeys: [] as string[],
    fallbackPath: card.fallbackPath,
    warnings: [],
  }))]
  const authoredSectionCount = narrativeSections.filter((entry) => entry.provenance === 'package_authored_localized').length
  const fallbackSectionCount = narrativeSections.filter((entry) => entry.provenance === 'system_fallback' || entry.provenance === 'blocked').length
  const defaultLocaleSectionCount = narrativeSections.filter((entry) => entry.provenance === 'package_authored_default_locale').length

  const qualityChecks: AdminAssessmentReportQualityCheck[] = [
    {
      key: 'headline_generated',
      label: 'Headline generated',
      status: headline.text ? 'pass' : 'fail',
      detail: headline.text ? `Headline source: ${headline.provenance.replace(/_/g, ' ')}.` : 'No headline could be generated from the current sample evidence.',
    },
    {
      key: 'dimension_coverage',
      label: 'Dimension coverage',
      status: dimensions.length > 0 && dimensions.every((dimension) => dimension.normalizedScore !== null) ? 'pass' : dimensions.some((dimension) => dimension.normalizedScore !== null) ? 'warning' : 'fail',
      detail: dimensions.every((dimension) => dimension.normalizedScore !== null)
        ? `All ${dimensions.length} dimensions produced normalized content.`
        : `${dimensions.filter((dimension) => dimension.normalizedScore !== null).length}/${dimensions.length} dimensions produced normalized content.`,
    },
    {
      key: 'authored_content_coverage',
      label: 'Authored narrative coverage',
      status: fallbackSectionCount <= 1 && authoredSectionCount >= 4 ? 'pass' : 'warning',
      detail: `${authoredSectionCount}/${narrativeSections.length} narrative sections resolved with locale-specific package-authored content; ${defaultLocaleSectionCount} used default-locale authored content and ${fallbackSectionCount} used system fallback.`,
    },
    {
      key: 'locale_resolution',
      label: 'Locale resolution',
      status: localeContext.localeFallbackUsed || defaultLocaleSectionCount > 0 ? 'warning' : 'pass',
      detail: localeContext.localeFallbackUsed
        ? localeContext.localeFallbackPath.join(' ')
        : defaultLocaleSectionCount > 0
          ? `${defaultLocaleSectionCount} section(s) relied on default-locale authored content.`
          : 'Locale-specific authored content resolved cleanly.',
    },
    {
      key: 'recommendation_population',
      label: 'Recommendations or watchouts populated when expected',
      status: lowDimensions.length === 0 ? 'pass' : recommendationItems.length > 0 && watchoutItems.length > 0 ? 'pass' : 'warning',
      detail: lowDimensions.length === 0
        ? 'No lower-band dimensions required watchout or recommendation content in this sample preview.'
        : `${watchoutItems.length} watchout item(s) and ${recommendationItems.length} recommendation item(s) were generated from lower-band evidence.`,
    },
    {
      key: 'fallback_usage',
      label: 'Fallback usage',
      status: fallbackSectionCount > 1 || warnings.some((warning) => warning.code.startsWith('missing_language') || warning.code.startsWith('locale.') || warning.code.startsWith('fallback.headline')) ? 'warning' : 'pass',
      detail: fallbackSectionCount > 1 || warnings.some((warning) => warning.code.startsWith('missing_language') || warning.code.startsWith('locale.') || warning.code.startsWith('fallback.headline'))
        ? 'Fallbacks, missing language, or locale fallbacks were required in the preview output.'
        : 'No fallback-generated copy was required.',
    },
  ]

  const hasFailure = qualityChecks.some((check) => check.status === 'fail')
  const hasWarning = qualityChecks.some((check) => check.status === 'warning')
  const qualityVerdict: AdminAssessmentReportQualityVerdict = hasFailure ? 'blocked' : hasWarning ? 'usable_with_gaps' : 'strong'
  const qualitySummary = qualityVerdict === 'strong'
    ? 'Preview output is structurally strong and relies primarily on locale-specific package-authored narrative content.'
    : qualityVerdict === 'usable_with_gaps'
      ? 'Preview output is usable, but fallback wording, locale fallback, or thin authored coverage should be reviewed before publish.'
      : 'Preview output is blocked because core report sections could not be generated reliably.'

  return {
    locale: localeContext.locale,
    localeFallbackUsed: localeContext.localeFallbackUsed,
    localeFallbackPath: localeContext.localeFallbackPath,
    webSummary: {
      headline: {
        text: headline.text,
        source: headline.provenance,
        localeUsed: headline.localeUsed,
        fallbackPath: headline.fallbackPath,
        traceSectionId: headlineSectionId,
      },
      verdict: {
        label: qualityVerdict === 'strong' ? 'Strong preview' : qualityVerdict === 'usable_with_gaps' ? 'Usable with gaps' : 'Blocked',
        tone: qualityVerdict === 'strong' ? getHeadlineTone(topDimension) : qualityVerdict === 'usable_with_gaps' ? 'amber' : 'rose',
      },
      overview: summaryNarrative.text,
      badges: [
        { id: 'scenario', label: simulation.responseSummary.scenarioKey?.replace(/_/g, ' ') ?? 'Custom scenario', tone: 'sky' },
        { id: 'quality', label: qualityVerdict.replace(/_/g, ' '), tone: qualityVerdict === 'strong' ? 'emerald' : qualityVerdict === 'usable_with_gaps' ? 'amber' : 'rose' },
        { id: 'outputs', label: `${firedOutputs.length} output${firedOutputs.length === 1 ? '' : 's'} triggered`, tone: firedOutputs.length ? 'emerald' : 'slate' },
        { id: 'authored', label: `${authoredSectionCount} authored sections`, tone: authoredSectionCount >= 4 ? 'emerald' : authoredSectionCount >= 2 ? 'amber' : 'rose' },
        { id: 'locale', label: localeContext.localeFallbackUsed ? `Locale fallback · ${localeContext.locale}` : `Locale · ${localeContext.locale}`, tone: localeContext.localeFallbackUsed ? 'amber' : 'sky' },
      ],
      dimensionCards,
      sections,
    },
    pdfBlocks,
    traceability,
    warnings,
    quality: {
      verdict: qualityVerdict,
      summary: qualitySummary,
      checks: qualityChecks,
      authoredSectionCount,
      fallbackSectionCount,
      localeFallbackCount: defaultLocaleSectionCount + (localeContext.localeFallbackUsed ? 1 : 0),
    },
  }
}

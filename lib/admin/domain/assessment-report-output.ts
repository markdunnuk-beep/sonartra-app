import type { AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import type { SonartraAssessmentPackageNormalizationScale, SonartraAssessmentPackageOutputRule, SonartraAssessmentPackageV1 } from '@/lib/admin/domain/assessment-package'
import { getAdminAssessmentSimulationWorkspaceStatus, type AdminAssessmentSimulationNormalizedDimensionResult, type AdminAssessmentSimulationOutputResult, type AdminAssessmentSimulationRawDimensionResult, type AdminAssessmentSimulationResult } from '@/lib/admin/domain/assessment-simulation'

export type AdminAssessmentReportPreviewAvailability = 'available' | 'blocked'
export type AdminAssessmentReportQualityVerdict = 'strong' | 'usable_with_gaps' | 'blocked'
export type AdminAssessmentReportSectionType = 'headline' | 'summary' | 'dimension_card' | 'strengths' | 'watchouts' | 'recommendations' | 'output_rule' | 'pdf_block' | 'warning'
export type AdminAssessmentPdfBlockType = 'title' | 'intro_summary' | 'dimension_profile' | 'strengths' | 'risk_watchout' | 'recommendation_action' | 'explanatory_text' | 'table'

export interface AdminAssessmentReportPreviewWorkspaceStatus {
  availability: AdminAssessmentReportPreviewAvailability
  statusLabel: string
  summary: string
  blockingReason: string | null
  canGeneratePreview: boolean
}

export interface AdminAssessmentReportTraceabilityReference {
  type: 'rule' | 'language_key' | 'dimension' | 'score' | 'fallback' | 'warning'
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
  badges: AdminAssessmentWebSummaryBadge[]
  traceSectionId: string
}

export interface AdminAssessmentWebSummarySection {
  id: string
  title: string
  kind: 'summary' | 'strengths' | 'watchouts' | 'recommendations' | 'outputs'
  narrative: string | null
  items: string[]
  traceSectionId: string
}

export interface AdminAssessmentWebSummaryModel {
  headline: {
    text: string | null
    source: 'output_rule' | 'system_fallback' | 'blocked'
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
}

export interface AdminAssessmentGeneratedReportOutput {
  locale: string
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

function buildLocaleText(pkg: SonartraAssessmentPackageV1, locale: string): Record<string, string> {
  return pkg.language.locales.find((entry) => entry.locale === locale)?.text
    ?? pkg.language.locales.find((entry) => entry.locale === pkg.meta.defaultLocale)?.text
    ?? pkg.language.locales[0]?.text
    ?? {}
}

function resolveLocale(pkg: SonartraAssessmentPackageV1, requestedLocale?: string | null): string {
  if (requestedLocale && pkg.language.locales.some((entry) => entry.locale === requestedLocale)) {
    return requestedLocale
  }

  if (pkg.language.locales.some((entry) => entry.locale === pkg.meta.defaultLocale)) {
    return pkg.meta.defaultLocale
  }

  return pkg.language.locales[0]?.locale ?? 'en'
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

function getOutputDisplayLabel(rule: SonartraAssessmentPackageOutputRule, output: AdminAssessmentSimulationOutputResult, localeText: Record<string, string>, warnings: AdminAssessmentReportOutputWarning[], sectionId?: string): string {
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

  if (output.label === rule.labelKey) {
    pushWarning(warnings, {
      code: `simulation_output_language.output.${rule.key}`,
      severity: 'warning',
      message: `Simulation returned the raw language key for output rule "${rule.key}" instead of resolved text.`,
      sectionId,
      relatedKeys: [rule.labelKey, rule.key],
    })
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

function buildTrace(
  input: Omit<AdminAssessmentReportSectionTrace, 'references'>,
): AdminAssessmentReportSectionTrace {
  return {
    ...input,
    references: [
      ...input.ruleKeys.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'rule', value, detail: `Triggered or referenced output rule ${value}.` })),
      ...input.languageKeys.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'language_key', value, detail: `Language key ${value} was used or expected here.` })),
      ...input.dimensionIds.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'dimension', value, detail: `Dimension ${value} contributes evidence to this section.` })),
      ...input.scoreEvidence.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'score', value: value.dimensionId, detail: `${value.dimensionId} raw ${value.rawScore ?? 'n/a'} · normalized ${value.normalizedScore ?? 'n/a'} · band ${value.bandKey ?? 'n/a'}.` })),
      ...input.fallbacks.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'fallback', value, detail: value })),
      ...input.warnings.map((value): AdminAssessmentReportTraceabilityReference => ({ type: 'warning', value, detail: value })),
    ],
  }
}

export function getAdminAssessmentReportPreviewWorkspaceStatus(version: Pick<AdminAssessmentVersionRecord, 'packageInfo' | 'normalizedPackage'>): AdminAssessmentReportPreviewWorkspaceStatus {
  const simulationStatus = getAdminAssessmentSimulationWorkspaceStatus(version)

  if (!simulationStatus.canRunSimulation) {
    return {
      availability: 'blocked',
      statusLabel: 'Blocked',
      summary: 'Report-output preview is unavailable until simulation can run against a valid normalized package.',
      blockingReason: simulationStatus.blockingReason,
      canGeneratePreview: false,
    }
  }

  return {
    availability: 'available',
    statusLabel: 'Available',
    summary: 'Report-output preview can be generated after running a sample scenario in this workspace. Nothing is persisted as an end-user report in v1.',
    blockingReason: null,
    canGeneratePreview: true,
  }
}

export function generateAdminAssessmentReportOutput(
  pkg: SonartraAssessmentPackageV1,
  simulation: AdminAssessmentSimulationResult,
): AdminAssessmentGeneratedReportOutput {
  const locale = resolveLocale(pkg, simulation.responseSummary.locale)
  const localeText = buildLocaleText(pkg, locale)
  const warnings: AdminAssessmentReportOutputWarning[] = simulation.warnings.map((warning) => ({
    code: `simulation.${warning.path}`,
    severity: warning.path.startsWith('outputs') ? 'warning' : 'warning',
    message: warning.message,
    relatedKeys: [warning.path],
  }))

  const dimensions = getDimensionContext(pkg, simulation, localeText, warnings)
  const triggeredOutputs = (pkg.outputs?.reportRules ?? []).map((rule) => ({
    rule,
    result: simulation.outputs.find((entry) => entry.key === rule.key) ?? null,
  })).filter((entry) => entry.result)
  const firedOutputs = triggeredOutputs.filter((entry) => entry.result?.triggered)
  const topDimension = dimensions[0]
  const lowDimensions = dimensions.filter((dimension) => dimension.normalizedScore !== null && dimension.normalizedScore < 40)
  const unresolvedDimensions = dimensions.filter((dimension) => dimension.normalizedScore === null)
  const headlineSectionId = 'headline'
  const summarySectionId = 'summary'
  const traceability: AdminAssessmentReportSectionTrace[] = []

  let headlineText: string | null = null
  let headlineSource: 'output_rule' | 'system_fallback' | 'blocked' = 'blocked'
  let headlineFallbacks: string[] = []
  let headlineRuleKeys: string[] = []
  let headlineLanguageKeys: string[] = []
  let headlineWarnings: string[] = []

  if (firedOutputs[0]?.result) {
    headlineText = getOutputDisplayLabel(firedOutputs[0].rule, firedOutputs[0].result, localeText, warnings, headlineSectionId)
    headlineSource = 'output_rule'
    headlineRuleKeys = [firedOutputs[0].rule.key]
    headlineLanguageKeys = [firedOutputs[0].rule.labelKey]
  } else if (topDimension) {
    headlineText = `${topDimension.label} leads this sample profile${topDimension.bandLabel ? ` · ${topDimension.bandLabel}` : ''}`
    headlineSource = 'system_fallback'
    headlineFallbacks = ['No triggered output rule supplied a resolved language label, so the preview headline falls back to score-derived wording.']
    headlineWarnings = headlineFallbacks
    pushWarning(warnings, {
      code: 'fallback.headline',
      severity: 'warning',
      message: headlineFallbacks[0],
      sectionId: headlineSectionId,
      relatedKeys: topDimension.relatedOutputKeys,
    })
  } else {
    headlineWarnings = ['No normalized dimension evidence exists, so the preview headline could not be generated.']
    pushWarning(warnings, {
      code: 'blocked.headline',
      severity: 'error',
      message: headlineWarnings[0],
      sectionId: headlineSectionId,
      relatedKeys: [],
    })
  }

  traceability.push(buildTrace({
    sectionId: headlineSectionId,
    sectionType: 'headline',
    title: 'Headline',
    ruleKeys: headlineRuleKeys,
    languageKeys: headlineLanguageKeys,
    dimensionIds: topDimension ? [topDimension.dimensionId] : [],
    scoreEvidence: topDimension ? [{
      dimensionId: topDimension.dimensionId,
      rawScore: topDimension.rawScore,
      normalizedScore: topDimension.normalizedScore,
      bandKey: topDimension.bandKey,
    }] : [],
    fallbacks: headlineFallbacks,
    warnings: headlineWarnings,
  }))

  const overview = topDimension
    ? `Sample scenario ${simulation.responseSummary.scenarioKey?.replace(/_/g, ' ') ?? 'custom'} resolved ${firedOutputs.length} triggered output${firedOutputs.length === 1 ? '' : 's'} across ${dimensions.length} dimension${dimensions.length === 1 ? '' : 's'}. Highest observed signal: ${topDimension.label}${topDimension.normalizedScore !== null ? ` at ${roundMetric(topDimension.normalizedScore)}.` : '.'}`
    : 'Sample scenario could not resolve enough score evidence to build a report-output preview.'

  traceability.push(buildTrace({
    sectionId: summarySectionId,
    sectionType: 'summary',
    title: 'Summary overview',
    ruleKeys: firedOutputs.map((entry) => entry.rule.key),
    languageKeys: firedOutputs.map((entry) => entry.rule.labelKey),
    dimensionIds: dimensions.map((dimension) => dimension.dimensionId),
    scoreEvidence: dimensions.map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: [],
    warnings: [],
  }))

  const dimensionCards: AdminAssessmentWebSummaryDimensionCard[] = dimensions.map((dimension) => {
    const sectionId = `dimension.${dimension.dimensionId}`
    const narrative = dimension.normalizedScore === null
      ? `${dimension.label} did not resolve to a normalized score in this sample preview.`
      : `${dimension.label} resolved at ${roundMetric(dimension.normalizedScore)}${dimension.bandLabel ? ` in the ${dimension.bandLabel} band` : ''}. Raw score ${dimension.rawScore ?? 'n/a'} across range ${dimension.rangeText}.`

    const dimensionPackage = pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)
    const scale = getDimensionScale(pkg, dimension.dimensionId, dimension.scaleId)
    const band = scale?.bands.find((entry) => entry.key === dimension.bandKey)
    const cardWarnings: string[] = []
    if (dimension.normalizedScore === null) {
      cardWarnings.push('No normalized score was available for this dimension.')
    }

    traceability.push(buildTrace({
      sectionId,
      sectionType: 'dimension_card',
      title: `${dimension.label} card`,
      ruleKeys: dimension.relatedOutputKeys,
      languageKeys: unique([dimensionPackage?.labelKey, band?.labelKey].filter(Boolean) as string[]),
      dimensionIds: [dimension.dimensionId],
      scoreEvidence: [{
        dimensionId: dimension.dimensionId,
        rawScore: dimension.rawScore,
        normalizedScore: dimension.normalizedScore,
        bandKey: dimension.bandKey,
      }],
      fallbacks: dimension.label.startsWith('Missing language:') ? ['Dimension label fell back to an explicit missing-language marker.'] : [],
      warnings: cardWarnings,
    }))

    return {
      id: dimension.dimensionId,
      label: dimension.label,
      score: dimension.normalizedScore,
      rawScore: dimension.rawScore,
      bandLabel: dimension.bandLabel,
      scaleId: dimension.scaleId,
      narrative,
      badges: [
        { id: `${dimension.dimensionId}-band`, label: dimension.bandLabel ?? 'No band', tone: dimension.normalizedScore === null ? 'rose' : dimension.normalizedScore >= 70 ? 'emerald' : dimension.normalizedScore >= 40 ? 'amber' : 'rose' },
        { id: `${dimension.dimensionId}-outputs`, label: `${dimension.relatedOutputKeys.length} output refs`, tone: dimension.relatedOutputKeys.length ? 'sky' : 'slate' },
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
  const outputItems = firedOutputs.map(({ rule, result }) => `${getOutputDisplayLabel(rule, result!, localeText, warnings, 'outputs')} · ${result?.reasons[0] ?? 'Triggered by referenced score evidence.'}`)

  const sections: AdminAssessmentWebSummarySection[] = [
    {
      id: 'summary-output',
      title: 'Top-line summary',
      kind: 'summary',
      narrative: overview,
      items: firedOutputs.length ? outputItems.slice(0, 3) : ['No triggered outputs supplied resolved copy for this sample scenario.'],
      traceSectionId: summarySectionId,
    },
    {
      id: 'strengths-output',
      title: 'Strengths',
      kind: 'strengths',
      narrative: strengthsItems.length ? 'Highest-scoring dimensions in this sample preview.' : 'No strength narrative could be assembled from the current sample evidence.',
      items: strengthsItems.length ? strengthsItems : ['No high-signal dimensions were available.'],
      traceSectionId: 'strengths',
    },
    {
      id: 'watchouts-output',
      title: 'Risks / watchouts',
      kind: 'watchouts',
      narrative: watchoutItems.length ? 'Lower-band dimensions that may require careful wording or recommendations.' : 'No low-band watchouts were triggered in this sample preview.',
      items: watchoutItems.length ? watchoutItems : ['No explicit watchouts were triggered.'],
      traceSectionId: 'watchouts',
    },
    {
      id: 'recommendations-output',
      title: 'Recommendations',
      kind: 'recommendations',
      narrative: recommendationItems.length ? 'System-generated recommendations are being used where package-authored recommendation language is not yet available.' : 'No recommendation block was required by this sample preview.',
      items: recommendationItems.length ? recommendationItems : ['No recommendations were required for this sample preview.'],
      traceSectionId: 'recommendations',
    },
    {
      id: 'triggered-output-rules',
      title: 'Triggered outputs',
      kind: 'outputs',
      narrative: firedOutputs.length ? 'Triggered output rules that would feed later report-delivery layers.' : 'No output rules triggered for this sample scenario.',
      items: firedOutputs.length ? outputItems : ['No triggered outputs.'],
      traceSectionId: 'outputs',
    },
  ]

  traceability.push(buildTrace({
    sectionId: 'strengths',
    sectionType: 'strengths',
    title: 'Strengths block',
    ruleKeys: unique(dimensions.slice(0, 2).flatMap((dimension) => dimension.relatedOutputKeys)),
    languageKeys: unique(dimensions.slice(0, 2).map((dimension) => pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)?.labelKey).filter(Boolean) as string[]),
    dimensionIds: dimensions.slice(0, 2).map((dimension) => dimension.dimensionId),
    scoreEvidence: dimensions.slice(0, 2).map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: [],
    warnings: strengthsItems.length ? [] : ['No dimensions resolved strongly enough to populate the strengths block beyond fallback copy.'],
  }))

  traceability.push(buildTrace({
    sectionId: 'watchouts',
    sectionType: 'watchouts',
    title: 'Watchouts block',
    ruleKeys: unique(lowDimensions.flatMap((dimension) => dimension.relatedOutputKeys)),
    languageKeys: unique(lowDimensions.map((dimension) => pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)?.labelKey).filter(Boolean) as string[]),
    dimensionIds: lowDimensions.map((dimension) => dimension.dimensionId),
    scoreEvidence: lowDimensions.map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: watchoutItems.length ? [] : ['Watchout block fell back to an explicit “no watchouts triggered” state.'],
    warnings: unresolvedDimensions.length ? ['One or more dimensions did not resolve, so watchout coverage may be incomplete.'] : [],
  }))

  traceability.push(buildTrace({
    sectionId: 'recommendations',
    sectionType: 'recommendations',
    title: 'Recommendations block',
    ruleKeys: unique((lowDimensions.length ? lowDimensions : unresolvedDimensions).flatMap((dimension) => dimension.relatedOutputKeys)),
    languageKeys: unique((lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)?.labelKey).filter(Boolean) as string[]),
    dimensionIds: (lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => dimension.dimensionId),
    scoreEvidence: (lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: recommendationItems.length ? ['Recommendation language is currently system-generated because the v1 package model does not yet carry authored recommendation bodies.'] : [],
    warnings: recommendationItems.length ? [] : ['No recommendations were required for the supplied sample scenario.'],
  }))

  traceability.push(buildTrace({
    sectionId: 'outputs',
    sectionType: 'output_rule',
    title: 'Triggered outputs block',
    ruleKeys: firedOutputs.map((entry) => entry.rule.key),
    languageKeys: firedOutputs.map((entry) => entry.rule.labelKey),
    dimensionIds: unique(firedOutputs.flatMap((entry) => entry.rule.dimensionIds)),
    scoreEvidence: dimensions.filter((dimension) => firedOutputs.some((entry) => entry.rule.dimensionIds.includes(dimension.dimensionId))).map((dimension) => ({
      dimensionId: dimension.dimensionId,
      rawScore: dimension.rawScore,
      normalizedScore: dimension.normalizedScore,
      bandKey: dimension.bandKey,
    })),
    fallbacks: firedOutputs.length ? [] : ['No output-rule content fired, so the outputs block remains informational only.'],
    warnings: firedOutputs.flatMap((entry) => entry.result?.warnings ?? []),
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
    title: headlineText ?? 'Report preview blocked',
    text: `${pkg.meta.assessmentTitle} · sample preview`,
    metadata: {
      ruleKeys: headlineRuleKeys,
      languageKeys: headlineLanguageKeys,
      dimensionIds: topDimension ? [topDimension.dimensionId] : [],
      fallbackUsed: headlineSource !== 'output_rule',
    },
  })

  pushPdfBlock({
    id: 'pdf.intro',
    sectionId: summarySectionId,
    sectionIdentifier: 'report.intro',
    type: 'intro_summary',
    title: 'Preview summary',
    text: overview,
    items: [
      `Scenario: ${simulation.responseSummary.scenarioKey?.replace(/_/g, ' ') ?? 'custom'}`,
      `Triggered outputs: ${firedOutputs.length}`,
      `Locale: ${locale}`,
    ],
    metadata: {
      ruleKeys: firedOutputs.map((entry) => entry.rule.key),
      languageKeys: firedOutputs.map((entry) => entry.rule.labelKey),
      dimensionIds: dimensions.map((dimension) => dimension.dimensionId),
      fallbackUsed: false,
    },
  })

  dimensions.forEach((dimension) => {
    pushPdfBlock({
      id: `pdf.dimension.${dimension.dimensionId}`,
      sectionId: `dimension.${dimension.dimensionId}`,
      sectionIdentifier: `report.dimension.${dimension.dimensionId}`,
      type: 'dimension_profile',
      title: dimension.label,
      text: dimension.normalizedScore === null
        ? `${dimension.label} did not resolve to a normalized score in this sample preview.`
        : `${dimension.label} resolved at ${roundMetric(dimension.normalizedScore)}${dimension.bandLabel ? ` in the ${dimension.bandLabel} band` : ''}.`,
      items: [
        `Raw score: ${dimension.rawScore ?? 'n/a'}`,
        `Scale: ${dimension.scaleId ?? 'n/a'}`,
        `Related outputs: ${dimension.relatedOutputKeys.length ? dimension.relatedOutputKeys.join(', ') : 'none'}`,
      ],
      metadata: {
        ruleKeys: dimension.relatedOutputKeys,
        languageKeys: unique([pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)?.labelKey].filter(Boolean) as string[]),
        dimensionIds: [dimension.dimensionId],
        fallbackUsed: dimension.label.startsWith('Missing language:'),
      },
    })
  })

  pushPdfBlock({
    id: 'pdf.strengths',
    sectionId: 'strengths',
    sectionIdentifier: 'report.strengths',
    type: 'strengths',
    title: 'Strengths',
    text: sections.find((section) => section.id === 'strengths-output')?.narrative ?? null,
    items: strengthsItems.length ? strengthsItems : ['No high-signal dimensions were available.'],
    metadata: {
      ruleKeys: unique(dimensions.slice(0, 2).flatMap((dimension) => dimension.relatedOutputKeys)),
      languageKeys: unique(dimensions.slice(0, 2).map((dimension) => pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)?.labelKey).filter(Boolean) as string[]),
      dimensionIds: dimensions.slice(0, 2).map((dimension) => dimension.dimensionId),
      fallbackUsed: strengthsItems.length === 0,
    },
  })

  pushPdfBlock({
    id: 'pdf.watchouts',
    sectionId: 'watchouts',
    sectionIdentifier: 'report.watchouts',
    type: 'risk_watchout',
    title: 'Risks / watchouts',
    text: sections.find((section) => section.id === 'watchouts-output')?.narrative ?? null,
    items: watchoutItems.length ? watchoutItems : ['No explicit watchouts were triggered.'],
    metadata: {
      ruleKeys: unique(lowDimensions.flatMap((dimension) => dimension.relatedOutputKeys)),
      languageKeys: unique(lowDimensions.map((dimension) => pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)?.labelKey).filter(Boolean) as string[]),
      dimensionIds: lowDimensions.map((dimension) => dimension.dimensionId),
      fallbackUsed: watchoutItems.length === 0,
    },
  })

  pushPdfBlock({
    id: 'pdf.recommendations',
    sectionId: 'recommendations',
    sectionIdentifier: 'report.recommendations',
    type: 'recommendation_action',
    title: 'Recommendations',
    text: sections.find((section) => section.id === 'recommendations-output')?.narrative ?? null,
    items: recommendationItems.length ? recommendationItems : ['No recommendations were required for this sample preview.'],
    metadata: {
      ruleKeys: unique((lowDimensions.length ? lowDimensions : unresolvedDimensions).flatMap((dimension) => dimension.relatedOutputKeys)),
      languageKeys: unique((lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => pkg.dimensions.find((entry) => entry.id === dimension.dimensionId)?.labelKey).filter(Boolean) as string[]),
      dimensionIds: (lowDimensions.length ? lowDimensions : unresolvedDimensions).map((dimension) => dimension.dimensionId),
      fallbackUsed: true,
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
          getOutputDisplayLabel(rule, result ?? { key: rule.key, label: rule.labelKey, triggered: false, normalizationScaleId: rule.normalizationScaleId ?? null, referencedDimensions: rule.dimensionIds, reasons: [], warnings: [] }, localeText, warnings, 'outputs'),
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
    },
  })

  if (warnings.length > 0) {
    pushPdfBlock({
      id: 'pdf.warnings',
      sectionId: 'warnings',
      sectionIdentifier: 'report.warnings',
      type: 'explanatory_text',
      title: 'Preview warnings and fallbacks',
      text: 'This sample preview includes warnings, missing language references, or fallback-generated content that should be reviewed before publish.',
      items: warnings.map((warning) => warning.message),
      metadata: {
        ruleKeys: [],
        languageKeys: unique(warnings.flatMap((warning) => warning.relatedKeys)),
        dimensionIds: [],
        fallbackUsed: true,
      },
    })
  }

  const qualityChecks: AdminAssessmentReportQualityCheck[] = [
    {
      key: 'headline_generated',
      label: 'Headline generated',
      status: headlineText ? 'pass' : 'fail',
      detail: headlineText ? `Headline source: ${headlineSource.replace(/_/g, ' ')}.` : 'No headline could be generated from the current sample evidence.',
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
      key: 'output_language_resolution',
      label: 'Triggered outputs resolved to language',
      status: firedOutputs.length === 0 ? 'warning' : firedOutputs.every((entry) => Boolean(getLanguageValue(localeText, entry.rule.labelKey))) ? 'pass' : 'warning',
      detail: firedOutputs.length === 0
        ? 'No output rules triggered in the supplied sample scenario.'
        : `${firedOutputs.filter((entry) => Boolean(getLanguageValue(localeText, entry.rule.labelKey))).length}/${firedOutputs.length} triggered outputs resolved to language text.`,
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
      status: warnings.some((warning) => warning.code.startsWith('fallback') || warning.code.startsWith('missing_language')) ? 'warning' : 'pass',
      detail: warnings.some((warning) => warning.code.startsWith('fallback') || warning.code.startsWith('missing_language'))
        ? 'Fallbacks or explicit missing-language markers were required in the preview output.'
        : 'No fallback-generated copy was required.',
    },
    {
      key: 'content_depth',
      label: 'Content coverage depth',
      status: dimensions.length >= 2 && (firedOutputs.length > 0 || strengthsItems.length > 0) ? 'pass' : dimensions.length >= 1 ? 'warning' : 'fail',
      detail: dimensions.length >= 2 && (firedOutputs.length > 0 || strengthsItems.length > 0)
        ? 'Content coverage is sufficient for admin QA review.'
        : 'Content coverage is thin and may not provide enough publish confidence yet.',
    },
  ]

  const hasFailure = qualityChecks.some((check) => check.status === 'fail')
  const hasWarning = qualityChecks.some((check) => check.status === 'warning')
  const qualityVerdict: AdminAssessmentReportQualityVerdict = hasFailure ? 'blocked' : hasWarning ? 'usable_with_gaps' : 'strong'
  const qualitySummary = qualityVerdict === 'strong'
    ? 'Preview output is structurally strong for this sample scenario.'
    : qualityVerdict === 'usable_with_gaps'
      ? 'Preview output is usable, but gaps, fallbacks, or thin sections should be reviewed before publish.'
      : 'Preview output is blocked because core report sections could not be generated reliably.'

  return {
    locale,
    webSummary: {
      headline: {
        text: headlineText,
        source: headlineSource,
        traceSectionId: headlineSectionId,
      },
      verdict: {
        label: qualityVerdict === 'strong' ? 'Strong preview' : qualityVerdict === 'usable_with_gaps' ? 'Usable with gaps' : 'Blocked',
        tone: qualityVerdict === 'strong' ? getHeadlineTone(topDimension) : qualityVerdict === 'usable_with_gaps' ? 'amber' : 'rose',
      },
      overview,
      badges: [
        { id: 'scenario', label: simulation.responseSummary.scenarioKey?.replace(/_/g, ' ') ?? 'Custom scenario', tone: 'sky' },
        { id: 'quality', label: qualityVerdict.replace(/_/g, ' '), tone: qualityVerdict === 'strong' ? 'emerald' : qualityVerdict === 'usable_with_gaps' ? 'amber' : 'rose' },
        { id: 'outputs', label: `${firedOutputs.length} output${firedOutputs.length === 1 ? '' : 's'} triggered`, tone: firedOutputs.length ? 'emerald' : 'slate' },
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
    },
  }
}

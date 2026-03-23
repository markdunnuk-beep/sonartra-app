import {
  parseStoredNormalizedAssessmentPackage,
  type AdminAssessmentVersionPackageInfo,
  type SonartraAssessmentPackageDimension,
  type SonartraAssessmentPackageQuestion,
  type SonartraAssessmentPackageV1,
} from '@/lib/admin/domain/assessment-package'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, parseStoredValidatedAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2'
import { evaluatePackageV2LiveRuntimeSupport } from '@/lib/package-contract-v2-live-runtime'
import type {
  AdminAssessmentReleaseCheck,
  AdminAssessmentReleaseCheckStatus,
  AdminAssessmentReleaseReadinessStatus,
  AdminAssessmentVersionRecord,
} from '@/lib/admin/domain/assessment-management'

export type AdminAssessmentPublishReadinessVerdict = 'ready' | 'ready_with_warnings' | 'blocked'
export type AdminAssessmentEvidenceStatus = AdminAssessmentReleaseCheckStatus
export type AdminAssessmentDiffBaselineReason = 'published_baseline' | 'previous_version' | 'most_recent_other' | 'first_version'

export interface AdminAssessmentPackagePreviewSectionDimension {
  id: string
  label: string
  scaleIds: string[]
  questionCount: number
}

export interface AdminAssessmentPackagePreviewSectionQuestion {
  id: string
  prompt: string
  optionCount: number
  mappedDimensions: string[]
}

export interface AdminAssessmentPackagePreviewSummary {
  state: 'ready' | 'invalid' | 'missing'
  schemaVersion: string | null
  provenanceSummary: string
  validationSummary: string
  lastImportedSummary: string
  dimensionsSummary: string
  questionSummary: string
  scoringSummary: string
  outputsSummary: string
  languageSummary: string
  dimensions: AdminAssessmentPackagePreviewSectionDimension[]
  questions: AdminAssessmentPackagePreviewSectionQuestion[]
  warnings: string[]
  errors: string[]
  metrics: {
    dimensionsCount: number
    questionsCount: number
    optionsCount: number
    normalizationCoveredDimensions: number
    totalDimensions: number
    scoringCoveredQuestions: number
    outputRuleCount: number
    localeCount: number
    languageKeyCount: number
  }
}

export interface AdminAssessmentReadinessChecklistItem extends AdminAssessmentReleaseCheck {}

export interface AdminAssessmentVersionReadiness {
  status: AdminAssessmentReleaseReadinessStatus
  verdict: AdminAssessmentPublishReadinessVerdict
  blockingIssues: string[]
  warnings: string[]
  checks: AdminAssessmentReadinessChecklistItem[]
  checklist: AdminAssessmentReadinessChecklistItem[]
  summaryText: string
  summary: string
}

export interface AdminAssessmentVersionDiffBaseline {
  id: string
  versionLabel: string
  reason: AdminAssessmentDiffBaselineReason
  summary: string
}

export interface AdminAssessmentVersionDiffResult {
  hasBaseline: boolean
  baseline: AdminAssessmentVersionDiffBaseline | null
  materiallyDifferent: boolean
  summary: string
  summaryLines: string[]
  metadataChanges: string[]
  dimensions: {
    added: string[]
    removed: string[]
    changed: string[]
  }
  questions: {
    added: string[]
    removed: string[]
    changed: string[]
  }
  coverageChanges: string[]
  outputLanguageChanges: string[]
}

export interface AdminAssessmentVersionControlTowerSummary {
  readiness: AdminAssessmentVersionReadiness
  diff: AdminAssessmentVersionDiffResult
  snippet: string
}

function formatCount(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`
}

function truncate(value: string, maxLength = 96): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function normalizePackageInfoRuntime(packageInfo: AdminAssessmentVersionPackageInfo | null | undefined): AdminAssessmentVersionPackageInfo {
  return {
    status: packageInfo?.status === 'valid' || packageInfo?.status === 'valid_with_warnings' || packageInfo?.status === 'invalid' || packageInfo?.status === 'missing'
      ? packageInfo.status
      : 'missing',
    detectedVersion: packageInfo?.detectedVersion === 'legacy_v1' || packageInfo?.detectedVersion === 'package_contract_v2' || packageInfo?.detectedVersion === 'unknown'
      ? packageInfo.detectedVersion
      : null,
    schemaVersion: typeof packageInfo?.schemaVersion === 'string' && packageInfo.schemaVersion.trim() ? packageInfo.schemaVersion.trim() : null,
    sourceType: packageInfo?.sourceType === 'manual_import' ? 'manual_import' : null,
    importedAt: typeof packageInfo?.importedAt === 'string' && packageInfo.importedAt.trim() ? packageInfo.importedAt.trim() : null,
    importedByName: typeof packageInfo?.importedByName === 'string' && packageInfo.importedByName.trim() ? packageInfo.importedByName.trim() : null,
    sourceFilename: typeof packageInfo?.sourceFilename === 'string' && packageInfo.sourceFilename.trim() ? packageInfo.sourceFilename.trim() : null,
    summary: packageInfo?.summary ?? null,
    errors: Array.isArray(packageInfo?.errors) ? packageInfo.errors.filter((issue) => issue && typeof issue.path === 'string' && typeof issue.message === 'string') : [],
    warnings: Array.isArray(packageInfo?.warnings) ? packageInfo.warnings.filter((issue) => issue && typeof issue.path === 'string' && typeof issue.message === 'string') : [],
  }
}

function getPackageWarningMessages(packageInfo: AdminAssessmentVersionPackageInfo): string[] {
  return packageInfo.warnings.map((issue) => `${issue.path}: ${issue.message}`)
}

function getPackageErrorMessages(packageInfo: AdminAssessmentVersionPackageInfo): string[] {
  return packageInfo.errors.map((issue) => `${issue.path}: ${issue.message}`)
}

function getLocaleKeyCounts(pkg: SonartraAssessmentPackageV1 | null): { localeCount: number; maxKeyCount: number } {
  if (!pkg) {
    return { localeCount: 0, maxKeyCount: 0 }
  }

  return pkg.language.locales.reduce((result, locale) => ({
    localeCount: result.localeCount + 1,
    maxKeyCount: Math.max(result.maxKeyCount, Object.keys(locale.text).length),
  }), { localeCount: 0, maxKeyCount: 0 })
}

function getNormalizationCoverage(pkg: SonartraAssessmentPackageV1 | null): { covered: number; total: number; missingDimensionIds: string[] } {
  if (!pkg) {
    return { covered: 0, total: 0, missingDimensionIds: [] }
  }

  const covered = new Set(pkg.normalization.scales.flatMap((scale) => scale.dimensionIds))
  const allDimensionIds = pkg.dimensions.map((dimension) => dimension.id)
  const missingDimensionIds = allDimensionIds.filter((dimensionId) => !covered.has(dimensionId))

  return {
    covered: allDimensionIds.length - missingDimensionIds.length,
    total: allDimensionIds.length,
    missingDimensionIds,
  }
}

function getQuestionScoringCoverage(pkg: SonartraAssessmentPackageV1 | null): { coveredQuestions: number; totalQuestions: number; missingQuestionIds: string[] } {
  if (!pkg) {
    return { coveredQuestions: 0, totalQuestions: 0, missingQuestionIds: [] }
  }

  const missingQuestionIds = pkg.questions
    .filter((question) => question.options.length === 0 || question.options.some((option) => Object.keys(option.scoreMap).length === 0))
    .map((question) => question.id)

  return {
    coveredQuestions: pkg.questions.length - missingQuestionIds.length,
    totalQuestions: pkg.questions.length,
    missingQuestionIds,
  }
}

function getExplicitScoringCoverage(pkg: SonartraAssessmentPackageV1 | null): { covered: number; total: number; missingDimensionIds: string[] } {
  if (!pkg) {
    return { covered: 0, total: 0, missingDimensionIds: [] }
  }

  const covered = new Set(pkg.scoring.dimensionRules.map((rule) => rule.dimensionId))
  const allDimensionIds = pkg.dimensions.map((dimension) => dimension.id)
  const missingDimensionIds = allDimensionIds.filter((dimensionId) => !covered.has(dimensionId))

  return {
    covered: allDimensionIds.length - missingDimensionIds.length,
    total: allDimensionIds.length,
    missingDimensionIds,
  }
}

function getOutputCoverage(pkg: SonartraAssessmentPackageV1 | null): { outputRuleCount: number; missingOutputDimensionIds: string[] } {
  if (!pkg) {
    return { outputRuleCount: 0, missingOutputDimensionIds: [] }
  }

  const referencedDimensions = new Set(pkg.outputs?.reportRules.flatMap((rule) => rule.dimensionIds) ?? [])
  const missingOutputDimensionIds = pkg.dimensions
    .map((dimension) => dimension.id)
    .filter((dimensionId) => !referencedDimensions.has(dimensionId))

  return {
    outputRuleCount: pkg.outputs?.reportRules.length ?? 0,
    missingOutputDimensionIds,
  }
}

function getDimensionDisplay(dimension: SonartraAssessmentPackageDimension, pkg: SonartraAssessmentPackageV1): AdminAssessmentPackagePreviewSectionDimension {
  const scaleIds = pkg.normalization.scales.filter((scale) => scale.dimensionIds.includes(dimension.id)).map((scale) => scale.id)
  const questionCount = pkg.questions.filter((question) => question.dimensionId === dimension.id).length

  return {
    id: dimension.id,
    label: dimension.labelKey,
    scaleIds,
    questionCount,
  }
}

function getQuestionDisplay(question: SonartraAssessmentPackageQuestion): AdminAssessmentPackagePreviewSectionQuestion {
  const mappedDimensions = Array.from(new Set([
    question.dimensionId,
    ...question.options.flatMap((option) => Object.keys(option.scoreMap)),
  ]))

  return {
    id: question.id,
    prompt: truncate(question.promptKey),
    optionCount: question.options.length,
    mappedDimensions,
  }
}

export function getAdminAssessmentPackagePreviewSummary(version: Pick<AdminAssessmentVersionRecord, 'packageInfo' | 'normalizedPackage'>): AdminAssessmentPackagePreviewSummary {
  const packageInfo = normalizePackageInfoRuntime(version.packageInfo)
  const pkg = parseStoredNormalizedAssessmentPackage(version.normalizedPackage)
  const normalizationCoverage = getNormalizationCoverage(pkg)
  const questionCoverage = getQuestionScoringCoverage(pkg)
  const explicitScoringCoverage = getExplicitScoringCoverage(pkg)
  const outputCoverage = getOutputCoverage(pkg)
  const localeSummary = getLocaleKeyCounts(pkg)

  if (!pkg) {
    const isValidatedV2Package = packageInfo.schemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
      && (packageInfo.status === 'valid' || packageInfo.status === 'valid_with_warnings')
    return {
      state: packageInfo.status === 'missing' ? 'missing' : isValidatedV2Package ? 'ready' : 'invalid',
      schemaVersion: packageInfo.schemaVersion,
      provenanceSummary: packageInfo.sourceFilename
        ? `Imported from ${packageInfo.sourceFilename}${packageInfo.sourceType ? ` via ${packageInfo.sourceType.replace(/_/g, ' ')}` : ''}.`
        : packageInfo.importedAt
          ? 'Imported package provenance recorded.'
          : 'No package provenance recorded yet.',
      validationSummary: packageInfo.status === 'missing'
        ? 'No package attached yet.'
        : isValidatedV2Package
          ? `${packageInfo.errors.length} blocking issue(s) · ${packageInfo.warnings.length} warning(s) · imported through the Package Contract v2 compatibility path.`
        : `${packageInfo.errors.length} blocking issue(s) · ${packageInfo.warnings.length} warning(s).`,
      lastImportedSummary: packageInfo.importedAt
        ? `${packageInfo.importedByName ?? 'Unknown admin'} imported the latest package.`
        : 'No import has been recorded.',
      dimensionsSummary: isValidatedV2Package
        ? `${formatCount(packageInfo.summary?.dimensionsCount ?? 0, 'dimension')} recorded in the compatibility summary across ${formatCount(packageInfo.summary?.sectionCount ?? 0, 'section')}.`
        : 'No normalized dimensions available.',
      questionSummary: isValidatedV2Package
        ? `${formatCount(packageInfo.summary?.questionsCount ?? 0, 'question')} recorded in the compatibility summary.`
        : 'No normalized questions available.',
      scoringSummary: isValidatedV2Package
        ? 'Package Contract v2 imported successfully, but the current admin runtime cannot execute v2 scoring or simulation yet.'
        : 'Scoring coverage cannot be inspected until the package validates.',
      outputsSummary: isValidatedV2Package
        ? `${formatCount(packageInfo.summary?.outputRuleCount ?? 0, 'output rule')} recorded in the stored compatibility summary.`
        : 'Output coverage is unavailable until the package validates.',
      languageSummary: isValidatedV2Package
        ? `${formatCount(packageInfo.summary?.localeCount ?? 0, 'locale')} recorded in the stored compatibility summary.`
        : 'Language coverage is unavailable until the package validates.',
      dimensions: [],
      questions: [],
      warnings: getPackageWarningMessages(packageInfo),
      errors: getPackageErrorMessages(packageInfo),
      metrics: {
        dimensionsCount: packageInfo.summary?.dimensionsCount ?? 0,
        questionsCount: packageInfo.summary?.questionsCount ?? 0,
        optionsCount: packageInfo.summary?.optionsCount ?? 0,
        normalizationCoveredDimensions: 0,
        totalDimensions: packageInfo.summary?.dimensionsCount ?? 0,
        scoringCoveredQuestions: 0,
        outputRuleCount: packageInfo.summary?.outputRuleCount ?? 0,
        localeCount: packageInfo.summary?.localeCount ?? 0,
        languageKeyCount: 0,
      },
    }
  }

  return {
    state: 'ready',
    schemaVersion: packageInfo.schemaVersion ?? pkg.meta.schemaVersion,
    provenanceSummary: packageInfo.sourceFilename
      ? `Imported from ${packageInfo.sourceFilename}${packageInfo.sourceType ? ` via ${packageInfo.sourceType.replace(/_/g, ' ')}` : ''}.`
      : 'Imported package provenance recorded.',
    validationSummary: `${packageInfo.errors.length} error(s) · ${packageInfo.warnings.length} warning(s) in the latest validation report.`,
    lastImportedSummary: packageInfo.importedAt
      ? `${packageInfo.importedByName ?? 'Unknown admin'} imported the latest package.`
      : 'The normalized package is stored, but import provenance is incomplete.',
    dimensionsSummary: `${formatCount(pkg.dimensions.length, 'dimension')} across ${normalizationCoverage.covered}/${normalizationCoverage.total} normalization-covered dimensions.`,
    questionSummary: `${formatCount(pkg.questions.length, 'question')} with ${formatCount(pkg.questions.reduce((count, question) => count + question.options.length, 0), 'option')} total.`,
    scoringSummary: `${questionCoverage.coveredQuestions}/${questionCoverage.totalQuestions} questions have full option scoring coverage; ${explicitScoringCoverage.covered}/${explicitScoringCoverage.total} dimensions have explicit scoring rules.`,
    outputsSummary: outputCoverage.outputRuleCount > 0
      ? `${formatCount(outputCoverage.outputRuleCount, 'output rule')} linked to ${outputCoverage.outputRuleCount === 1 ? 'the' : 'their'} normalized references.`
      : 'No output rules are attached to this package.',
    languageSummary: `${formatCount(localeSummary.localeCount, 'locale')} with up to ${localeSummary.maxKeyCount} language keys per locale.`,
    dimensions: pkg.dimensions.map((dimension) => getDimensionDisplay(dimension, pkg)),
    questions: pkg.questions.map(getQuestionDisplay),
    warnings: getPackageWarningMessages(packageInfo),
    errors: getPackageErrorMessages(packageInfo),
    metrics: {
      dimensionsCount: pkg.dimensions.length,
      questionsCount: pkg.questions.length,
      optionsCount: pkg.questions.reduce((count, question) => count + question.options.length, 0),
      normalizationCoveredDimensions: normalizationCoverage.covered,
      totalDimensions: normalizationCoverage.total,
      scoringCoveredQuestions: questionCoverage.coveredQuestions,
      outputRuleCount: outputCoverage.outputRuleCount,
      localeCount: localeSummary.localeCount,
      languageKeyCount: localeSummary.maxKeyCount,
    },
  }
}

export function getAdminAssessmentVersionReadiness(
  version: Pick<AdminAssessmentVersionRecord, 'packageInfo' | 'normalizedPackage' | 'storedDefinitionPayload' | 'lifecycleStatus'> & Partial<Pick<AdminAssessmentVersionRecord, 'savedScenarios' | 'latestSuiteSnapshot'>>,
): AdminAssessmentVersionReadiness {
  const packageInfo = normalizePackageInfoRuntime(version.packageInfo)
  const pkg = parseStoredNormalizedAssessmentPackage(version.normalizedPackage)
  const pkgV2 = packageInfo.schemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 ? parseStoredValidatedAssessmentPackageV2(version.storedDefinitionPayload ?? version.normalizedPackage) : null
  const v2RuntimeSupport = evaluatePackageV2LiveRuntimeSupport(pkgV2)
  const checks: AdminAssessmentReadinessChecklistItem[] = []
  const blockingIssues: string[] = []
  const warnings = [...getPackageWarningMessages(packageInfo)]

  const addCheck = (key: string, label: string, status: AdminAssessmentEvidenceStatus, detail: string) => {
    checks.push({ key, label, status, detail })
    if (status === 'fail') {
      blockingIssues.push(detail)
    }
    if (status === 'warning') {
      warnings.push(detail)
    }
  }

  addCheck(
    'lifecycle_state',
    'Lifecycle state allows publish',
    version.lifecycleStatus === 'archived' ? 'fail' : version.lifecycleStatus === 'published' ? 'warning' : 'pass',
    version.lifecycleStatus === 'archived'
      ? 'Archived versions cannot be published directly.'
      : version.lifecycleStatus === 'published'
        ? 'This version is already published; republishing should be an explicit operator decision.'
        : 'Draft lifecycle state is eligible for publish review.',
  )

  const packageAttached = packageInfo.status !== 'missing'
  addCheck('package_attached', 'Package attached', packageAttached ? 'pass' : 'fail', packageAttached ? 'A package payload is attached to the version record.' : 'Attach a package before publish.')

  const isImportedV2Package = packageInfo.schemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
    && (packageInfo.status === 'valid' || packageInfo.status === 'valid_with_warnings')
  const structurallyValid = (packageInfo.status === 'valid' || packageInfo.status === 'valid_with_warnings') && Boolean(pkg || pkgV2)
  addCheck(
    'package_valid',
    'Executable normalized package',
    structurallyValid ? 'pass' : 'fail',
    structurallyValid
      ? 'The latest package validated and produced a normalized executable payload.'
      : isImportedV2Package
        ? (v2RuntimeSupport.supported ? 'Package Contract v2 validated into a live runtime-supported package.' : (v2RuntimeSupport.issues[0]?.message ?? 'Package Contract v2 imported successfully, but the executable live runtime package could not be prepared.'))
        : 'The latest package is missing, invalid, or has no normalized payload.',
  )

  addCheck(
    'runtime_execution_path',
    'Current runtime can execute this contract version',
    isImportedV2Package && !v2RuntimeSupport.supported ? 'fail' : 'pass',
    isImportedV2Package
      ? (v2RuntimeSupport.supported
          ? 'Current runtime execution path is compatible with Package Contract v2 for live execution.'
          : `Package Contract v2 is importable and structurally valid, but publish stays blocked until the live runtime supports the full execution path. ${v2RuntimeSupport.issues[0]?.message ?? ''}`.trim())
      : 'Current runtime execution path is compatible with the stored package contract.',
  )

  if (!pkg) {
    const status: AdminAssessmentReleaseReadinessStatus = blockingIssues.length > 0 ? 'not_ready' : warnings.length > 0 ? 'ready_with_warnings' : 'ready'
    const verdict: AdminAssessmentPublishReadinessVerdict = status === 'not_ready' ? 'blocked' : status
    const summaryText = isImportedV2Package
      ? (v2RuntimeSupport.supported
          ? 'Package Contract v2 is ready for publish review through the live execution path.'
          : 'Publish is blocked because this version uses Package Contract v2 and the live execution path is not ready for it yet.')
      : status === 'not_ready'
        ? 'Publish is blocked until a valid normalized package is attached.'
        : 'Review the package evidence before publish.'
    return {
      status,
      verdict,
      blockingIssues: [...new Set([...blockingIssues, ...getPackageErrorMessages(packageInfo)])],
      warnings: [...new Set(warnings)],
      checks,
      checklist: checks,
      summaryText,
      summary: summaryText,
    }
  }

  addCheck('required_sections', 'Required sections present', 'pass', 'Meta, dimensions, questions, scoring, normalization, and language sections are present.')

  addCheck(
    'dimensions_exist',
    'Dimensions defined',
    pkg.dimensions.length > 0 ? 'pass' : 'fail',
    pkg.dimensions.length > 0 ? `${formatCount(pkg.dimensions.length, 'dimension')} defined.` : 'At least one dimension is required.',
  )

  addCheck(
    'questions_exist',
    'Questions defined',
    pkg.questions.length > 0 ? 'pass' : 'fail',
    pkg.questions.length > 0 ? `${formatCount(pkg.questions.length, 'question')} defined.` : 'At least one question is required.',
  )

  const questionCoverage = getQuestionScoringCoverage(pkg)
  addCheck(
    'scoring_coverage',
    'Question scoring coverage',
    questionCoverage.missingQuestionIds.length === 0 ? 'pass' : 'fail',
    questionCoverage.missingQuestionIds.length === 0
      ? 'Every question option contributes scoring evidence.'
      : `Scoring is incomplete for ${questionCoverage.missingQuestionIds.join(', ')}.`,
  )

  const normalizationCoverage = getNormalizationCoverage(pkg)
  addCheck(
    'normalization_coverage',
    'Normalization coverage',
    normalizationCoverage.missingDimensionIds.length === 0 ? 'pass' : 'fail',
    normalizationCoverage.missingDimensionIds.length === 0
      ? `Normalization covers all ${normalizationCoverage.total} defined dimensions.`
      : `Normalization is missing for ${normalizationCoverage.missingDimensionIds.join(', ')}.`,
  )

  const localeCounts = getLocaleKeyCounts(pkg)
  addCheck(
    'language_coverage',
    'Language coverage',
    localeCounts.localeCount > 0 && localeCounts.maxKeyCount > 0 ? 'pass' : 'fail',
    localeCounts.localeCount > 0 && localeCounts.maxKeyCount > 0
      ? `${formatCount(localeCounts.localeCount, 'locale')} available with populated language keys.`
      : 'At least one populated locale is required.',
  )

  const activeScenarios = (version.savedScenarios ?? []).filter((scenario) => scenario.status === 'active')
  addCheck(
    'active_scenarios',
    'Saved QA scenarios available',
    activeScenarios.length > 0 ? 'pass' : 'warning',
    activeScenarios.length > 0
      ? `${formatCount(activeScenarios.length, 'active saved scenario')} available for deterministic QA.`
      : 'No active saved QA scenarios are attached; publish may still be acceptable with manual judgement.',
  )

  const outputCoverage = getOutputCoverage(pkg)
  addCheck(
    'output_consistency',
    'Outputs and rule references',
    outputCoverage.outputRuleCount > 0 ? 'pass' : 'warning',
    outputCoverage.outputRuleCount > 0
      ? `${formatCount(outputCoverage.outputRuleCount, 'output rule')} available for operational preview.`
      : 'No output rules are attached; publish is allowed, but downstream report evidence is limited.',
  )

  addCheck(
    'blocking_errors',
    'No blocking validation issues',
    packageInfo.errors.length === 0 ? 'pass' : 'fail',
    packageInfo.errors.length === 0 ? 'No blocking validation errors remain.' : `${formatCount(packageInfo.errors.length, 'blocking error')} still recorded on the package.`,
  )

  const latestSuiteSnapshot = version.latestSuiteSnapshot ?? null
  addCheck(
    'suite_snapshot_exists',
    'Latest regression suite snapshot recorded',
    latestSuiteSnapshot ? 'pass' : 'warning',
    latestSuiteSnapshot
      ? `Latest suite snapshot recorded at ${latestSuiteSnapshot.executedAt}.`
      : 'No latest regression suite snapshot is stored; publish may still proceed with human judgement.',
  )

  if (latestSuiteSnapshot) {
    addCheck(
      'suite_snapshot_status',
      'Latest regression suite snapshot status',
      latestSuiteSnapshot.overallStatus === 'fail' ? 'fail' : latestSuiteSnapshot.overallStatus === 'warning' ? 'warning' : 'pass',
      latestSuiteSnapshot.overallStatus === 'fail'
        ? `Latest suite snapshot failed: ${latestSuiteSnapshot.summaryText}`
        : latestSuiteSnapshot.overallStatus === 'warning'
          ? `Latest suite snapshot has warnings: ${latestSuiteSnapshot.summaryText}`
          : `Latest suite snapshot passed: ${latestSuiteSnapshot.summaryText}`,
    )
  }

  const status: AdminAssessmentReleaseReadinessStatus = blockingIssues.length > 0
    ? 'not_ready'
    : warnings.length > 0
      ? 'ready_with_warnings'
      : 'ready'
  const verdict: AdminAssessmentPublishReadinessVerdict = status === 'not_ready' ? 'blocked' : status
  const summaryText = status === 'ready'
    ? 'Ready to publish: the attached package and release evidence meet the current governance checks.'
    : status === 'ready_with_warnings'
      ? 'Ready with warnings: publish can proceed only with operator review of the flagged release evidence.'
      : 'Publish is blocked until the failing release-governance checks are resolved.'

  return {
    status,
    verdict,
    blockingIssues: [...new Set([...blockingIssues, ...getPackageErrorMessages(packageInfo)])],
    warnings: [...new Set(warnings)],
    checks,
    checklist: checks,
    summaryText,
    summary: summaryText,
  }
}

function versionLabelParts(versionLabel: string): number[] {
  return versionLabel.split(/[^0-9]+/).filter(Boolean).map((segment) => Number.parseInt(segment, 10))
}

function compareVersionLabels(left: string, right: string): number {
  const leftParts = versionLabelParts(left)
  const rightParts = versionLabelParts(right)
  const maxLength = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0
    const rightPart = rightParts[index] ?? 0

    if (leftPart !== rightPart) {
      return leftPart - rightPart
    }
  }

  return left.localeCompare(right)
}

export function getAdminAssessmentVersionDiff(
  currentVersion: Pick<AdminAssessmentVersionRecord, 'id' | 'versionLabel' | 'packageInfo' | 'normalizedPackage' | 'updatedAt' | 'lifecycleStatus'>,
  versions: Array<Pick<AdminAssessmentVersionRecord, 'id' | 'versionLabel' | 'packageInfo' | 'normalizedPackage' | 'updatedAt' | 'lifecycleStatus'>>,
  currentPublishedVersionId?: string | null,
): AdminAssessmentVersionDiffResult {
  const otherVersions = versions.filter((version) => version.id !== currentVersion.id)
  const publishedBaseline = currentPublishedVersionId
    ? otherVersions.find((version) => version.id === currentPublishedVersionId) ?? null
    : otherVersions.find((version) => version.lifecycleStatus === 'published') ?? null

  let baseline: AdminAssessmentVersionDiffBaseline | null = null
  let comparisonVersion: (typeof otherVersions)[number] | null = null

  if (publishedBaseline && currentVersion.lifecycleStatus !== 'published') {
    comparisonVersion = publishedBaseline
    baseline = {
      id: publishedBaseline.id,
      versionLabel: publishedBaseline.versionLabel,
      reason: 'published_baseline',
      summary: `Compared with the current published baseline v${publishedBaseline.versionLabel}.`,
    }
  } else {
    const previousVersion = [...otherVersions]
      .filter((version) => compareVersionLabels(version.versionLabel, currentVersion.versionLabel) < 0)
      .sort((left, right) => compareVersionLabels(right.versionLabel, left.versionLabel))[0] ?? null

    if (previousVersion) {
      comparisonVersion = previousVersion
      baseline = {
        id: previousVersion.id,
        versionLabel: previousVersion.versionLabel,
        reason: 'previous_version',
        summary: `Compared with the nearest prior version v${previousVersion.versionLabel}.`,
      }
    } else if (otherVersions.length > 0) {
      comparisonVersion = [...otherVersions].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0] ?? null
      if (comparisonVersion) {
        baseline = {
          id: comparisonVersion.id,
          versionLabel: comparisonVersion.versionLabel,
          reason: 'most_recent_other',
          summary: `Compared with the most recently updated related version v${comparisonVersion.versionLabel}.`,
        }
      }
    }
  }

  if (!comparisonVersion || !baseline) {
    return {
      hasBaseline: false,
      baseline: null,
      materiallyDifferent: false,
      summary: 'No comparison baseline is available yet; this behaves as a first-version package.',
      summaryLines: ['First version imported — no prior baseline is available for diff evidence.'],
      metadataChanges: [],
      dimensions: { added: [], removed: [], changed: [] },
      questions: { added: [], removed: [], changed: [] },
      coverageChanges: [],
      outputLanguageChanges: [],
    }
  }

  const currentPackage = currentVersion.normalizedPackage
  const baselinePackage = comparisonVersion.normalizedPackage

  if (!currentPackage || !baselinePackage) {
    return {
      hasBaseline: true,
      baseline,
      materiallyDifferent: false,
      summary: 'A comparison target exists, but one side lacks a normalized package for structured diffing.',
      summaryLines: ['Structured diff is unavailable because one version has no normalized package.'],
      metadataChanges: [],
      dimensions: { added: [], removed: [], changed: [] },
      questions: { added: [], removed: [], changed: [] },
      coverageChanges: [],
      outputLanguageChanges: [],
    }
  }

  const baselineDimensions = new Map(baselinePackage.dimensions.map((dimension) => [dimension.id, dimension]))
  const currentDimensions = new Map(currentPackage.dimensions.map((dimension) => [dimension.id, dimension]))
  const addedDimensions = currentPackage.dimensions.filter((dimension) => !baselineDimensions.has(dimension.id)).map((dimension) => dimension.id)
  const removedDimensions = baselinePackage.dimensions.filter((dimension) => !currentDimensions.has(dimension.id)).map((dimension) => dimension.id)
  const changedDimensions = currentPackage.dimensions
    .filter((dimension) => {
      const baselineDimension = baselineDimensions.get(dimension.id)
      return baselineDimension && (baselineDimension.labelKey !== dimension.labelKey || baselineDimension.descriptionKey !== dimension.descriptionKey)
    })
    .map((dimension) => dimension.id)

  const baselineQuestions = new Map(baselinePackage.questions.map((question) => [question.id, question]))
  const currentQuestions = new Map(currentPackage.questions.map((question) => [question.id, question]))
  const addedQuestions = currentPackage.questions.filter((question) => !baselineQuestions.has(question.id)).map((question) => question.id)
  const removedQuestions = baselinePackage.questions.filter((question) => !currentQuestions.has(question.id)).map((question) => question.id)
  const changedQuestions = currentPackage.questions
    .filter((question) => {
      const baselineQuestion = baselineQuestions.get(question.id)
      if (!baselineQuestion) {
        return false
      }

      return baselineQuestion.promptKey !== question.promptKey
        || baselineQuestion.dimensionId !== question.dimensionId
        || baselineQuestion.weight !== question.weight
        || baselineQuestion.reverseScored !== question.reverseScored
        || baselineQuestion.options.length !== question.options.length
        || JSON.stringify(baselineQuestion.options) !== JSON.stringify(question.options)
    })
    .map((question) => question.id)

  const coverageChanges: string[] = []
  const currentNormalizationCoverage = getNormalizationCoverage(currentPackage)
  const baselineNormalizationCoverage = getNormalizationCoverage(baselinePackage)
  if (currentNormalizationCoverage.covered !== baselineNormalizationCoverage.covered || currentNormalizationCoverage.total !== baselineNormalizationCoverage.total) {
    coverageChanges.push(`Normalization coverage changed from ${baselineNormalizationCoverage.covered}/${baselineNormalizationCoverage.total} to ${currentNormalizationCoverage.covered}/${currentNormalizationCoverage.total} dimensions.`)
  }

  const currentQuestionCoverage = getQuestionScoringCoverage(currentPackage)
  const baselineQuestionCoverage = getQuestionScoringCoverage(baselinePackage)
  if (currentQuestionCoverage.coveredQuestions !== baselineQuestionCoverage.coveredQuestions || currentQuestionCoverage.totalQuestions !== baselineQuestionCoverage.totalQuestions) {
    coverageChanges.push(`Question scoring coverage changed from ${baselineQuestionCoverage.coveredQuestions}/${baselineQuestionCoverage.totalQuestions} to ${currentQuestionCoverage.coveredQuestions}/${currentQuestionCoverage.totalQuestions}.`)
  }

  const currentExplicitScoring = getExplicitScoringCoverage(currentPackage)
  const baselineExplicitScoring = getExplicitScoringCoverage(baselinePackage)
  if (currentExplicitScoring.covered !== baselineExplicitScoring.covered || currentExplicitScoring.total !== baselineExplicitScoring.total) {
    coverageChanges.push(`Explicit scoring-rule coverage changed from ${baselineExplicitScoring.covered}/${baselineExplicitScoring.total} to ${currentExplicitScoring.covered}/${currentExplicitScoring.total} dimensions.`)
  }

  const outputLanguageChanges: string[] = []
  const currentOutputCoverage = getOutputCoverage(currentPackage)
  const baselineOutputCoverage = getOutputCoverage(baselinePackage)
  if (currentOutputCoverage.outputRuleCount !== baselineOutputCoverage.outputRuleCount) {
    outputLanguageChanges.push(`Output rule count changed from ${baselineOutputCoverage.outputRuleCount} to ${currentOutputCoverage.outputRuleCount}.`)
  }

  const currentLocaleCounts = getLocaleKeyCounts(currentPackage)
  const baselineLocaleCounts = getLocaleKeyCounts(baselinePackage)
  if (currentLocaleCounts.localeCount !== baselineLocaleCounts.localeCount || currentLocaleCounts.maxKeyCount !== baselineLocaleCounts.maxKeyCount) {
    outputLanguageChanges.push(`Language coverage changed from ${baselineLocaleCounts.maxKeyCount} keys across ${baselineLocaleCounts.localeCount} locale(s) to ${currentLocaleCounts.maxKeyCount} keys across ${currentLocaleCounts.localeCount} locale(s).`)
  }

  const metadataChanges: string[] = []
  if ((currentVersion.packageInfo.schemaVersion ?? null) !== (comparisonVersion.packageInfo.schemaVersion ?? null)) {
    metadataChanges.push(`Schema version changed from ${comparisonVersion.packageInfo.schemaVersion ?? 'none'} to ${currentVersion.packageInfo.schemaVersion ?? 'none'}.`)
  }
  if ((currentVersion.packageInfo.sourceFilename ?? null) !== (comparisonVersion.packageInfo.sourceFilename ?? null)) {
    metadataChanges.push(`Source filename changed from ${comparisonVersion.packageInfo.sourceFilename ?? 'unspecified'} to ${currentVersion.packageInfo.sourceFilename ?? 'unspecified'}.`)
  }

  const summaryLines = [
    addedQuestions.length ? `+${addedQuestions.length} question(s) added.` : null,
    removedQuestions.length ? `${removedQuestions.length} question(s) removed.` : null,
    changedQuestions.length ? `${changedQuestions.length} existing question(s) changed.` : null,
    addedDimensions.length ? `+${addedDimensions.length} dimension(s) added.` : null,
    removedDimensions.length ? `${removedDimensions.length} dimension(s) removed.` : null,
    changedDimensions.length ? `${changedDimensions.length} dimension metadata change(s).` : null,
    ...coverageChanges,
    ...outputLanguageChanges,
    metadataChanges[0] ?? null,
  ].filter((line): line is string => Boolean(line))

  const materiallyDifferent = summaryLines.length > 0

  return {
    hasBaseline: true,
    baseline,
    materiallyDifferent,
    summary: materiallyDifferent
      ? `Structured comparison against v${baseline.versionLabel} found operational package changes.`
      : `Structured comparison against v${baseline.versionLabel} found no material package changes.`,
    summaryLines: materiallyDifferent ? summaryLines : ['No material package differences were detected in the structured comparison.'],
    metadataChanges,
    dimensions: {
      added: addedDimensions,
      removed: removedDimensions,
      changed: changedDimensions,
    },
    questions: {
      added: addedQuestions,
      removed: removedQuestions,
      changed: changedQuestions,
    },
    coverageChanges,
    outputLanguageChanges,
  }
}

export function getAdminAssessmentVersionControlTowerSummary(
  version: Pick<AdminAssessmentVersionRecord, 'id' | 'versionLabel' | 'packageInfo' | 'normalizedPackage' | 'updatedAt' | 'lifecycleStatus'>,
  versions: Array<Pick<AdminAssessmentVersionRecord, 'id' | 'versionLabel' | 'packageInfo' | 'normalizedPackage' | 'updatedAt' | 'lifecycleStatus'>>,
  currentPublishedVersionId?: string | null,
): AdminAssessmentVersionControlTowerSummary {
  const readiness = getAdminAssessmentVersionReadiness(version)
  const diff = getAdminAssessmentVersionDiff(version, versions, currentPublishedVersionId)

  return {
    readiness,
    diff,
    snippet: diff.hasBaseline
      ? `${readiness.verdict.replace(/_/g, ' ')} · ${diff.summaryLines[0] ?? diff.summary}`
      : `${readiness.verdict.replace(/_/g, ' ')} · First-version package evidence only.`,
  }
}

export const SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1 = 'sonartra-assessment-package/v1'

export type AssessmentPackageImportSourceType = 'manual_import'
export type AssessmentPackageStatus = 'missing' | 'valid' | 'valid_with_warnings' | 'invalid'

export interface SonartraAssessmentPackageMeta {
  schemaVersion: string
  assessmentKey: string
  assessmentTitle: string
  versionLabel?: string | null
  defaultLocale: string
}

export interface SonartraAssessmentPackageDimension {
  id: string
  labelKey: string
  descriptionKey?: string | null
}

export interface SonartraAssessmentPackageQuestionOption {
  id: string
  labelKey: string
  value: number
  scoreMap: Record<string, number>
}

export interface SonartraAssessmentPackageQuestion {
  id: string
  promptKey: string
  dimensionId: string
  reverseScored: boolean
  weight: number
  options: SonartraAssessmentPackageQuestionOption[]
}

export interface SonartraAssessmentPackageScoringDimensionRule {
  dimensionId: string
  aggregation: 'sum'
}

export interface SonartraAssessmentPackageNormalizationBand {
  key: string
  min: number
  max: number
  labelKey: string
}

export interface SonartraAssessmentPackageNormalizationScale {
  id: string
  dimensionIds: string[]
  range: {
    min: number
    max: number
  }
  bands: SonartraAssessmentPackageNormalizationBand[]
}

export interface SonartraAssessmentPackageOutputRule {
  key: string
  labelKey: string
  dimensionIds: string[]
  normalizationScaleId?: string | null
}

export interface SonartraAssessmentPackageLocale {
  locale: string
  text: Record<string, string>
}

export interface SonartraAssessmentPackageV1 {
  meta: SonartraAssessmentPackageMeta
  dimensions: SonartraAssessmentPackageDimension[]
  questions: SonartraAssessmentPackageQuestion[]
  scoring: {
    dimensionRules: SonartraAssessmentPackageScoringDimensionRule[]
  }
  normalization: {
    scales: SonartraAssessmentPackageNormalizationScale[]
  }
  outputs?: {
    reportRules: SonartraAssessmentPackageOutputRule[]
  }
  language: {
    locales: SonartraAssessmentPackageLocale[]
  }
}

export interface SonartraAssessmentPackageSummary {
  dimensionsCount: number
  questionsCount: number
  optionsCount: number
  scoringRuleCount: number
  normalizationRuleCount: number
  outputRuleCount: number
  localeCount: number
}

export interface SonartraAssessmentPackageValidationIssue {
  path: string
  message: string
}

export interface SonartraAssessmentPackageValidationResult {
  ok: boolean
  status: Exclude<AssessmentPackageStatus, 'missing'>
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
  summary: SonartraAssessmentPackageSummary
  normalizedPackage: SonartraAssessmentPackageV1 | null
  schemaVersion: string | null
}

export interface AdminAssessmentVersionPackageInfo {
  status: AssessmentPackageStatus
  schemaVersion: string | null
  sourceType: AssessmentPackageImportSourceType | null
  importedAt: string | null
  importedByName: string | null
  sourceFilename: string | null
  summary: SonartraAssessmentPackageSummary | null
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function createEmptySummary(): SonartraAssessmentPackageSummary {
  return {
    dimensionsCount: 0,
    questionsCount: 0,
    optionsCount: 0,
    scoringRuleCount: 0,
    normalizationRuleCount: 0,
    outputRuleCount: 0,
    localeCount: 0,
  }
}

function pushIssue(collection: SonartraAssessmentPackageValidationIssue[], path: string, message: string) {
  collection.push({ path, message })
}

function isIdentifier(value: string): boolean {
  return /^[a-z][a-z0-9_:-]*$/i.test(value)
}

export function getAssessmentPackageStatusLabel(status: AssessmentPackageStatus): string {
  switch (status) {
    case 'valid':
      return 'Valid'
    case 'valid_with_warnings':
      return 'Valid with warnings'
    case 'invalid':
      return 'Invalid'
    default:
      return 'No package'
  }
}

export function validateSonartraAssessmentPackage(input: unknown): SonartraAssessmentPackageValidationResult {
  const errors: SonartraAssessmentPackageValidationIssue[] = []
  const warnings: SonartraAssessmentPackageValidationIssue[] = []
  const summary = createEmptySummary()

  if (!isRecord(input)) {
    pushIssue(errors, '$', 'Package payload must be a JSON object.')
    return { ok: false, status: 'invalid', errors, warnings, summary, normalizedPackage: null, schemaVersion: null }
  }

  const metaInput = isRecord(input.meta) ? input.meta : null
  const dimensionsInput = Array.isArray(input.dimensions) ? input.dimensions : null
  const questionsInput = Array.isArray(input.questions) ? input.questions : null
  const scoringInput = isRecord(input.scoring) ? input.scoring : null
  const normalizationInput = isRecord(input.normalization) ? input.normalization : null
  const outputsInput = input.outputs === undefined ? null : isRecord(input.outputs) ? input.outputs : null
  const languageInput = isRecord(input.language) ? input.language : null

  if (!metaInput) pushIssue(errors, 'meta', 'The meta section is required.')
  if (!dimensionsInput) pushIssue(errors, 'dimensions', 'The dimensions section must be an array.')
  if (!questionsInput) pushIssue(errors, 'questions', 'The questions section must be an array.')
  if (!scoringInput) pushIssue(errors, 'scoring', 'The scoring section is required.')
  if (!normalizationInput) pushIssue(errors, 'normalization', 'The normalization section is required.')
  if (!languageInput) pushIssue(errors, 'language', 'The language section is required.')
  if (input.outputs !== undefined && !outputsInput) pushIssue(errors, 'outputs', 'The outputs section must be an object when provided.')

  const meta: SonartraAssessmentPackageMeta = {
    schemaVersion: asTrimmedString(metaInput?.schemaVersion) ?? '',
    assessmentKey: asTrimmedString(metaInput?.assessmentKey) ?? '',
    assessmentTitle: asTrimmedString(metaInput?.assessmentTitle) ?? '',
    versionLabel: asTrimmedString(metaInput?.versionLabel),
    defaultLocale: asTrimmedString(metaInput?.defaultLocale) ?? '',
  }

  if (!meta.schemaVersion) {
    pushIssue(errors, 'meta.schemaVersion', 'meta.schemaVersion is required.')
  } else if (meta.schemaVersion !== SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1) {
    pushIssue(errors, 'meta.schemaVersion', `Only ${SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1} is supported in v1.`)
  }

  if (!meta.assessmentKey) {
    pushIssue(errors, 'meta.assessmentKey', 'meta.assessmentKey is required.')
  } else if (!isIdentifier(meta.assessmentKey)) {
    pushIssue(errors, 'meta.assessmentKey', 'meta.assessmentKey must use letters, numbers, underscores, colons, or hyphens.')
  }

  if (!meta.assessmentTitle) {
    pushIssue(errors, 'meta.assessmentTitle', 'meta.assessmentTitle is required.')
  }

  if (!meta.defaultLocale) {
    pushIssue(errors, 'meta.defaultLocale', 'meta.defaultLocale is required.')
  }

  const normalizedDimensions: SonartraAssessmentPackageDimension[] = []
  const dimensionIds = new Set<string>()
  const languageKeys = new Set<string>()

  for (const [index, value] of (dimensionsInput ?? []).entries()) {
    if (!isRecord(value)) {
      pushIssue(errors, `dimensions[${index}]`, 'Each dimension must be an object.')
      continue
    }

    const id = asTrimmedString(value.id) ?? ''
    const labelKey = asTrimmedString(value.labelKey) ?? ''
    const descriptionKey = asTrimmedString(value.descriptionKey)

    if (!id) {
      pushIssue(errors, `dimensions[${index}].id`, 'Dimension id is required.')
      continue
    }

    if (!isIdentifier(id)) {
      pushIssue(errors, `dimensions[${index}].id`, 'Dimension ids must use letters, numbers, underscores, colons, or hyphens.')
    }

    if (dimensionIds.has(id)) {
      pushIssue(errors, `dimensions[${index}].id`, `Duplicate dimension id "${id}" found.`)
      continue
    }

    if (!labelKey) {
      pushIssue(errors, `dimensions[${index}].labelKey`, 'Dimension labelKey is required.')
    }

    dimensionIds.add(id)
    if (labelKey) languageKeys.add(labelKey)
    if (descriptionKey) languageKeys.add(descriptionKey)
    normalizedDimensions.push({ id, labelKey, descriptionKey })
  }

  if (normalizedDimensions.length === 0) {
    pushIssue(errors, 'dimensions', 'At least one dimension is required.')
  }

  const normalizedQuestions: SonartraAssessmentPackageQuestion[] = []
  const questionIds = new Set<string>()

  for (const [questionIndex, value] of (questionsInput ?? []).entries()) {
    if (!isRecord(value)) {
      pushIssue(errors, `questions[${questionIndex}]`, 'Each question must be an object.')
      continue
    }

    const id = asTrimmedString(value.id) ?? ''
    const promptKey = asTrimmedString(value.promptKey) ?? ''
    const dimensionId = asTrimmedString(value.dimensionId) ?? ''
    const reverseScored = asBoolean(value.reverseScored)
    const weight = asNumber(value.weight) ?? 1
    const optionsInput = Array.isArray(value.options) ? value.options : null

    if (!id) {
      pushIssue(errors, `questions[${questionIndex}].id`, 'Question id is required.')
      continue
    }
    if (!isIdentifier(id)) {
      pushIssue(errors, `questions[${questionIndex}].id`, 'Question ids must use letters, numbers, underscores, colons, or hyphens.')
    }
    if (questionIds.has(id)) {
      pushIssue(errors, `questions[${questionIndex}].id`, `Duplicate question id "${id}" found.`)
      continue
    }
    questionIds.add(id)

    if (!promptKey) pushIssue(errors, `questions[${questionIndex}].promptKey`, 'Question promptKey is required.')
    if (!dimensionId) {
      pushIssue(errors, `questions[${questionIndex}].dimensionId`, 'Question dimensionId is required.')
    } else if (!dimensionIds.has(dimensionId)) {
      pushIssue(errors, `questions[${questionIndex}].dimensionId`, `Question references unknown dimension "${dimensionId}".`)
    }
    if (!Number.isFinite(weight) || weight <= 0) {
      pushIssue(errors, `questions[${questionIndex}].weight`, 'Question weight must be a positive number.')
    }
    if (!optionsInput) {
      pushIssue(errors, `questions[${questionIndex}].options`, 'Each question requires an options array.')
      continue
    }
    if (optionsInput.length === 0) {
      pushIssue(errors, `questions[${questionIndex}].options`, 'Each question must contain at least one option.')
    }

    const optionIds = new Set<string>()
    const normalizedOptions: SonartraAssessmentPackageQuestionOption[] = []

    for (const [optionIndex, optionValue] of optionsInput.entries()) {
      if (!isRecord(optionValue)) {
        pushIssue(errors, `questions[${questionIndex}].options[${optionIndex}]`, 'Each option must be an object.')
        continue
      }

      const optionId = asTrimmedString(optionValue.id) ?? ''
      const labelKey = asTrimmedString(optionValue.labelKey) ?? ''
      const numericValue = asNumber(optionValue.value)
      const scoreMapInput = isRecord(optionValue.scoreMap) ? optionValue.scoreMap : null

      if (!optionId) {
        pushIssue(errors, `questions[${questionIndex}].options[${optionIndex}].id`, 'Option id is required.')
        continue
      }
      if (optionIds.has(optionId)) {
        pushIssue(errors, `questions[${questionIndex}].options[${optionIndex}].id`, `Duplicate option id "${optionId}" found within question "${id}".`)
        continue
      }
      optionIds.add(optionId)

      if (!labelKey) pushIssue(errors, `questions[${questionIndex}].options[${optionIndex}].labelKey`, 'Option labelKey is required.')
      if (numericValue === null) pushIssue(errors, `questions[${questionIndex}].options[${optionIndex}].value`, 'Option value must be numeric.')
      if (!scoreMapInput || Object.keys(scoreMapInput).length === 0) {
        pushIssue(errors, `questions[${questionIndex}].options[${optionIndex}].scoreMap`, 'Option scoreMap is required.')
      }

      const normalizedScoreMap: Record<string, number> = {}
      for (const [scoreDimensionId, scoreValue] of Object.entries(scoreMapInput ?? {})) {
        if (!dimensionIds.has(scoreDimensionId)) {
          pushIssue(errors, `questions[${questionIndex}].options[${optionIndex}].scoreMap.${scoreDimensionId}`, `Option scoreMap references unknown dimension "${scoreDimensionId}".`)
          continue
        }
        const numericScore = asNumber(scoreValue)
        if (numericScore === null) {
          pushIssue(errors, `questions[${questionIndex}].options[${optionIndex}].scoreMap.${scoreDimensionId}`, 'Option scoreMap values must be numeric.')
          continue
        }
        normalizedScoreMap[scoreDimensionId] = numericScore
      }

      if (labelKey) languageKeys.add(labelKey)
      normalizedOptions.push({ id: optionId, labelKey, value: numericValue ?? 0, scoreMap: normalizedScoreMap })
    }

    if (promptKey) languageKeys.add(promptKey)
    normalizedQuestions.push({ id, promptKey, dimensionId, reverseScored, weight, options: normalizedOptions })
  }

  if (normalizedQuestions.length === 0) {
    pushIssue(errors, 'questions', 'At least one question is required.')
  }

  const scoringDimensionRulesInput = Array.isArray(scoringInput?.dimensionRules) ? scoringInput?.dimensionRules : null
  if (!scoringDimensionRulesInput) {
    pushIssue(errors, 'scoring.dimensionRules', 'scoring.dimensionRules must be an array.')
  }
  const scoringRuleIds = new Set<string>()
  const normalizedScoringRules: SonartraAssessmentPackageScoringDimensionRule[] = []
  for (const [index, value] of (scoringDimensionRulesInput ?? []).entries()) {
    if (!isRecord(value)) {
      pushIssue(errors, `scoring.dimensionRules[${index}]`, 'Each scoring rule must be an object.')
      continue
    }
    const dimensionId = asTrimmedString(value.dimensionId) ?? ''
    const aggregation = asTrimmedString(value.aggregation) ?? ''
    if (!dimensionId) {
      pushIssue(errors, `scoring.dimensionRules[${index}].dimensionId`, 'Scoring rule dimensionId is required.')
      continue
    }
    if (!dimensionIds.has(dimensionId)) {
      pushIssue(errors, `scoring.dimensionRules[${index}].dimensionId`, `Scoring rule references unknown dimension "${dimensionId}".`)
    }
    if (scoringRuleIds.has(dimensionId)) {
      pushIssue(errors, `scoring.dimensionRules[${index}].dimensionId`, `Duplicate scoring rule for dimension "${dimensionId}".`)
      continue
    }
    if (aggregation !== 'sum') {
      pushIssue(errors, `scoring.dimensionRules[${index}].aggregation`, 'Only "sum" aggregation is supported in v1.')
    }
    scoringRuleIds.add(dimensionId)
    normalizedScoringRules.push({ dimensionId, aggregation: 'sum' })
  }

  const normalizationScalesInput = Array.isArray(normalizationInput?.scales) ? normalizationInput?.scales : null
  if (!normalizationScalesInput) {
    pushIssue(errors, 'normalization.scales', 'normalization.scales must be an array.')
  }
  const normalizationScaleIds = new Set<string>()
  const normalizedScales: SonartraAssessmentPackageNormalizationScale[] = []
  for (const [scaleIndex, value] of (normalizationScalesInput ?? []).entries()) {
    if (!isRecord(value)) {
      pushIssue(errors, `normalization.scales[${scaleIndex}]`, 'Each normalization scale must be an object.')
      continue
    }

    const id = asTrimmedString(value.id) ?? ''
    const dimensionRefs = Array.isArray(value.dimensionIds) ? value.dimensionIds.map(asTrimmedString).filter((entry): entry is string => Boolean(entry)) : []
    const rangeInput = isRecord(value.range) ? value.range : null
    const bandsInput = Array.isArray(value.bands) ? value.bands : []

    if (!id) {
      pushIssue(errors, `normalization.scales[${scaleIndex}].id`, 'Normalization scale id is required.')
      continue
    }
    if (normalizationScaleIds.has(id)) {
      pushIssue(errors, `normalization.scales[${scaleIndex}].id`, `Duplicate normalization scale id "${id}" found.`)
      continue
    }
    if (dimensionRefs.length === 0) {
      pushIssue(errors, `normalization.scales[${scaleIndex}].dimensionIds`, 'Normalization scales must reference at least one dimension.')
    }
    for (const dimensionId of dimensionRefs) {
      if (!dimensionIds.has(dimensionId)) {
        pushIssue(errors, `normalization.scales[${scaleIndex}].dimensionIds`, `Normalization scale references unknown dimension "${dimensionId}".`)
      }
    }

    const min = asNumber(rangeInput?.min)
    const max = asNumber(rangeInput?.max)
    if (min === null || max === null || min >= max) {
      pushIssue(errors, `normalization.scales[${scaleIndex}].range`, 'Normalization scale range must contain numeric min and max values where min < max.')
    }

    const normalizedBands: SonartraAssessmentPackageNormalizationBand[] = []
    const bandKeys = new Set<string>()
    for (const [bandIndex, bandValue] of bandsInput.entries()) {
      if (!isRecord(bandValue)) {
        pushIssue(errors, `normalization.scales[${scaleIndex}].bands[${bandIndex}]`, 'Each normalization band must be an object.')
        continue
      }
      const key = asTrimmedString(bandValue.key) ?? ''
      const bandMin = asNumber(bandValue.min)
      const bandMax = asNumber(bandValue.max)
      const labelKey = asTrimmedString(bandValue.labelKey) ?? ''
      if (!key) pushIssue(errors, `normalization.scales[${scaleIndex}].bands[${bandIndex}].key`, 'Normalization band key is required.')
      if (key && bandKeys.has(key)) pushIssue(errors, `normalization.scales[${scaleIndex}].bands[${bandIndex}].key`, `Duplicate normalization band key "${key}" found.`)
      if (bandMin === null || bandMax === null || bandMin > bandMax) pushIssue(errors, `normalization.scales[${scaleIndex}].bands[${bandIndex}]`, 'Normalization band min/max values must be numeric and min must be <= max.')
      if (!labelKey) pushIssue(errors, `normalization.scales[${scaleIndex}].bands[${bandIndex}].labelKey`, 'Normalization band labelKey is required.')
      if (labelKey) languageKeys.add(labelKey)
      if (key) bandKeys.add(key)
      normalizedBands.push({ key, min: bandMin ?? 0, max: bandMax ?? 0, labelKey })
    }

    normalizationScaleIds.add(id)
    normalizedScales.push({ id, dimensionIds: dimensionRefs, range: { min: min ?? 0, max: max ?? 0 }, bands: normalizedBands })
  }

  const outputRulesInput = outputsInput && Array.isArray(outputsInput.reportRules) ? outputsInput.reportRules : outputsInput ? null : []
  if (outputsInput && !outputRulesInput) {
    pushIssue(errors, 'outputs.reportRules', 'outputs.reportRules must be an array when outputs are provided.')
  }
  const outputRuleKeys = new Set<string>()
  const normalizedOutputRules: SonartraAssessmentPackageOutputRule[] = []
  for (const [index, value] of (outputRulesInput ?? []).entries()) {
    if (!isRecord(value)) {
      pushIssue(errors, `outputs.reportRules[${index}]`, 'Each output rule must be an object.')
      continue
    }
    const key = asTrimmedString(value.key) ?? ''
    const labelKey = asTrimmedString(value.labelKey) ?? ''
    const dimensionRefs = Array.isArray(value.dimensionIds) ? value.dimensionIds.map(asTrimmedString).filter((entry): entry is string => Boolean(entry)) : []
    const normalizationScaleId = asTrimmedString(value.normalizationScaleId)
    if (!key) {
      pushIssue(errors, `outputs.reportRules[${index}].key`, 'Output rule key is required.')
      continue
    }
    if (outputRuleKeys.has(key)) {
      pushIssue(errors, `outputs.reportRules[${index}].key`, `Duplicate output rule key "${key}" found.`)
      continue
    }
    if (!labelKey) pushIssue(errors, `outputs.reportRules[${index}].labelKey`, 'Output rule labelKey is required.')
    for (const dimensionId of dimensionRefs) {
      if (!dimensionIds.has(dimensionId)) {
        pushIssue(errors, `outputs.reportRules[${index}].dimensionIds`, `Output rule references unknown dimension "${dimensionId}".`)
      }
    }
    if (normalizationScaleId && !normalizationScaleIds.has(normalizationScaleId)) {
      pushIssue(errors, `outputs.reportRules[${index}].normalizationScaleId`, `Output rule references unknown normalization scale "${normalizationScaleId}".`)
    }
    if (labelKey) languageKeys.add(labelKey)
    outputRuleKeys.add(key)
    normalizedOutputRules.push({ key, labelKey, dimensionIds: dimensionRefs, normalizationScaleId })
  }

  const localesInput = Array.isArray(languageInput?.locales) ? languageInput?.locales : null
  if (!localesInput) {
    pushIssue(errors, 'language.locales', 'language.locales must be an array.')
  }
  const localeIds = new Set<string>()
  const normalizedLocales: SonartraAssessmentPackageLocale[] = []
  for (const [index, value] of (localesInput ?? []).entries()) {
    if (!isRecord(value)) {
      pushIssue(errors, `language.locales[${index}]`, 'Each locale must be an object.')
      continue
    }
    const locale = asTrimmedString(value.locale) ?? ''
    const text = isRecord(value.text) ? value.text : null
    if (!locale) {
      pushIssue(errors, `language.locales[${index}].locale`, 'Locale is required.')
      continue
    }
    if (localeIds.has(locale)) {
      pushIssue(errors, `language.locales[${index}].locale`, `Duplicate locale "${locale}" found.`)
      continue
    }
    if (!text) {
      pushIssue(errors, `language.locales[${index}].text`, 'Locale text library must be an object.')
      continue
    }
    const normalizedText: Record<string, string> = {}
    for (const [key, rawValue] of Object.entries(text)) {
      const trimmedValue = asTrimmedString(rawValue)
      if (trimmedValue) {
        normalizedText[key] = trimmedValue
      }
    }
    localeIds.add(locale)
    normalizedLocales.push({ locale, text: normalizedText })
  }

  if (meta.defaultLocale && !localeIds.has(meta.defaultLocale)) {
    pushIssue(errors, 'meta.defaultLocale', `Default locale "${meta.defaultLocale}" is not present in language.locales.`)
  }

  for (const locale of normalizedLocales) {
    for (const key of languageKeys) {
      if (!locale.text[key]) {
        pushIssue(errors, `language.locales.${locale.locale}.${key}`, `Missing language text for key "${key}" in locale "${locale.locale}".`)
      }
    }
  }

  summary.dimensionsCount = normalizedDimensions.length
  summary.questionsCount = normalizedQuestions.length
  summary.optionsCount = normalizedQuestions.reduce((count, question) => count + question.options.length, 0)
  summary.scoringRuleCount = normalizedScoringRules.length
  summary.normalizationRuleCount = normalizedScales.length
  summary.outputRuleCount = normalizedOutputRules.length
  summary.localeCount = normalizedLocales.length

  if (normalizedScoringRules.length !== normalizedDimensions.length) {
    pushIssue(warnings, 'scoring.dimensionRules', 'Not every dimension has an explicit scoring rule. Missing dimensions will rely on question-level mappings only.')
  }

  const status: Exclude<AssessmentPackageStatus, 'missing'> = errors.length > 0 ? 'invalid' : warnings.length > 0 ? 'valid_with_warnings' : 'valid'

  return {
    ok: errors.length === 0,
    status,
    errors,
    warnings,
    summary,
    normalizedPackage: errors.length > 0 ? null : {
      meta,
      dimensions: normalizedDimensions,
      questions: normalizedQuestions,
      scoring: { dimensionRules: normalizedScoringRules },
      normalization: { scales: normalizedScales },
      outputs: normalizedOutputRules.length > 0 ? { reportRules: normalizedOutputRules } : undefined,
      language: { locales: normalizedLocales },
    },
    schemaVersion: meta.schemaVersion || null,
  }
}

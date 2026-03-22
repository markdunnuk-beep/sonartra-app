import type {
  AssessmentPackageStatus,
  SonartraAssessmentPackageNormalizationScale,
  SonartraAssessmentPackageQuestion,
  SonartraAssessmentPackageQuestionOption,
  SonartraAssessmentPackageV1,
} from '@/lib/admin/domain/assessment-package'
import { parseStoredNormalizedAssessmentPackage } from '@/lib/admin/domain/assessment-package'
import { resolveAssessmentPackageLocaleContext } from '@/lib/admin/domain/assessment-package-content'
import type { AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'

export type AdminAssessmentSimulationEligibility = 'eligible' | 'blocked'
export type AdminAssessmentSimulationInputMode = 'generated_form' | 'manual_json'
export type AdminAssessmentSimulationScenarioKey = 'sensible_defaults' | 'high' | 'low' | 'balanced'

export interface AdminAssessmentSimulationAnswer {
  questionId: string
  optionId: string
}

export interface AdminAssessmentSimulationRequest {
  answers: AdminAssessmentSimulationAnswer[]
  locale?: string | null
  source: AdminAssessmentSimulationInputMode | 'seeded_scenario'
  scenarioKey?: AdminAssessmentSimulationScenarioKey | null
}

export interface AdminAssessmentSimulationIssue {
  path: string
  message: string
}

export interface AdminAssessmentSimulationValidationResult {
  ok: boolean
  errors: AdminAssessmentSimulationIssue[]
  warnings: AdminAssessmentSimulationIssue[]
  normalizedRequest: AdminAssessmentSimulationRequest | null
}

export interface AdminAssessmentSimulationQuestionTrace {
  questionId: string
  prompt: string
  selectedOptionId: string
  selectedOptionLabel: string
  effectiveOptionId: string
  effectiveOptionLabel: string
  reverseScored: boolean
  weight: number
  contributions: Array<{
    dimensionId: string
    contribution: number
  }>
}

export interface AdminAssessmentSimulationRawDimensionResult {
  dimensionId: string
  label: string
  rawScore: number
  minimumPossibleScore: number
  maximumPossibleScore: number
  rawPercentage: number | null
  answeredQuestions: number
}

export interface AdminAssessmentSimulationNormalizedDimensionResult {
  dimensionId: string
  label: string
  scaleId: string
  normalizedScore: number | null
  range: {
    min: number
    max: number
  }
  band: {
    key: string
    label: string
    min: number
    max: number
  } | null
}

export interface AdminAssessmentSimulationOutputResult {
  key: string
  label: string
  triggered: boolean
  normalizationScaleId: string | null
  referencedDimensions: string[]
  reasons: string[]
  warnings: string[]
}

export interface AdminAssessmentSimulationResult {
  request: AdminAssessmentSimulationRequest
  responseSummary: {
    answeredCount: number
    totalQuestions: number
    locale: string
    scenarioKey: AdminAssessmentSimulationScenarioKey | null
    source: AdminAssessmentSimulationRequest['source']
  }
  rawScores: AdminAssessmentSimulationRawDimensionResult[]
  normalizedScores: AdminAssessmentSimulationNormalizedDimensionResult[]
  outputs: AdminAssessmentSimulationOutputResult[]
  trace: {
    questions: AdminAssessmentSimulationQuestionTrace[]
    outputExecution: Array<{
      ruleKey: string
      explanation: string
    }>
  }
  warnings: AdminAssessmentSimulationIssue[]
  readinessNotes: string[]
  debug: {
    responsePayload: Record<string, string>
  }
}

export interface AdminAssessmentSimulationExecutionResult {
  ok: boolean
  errors: AdminAssessmentSimulationIssue[]
  warnings: AdminAssessmentSimulationIssue[]
  result: AdminAssessmentSimulationResult | null
}

export interface AdminAssessmentSimulationWorkspaceStatus {
  eligibility: AdminAssessmentSimulationEligibility
  statusLabel: string
  summary: string
  blockingReason: string | null
  canRunSimulation: boolean
}

export interface AdminAssessmentSimulationActionState {
  status: 'idle' | 'success' | 'error' | 'blocked'
  message?: string
  fieldErrors?: {
    responsePayload?: string
  }
  result?: AdminAssessmentSimulationResult
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function roundMetric(value: number, precision = 2): number {
  const multiplier = 10 ** precision
  return Math.round(value * multiplier) / multiplier
}

function resolveText(text: Record<string, string>, key: string): string | null {
  return text[key]?.trim() || null
}

function pushIssue(collection: AdminAssessmentSimulationIssue[], path: string, message: string) {
  collection.push({ path, message })
}

function getQuestionOptionScoreTotal(option: SonartraAssessmentPackageQuestionOption): number {
  return Object.values(option.scoreMap).reduce((total, value) => total + value, 0)
}

function getEffectiveOption(question: SonartraAssessmentPackageQuestion, selectedOption: SonartraAssessmentPackageQuestionOption): SonartraAssessmentPackageQuestionOption {
  if (!question.reverseScored || question.options.length <= 1) {
    return selectedOption
  }

  const orderedOptions = [...question.options].sort((left, right) => left.value - right.value)
  const selectedIndex = orderedOptions.findIndex((option) => option.id === selectedOption.id)

  if (selectedIndex < 0) {
    return selectedOption
  }

  return orderedOptions[orderedOptions.length - 1 - selectedIndex] ?? selectedOption
}

function getDimensionLabel(pkg: SonartraAssessmentPackageV1, dimensionId: string, text: Record<string, string>): string {
  const dimension = pkg.dimensions.find((entry) => entry.id === dimensionId)
  if (!dimension) {
    return dimensionId
  }

  return resolveText(text, dimension.labelKey) ?? dimension.labelKey
}

function getBandLabel(scale: SonartraAssessmentPackageNormalizationScale, bandKey: string, text: Record<string, string>): string {
  const band = scale.bands.find((entry) => entry.key === bandKey)
  if (!band) {
    return bandKey
  }

  return resolveText(text, band.labelKey) ?? band.labelKey
}

function selectScenarioOption(question: SonartraAssessmentPackageQuestion, scenarioKey: AdminAssessmentSimulationScenarioKey): SonartraAssessmentPackageQuestionOption {
  const orderedOptions = [...question.options].sort((left, right) => left.value - right.value)

  if (scenarioKey === 'high') {
    return orderedOptions.reduce((best, option) => (getQuestionOptionScoreTotal(option) > getQuestionOptionScoreTotal(best) ? option : best), orderedOptions[0])
  }

  if (scenarioKey === 'low') {
    return orderedOptions.reduce((best, option) => (getQuestionOptionScoreTotal(option) < getQuestionOptionScoreTotal(best) ? option : best), orderedOptions[0])
  }

  if (scenarioKey === 'balanced') {
    const sortedByValue = [...orderedOptions].sort((left, right) => left.value - right.value)
    return sortedByValue[Math.floor((sortedByValue.length - 1) / 2)] ?? sortedByValue[0]
  }

  return orderedOptions[0]
}

export function getAdminAssessmentSimulationWorkspaceStatus(version: Pick<AdminAssessmentVersionRecord, 'packageInfo' | 'normalizedPackage'>): AdminAssessmentSimulationWorkspaceStatus {
  const status = version.packageInfo?.status === 'valid' || version.packageInfo?.status === 'valid_with_warnings' || version.packageInfo?.status === 'invalid' || version.packageInfo?.status === 'missing'
    ? version.packageInfo.status
    : 'missing'
  const pkg = parseStoredNormalizedAssessmentPackage(version.normalizedPackage)

  if (!pkg || status === 'missing') {
    return {
      eligibility: 'blocked',
      statusLabel: 'Blocked',
      summary: 'Simulation is unavailable until a valid normalized package is attached to the version.',
      blockingReason: 'No valid package is attached to this version yet.',
      canRunSimulation: false,
    }
  }

  if (status === 'invalid') {
    return {
      eligibility: 'blocked',
      statusLabel: 'Blocked',
      summary: 'The latest package import is invalid, so scoring and output execution cannot be trusted for simulation.',
      blockingReason: 'Resolve the package validation errors before running simulation.',
      canRunSimulation: false,
    }
  }

  if (pkg.questions.length === 0) {
    return {
      eligibility: 'blocked',
      statusLabel: 'Blocked',
      summary: 'A normalized package exists, but it does not contain questions that can be answered in simulation.',
      blockingReason: 'At least one normalized question is required for simulation.',
      canRunSimulation: false,
    }
  }

  return {
    eligibility: 'eligible',
    statusLabel: status === 'valid_with_warnings' ? 'Eligible with warnings' : 'Eligible',
    summary: status === 'valid_with_warnings'
      ? 'Simulation can run, but the package still carries warning-level evidence gaps worth reviewing before publish.'
      : 'Simulation is available for deterministic score, normalization, and output-rule verification.',
    blockingReason: null,
    canRunSimulation: true,
  }
}

export function buildAdminAssessmentSimulationScenario(
  pkg: SonartraAssessmentPackageV1,
  scenarioKey: AdminAssessmentSimulationScenarioKey,
): AdminAssessmentSimulationRequest {
  return {
    answers: pkg.questions.map((question) => ({
      questionId: question.id,
      optionId: selectScenarioOption(question, scenarioKey).id,
    })),
    locale: pkg.meta.defaultLocale,
    source: scenarioKey === 'sensible_defaults' ? 'generated_form' : 'seeded_scenario',
    scenarioKey,
  }
}

export function buildAdminAssessmentSimulationPayloadText(request: AdminAssessmentSimulationRequest): string {
  return JSON.stringify({
    answers: request.answers,
    locale: request.locale ?? null,
    source: request.source,
    scenarioKey: request.scenarioKey ?? null,
  }, null, 2)
}

export function parseAdminAssessmentSimulationPayload(
  input: string,
  fallbackSource: AdminAssessmentSimulationRequest['source'] = 'manual_json',
): AdminAssessmentSimulationValidationResult {
  const errors: AdminAssessmentSimulationIssue[] = []
  const warnings: AdminAssessmentSimulationIssue[] = []
  const trimmed = input.trim()

  if (!trimmed) {
    pushIssue(errors, 'responsePayload', 'Provide a simulation response payload before running the simulation.')
    return { ok: false, errors, warnings, normalizedRequest: null }
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(trimmed)
  } catch {
    pushIssue(errors, 'responsePayload', 'Simulation payload must be valid JSON.')
    return { ok: false, errors, warnings, normalizedRequest: null }
  }

  let answersInput: unknown = null
  let locale: string | null = null
  let source: AdminAssessmentSimulationRequest['source'] = fallbackSource
  let scenarioKey: AdminAssessmentSimulationScenarioKey | null = null

  if (Array.isArray(parsed)) {
    answersInput = parsed
  } else if (isRecord(parsed)) {
    if (Array.isArray(parsed.answers)) {
      answersInput = parsed.answers
    } else {
      const mappedAnswers = Object.entries(parsed)
        .filter(([key]) => !['locale', 'source', 'scenarioKey'].includes(key))
        .map(([questionId, optionId]) => ({ questionId, optionId }))
      answersInput = mappedAnswers
    }

    locale = asTrimmedString(parsed.locale)
    source = parsed.source === 'generated_form' || parsed.source === 'manual_json' || parsed.source === 'seeded_scenario'
      ? parsed.source
      : fallbackSource
    scenarioKey = parsed.scenarioKey === 'sensible_defaults' || parsed.scenarioKey === 'high' || parsed.scenarioKey === 'low' || parsed.scenarioKey === 'balanced'
      ? parsed.scenarioKey
      : null
  }

  if (!Array.isArray(answersInput)) {
    pushIssue(errors, 'responsePayload.answers', 'Simulation payload must include an answers array or a question-to-option map.')
    return { ok: false, errors, warnings, normalizedRequest: null }
  }

  const normalizedAnswers = answersInput.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      pushIssue(errors, `responsePayload.answers[${index}]`, 'Each answer must be an object with questionId and optionId.')
      return []
    }

    const questionId = asTrimmedString(entry.questionId)
    const optionId = asTrimmedString(entry.optionId)

    if (!questionId) {
      pushIssue(errors, `responsePayload.answers[${index}].questionId`, 'questionId is required.')
    }
    if (!optionId) {
      pushIssue(errors, `responsePayload.answers[${index}].optionId`, 'optionId is required.')
    }

    if (!questionId || !optionId) {
      return []
    }

    return [{ questionId, optionId }]
  })

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    normalizedRequest: errors.length === 0 ? {
      answers: normalizedAnswers,
      locale,
      source,
      scenarioKey,
    } : null,
  }
}

export function executeAdminAssessmentSimulation(
  pkg: SonartraAssessmentPackageV1,
  request: AdminAssessmentSimulationRequest,
): AdminAssessmentSimulationExecutionResult {
  const errors: AdminAssessmentSimulationIssue[] = []
  const warnings: AdminAssessmentSimulationIssue[] = []
  const localeContext = resolveAssessmentPackageLocaleContext(pkg, request.locale)
  const locale = localeContext.locale
  const localeText = localeContext.localeText
  const questionMap = new Map(pkg.questions.map((question) => [question.id, question]))
  const answerMap = new Map<string, string>()

  for (const [index, answer] of request.answers.entries()) {
    if (answerMap.has(answer.questionId)) {
      pushIssue(errors, `answers[${index}].questionId`, `Question "${answer.questionId}" is answered more than once.`)
      continue
    }

    answerMap.set(answer.questionId, answer.optionId)
  }

  for (const [index, answer] of request.answers.entries()) {
    const question = questionMap.get(answer.questionId)
    if (!question) {
      pushIssue(errors, `answers[${index}].questionId`, `Question "${answer.questionId}" does not exist in the normalized package.`)
      continue
    }

    if (!question.options.some((option) => option.id === answer.optionId)) {
      pushIssue(errors, `answers[${index}].optionId`, `Option "${answer.optionId}" is not valid for question "${answer.questionId}".`)
    }
  }

  for (const question of pkg.questions) {
    if (!answerMap.has(question.id)) {
      pushIssue(errors, `answers.${question.id}`, `Question "${question.id}" requires a selected option for simulation.`)
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, result: null }
  }

  const rawScoreState = new Map<string, {
    rawScore: number
    minimumPossibleScore: number
    maximumPossibleScore: number
    answeredQuestions: number
  }>()

  for (const dimension of pkg.dimensions) {
    rawScoreState.set(dimension.id, {
      rawScore: 0,
      minimumPossibleScore: 0,
      maximumPossibleScore: 0,
      answeredQuestions: 0,
    })
  }

  const questionTrace: AdminAssessmentSimulationQuestionTrace[] = []

  for (const question of pkg.questions) {
    const selectedOptionId = answerMap.get(question.id)
    const selectedOption = question.options.find((option) => option.id === selectedOptionId)

    if (!selectedOption) {
      pushIssue(errors, `answers.${question.id}`, `A valid option is required for question "${question.id}".`)
      continue
    }

    const effectiveOption = getEffectiveOption(question, selectedOption)
    const selectedPrompt = resolveText(localeText, question.promptKey) ?? question.promptKey
    const selectedOptionLabel = resolveText(localeText, selectedOption.labelKey) ?? selectedOption.labelKey
    const effectiveOptionLabel = resolveText(localeText, effectiveOption.labelKey) ?? effectiveOption.labelKey

    questionTrace.push({
      questionId: question.id,
      prompt: selectedPrompt,
      selectedOptionId: selectedOption.id,
      selectedOptionLabel,
      effectiveOptionId: effectiveOption.id,
      effectiveOptionLabel,
      reverseScored: question.reverseScored,
      weight: question.weight,
      contributions: Object.entries(effectiveOption.scoreMap).map(([dimensionId, score]) => ({
        dimensionId,
        contribution: roundMetric(score * question.weight),
      })),
    })

    const effectiveOptionContributions = question.options.map((option) => {
      const effective = getEffectiveOption(question, option)
      const weightedScores = new Map<string, number>()
      for (const [dimensionId, score] of Object.entries(effective.scoreMap)) {
        weightedScores.set(dimensionId, roundMetric(score * question.weight))
      }
      return weightedScores
    })

    const allDimensionIds = new Set<string>()
    for (const contributionMap of effectiveOptionContributions) {
      for (const dimensionId of contributionMap.keys()) {
        allDimensionIds.add(dimensionId)
      }
    }

    for (const dimensionId of allDimensionIds) {
      const dimensionState = rawScoreState.get(dimensionId)
      if (!dimensionState) {
        continue
      }

      const selectedContribution = roundMetric((effectiveOption.scoreMap[dimensionId] ?? 0) * question.weight)
      dimensionState.rawScore = roundMetric(dimensionState.rawScore + selectedContribution)
      dimensionState.answeredQuestions += 1

      const contributions = effectiveOptionContributions.map((entry) => entry.get(dimensionId) ?? 0)
      dimensionState.minimumPossibleScore = roundMetric(dimensionState.minimumPossibleScore + Math.min(...contributions))
      dimensionState.maximumPossibleScore = roundMetric(dimensionState.maximumPossibleScore + Math.max(...contributions))
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, result: null }
  }

  const rawScores: AdminAssessmentSimulationRawDimensionResult[] = pkg.dimensions.map((dimension) => {
    const state = rawScoreState.get(dimension.id) ?? {
      rawScore: 0,
      minimumPossibleScore: 0,
      maximumPossibleScore: 0,
      answeredQuestions: 0,
    }
    const denominator = state.maximumPossibleScore - state.minimumPossibleScore
    const rawPercentage = denominator > 0
      ? roundMetric(((state.rawScore - state.minimumPossibleScore) / denominator) * 100)
      : null

    if (denominator <= 0) {
      pushIssue(warnings, `rawScores.${dimension.id}`, `Dimension "${dimension.id}" does not have enough score spread to calculate a raw percentage.`)
    }

    return {
      dimensionId: dimension.id,
      label: getDimensionLabel(pkg, dimension.id, localeText),
      rawScore: state.rawScore,
      minimumPossibleScore: state.minimumPossibleScore,
      maximumPossibleScore: state.maximumPossibleScore,
      rawPercentage,
      answeredQuestions: state.answeredQuestions,
    }
  })

  const normalizedScores: AdminAssessmentSimulationNormalizedDimensionResult[] = []

  for (const scale of pkg.normalization.scales) {
    for (const dimensionId of scale.dimensionIds) {
      const rawResult = rawScores.find((entry) => entry.dimensionId === dimensionId)
      if (!rawResult) {
        pushIssue(warnings, `normalization.${scale.id}.${dimensionId}`, `Normalization scale "${scale.id}" references dimension "${dimensionId}" but no raw score was produced.`)
        continue
      }

      const denominator = rawResult.maximumPossibleScore - rawResult.minimumPossibleScore
      let normalizedScore: number | null = null

      if (denominator > 0) {
        const progress = (rawResult.rawScore - rawResult.minimumPossibleScore) / denominator
        normalizedScore = roundMetric(scale.range.min + progress * (scale.range.max - scale.range.min))
      } else {
        pushIssue(warnings, `normalization.${scale.id}.${dimensionId}`, `Normalization for dimension "${dimensionId}" could not be calculated because the raw score range collapsed.`)
      }

      const matchedBand = normalizedScore === null
        ? null
        : [...scale.bands].sort((left, right) => left.min - right.min).find((band) => normalizedScore >= band.min && normalizedScore <= band.max) ?? null

      if (normalizedScore !== null && !matchedBand) {
        pushIssue(warnings, `normalization.${scale.id}.${dimensionId}.band`, `Normalized score ${normalizedScore} did not match a configured band on scale "${scale.id}".`)
      }

      normalizedScores.push({
        dimensionId,
        label: rawResult.label,
        scaleId: scale.id,
        normalizedScore,
        range: scale.range,
        band: matchedBand
          ? {
              key: matchedBand.key,
              label: getBandLabel(scale, matchedBand.key, localeText),
              min: matchedBand.min,
              max: matchedBand.max,
            }
          : null,
      })
    }
  }

  for (const dimension of pkg.dimensions) {
    if (!normalizedScores.some((entry) => entry.dimensionId === dimension.id)) {
      pushIssue(warnings, `normalization.${dimension.id}`, `No normalization result was produced for dimension "${dimension.id}".`)
    }
  }

  const outputs: AdminAssessmentSimulationOutputResult[] = []
  const outputExecution: Array<{ ruleKey: string; explanation: string }> = []

  for (const rule of pkg.outputs?.reportRules ?? []) {
    const outputWarnings: string[] = []
    const ruleLabel = resolveText(localeText, rule.labelKey) ?? rule.labelKey

    if (!resolveText(localeText, rule.labelKey)) {
      outputWarnings.push(`Missing language text for output label key "${rule.labelKey}" in locale "${locale}".`)
      pushIssue(warnings, `outputs.${rule.key}.labelKey`, `Missing language text for output label key "${rule.labelKey}" in locale "${locale}".`)
    }

    const referencedResults = rule.dimensionIds.map((dimensionId) => {
      const raw = rawScores.find((entry) => entry.dimensionId === dimensionId) ?? null
      const normalized = rule.normalizationScaleId
        ? normalizedScores.find((entry) => entry.dimensionId === dimensionId && entry.scaleId === rule.normalizationScaleId) ?? null
        : normalizedScores.find((entry) => entry.dimensionId === dimensionId) ?? null
      return { dimensionId, raw, normalized }
    })

    const missingDimensions = referencedResults.filter((entry) => !entry.raw)
    if (missingDimensions.length > 0) {
      for (const missing of missingDimensions) {
        const message = `Output rule "${rule.key}" could not resolve dimension "${missing.dimensionId}".`
        outputWarnings.push(message)
        pushIssue(warnings, `outputs.${rule.key}.${missing.dimensionId}`, message)
      }
    }

    if (rule.normalizationScaleId) {
      for (const entry of referencedResults.filter((item) => !item.normalized)) {
        const message = `Output rule "${rule.key}" expected normalized result(s) on scale "${rule.normalizationScaleId}" for dimension "${entry.dimensionId}".`
        outputWarnings.push(message)
        pushIssue(warnings, `outputs.${rule.key}.normalizationScaleId`, message)
      }
    }

    const reasons = referencedResults.map((entry) => {
      const label = rawScores.find((result) => result.dimensionId === entry.dimensionId)?.label ?? entry.dimensionId
      if (entry.normalized) {
        return `${label}: normalized ${entry.normalized.normalizedScore ?? 'n/a'} on ${entry.normalized.scaleId}${entry.normalized.band ? ` (${entry.normalized.band.label})` : ''}.`
      }

      if (entry.raw) {
        return `${label}: raw ${entry.raw.rawScore}${entry.raw.rawPercentage !== null ? ` (${entry.raw.rawPercentage}% of range)` : ''}.`
      }

      return `${label}: no score available.`
    })

    const triggered = missingDimensions.length === 0 && (rule.normalizationScaleId ? referencedResults.every((entry) => entry.normalized) : true)
    const explanation = triggered
      ? rule.normalizationScaleId
        ? `Rule "${rule.key}" fired because every referenced dimension resolved on scale "${rule.normalizationScaleId}".`
        : `Rule "${rule.key}" fired because the current package model exposes no additional predicate beyond the referenced score path.`
      : `Rule "${rule.key}" did not fully resolve because one or more score references were missing.`

    outputs.push({
      key: rule.key,
      label: ruleLabel,
      triggered,
      normalizationScaleId: rule.normalizationScaleId ?? null,
      referencedDimensions: [...rule.dimensionIds],
      reasons,
      warnings: outputWarnings,
    })
    outputExecution.push({ ruleKey: rule.key, explanation })
  }

  const readinessNotes = [
    errors.length === 0 ? 'Scoring executed successfully for the supplied sample responses.' : 'Scoring execution failed.',
    normalizedScores.length > 0 && !warnings.some((issue) => issue.path.startsWith('normalization'))
      ? 'Normalization completed successfully for every configured scale path.'
      : 'Normalization exposed one or more gaps that should be reviewed before publish.',
    outputs.length > 0 && outputs.every((output) => output.triggered && output.warnings.length === 0)
      ? 'Output-rule execution completed without unresolved references.'
      : outputs.length > 0
        ? 'Output-rule execution surfaced warnings or unresolved references.'
        : 'No output rules are configured on this package, so report verdict evidence remains limited.',
  ]

  return {
    ok: true,
    errors,
    warnings,
    result: {
      request: {
        answers: request.answers.map((answer) => ({ ...answer })),
        locale,
        source: request.source,
        scenarioKey: request.scenarioKey ?? null,
      },
      responseSummary: {
        answeredCount: request.answers.length,
        totalQuestions: pkg.questions.length,
        locale,
        scenarioKey: request.scenarioKey ?? null,
        source: request.source,
      },
      rawScores,
      normalizedScores,
      outputs,
      trace: {
        questions: questionTrace,
        outputExecution,
      },
      warnings,
      readinessNotes,
      debug: {
        responsePayload: Object.fromEntries(request.answers.map((answer) => [answer.questionId, answer.optionId])),
      },
    },
  }
}

export function getAdminAssessmentSimulationScenarioOptions(
  pkg: SonartraAssessmentPackageV1 | null,
): Array<{ key: AdminAssessmentSimulationScenarioKey; label: string; request: AdminAssessmentSimulationRequest | null }> {
  const scenarios: Array<{ key: AdminAssessmentSimulationScenarioKey; label: string }> = [
    { key: 'sensible_defaults', label: 'Sensible defaults' },
    { key: 'high', label: 'High profile' },
    { key: 'balanced', label: 'Balanced profile' },
    { key: 'low', label: 'Low profile' },
  ]

  return scenarios.map((scenario) => ({
    ...scenario,
    request: pkg ? buildAdminAssessmentSimulationScenario(pkg, scenario.key) : null,
  }))
}

export function getAdminAssessmentSimulationPackageStatusSummary(status: AssessmentPackageStatus): string {
  switch (status) {
    case 'valid':
      return 'Package validated cleanly for simulation.'
    case 'valid_with_warnings':
      return 'Package can simulate, but warning-level readiness evidence remains.'
    case 'invalid':
      return 'Package is invalid and cannot be simulated safely.'
    default:
      return 'No package is attached yet.'
  }
}

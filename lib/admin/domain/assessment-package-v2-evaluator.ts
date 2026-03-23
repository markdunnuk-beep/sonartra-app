import type {
  ExecutableAssessmentPackageV2,
  ExecutableNormalizationRule,
  ExecutablePredicate,
  ExecutablePredicateOperand,
  ExecutableScoringRule,
  ExecutableScoringTransform,
} from '@/lib/admin/domain/assessment-package-v2-compiler'

export type AssessmentEvaluationDiagnosticSeverity = 'error' | 'warning'
export type AssessmentEvaluationStatus = 'success' | 'completed_with_warnings' | 'failed'
export type AssessmentEvaluationEntityKind = 'question' | 'dimension' | 'derived_dimension' | 'normalization' | 'integrity_rule' | 'output_rule'

export interface AssessmentEvaluationDiagnostic {
  severity: AssessmentEvaluationDiagnosticSeverity
  code: string
  path: string
  message: string
  entityKind?: AssessmentEvaluationEntityKind
  entityId?: string | null
}

export interface BoundResponseResult {
  questionId: string
  questionCode: string
  responseModelId: string
  status: 'bound' | 'missing' | 'invalid'
  rawValue: unknown
  normalizedValue: string | number | boolean | null | Array<string | number | boolean | null>
  optionId: string | null
  optionIds: string[]
  diagnostics: AssessmentEvaluationDiagnostic[]
}

export interface ItemContributionResult {
  questionId: string
  questionCode: string
  dimensionId: string | null
  bindingIndex: number
  status: 'scored' | 'missing' | 'invalid' | 'ignored'
  rawValue: string | number | boolean | null | Array<string | number | boolean | null>
  baseScore: number | null
  effectiveScore: number | null
  weight: number
  transformApplications: Array<{
    transformId: string
    kind: ExecutableScoringTransform['kind']
    applied: boolean
    before: number | null
    after: number | null
    reason: string | null
  }>
  ruleApplications: Array<{
    ruleId: string
    applied: boolean
    action: ExecutableScoringRule['effect']['action']
    before: number | null
    after: number | null
    reason: string | null
  }>
}

export interface RawDimensionEvaluationResult {
  dimensionId: string
  label: string
  status: 'scored' | 'insufficient_data' | 'invalid' | 'missing_dependencies'
  rawScore: number | null
  answeredCount: number
  expectedCount: number
  minimumAnswered: number | null
  missingDataPolicy: string | null
  missingQuestionIds: string[]
  itemResults: ItemContributionResult[]
  transformApplications: ItemContributionResult['transformApplications']
  ruleApplications: ItemContributionResult['ruleApplications']
}

export interface DerivedDimensionEvaluationResult {
  derivedDimensionId: string
  label: string
  status: 'scored' | 'missing_dependencies' | 'invalid'
  rawScore: number | null
  dependencies: Array<{
    id: string
    kind: 'dimension' | 'derived_dimension'
    value: number | null
    available: boolean
  }>
  computation: {
    method: string
    formula: string | null
    ruleId: string | null
  }
  ruleApplications: ItemContributionResult['ruleApplications']
  transformApplications: ItemContributionResult['transformApplications']
}

export interface NormalizedDimensionResult {
  ruleId: string
  targetId: string
  targetKind: 'dimension' | 'derived_dimension'
  status: 'applied' | 'skipped' | 'failed'
  method: string
  rawScore: number | null
  normalizedScore: number | null
  percentile: number | null
  band: string | null
  label: string | null
  matchedTableRowIndex: number | null
}

export interface IntegrityFinding {
  ruleId: string
  kind: string
  severity: string
  status: 'triggered' | 'not_triggered' | 'error'
  message: string
  affectedQuestionIds: string[]
  affectedDimensionIds: string[]
  affectedDerivedDimensionIds: string[]
}

export interface OutputRuleEvaluationResult {
  ruleId: string
  key: string
  type: string
  severity: string | null
  status: 'triggered' | 'not_triggered' | 'error'
  band: string | null
  targetReportKeys: string[]
  narrativeBindingKeys: string[]
}

export interface AssessmentEvaluationOptionsV2 {
  includeTrace?: boolean
  evaluationId?: string | null
}

export interface AssessmentEvaluationResultV2 {
  status: AssessmentEvaluationStatus
  errors: AssessmentEvaluationDiagnostic[]
  warnings: AssessmentEvaluationDiagnostic[]
  responseDiagnostics: AssessmentEvaluationDiagnostic[]
  boundResponses: Record<string, BoundResponseResult>
  itemResults: ItemContributionResult[]
  rawDimensions: Record<string, RawDimensionEvaluationResult>
  derivedDimensions: Record<string, DerivedDimensionEvaluationResult>
  normalizedResults: NormalizedDimensionResult[]
  integrityFindings: IntegrityFinding[]
  outputRuleFindings: OutputRuleEvaluationResult[]
  executionMetadata: {
    evaluationId: string | null
    runtimeVersion: string
    packageKey: string
    packageSemver: string
    questionCount: number
    rawDimensionCount: number
    derivedDimensionCount: number
  }
}

type Primitive = string | number | boolean | null

type PredicateContext = {
  responses: Record<string, BoundResponseResult>
  rawDimensions: Record<string, RawDimensionEvaluationResult>
  derivedDimensions: Record<string, DerivedDimensionEvaluationResult>
  integrityFindingsByRuleId: Record<string, IntegrityFinding | undefined>
}

function pushDiagnostic(
  diagnostics: AssessmentEvaluationDiagnostic[],
  severity: AssessmentEvaluationDiagnosticSeverity,
  code: string,
  path: string,
  message: string,
  entityKind?: AssessmentEvaluationEntityKind,
  entityId?: string | null,
) {
  diagnostics.push({ severity, code, path, message, entityKind, entityId })
}

function isPrimitive(value: unknown): value is Primitive {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function roundMetric(value: number, precision = 6): number {
  const multiplier = 10 ** precision
  return Math.round(value * multiplier) / multiplier
}

function getResponseModelOptions(pkg: ExecutableAssessmentPackageV2, responseModelId: string) {
  const model = pkg.responseModels.modelsById[responseModelId]
  if (!model) {
    return []
  }
  return [
    ...(model.optionSetId ? pkg.responseModels.optionSetsById[model.optionSetId]?.options ?? [] : []),
    ...(model.options ?? []),
  ]
}

function bindResponse(
  pkg: ExecutableAssessmentPackageV2,
  questionId: string,
  value: unknown,
  diagnostics: AssessmentEvaluationDiagnostic[],
): BoundResponseResult {
  const question = pkg.questionsById[questionId]
  const responseModel = pkg.responseModels.modelsById[question.responseModelId]
  const path = `responses.${questionId}`
  const result: BoundResponseResult = {
    questionId,
    questionCode: question.code,
    responseModelId: question.responseModelId,
    status: 'missing',
    rawValue: value,
    normalizedValue: null,
    optionId: null,
    optionIds: [],
    diagnostics: [],
  }

  if (value === undefined) {
    return result
  }

  const localDiagnostics: AssessmentEvaluationDiagnostic[] = []
  const optionList = getResponseModelOptions(pkg, question.responseModelId)
  const byOptionId = new Map(optionList.map((option) => [option.id, option]))

  const fail = (code: string, message: string) => {
    pushDiagnostic(localDiagnostics, 'error', code, path, message, 'question', questionId)
    result.status = 'invalid'
  }

  switch (responseModel.type) {
    case 'numeric': {
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        fail('invalid_numeric_response', `Question "${questionId}" expects a numeric response.`)
        break
      }
      if (responseModel.numericRange && (value < responseModel.numericRange.min || value > responseModel.numericRange.max)) {
        fail('numeric_response_out_of_range', `Question "${questionId}" expects a value between ${responseModel.numericRange.min} and ${responseModel.numericRange.max}.`)
        break
      }
      result.status = 'bound'
      result.normalizedValue = value
      break
    }
    case 'boolean': {
      if (typeof value !== 'boolean') {
        fail('invalid_boolean_response', `Question "${questionId}" expects a boolean response.`)
        break
      }
      result.status = 'bound'
      result.normalizedValue = value
      break
    }
    case 'multi_select': {
      if (!Array.isArray(value)) {
        fail('invalid_multi_select_response', `Question "${questionId}" expects an array of option ids.`)
        break
      }
      const selected = value
        .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
        .filter((entry, index, collection) => collection.indexOf(entry) === index)
      if (selected.length !== value.length || selected.some((optionId) => !byOptionId.has(optionId))) {
        fail('unknown_multi_select_option', `Question "${questionId}" includes one or more unknown option ids.`)
        break
      }
      const minSelections = responseModel.multiSelect?.minSelections
      const maxSelections = responseModel.multiSelect?.maxSelections
      if (typeof minSelections === 'number' && selected.length < minSelections) {
        fail('too_few_multi_select_options', `Question "${questionId}" requires at least ${minSelections} selections.`)
        break
      }
      if (typeof maxSelections === 'number' && selected.length > maxSelections) {
        fail('too_many_multi_select_options', `Question "${questionId}" allows at most ${maxSelections} selections.`)
        break
      }
      result.status = 'bound'
      result.optionIds = selected
      result.normalizedValue = selected.map((optionId) => byOptionId.get(optionId)?.value ?? optionId)
      break
    }
    default: {
      if (typeof value !== 'string' || !byOptionId.has(value)) {
        fail('invalid_option_response', `Question "${questionId}" expects a valid option id for response model "${responseModel.id}".`)
        break
      }
      const option = byOptionId.get(value)!
      result.status = 'bound'
      result.optionId = option.id
      result.optionIds = [option.id]
      result.normalizedValue = option.value ?? null
      break
    }
  }

  result.diagnostics = localDiagnostics
  diagnostics.push(...localDiagnostics)
  return result
}

function createPredicateContext(
  responses: Record<string, BoundResponseResult>,
  rawDimensions: Record<string, RawDimensionEvaluationResult>,
  derivedDimensions: Record<string, DerivedDimensionEvaluationResult>,
  integrityFindingsByRuleId: Record<string, IntegrityFinding | undefined>,
): PredicateContext {
  return { responses, rawDimensions, derivedDimensions, integrityFindingsByRuleId }
}

function resolveOperandValue(operand: ExecutablePredicateOperand, context: PredicateContext): Primitive | Primitive[] | undefined {
  switch (operand.kind) {
    case 'constant':
      return operand.value
    case 'question_answer':
      return context.responses[operand.questionId]?.normalizedValue as Primitive | Primitive[] | undefined
    case 'dimension_score':
      return context.rawDimensions[operand.dimensionId]?.rawScore ?? undefined
    case 'derived_dimension_score':
      return context.derivedDimensions[operand.derivedDimensionId]?.rawScore ?? undefined
    case 'integrity_flag':
      return context.integrityFindingsByRuleId[operand.ruleId]?.status === 'triggered'
    default:
      return undefined
  }
}

function compareValues(operator: string, left: Primitive | Primitive[] | undefined, right: Primitive | Primitive[] | undefined): boolean {
  if (left === undefined || right === undefined) {
    return false
  }
  if (operator === 'eq') return left === right
  if (operator === 'neq') return left !== right
  if (operator === 'gt') return typeof left === 'number' && typeof right === 'number' && left > right
  if (operator === 'gte') return typeof left === 'number' && typeof right === 'number' && left >= right
  if (operator === 'lt') return typeof left === 'number' && typeof right === 'number' && left < right
  if (operator === 'lte') return typeof left === 'number' && typeof right === 'number' && left <= right
  if (operator === 'in') {
    const set = Array.isArray(right) ? right : [right]
    return set.includes(left as Primitive)
  }
  if (operator === 'contains') {
    if (Array.isArray(left)) {
      return Array.isArray(right)
        ? right.every((value) => left.includes(value))
        : left.includes(right as Primitive)
    }
    if (typeof left === 'string') {
      return typeof right === 'string' && left.includes(right)
    }
  }
  return false
}

export function evaluateExecutablePredicate(
  predicate: ExecutablePredicate,
  context: PredicateContext,
): boolean {
  if (predicate.kind === 'comparison') {
    const left = resolveOperandValue(predicate.left, context)
    const right = Array.isArray(predicate.right)
      ? predicate.right.map((operand) => resolveOperandValue(operand, context)).filter((value): value is Primitive => value !== undefined && !Array.isArray(value))
      : resolveOperandValue(predicate.right, context)
    return compareValues(predicate.operator, left, right)
  }

  if (predicate.kind === 'group') {
    return predicate.operator === 'and'
      ? predicate.conditions.every((condition) => evaluateExecutablePredicate(condition, context))
      : predicate.conditions.some((condition) => evaluateExecutablePredicate(condition, context))
  }

  return !evaluateExecutablePredicate(predicate.condition, context)
}

function applyNumericAction(currentValue: number | null, action: ExecutableScoringRule['effect']['action'], value: Primitive): number | null {
  if (typeof value !== 'number') {
    return currentValue
  }
  const base = currentValue ?? 0
  if (action === 'add') return roundMetric(base + value)
  if (action === 'set') return roundMetric(value)
  if (action === 'multiply') return roundMetric(base * value)
  return currentValue
}

function deriveBaseItemScore(
  pkg: ExecutableAssessmentPackageV2,
  questionId: string,
  dimensionId: string | null,
  response: BoundResponseResult,
): number | null {
  if (response.status !== 'bound') {
    return null
  }
  const responseModel = pkg.responseModels.modelsById[response.responseModelId]
  const options = getResponseModelOptions(pkg, response.responseModelId)

  if (response.optionId) {
    const option = options.find((entry) => entry.id === response.optionId)
    if (!option) return null
    if (dimensionId && option.scoreMap && typeof option.scoreMap[dimensionId] === 'number') {
      return option.scoreMap[dimensionId]!
    }
    if (typeof option.value === 'number') {
      return option.value
    }
    if (responseModel.valueMappings && option.code && typeof responseModel.valueMappings[option.code] === 'number') {
      return responseModel.valueMappings[option.code] as number
    }
    return null
  }

  if (typeof response.normalizedValue === 'number') {
    return response.normalizedValue
  }
  if (typeof response.normalizedValue === 'boolean') {
    return response.normalizedValue ? 1 : 0
  }
  if (Array.isArray(response.normalizedValue)) {
    const numericValues = response.normalizedValue.filter((value): value is number => typeof value === 'number')
    return numericValues.length > 0 ? roundMetric(numericValues.reduce((sum, value) => sum + value, 0)) : null
  }

  const _unused = questionId
  return null
}

function applyTransformToScore(
  transform: ExecutableScoringTransform,
  currentScore: number | null,
  context: PredicateContext,
): { nextScore: number | null; applied: boolean; reason: string | null } {
  if (transform.predicate && !evaluateExecutablePredicate(transform.predicate, context)) {
    return { nextScore: currentScore, applied: false, reason: 'predicate_not_met' }
  }
  if (currentScore === null && transform.kind !== 'conditional_score') {
    return { nextScore: currentScore, applied: false, reason: 'no_numeric_score' }
  }

  if (transform.kind === 'reverse_scale') {
    return {
      nextScore: currentScore === null ? null : roundMetric(transform.config.max + transform.config.min - currentScore),
      applied: currentScore !== null,
      reason: currentScore === null ? 'no_numeric_score' : null,
    }
  }
  if (transform.kind === 'weight_multiplier') {
    return {
      nextScore: currentScore === null ? null : roundMetric(currentScore * transform.config.multiplier),
      applied: currentScore !== null,
      reason: currentScore === null ? 'no_numeric_score' : null,
    }
  }
  if (transform.kind === 'value_remap') {
    if (currentScore === null) {
      return { nextScore: null, applied: false, reason: 'no_numeric_score' }
    }
    const mapped = transform.config.mapping[String(currentScore)]
    return {
      nextScore: typeof mapped === 'number' ? roundMetric(mapped) : currentScore,
      applied: mapped !== undefined,
      reason: mapped === undefined ? 'mapping_not_found' : null,
    }
  }

  if (transform.config.action === 'flag') {
    return { nextScore: currentScore, applied: true, reason: null }
  }

  return {
    nextScore: applyNumericAction(currentScore, transform.config.action, transform.config.value),
    applied: currentScore !== null || transform.config.action === 'set' || transform.config.action === 'add',
    reason: null,
  }
}

function applyRuleToScore(
  rule: ExecutableScoringRule,
  currentScore: number | null,
  context: PredicateContext,
): { nextScore: number | null; applied: boolean; reason: string | null } {
  if (!evaluateExecutablePredicate(rule.predicate, context)) {
    return { nextScore: currentScore, applied: false, reason: 'predicate_not_met' }
  }
  if (rule.effect.action === 'flag') {
    return { nextScore: currentScore, applied: true, reason: null }
  }
  return {
    nextScore: applyNumericAction(currentScore, rule.effect.action, rule.effect.value),
    applied: true,
    reason: null,
  }
}

function aggregateDimensionScore(scoringMethod: string, scores: number[], weights: number[]): number | null {
  if (scores.length === 0) {
    return null
  }
  const scoreSum = scores.reduce((sum, value) => sum + value, 0)
  const weightedSum = scores.reduce((sum, value, index) => sum + (value * (weights[index] ?? 1)), 0)
  const weightSum = weights.reduce((sum, value) => sum + value, 0)

  switch (scoringMethod) {
    case 'average':
      return roundMetric(scoreSum / scores.length)
    case 'weighted_sum':
      return roundMetric(weightedSum)
    case 'weighted_average':
      return weightSum > 0 ? roundMetric(weightedSum / weightSum) : null
    case 'rule_based':
      return roundMetric(scoreSum)
    default:
      return roundMetric(scoreSum)
  }
}

function evaluateFormula(formula: string, values: Record<string, number>): number | null {
  const tokens = formula.match(/[A-Za-z_][A-Za-z0-9_-]*|\d+\.\d+|\d+|[()+\-*/]/g)
  if (!tokens || tokens.join('').length === 0) {
    return null
  }

  const output: string[] = []
  const ops: string[] = []
  const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 }

  for (const token of tokens) {
    if (/^\d/.test(token) || /^[A-Za-z_]/.test(token)) {
      output.push(token)
      continue
    }
    if (token === '(') {
      ops.push(token)
      continue
    }
    if (token === ')') {
      while (ops.length > 0 && ops[ops.length - 1] !== '(') {
        output.push(ops.pop()!)
      }
      ops.pop()
      continue
    }
    while (ops.length > 0 && ops[ops.length - 1] !== '(' && precedence[ops[ops.length - 1]] >= precedence[token]) {
      output.push(ops.pop()!)
    }
    ops.push(token)
  }
  while (ops.length > 0) {
    output.push(ops.pop()!)
  }

  const stack: number[] = []
  for (const token of output) {
    if (/^\d/.test(token)) {
      stack.push(Number(token))
      continue
    }
    if (/^[A-Za-z_]/.test(token)) {
      if (typeof values[token] !== 'number') {
        return null
      }
      stack.push(values[token])
      continue
    }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) {
      return null
    }
    if (token === '+') stack.push(left + right)
    if (token === '-') stack.push(left - right)
    if (token === '*') stack.push(left * right)
    if (token === '/') stack.push(right === 0 ? NaN : left / right)
  }

  const result = stack.pop()
  return typeof result === 'number' && Number.isFinite(result) ? roundMetric(result) : null
}

function applyMissingDataPolicy(
  dimensionId: string,
  policy: string | null,
  minimumAnswered: number | null,
  itemResults: ItemContributionResult[],
  diagnostics: AssessmentEvaluationDiagnostic[],
): { scores: number[]; weights: number[]; status: RawDimensionEvaluationResult['status'] } {
  const answered = itemResults.filter((item) => item.status === 'scored' && typeof item.effectiveScore === 'number')
  const missing = itemResults.filter((item) => item.status !== 'scored')
  const answeredCount = answered.length
  const expectedCount = itemResults.length
  const threshold = minimumAnswered ?? expectedCount

  if (policy === 'error' && missing.length > 0) {
    pushDiagnostic(diagnostics, 'error', 'missing_required_inputs', `dimensions.${dimensionId}`, `Dimension "${dimensionId}" requires every bound response but ${missing.length} input(s) were missing or invalid.`, 'dimension', dimensionId)
    return { scores: [], weights: [], status: 'invalid' }
  }

  if ((policy === 'minimum_answer_threshold' || minimumAnswered !== null) && answeredCount < threshold) {
    pushDiagnostic(diagnostics, 'warning', 'minimum_answer_threshold_not_met', `dimensions.${dimensionId}`, `Dimension "${dimensionId}" requires at least ${threshold} answered input(s); only ${answeredCount} were usable.`, 'dimension', dimensionId)
    return { scores: [], weights: [], status: 'insufficient_data' }
  }

  if (policy === 'mean_impute' && missing.length > 0) {
    const mean = answered.length > 0
      ? answered.reduce((sum, item) => sum + (item.effectiveScore ?? 0), 0) / answered.length
      : 0
    const scores = [...answered.map((item) => item.effectiveScore!), ...missing.map(() => roundMetric(mean))]
    const weights = [...answered.map((item) => item.weight), ...missing.map((item) => item.weight)]
    pushDiagnostic(diagnostics, 'warning', 'mean_imputation_applied', `dimensions.${dimensionId}`, `Dimension "${dimensionId}" applied mean imputation for ${missing.length} missing input(s).`, 'dimension', dimensionId)
    return { scores, weights, status: 'scored' }
  }

  return {
    scores: answered.map((item) => item.effectiveScore!),
    weights: answered.map((item) => item.weight),
    status: answered.length > 0 ? 'scored' : 'insufficient_data',
  }
}

function evaluateNormalizationRule(
  rule: ExecutableNormalizationRule,
  targetId: string,
  targetKind: 'dimension' | 'derived_dimension',
  rawScore: number | null,
): NormalizedDimensionResult {
  if (rawScore === null) {
    return {
      ruleId: rule.id,
      targetId,
      targetKind,
      status: 'skipped',
      method: rule.method,
      rawScore,
      normalizedScore: null,
      percentile: null,
      band: null,
      label: null,
      matchedTableRowIndex: null,
    }
  }

  if (rule.method === 'expression') {
    const normalizedScore = rule.expression ? evaluateFormula(rule.expression, { rawScore, raw: rawScore }) : null
    return {
      ruleId: rule.id,
      targetId,
      targetKind,
      status: normalizedScore === null ? 'failed' : 'applied',
      method: rule.method,
      rawScore,
      normalizedScore,
      percentile: null,
      band: null,
      label: null,
      matchedTableRowIndex: null,
    }
  }

  const table = rule.table ?? []
  const rowIndex = table.findIndex((row) => rawScore >= row.rawMin && rawScore <= row.rawMax)
  const row = rowIndex >= 0 ? table[rowIndex] : null
  return {
    ruleId: rule.id,
    targetId,
    targetKind,
    status: row ? 'applied' : 'failed',
    method: rule.method,
    rawScore,
    normalizedScore: row?.normalizedValue ?? null,
    percentile: row?.percentile ?? null,
    band: row?.band ?? null,
    label: row?.label ?? null,
    matchedTableRowIndex: row ? rowIndex : null,
  }
}

export function evaluateAssessmentPackageV2(
  executablePackage: ExecutableAssessmentPackageV2,
  responses: Record<string, unknown>,
  options: AssessmentEvaluationOptionsV2 = {},
): AssessmentEvaluationResultV2 {
  const diagnostics: AssessmentEvaluationDiagnostic[] = []
  const boundResponses = Object.fromEntries(
    executablePackage.executionPlan.questionIds.map((questionId) => [
      questionId,
      bindResponse(executablePackage, questionId, responses[questionId], diagnostics),
    ]),
  ) as Record<string, BoundResponseResult>

  const itemResults: ItemContributionResult[] = []
  const rawDimensions: Record<string, RawDimensionEvaluationResult> = {}
  const derivedDimensions: Record<string, DerivedDimensionEvaluationResult> = {}
  const integrityFindingsByRuleId: Record<string, IntegrityFinding | undefined> = {}

  const basePredicateContext = createPredicateContext(boundResponses, rawDimensions, derivedDimensions, integrityFindingsByRuleId)

  for (const dimensionId of executablePackage.executionPlan.rawDimensionIds) {
    const dimension = executablePackage.dimensionsById[dimensionId]
    const dimensionItemResults = dimension.itemBindings.map((binding, bindingIndex) => {
      const response = boundResponses[binding.questionId]
      const itemResult: ItemContributionResult = {
        questionId: binding.questionId,
        questionCode: executablePackage.questionsById[binding.questionId]?.code ?? binding.questionId,
        dimensionId,
        bindingIndex,
        status: response?.status === 'missing' ? 'missing' : response?.status === 'invalid' ? 'invalid' : 'ignored',
        rawValue: response?.normalizedValue ?? null,
        baseScore: null,
        effectiveScore: null,
        weight: binding.weight,
        transformApplications: [],
        ruleApplications: [],
      }

      const baseScore = response ? deriveBaseItemScore(executablePackage, binding.questionId, dimensionId, response) : null
      itemResult.baseScore = baseScore
      itemResult.effectiveScore = baseScore
      if (response?.status === 'bound' && baseScore !== null) {
        itemResult.status = 'scored'
      } else if (response?.status === 'bound' && baseScore === null) {
        itemResult.status = 'invalid'
        pushDiagnostic(diagnostics, 'warning', 'non_numeric_item_score', `dimensions.${dimensionId}.items.${binding.questionId}`, `Question "${binding.questionId}" could not be converted into a numeric score for dimension "${dimensionId}".`, 'question', binding.questionId)
      }

      const predicateContext = createPredicateContext(boundResponses, rawDimensions, derivedDimensions, integrityFindingsByRuleId)
      for (const transformId of binding.transformIds) {
        const transform = executablePackage.transformsById[transformId]
        const before = itemResult.effectiveScore
        const applied = transform ? applyTransformToScore(transform, itemResult.effectiveScore, predicateContext) : { nextScore: itemResult.effectiveScore, applied: false, reason: 'missing_transform' }
        itemResult.effectiveScore = applied.nextScore
        itemResult.transformApplications.push({ transformId, kind: transform?.kind ?? 'conditional_score', applied: applied.applied, before, after: itemResult.effectiveScore, reason: applied.reason })
      }
      for (const ruleId of binding.ruleIds) {
        const rule = executablePackage.scoringRulesById[ruleId]
        const before = itemResult.effectiveScore
        const applied = rule ? applyRuleToScore(rule, itemResult.effectiveScore, predicateContext) : { nextScore: itemResult.effectiveScore, applied: false, reason: 'missing_rule' }
        itemResult.effectiveScore = applied.nextScore
        itemResult.ruleApplications.push({ ruleId, action: rule?.effect.action ?? 'flag', applied: applied.applied, before, after: itemResult.effectiveScore, reason: applied.reason })
      }

      itemResults.push(itemResult)
      return itemResult
    })

    const missingQuestionIds = dimensionItemResults.filter((item) => item.status !== 'scored').map((item) => item.questionId)
    const missingData = applyMissingDataPolicy(dimensionId, dimension.missingDataPolicy, dimension.minimumAnswered, dimensionItemResults, diagnostics)
    const aggregatedScore = aggregateDimensionScore(dimension.scoringMethod, missingData.scores, missingData.weights)
    let finalScore = aggregatedScore
    const dimensionTransformApplications: ItemContributionResult['transformApplications'] = []
    const dimensionRuleApplications: ItemContributionResult['ruleApplications'] = []
    const predicateContext = createPredicateContext(boundResponses, rawDimensions, derivedDimensions, integrityFindingsByRuleId)

    for (const transformId of dimension.transformIds) {
      const transform = executablePackage.transformsById[transformId]
      const before = finalScore
      const applied = transform ? applyTransformToScore(transform, finalScore, predicateContext) : { nextScore: finalScore, applied: false, reason: 'missing_transform' }
      finalScore = applied.nextScore
      dimensionTransformApplications.push({ transformId, kind: transform?.kind ?? 'conditional_score', applied: applied.applied, before, after: finalScore, reason: applied.reason })
    }

    for (const rule of Object.values(executablePackage.scoringRulesById).filter((entry) => entry.scope === 'dimension' && entry.effect.targetId === dimensionId)) {
      const before = finalScore
      const applied = applyRuleToScore(rule, finalScore, predicateContext)
      finalScore = applied.nextScore
      dimensionRuleApplications.push({ ruleId: rule.id, action: rule.effect.action, applied: applied.applied, before, after: finalScore, reason: applied.reason })
    }

    rawDimensions[dimensionId] = {
      dimensionId,
      label: dimension.label,
      status: missingData.status === 'scored' && finalScore !== null ? 'scored' : missingData.status,
      rawScore: missingData.status === 'scored' ? finalScore : null,
      answeredCount: dimensionItemResults.filter((item) => item.status === 'scored').length,
      expectedCount: dimensionItemResults.length,
      minimumAnswered: dimension.minimumAnswered,
      missingDataPolicy: dimension.missingDataPolicy,
      missingQuestionIds,
      itemResults: options.includeTrace === false ? [] : dimensionItemResults,
      transformApplications: dimensionTransformApplications,
      ruleApplications: dimensionRuleApplications,
    }
  }

  for (const derivedDimensionId of executablePackage.executionPlan.derivedDimensionIds) {
    const derived = executablePackage.derivedDimensionsById[derivedDimensionId]
    const dependencies = derived.dependencies.map((dependencyId) => {
      const raw = rawDimensions[dependencyId]
      if (raw) {
        return { id: dependencyId, kind: 'dimension' as const, value: raw.rawScore, available: typeof raw.rawScore === 'number' }
      }
      const nested = derivedDimensions[dependencyId]
      return { id: dependencyId, kind: 'derived_dimension' as const, value: nested?.rawScore ?? null, available: typeof nested?.rawScore === 'number' }
    })

    let rawScore: number | null = null
    if (dependencies.some((dependency) => !dependency.available)) {
      pushDiagnostic(diagnostics, 'warning', 'missing_derived_dependency', `derivedDimensions.${derivedDimensionId}`, `Derived dimension "${derivedDimensionId}" could not be computed because one or more dependencies were unavailable.`, 'derived_dimension', derivedDimensionId)
      derivedDimensions[derivedDimensionId] = {
        derivedDimensionId,
        label: derived.label,
        status: 'missing_dependencies',
        rawScore: null,
        dependencies,
        computation: { method: derived.computation.method, formula: derived.computation.formula, ruleId: derived.computation.ruleId },
        ruleApplications: [],
        transformApplications: [],
      }
      continue
    }

    if (derived.computation.method === 'formula' && derived.computation.formula) {
      rawScore = evaluateFormula(derived.computation.formula, Object.fromEntries(dependencies.map((dependency) => [dependency.id, dependency.value ?? 0])))
    } else if (derived.computation.method === 'expression' && derived.computation.expression) {
      rawScore = evaluateExecutablePredicate(derived.computation.expression, createPredicateContext(boundResponses, rawDimensions, derivedDimensions, integrityFindingsByRuleId)) ? 1 : 0
    } else if (derived.computation.method === 'rule_reference' && derived.computation.ruleId) {
      const rule = executablePackage.scoringRulesById[derived.computation.ruleId]
      rawScore = 0
      if (rule) {
        rawScore = applyRuleToScore(rule, rawScore, createPredicateContext(boundResponses, rawDimensions, derivedDimensions, integrityFindingsByRuleId)).nextScore
      }
    }

    const transformApplications: ItemContributionResult['transformApplications'] = []
    const ruleApplications: ItemContributionResult['ruleApplications'] = []
    const predicateContext = createPredicateContext(boundResponses, rawDimensions, derivedDimensions, integrityFindingsByRuleId)
    for (const transformId of derived.transformIds) {
      const transform = executablePackage.transformsById[transformId]
      const before = rawScore
      const applied = transform ? applyTransformToScore(transform, rawScore, predicateContext) : { nextScore: rawScore, applied: false, reason: 'missing_transform' }
      rawScore = applied.nextScore
      transformApplications.push({ transformId, kind: transform?.kind ?? 'conditional_score', applied: applied.applied, before, after: rawScore, reason: applied.reason })
    }
    for (const rule of Object.values(executablePackage.scoringRulesById).filter((entry) => entry.scope === 'derived_dimension' && entry.effect.targetId === derivedDimensionId)) {
      const before = rawScore
      const applied = applyRuleToScore(rule, rawScore, predicateContext)
      rawScore = applied.nextScore
      ruleApplications.push({ ruleId: rule.id, action: rule.effect.action, applied: applied.applied, before, after: rawScore, reason: applied.reason })
    }

    derivedDimensions[derivedDimensionId] = {
      derivedDimensionId,
      label: derived.label,
      status: rawScore === null ? 'invalid' : 'scored',
      rawScore,
      dependencies,
      computation: { method: derived.computation.method, formula: derived.computation.formula, ruleId: derived.computation.ruleId },
      ruleApplications,
      transformApplications,
    }
    if (rawScore === null) {
      pushDiagnostic(diagnostics, 'error', 'derived_dimension_evaluation_failed', `derivedDimensions.${derivedDimensionId}`, `Derived dimension "${derivedDimensionId}" could not be evaluated.`, 'derived_dimension', derivedDimensionId)
    }
  }

  const normalizedResults: NormalizedDimensionResult[] = []
  for (const ruleId of executablePackage.executionPlan.normalizationRuleIds) {
    const rule = executablePackage.normalizationRulesById[ruleId]
    for (const targetId of rule.appliesToDimensionIds) {
      const result = evaluateNormalizationRule(rule, targetId, 'dimension', rawDimensions[targetId]?.rawScore ?? null)
      normalizedResults.push(result)
      if (result.status === 'failed') {
        pushDiagnostic(diagnostics, 'warning', 'normalization_failed', `normalization.${ruleId}.${targetId}`, `Normalization rule "${ruleId}" did not resolve for target "${targetId}".`, 'normalization', ruleId)
      }
    }
    for (const targetId of rule.appliesToDerivedDimensionIds) {
      const result = evaluateNormalizationRule(rule, targetId, 'derived_dimension', derivedDimensions[targetId]?.rawScore ?? null)
      normalizedResults.push(result)
      if (result.status === 'failed') {
        pushDiagnostic(diagnostics, 'warning', 'normalization_failed', `normalization.${ruleId}.${targetId}`, `Normalization rule "${ruleId}" did not resolve for target "${targetId}".`, 'normalization', ruleId)
      }
    }
  }

  const integrityFindings: IntegrityFinding[] = []
  for (const ruleId of executablePackage.executionPlan.integrityRuleIds) {
    const rule = executablePackage.integrityRulesById[ruleId]
    let status: IntegrityFinding['status'] = 'not_triggered'
    try {
      status = evaluateExecutablePredicate(rule.predicate, createPredicateContext(boundResponses, rawDimensions, derivedDimensions, integrityFindingsByRuleId)) ? 'triggered' : 'not_triggered'
    } catch {
      status = 'error'
      pushDiagnostic(diagnostics, 'error', 'integrity_rule_evaluation_failed', `integrity.${ruleId}`, `Integrity rule "${ruleId}" could not be evaluated.`, 'integrity_rule', ruleId)
    }
    const finding: IntegrityFinding = {
      ruleId,
      kind: rule.kind,
      severity: rule.severity,
      status,
      message: rule.message,
      affectedQuestionIds: rule.affectedQuestionIds,
      affectedDimensionIds: rule.affectedDimensionIds,
      affectedDerivedDimensionIds: rule.affectedDerivedDimensionIds,
    }
    integrityFindings.push(finding)
    integrityFindingsByRuleId[ruleId] = finding
  }

  const outputRuleFindings: OutputRuleEvaluationResult[] = []
  for (const ruleId of executablePackage.executionPlan.outputRuleIds) {
    const rule = executablePackage.outputRulesById[ruleId]
    let status: OutputRuleEvaluationResult['status'] = 'not_triggered'
    try {
      status = evaluateExecutablePredicate(rule.predicate, createPredicateContext(boundResponses, rawDimensions, derivedDimensions, integrityFindingsByRuleId)) ? 'triggered' : 'not_triggered'
    } catch {
      status = 'error'
      pushDiagnostic(diagnostics, 'error', 'output_rule_evaluation_failed', `outputs.${ruleId}`, `Output rule "${ruleId}" could not be evaluated.`, 'output_rule', ruleId)
    }
    outputRuleFindings.push({
      ruleId,
      key: rule.key,
      type: rule.type,
      severity: rule.severity,
      status,
      band: rule.band,
      targetReportKeys: rule.targetReportKeys,
      narrativeBindingKeys: rule.narrativeBindingKeys,
    })
  }

  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error')
  const warnings = diagnostics.filter((diagnostic) => diagnostic.severity === 'warning')

  return {
    status: errors.length > 0 ? 'failed' : warnings.length > 0 ? 'completed_with_warnings' : 'success',
    errors,
    warnings,
    responseDiagnostics: diagnostics.filter((diagnostic) => diagnostic.path.startsWith('responses.')),
    boundResponses,
    itemResults: options.includeTrace === false ? [] : itemResults,
    rawDimensions,
    derivedDimensions,
    normalizedResults,
    integrityFindings,
    outputRuleFindings,
    executionMetadata: {
      evaluationId: options.evaluationId ?? null,
      runtimeVersion: executablePackage.runtimeVersion,
      packageKey: executablePackage.metadata.assessmentKey,
      packageSemver: executablePackage.metadata.compatibility.packageSemver,
      questionCount: executablePackage.executionPlan.questionIds.length,
      rawDimensionCount: executablePackage.executionPlan.rawDimensionIds.length,
      derivedDimensionCount: executablePackage.executionPlan.derivedDimensionIds.length,
    },
  }
}

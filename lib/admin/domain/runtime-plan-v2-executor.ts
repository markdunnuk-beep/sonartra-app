import type {
  ExecutableAssessmentPackageV2,
  ExecutableNormalizationRule,
  ExecutablePredicate,
  ExecutablePredicateOperand,
  ExecutableScoringRule,
  ExecutableScoringTransform,
} from '@/lib/admin/domain/assessment-package-v2-compiler'
import type { CompiledRuntimePlanV2, RuntimePlanDimensionRef } from '@/lib/admin/domain/runtime-plan-v2-compiler'

export type RuntimeExecutionStage = 'scoring' | 'derivation' | 'normalization' | 'aggregation' | 'integrity' | 'outputs'
export type RuntimeExecutionIssueCode =
  | 'missing_response'
  | 'unresolved_runtime_input'
  | 'unsupported_execution_pattern'
  | 'divide_by_zero'
  | 'invalid_numeric_result'
  | 'skipped_due_to_upstream_failure'
  | 'execution_stage_failed'

export interface RuntimeExecutionIssueV2 {
  code: RuntimeExecutionIssueCode
  stage: RuntimeExecutionStage
  path: string
  message: string
  fatal: boolean
}

export interface RuntimeExecutionStageResultV2 {
  stage: RuntimeExecutionStage
  status: 'success' | 'completed_with_issues' | 'failed' | 'skipped'
  issueCount: number
  fatalIssueCount: number
  skippedReason: string | null
}

export interface RuntimeScoringResultV2 {
  rawDimensionValues: Record<string, number | null>
  responseBindingStatusByQuestionId: Record<string, 'bound' | 'missing' | 'invalid'>
}

export interface RuntimeDerivationResultV2 {
  derivedDimensionValues: Record<string, number | null>
}

export interface RuntimeNormalizationEntryV2 {
  ruleId: string
  target: RuntimePlanDimensionRef
  status: 'applied' | 'failed' | 'skipped'
  normalizedScore: number | null
  percentile: number | null
  band: string | null
  label: string | null
}

export interface RuntimeAggregationEntryV2 {
  aggregationId: string
  source: RuntimePlanDimensionRef
  status: 'computed' | 'failed'
  value: number | null
}

export interface RuntimeIntegrityEntryV2 {
  ruleId: string
  status: 'pass' | 'warn' | 'fail'
  triggered: boolean
  severity: string
  message: string
}

export interface RuntimeOutputsResultV2 {
  matchedRuleIds: string[]
  unmetRuleIds: string[]
  byRuleId: Record<string, { key: string; status: 'matched' | 'unmet' | 'error'; targetReportKeys: string[] }>
}

export interface CompiledRuntimeExecutionResultV2 {
  status: 'success' | 'completed_with_issues' | 'failed'
  stages: Record<RuntimeExecutionStage, RuntimeExecutionStageResultV2>
  issues: RuntimeExecutionIssueV2[]
  scoring: RuntimeScoringResultV2
  derivation: RuntimeDerivationResultV2
  normalization: { entries: RuntimeNormalizationEntryV2[] }
  aggregation: { entries: RuntimeAggregationEntryV2[] }
  integrity: { entries: RuntimeIntegrityEntryV2[] }
  outputs: RuntimeOutputsResultV2
  summary: {
    executionOrder: CompiledRuntimePlanV2['executionOrder']
    issueCount: number
    fatalIssueCount: number
    timestamp: string
  }
}

export interface NormalizedRuntimeResponsesV2 {
  responsesByQuestionId: Record<string, unknown>
}

export interface ExecuteCompiledRuntimePlanV2Options {
  executablePackage: ExecutableAssessmentPackageV2
  evaluationTimestamp?: string
}

function roundMetric(value: number, precision = 6): number {
  const multiplier = 10 ** precision
  return Math.round(value * multiplier) / multiplier
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function resolveOperand(
  operand: ExecutablePredicateOperand,
  context: {
    responsesByQuestionId: Record<string, unknown>
    rawDimensionValues: Record<string, number | null>
    derivedDimensionValues: Record<string, number | null>
    integrityByRuleId: Record<string, RuntimeIntegrityEntryV2 | undefined>
  },
): (string | number | boolean | null) | Array<string | number | boolean | null> | undefined {
  if (operand.kind === 'constant') return operand.value
  if (operand.kind === 'question_answer') return context.responsesByQuestionId[operand.questionId] as ReturnType<typeof resolveOperand>
  if (operand.kind === 'dimension_score') return context.rawDimensionValues[operand.dimensionId] ?? undefined
  if (operand.kind === 'derived_dimension_score') return context.derivedDimensionValues[operand.derivedDimensionId] ?? undefined
  return context.integrityByRuleId[operand.ruleId]?.triggered
}

function compare(operator: string, left: unknown, right: unknown): boolean {
  if (left === undefined || right === undefined) return false
  if (operator === 'eq') return left === right
  if (operator === 'neq') return left !== right
  if (operator === 'gt') return typeof left === 'number' && typeof right === 'number' && left > right
  if (operator === 'gte') return typeof left === 'number' && typeof right === 'number' && left >= right
  if (operator === 'lt') return typeof left === 'number' && typeof right === 'number' && left < right
  if (operator === 'lte') return typeof left === 'number' && typeof right === 'number' && left <= right
  if (operator === 'in') {
    const collection = Array.isArray(right) ? right : [right]
    return collection.includes(left as never)
  }
  if (operator === 'contains') {
    if (Array.isArray(left)) {
      return Array.isArray(right) ? right.every((value) => left.includes(value)) : left.includes(right)
    }
    return typeof left === 'string' && typeof right === 'string' ? left.includes(right) : false
  }
  return false
}

function evaluatePredicate(
  predicate: ExecutablePredicate,
  context: Parameters<typeof resolveOperand>[1],
): boolean {
  if (predicate.kind === 'comparison') {
    const left = resolveOperand(predicate.left, context)
    const right = Array.isArray(predicate.right)
      ? predicate.right.map((entry) => resolveOperand(entry, context)).filter((entry): entry is string | number | boolean | null => isPrimitive(entry))
      : resolveOperand(predicate.right, context)
    return compare(predicate.operator, left, right)
  }

  if (predicate.kind === 'group') {
    return predicate.operator === 'and'
      ? predicate.conditions.every((condition) => evaluatePredicate(condition, context))
      : predicate.conditions.some((condition) => evaluatePredicate(condition, context))
  }

  return !evaluatePredicate(predicate.condition, context)
}

function applyNumericAction(current: number | null, action: ExecutableScoringRule['effect']['action'], value: unknown): number | null {
  if (typeof value !== 'number') return current
  const base = current ?? 0
  if (action === 'add') return roundMetric(base + value)
  if (action === 'set') return roundMetric(value)
  if (action === 'multiply') return roundMetric(base * value)
  return current
}

function applyTransform(
  transform: ExecutableScoringTransform,
  score: number | null,
  context: Parameters<typeof resolveOperand>[1],
): number | null {
  if (transform.predicate && !evaluatePredicate(transform.predicate, context)) return score
  if (score === null && transform.kind !== 'conditional_score') return score

  if (transform.kind === 'reverse_scale') return score === null ? null : roundMetric(transform.config.max + transform.config.min - score)
  if (transform.kind === 'weight_multiplier') return score === null ? null : roundMetric(score * transform.config.multiplier)
  if (transform.kind === 'value_remap') {
    if (score === null) return null
    const mapped = transform.config.mapping[String(score)]
    return typeof mapped === 'number' ? roundMetric(mapped) : score
  }
  if (transform.config.action === 'flag') return score
  return applyNumericAction(score, transform.config.action, transform.config.value)
}

function applyRule(rule: ExecutableScoringRule, score: number | null, context: Parameters<typeof resolveOperand>[1]): number | null {
  if (!evaluatePredicate(rule.predicate, context)) return score
  if (rule.effect.action === 'flag') return score
  return applyNumericAction(score, rule.effect.action, rule.effect.value)
}

function evaluateFormula(expression: string, values: Record<string, number>): { value: number | null; divideByZero: boolean } {
  const tokens = expression.match(/[A-Za-z_][A-Za-z0-9_-]*|\d+\.\d+|\d+|[()+\-*/]/g)
  if (!tokens || tokens.length === 0) return { value: null, divideByZero: false }

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
      while (ops.length > 0 && ops[ops.length - 1] !== '(') output.push(ops.pop()!)
      ops.pop()
      continue
    }
    while (ops.length > 0 && ops[ops.length - 1] !== '(' && precedence[ops[ops.length - 1]] >= precedence[token]) output.push(ops.pop()!)
    ops.push(token)
  }
  while (ops.length > 0) output.push(ops.pop()!)

  const stack: number[] = []
  let divideByZero = false
  for (const token of output) {
    if (/^\d/.test(token)) {
      stack.push(Number(token))
      continue
    }
    if (/^[A-Za-z_]/.test(token)) {
      if (typeof values[token] !== 'number') return { value: null, divideByZero }
      stack.push(values[token])
      continue
    }
    const right = stack.pop()
    const left = stack.pop()
    if (left === undefined || right === undefined) return { value: null, divideByZero }
    if (token === '+') stack.push(left + right)
    if (token === '-') stack.push(left - right)
    if (token === '*') stack.push(left * right)
    if (token === '/') {
      if (right === 0) {
        divideByZero = true
        return { value: null, divideByZero }
      }
      stack.push(left / right)
    }
  }

  const result = stack.pop()
  return { value: typeof result === 'number' && Number.isFinite(result) ? roundMetric(result) : null, divideByZero }
}

function aggregate(scoringMethod: string, values: number[], weights: number[]): number | null {
  if (values.length === 0) return null
  const sum = values.reduce((acc, entry) => acc + entry, 0)
  const weightedSum = values.reduce((acc, entry, index) => acc + (entry * (weights[index] ?? 1)), 0)
  const weightSum = weights.reduce((acc, entry) => acc + entry, 0)

  if (scoringMethod === 'average') return roundMetric(sum / values.length)
  if (scoringMethod === 'weighted_sum') return roundMetric(weightedSum)
  if (scoringMethod === 'weighted_average') return weightSum > 0 ? roundMetric(weightedSum / weightSum) : null
  return roundMetric(sum)
}

function evaluateNormalization(
  rule: ExecutableNormalizationRule,
  rawScore: number | null,
): RuntimeNormalizationEntryV2['status'] extends never ? never : Omit<RuntimeNormalizationEntryV2, 'ruleId' | 'target'> {
  if (rawScore === null) {
    return { status: 'skipped', normalizedScore: null, percentile: null, band: null, label: null }
  }

  if (rule.method === 'expression') {
    const evaluated = rule.expression ? evaluateFormula(rule.expression, { rawScore, raw: rawScore }) : { value: null, divideByZero: false }
    return {
      status: evaluated.value === null ? 'failed' : 'applied',
      normalizedScore: evaluated.value,
      percentile: null,
      band: null,
      label: null,
    }
  }

  if (['band_table', 'percentile_table', 'scaled_score_table', 'stanine_table'].includes(rule.method)) {
    const table = rule.table ?? []
    const row = table.find((entry) => rawScore >= entry.rawMin && rawScore <= entry.rawMax)
    return {
      status: row ? 'applied' : 'failed',
      normalizedScore: row?.normalizedValue ?? null,
      percentile: row?.percentile ?? null,
      band: row?.band ?? null,
      label: row?.label ?? null,
    }
  }

  return { status: 'failed', normalizedScore: null, percentile: null, band: null, label: null }
}

export function normalizeRuntimeResponsesForExecutionV2(input: unknown): NormalizedRuntimeResponsesV2 {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return { responsesByQuestionId: {} }
  }

  const candidate = input as Record<string, unknown>
  if (candidate.responses && typeof candidate.responses === 'object' && !Array.isArray(candidate.responses)) {
    return { responsesByQuestionId: { ...(candidate.responses as Record<string, unknown>) } }
  }

  return {
    responsesByQuestionId: Object.fromEntries(Object.entries(candidate).filter(([key]) => !['locale', 'source', 'scenarioKey'].includes(key))),
  }
}

export function executeCompiledRuntimePlanV2(
  compiledPlan: CompiledRuntimePlanV2,
  normalizedResponses: NormalizedRuntimeResponsesV2,
  options: ExecuteCompiledRuntimePlanV2Options,
): CompiledRuntimeExecutionResultV2 {
  const issues: RuntimeExecutionIssueV2[] = []
  const stageIssueCount: Record<RuntimeExecutionStage, { count: number; fatal: number }> = {
    scoring: { count: 0, fatal: 0 },
    derivation: { count: 0, fatal: 0 },
    normalization: { count: 0, fatal: 0 },
    aggregation: { count: 0, fatal: 0 },
    integrity: { count: 0, fatal: 0 },
    outputs: { count: 0, fatal: 0 },
  }

  const pushIssue = (issue: RuntimeExecutionIssueV2) => {
    issues.push(issue)
    stageIssueCount[issue.stage].count += 1
    if (issue.fatal) stageIssueCount[issue.stage].fatal += 1
  }
  const hasFatalIssueForStage = (stage: RuntimeExecutionStage) => stageIssueCount[stage].fatal > 0
  const stageOrder: RuntimeExecutionStage[] = ['scoring', 'derivation', 'normalization', 'aggregation', 'integrity', 'outputs']
  const skippedStages = new Map<RuntimeExecutionStage, string>()
  const markStageSkipped = (stage: RuntimeExecutionStage, reason: string) => {
    skippedStages.set(stage, reason)
    pushIssue({
      code: 'skipped_due_to_upstream_failure',
      stage,
      fatal: false,
      path: `stages.${stage}`,
      message: reason,
    })
  }

  const context = {
    responsesByQuestionId: {} as Record<string, unknown>,
    rawDimensionValues: {} as Record<string, number | null>,
    derivedDimensionValues: {} as Record<string, number | null>,
    integrityByRuleId: {} as Record<string, RuntimeIntegrityEntryV2 | undefined>,
  }

  const scoringStatusByQuestion: Record<string, 'bound' | 'missing' | 'invalid'> = {}
  for (const questionId of compiledPlan.executionOrder.questionIds) {
    const raw = normalizedResponses.responsesByQuestionId[questionId]
    if (raw === undefined) {
      scoringStatusByQuestion[questionId] = 'missing'
      pushIssue({ code: 'missing_response', stage: 'scoring', fatal: false, path: `responses.${questionId}`, message: `Missing response for question "${questionId}".` })
      continue
    }

    const modelId = compiledPlan.itemMap[questionId]?.responseModelId
    const model = options.executablePackage.responseModels.modelsById[modelId]
    const modelOptions = [
      ...(model?.optionSetId ? options.executablePackage.responseModels.optionSetsById[model.optionSetId]?.options ?? [] : []),
      ...(model?.options ?? []),
    ]

    if (!model) {
      scoringStatusByQuestion[questionId] = 'invalid'
      pushIssue({ code: 'unresolved_runtime_input', stage: 'scoring', fatal: true, path: `questions.${questionId}.responseModelId`, message: `Question "${questionId}" does not resolve to a known response model.` })
      continue
    }

    if (model.type === 'numeric' && typeof raw === 'number' && Number.isFinite(raw)) {
      context.responsesByQuestionId[questionId] = raw
      scoringStatusByQuestion[questionId] = 'bound'
    } else if (model.type === 'boolean' && typeof raw === 'boolean') {
      context.responsesByQuestionId[questionId] = raw
      scoringStatusByQuestion[questionId] = 'bound'
    } else if (model.type === 'multi_select' && Array.isArray(raw) && raw.every((entry) => typeof entry === 'string' && modelOptions.some((opt) => opt.id === entry))) {
      context.responsesByQuestionId[questionId] = raw
      scoringStatusByQuestion[questionId] = 'bound'
    } else if (typeof raw === 'string' && modelOptions.some((opt) => opt.id === raw)) {
      context.responsesByQuestionId[questionId] = raw
      scoringStatusByQuestion[questionId] = 'bound'
    } else {
      scoringStatusByQuestion[questionId] = 'invalid'
      pushIssue({ code: 'unresolved_runtime_input', stage: 'scoring', fatal: false, path: `responses.${questionId}`, message: `Response for question "${questionId}" is invalid for model "${model.type}".` })
    }
  }

  const scoringInstructionsByQuestionId = new Map<string, ExecutableScoringTransform[]>()
  for (const instruction of compiledPlan.scoringInstructions) {
    if (instruction.target.level !== 'item' || !instruction.target.questionId) continue
    const transform = options.executablePackage.transformsById[instruction.transformId]
    if (!transform) {
      pushIssue({ code: 'unresolved_runtime_input', stage: 'scoring', fatal: false, path: `scoringInstructions.${instruction.transformId}`, message: `Transform "${instruction.transformId}" could not be resolved.` })
      continue
    }
    const existing = scoringInstructionsByQuestionId.get(instruction.target.questionId) ?? []
    existing.push(transform)
    scoringInstructionsByQuestionId.set(instruction.target.questionId, existing)
  }

  const scoringRulesSorted = Object.values(options.executablePackage.scoringRulesById).sort((left, right) => left.id.localeCompare(right.id))

  for (const dimensionId of compiledPlan.executionOrder.rawDimensionIds) {
    const rawPlan = compiledPlan.rawDimensions[dimensionId]
    const runtimeDimension = options.executablePackage.dimensionsById[dimensionId]
    if (!runtimeDimension) {
      context.rawDimensionValues[dimensionId] = null
      pushIssue({ code: 'unresolved_runtime_input', stage: 'scoring', fatal: true, path: `rawDimensions.${dimensionId}`, message: `Raw dimension "${dimensionId}" is missing in executable package.` })
      continue
    }

    const collectedScores: number[] = []
    const weights: number[] = []
    for (const dep of rawPlan.dependencies) {
      const questionId = dep.questionId
      const rawResponse = context.responsesByQuestionId[questionId]
      if (rawResponse === undefined) continue

      const modelId = compiledPlan.itemMap[questionId]?.responseModelId
      const model = options.executablePackage.responseModels.modelsById[modelId]
      const modelOptions = [
        ...(model?.optionSetId ? options.executablePackage.responseModels.optionSetsById[model.optionSetId]?.options ?? [] : []),
        ...(model?.options ?? []),
      ]

      let score: number | null = null
      if (typeof rawResponse === 'number') {
        score = rawResponse
      } else if (typeof rawResponse === 'boolean') {
        score = rawResponse ? 1 : 0
      } else if (Array.isArray(rawResponse)) {
        const numericValues = rawResponse
          .map((id) => modelOptions.find((option) => option.id === id)?.value)
          .filter((value): value is number => typeof value === 'number')
        score = numericValues.length > 0 ? roundMetric(numericValues.reduce((acc, entry) => acc + entry, 0)) : null
      } else if (typeof rawResponse === 'string') {
        const option = modelOptions.find((entry) => entry.id === rawResponse)
        score = typeof option?.scoreMap?.[dimensionId] === 'number'
          ? option.scoreMap[dimensionId]!
          : typeof option?.value === 'number'
            ? option.value
            : null
      }

      if (score === null) {
        pushIssue({ code: 'unresolved_runtime_input', stage: 'scoring', fatal: false, path: `rawDimensions.${dimensionId}.dependencies.${questionId}`, message: `Question "${questionId}" did not produce numeric score for dimension "${dimensionId}".` })
        continue
      }

      for (const transform of scoringInstructionsByQuestionId.get(questionId) ?? []) {
        score = applyTransform(transform, score, context)
      }
      for (const ruleId of dep.ruleIds) {
        const rule = options.executablePackage.scoringRulesById[ruleId]
        if (!rule) {
          pushIssue({ code: 'unresolved_runtime_input', stage: 'scoring', fatal: false, path: `rawDimensions.${dimensionId}.rules.${ruleId}`, message: `Rule "${ruleId}" is not available.` })
          continue
        }
        score = applyRule(rule, score, context)
      }

      if (typeof score === 'number' && Number.isFinite(score)) {
        collectedScores.push(score)
        weights.push(dep.weight)
      }
    }

    let aggregated = aggregate(runtimeDimension.scoringMethod, collectedScores, weights)

    for (const transformId of runtimeDimension.transformIds) {
      const transform = options.executablePackage.transformsById[transformId]
      if (!transform) {
        pushIssue({ code: 'unresolved_runtime_input', stage: 'scoring', fatal: false, path: `rawDimensions.${dimensionId}.transforms.${transformId}`, message: `Transform "${transformId}" is not available.` })
        continue
      }
      aggregated = applyTransform(transform, aggregated, context)
    }

    for (const rule of scoringRulesSorted.filter((entry) => entry.scope === 'dimension' && entry.effect.targetId === dimensionId)) {
      aggregated = applyRule(rule, aggregated, context)
    }

    if (aggregated !== null && !Number.isFinite(aggregated)) {
      pushIssue({ code: 'invalid_numeric_result', stage: 'scoring', fatal: true, path: `rawDimensions.${dimensionId}`, message: `Dimension "${dimensionId}" produced non-finite numeric result.` })
      aggregated = null
    }
    context.rawDimensionValues[dimensionId] = aggregated
  }

  if (hasFatalIssueForStage('scoring')) {
    for (const stage of stageOrder.slice(1)) {
      markStageSkipped(stage, `Stage "${stage}" was skipped because scoring produced fatal execution issues.`)
    }
  }

  if (!skippedStages.has('derivation')) {
    for (const derivedId of compiledPlan.executionOrder.derivedDimensionIds) {
    const derivedPlan = compiledPlan.derivedDimensions[derivedId]
    const derivedRuntime = options.executablePackage.derivedDimensionsById[derivedId]
    if (!derivedRuntime) {
      context.derivedDimensionValues[derivedId] = null
      pushIssue({ code: 'unresolved_runtime_input', stage: 'derivation', fatal: true, path: `derivedDimensions.${derivedId}`, message: `Derived dimension "${derivedId}" is missing in executable package.` })
      continue
    }

    const missingDependency = derivedPlan.dependencies.some((dependency) => {
      const value = dependency.kind === 'raw_dimension' ? context.rawDimensionValues[dependency.id] : context.derivedDimensionValues[dependency.id]
      return typeof value !== 'number'
    })

    if (missingDependency) {
      context.derivedDimensionValues[derivedId] = null
      pushIssue({ code: 'skipped_due_to_upstream_failure', stage: 'derivation', fatal: false, path: `derivedDimensions.${derivedId}`, message: `Derived dimension "${derivedId}" skipped because dependencies are unresolved.` })
      continue
    }

    let nextValue: number | null = null
    if (derivedRuntime.computation.method === 'formula' && derivedRuntime.computation.formula) {
      const dependencyValues = Object.fromEntries(derivedPlan.dependencies.map((dependency) => [dependency.id, dependency.kind === 'raw_dimension' ? context.rawDimensionValues[dependency.id]! : context.derivedDimensionValues[dependency.id]!]))
      const formulaResult = evaluateFormula(derivedRuntime.computation.formula, dependencyValues)
      if (formulaResult.divideByZero) {
        pushIssue({ code: 'divide_by_zero', stage: 'derivation', fatal: true, path: `derivedDimensions.${derivedId}.formula`, message: `Derived dimension "${derivedId}" formula divided by zero.` })
      }
      nextValue = formulaResult.value
    } else if (derivedRuntime.computation.method === 'expression' && derivedRuntime.computation.expression) {
      nextValue = evaluatePredicate(derivedRuntime.computation.expression, context) ? 1 : 0
    } else if (derivedRuntime.computation.method === 'rule_reference' && derivedRuntime.computation.ruleId) {
      const rule = options.executablePackage.scoringRulesById[derivedRuntime.computation.ruleId]
      if (!rule) {
        pushIssue({ code: 'unresolved_runtime_input', stage: 'derivation', fatal: true, path: `derivedDimensions.${derivedId}.ruleId`, message: `Derived rule reference "${derivedRuntime.computation.ruleId}" is missing.` })
      } else {
        nextValue = applyRule(rule, 0, context)
      }
    } else {
      pushIssue({ code: 'unsupported_execution_pattern', stage: 'derivation', fatal: true, path: `derivedDimensions.${derivedId}.computation`, message: `Derived dimension "${derivedId}" uses unsupported computation configuration.` })
    }

    for (const transformId of derivedPlan.transformIds) {
      const transform = options.executablePackage.transformsById[transformId]
      if (!transform) {
        pushIssue({ code: 'unresolved_runtime_input', stage: 'derivation', fatal: false, path: `derivedDimensions.${derivedId}.transforms.${transformId}`, message: `Transform "${transformId}" is not available.` })
        continue
      }
      nextValue = applyTransform(transform, nextValue, context)
    }

    for (const rule of scoringRulesSorted.filter((entry) => entry.scope === 'derived_dimension' && entry.effect.targetId === derivedId)) {
      nextValue = applyRule(rule, nextValue, context)
    }

    if (nextValue !== null && !Number.isFinite(nextValue)) {
      pushIssue({ code: 'invalid_numeric_result', stage: 'derivation', fatal: true, path: `derivedDimensions.${derivedId}`, message: `Derived dimension "${derivedId}" produced non-finite numeric result.` })
      nextValue = null
    }

    context.derivedDimensionValues[derivedId] = nextValue
    }
  }

  const normalizationEntries: RuntimeNormalizationEntryV2[] = []
  if (!skippedStages.has('normalization')) {
    for (const instruction of compiledPlan.normalizationInstructions) {
    const rule = options.executablePackage.normalizationRulesById[instruction.ruleId]
    if (!rule) {
      pushIssue({ code: 'unresolved_runtime_input', stage: 'normalization', fatal: true, path: `normalization.${instruction.ruleId}`, message: `Normalization rule "${instruction.ruleId}" is missing.` })
      normalizationEntries.push({
        ruleId: instruction.ruleId,
        target: instruction.target,
        status: 'failed',
        normalizedScore: null,
        percentile: null,
        band: null,
        label: null,
      })
      continue
    }

    if (!['band_table', 'percentile_table', 'scaled_score_table', 'stanine_table', 'expression'].includes(rule.method)) {
      pushIssue({ code: 'unsupported_execution_pattern', stage: 'normalization', fatal: false, path: `normalization.${rule.id}.method`, message: `Normalization rule "${rule.id}" method "${rule.method}" is unsupported.` })
    }

    const rawScore = instruction.target.kind === 'raw_dimension'
      ? context.rawDimensionValues[instruction.target.id] ?? null
      : context.derivedDimensionValues[instruction.target.id] ?? null

    const normalized = evaluateNormalization(rule, rawScore)
    normalizationEntries.push({ ruleId: rule.id, target: instruction.target, ...normalized })
    }
  }

  const aggregationEntries: RuntimeAggregationEntryV2[] = []
  if (!skippedStages.has('aggregation')) {
    for (const aggregationId of compiledPlan.executionOrder.aggregationIds) {
    const aggregationPlan = compiledPlan.aggregations[aggregationId]
    const value = aggregationPlan.source.kind === 'raw_dimension'
      ? context.rawDimensionValues[aggregationPlan.source.id]
      : context.derivedDimensionValues[aggregationPlan.source.id]

    if (typeof value !== 'number') {
      pushIssue({ code: 'skipped_due_to_upstream_failure', stage: 'aggregation', fatal: false, path: `aggregations.${aggregationId}`, message: `Aggregation "${aggregationId}" skipped because source value is unavailable.` })
      aggregationEntries.push({ aggregationId, source: aggregationPlan.source, status: 'failed', value: null })
      continue
    }
    aggregationEntries.push({ aggregationId, source: aggregationPlan.source, status: 'computed', value })
    }
  }

  const integrityEntries: RuntimeIntegrityEntryV2[] = []
  if (!skippedStages.has('integrity')) {
    for (const ruleId of compiledPlan.executionOrder.integrityRuleIds) {
    const runtimeRule = options.executablePackage.integrityRulesById[ruleId]
    if (!runtimeRule) {
      pushIssue({ code: 'unresolved_runtime_input', stage: 'integrity', fatal: true, path: `integrity.${ruleId}`, message: `Integrity rule "${ruleId}" is missing.` })
      const failed: RuntimeIntegrityEntryV2 = { ruleId, status: 'fail', triggered: false, severity: 'error', message: 'Missing integrity rule.' }
      context.integrityByRuleId[ruleId] = failed
      integrityEntries.push(failed)
      continue
    }

    let triggered = false
    try {
      triggered = evaluatePredicate(runtimeRule.predicate, context)
    } catch {
      pushIssue({ code: 'execution_stage_failed', stage: 'integrity', fatal: true, path: `integrity.${ruleId}`, message: `Integrity rule "${ruleId}" failed during predicate evaluation.` })
    }

    const status: RuntimeIntegrityEntryV2['status'] = !triggered
      ? 'pass'
      : runtimeRule.severity === 'error'
        ? 'fail'
        : 'warn'

    const entry: RuntimeIntegrityEntryV2 = { ruleId, status, triggered, severity: runtimeRule.severity, message: runtimeRule.message }
    integrityEntries.push(entry)
    context.integrityByRuleId[ruleId] = entry
    }
  }

  const matchedRuleIds: string[] = []
  const unmetRuleIds: string[] = []
  const outputByRuleId: RuntimeOutputsResultV2['byRuleId'] = {}
  if (!skippedStages.has('outputs')) {
    for (const ruleId of compiledPlan.executionOrder.outputRuleIds) {
    const runtimeRule = options.executablePackage.outputRulesById[ruleId]
    if (!runtimeRule) {
      pushIssue({ code: 'unresolved_runtime_input', stage: 'outputs', fatal: true, path: `outputs.${ruleId}`, message: `Output rule "${ruleId}" is missing.` })
      outputByRuleId[ruleId] = { key: ruleId, status: 'error', targetReportKeys: [] }
      continue
    }

    const status = evaluatePredicate(runtimeRule.predicate, context)
    if (status) matchedRuleIds.push(ruleId)
    else unmetRuleIds.push(ruleId)
    outputByRuleId[ruleId] = {
      key: runtimeRule.key,
      status: status ? 'matched' : 'unmet',
      targetReportKeys: [...compiledPlan.outputInstructions[ruleId].targetReportKeys],
    }
    }
  }

  const toStageResult = (stage: RuntimeExecutionStage): RuntimeExecutionStageResultV2 => {
    if (skippedStages.has(stage)) {
      return {
        stage,
        status: 'skipped',
        issueCount: stageIssueCount[stage].count,
        fatalIssueCount: stageIssueCount[stage].fatal,
        skippedReason: skippedStages.get(stage) ?? null,
      }
    }
    const stats = stageIssueCount[stage]
    if (stats.fatal > 0) return { stage, status: 'failed', issueCount: stats.count, fatalIssueCount: stats.fatal, skippedReason: null }
    if (stats.count > 0) return { stage, status: 'completed_with_issues', issueCount: stats.count, fatalIssueCount: stats.fatal, skippedReason: null }
    return { stage, status: 'success', issueCount: 0, fatalIssueCount: 0, skippedReason: null }
  }

  const stages: CompiledRuntimeExecutionResultV2['stages'] = {
    scoring: toStageResult('scoring'),
    derivation: toStageResult('derivation'),
    normalization: toStageResult('normalization'),
    aggregation: toStageResult('aggregation'),
    integrity: toStageResult('integrity'),
    outputs: toStageResult('outputs'),
  }

  const fatalIssueCount = issues.filter((issue) => issue.fatal).length

  return {
    status: fatalIssueCount > 0 ? 'failed' : issues.length > 0 ? 'completed_with_issues' : 'success',
    stages,
    issues,
    scoring: {
      rawDimensionValues: context.rawDimensionValues,
      responseBindingStatusByQuestionId: scoringStatusByQuestion,
    },
    derivation: {
      derivedDimensionValues: context.derivedDimensionValues,
    },
    normalization: { entries: normalizationEntries },
    aggregation: { entries: aggregationEntries },
    integrity: { entries: integrityEntries },
    outputs: {
      matchedRuleIds,
      unmetRuleIds,
      byRuleId: outputByRuleId,
    },
    summary: {
      executionOrder: compiledPlan.executionOrder,
      issueCount: issues.length,
      fatalIssueCount,
      timestamp: options.evaluationTimestamp ?? new Date().toISOString(),
    },
  }
}

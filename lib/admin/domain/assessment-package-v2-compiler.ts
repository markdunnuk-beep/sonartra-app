import type {
  SonartraAssessmentPackageV2DerivedDimension,
  SonartraAssessmentPackageV2NormalizationRule,
  SonartraAssessmentPackageV2PredicateComparisonNode,
  SonartraAssessmentPackageV2PredicateExpression,
  SonartraAssessmentPackageV2PredicateOperand,
  SonartraAssessmentPackageV2Question,
  SonartraAssessmentPackageV2ScoringRule,
  SonartraAssessmentPackageV2ScoringTransform,
  SonartraAssessmentPackageV2ValidatedImport,
} from '@/lib/admin/domain/assessment-package-v2'

export const EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION = 'package-contract-v2-runtime/1'

export type PackageCompileDiagnosticSeverity = 'error' | 'warning'

export interface PackageCompileDiagnostic {
  severity: PackageCompileDiagnosticSeverity
  code: string
  path: string
  message: string
}

export type ExecutablePredicateOperand =
  | { kind: 'question_answer'; questionId: string; questionCode: string }
  | { kind: 'dimension_score'; dimensionId: string; dimensionLabel: string }
  | { kind: 'derived_dimension_score'; derivedDimensionId: string; derivedDimensionLabel: string }
  | { kind: 'integrity_flag'; ruleId: string }
  | { kind: 'constant'; value: string | number | boolean | null }

export interface ExecutablePredicateComparisonNode {
  kind: 'comparison'
  operator: SonartraAssessmentPackageV2PredicateComparisonNode['operator']
  left: ExecutablePredicateOperand
  right: ExecutablePredicateOperand | ExecutablePredicateOperand[]
}

export interface ExecutablePredicateGroupNode {
  kind: 'group'
  operator: 'and' | 'or'
  conditions: ExecutablePredicate[]
}

export interface ExecutablePredicateNotNode {
  kind: 'not'
  condition: ExecutablePredicate
}

export type ExecutablePredicate =
  | ExecutablePredicateComparisonNode
  | ExecutablePredicateGroupNode
  | ExecutablePredicateNotNode

export type ExecutableScoringTransform =
  | {
    id: string
    kind: 'reverse_scale'
    target: { level: 'item' | 'dimension'; questionId: string | null; dimensionId: string | null }
    config: { min: number; max: number }
    predicate: ExecutablePredicate | null
  }
  | {
    id: string
    kind: 'weight_multiplier'
    target: { level: 'item' | 'dimension'; questionId: string | null; dimensionId: string | null }
    config: { multiplier: number }
    predicate: ExecutablePredicate | null
  }
  | {
    id: string
    kind: 'value_remap'
    target: { level: 'item' | 'dimension'; questionId: string | null; dimensionId: string | null }
    config: { mapping: Record<string, string | number | boolean | null> }
    predicate: ExecutablePredicate | null
  }
  | {
    id: string
    kind: 'conditional_score'
    target: { level: 'item' | 'dimension'; questionId: string | null; dimensionId: string | null }
    config: { action: 'add' | 'set' | 'multiply' | 'flag'; value: string | number | boolean | null }
    predicate: ExecutablePredicate | null
  }

export interface ExecutableScoringRule {
  id: string
  scope: SonartraAssessmentPackageV2ScoringRule['scope']
  predicate: ExecutablePredicate
  effect: SonartraAssessmentPackageV2ScoringRule['effect']
}

export interface ExecutableQuestionScoringBinding {
  dimensionId: string | null
  transformIds: string[]
  ruleIds: string[]
}

export interface ExecutableQuestionNode {
  id: string
  code: string
  prompt: string
  responseModelId: string
  sectionIds: string[]
  scoringBindings: ExecutableQuestionScoringBinding[]
}

export interface ExecutableDimensionItemBinding {
  questionId: string
  weight: number
  transformIds: string[]
  ruleIds: string[]
}

export interface ExecutableDimensionNode {
  id: string
  kind: 'raw'
  label: string
  scoringMethod: string
  dependencies: string[]
  itemBindings: ExecutableDimensionItemBinding[]
  missingDataPolicy: string | null
  minimumAnswered: number | null
  transformIds: string[]
  normalizationRuleIds: string[]
  downstreamOutputRuleIds: string[]
}

export interface ExecutableDerivedDimensionNode {
  id: string
  kind: 'derived'
  label: string
  dependencies: string[]
  computation: {
    method: SonartraAssessmentPackageV2DerivedDimension['computation']['method']
    formula: string | null
    expression: ExecutablePredicate | null
    ruleId: string | null
  }
  transformIds: string[]
  normalizationRuleIds: string[]
  downstreamOutputRuleIds: string[]
}

export interface ExecutableNormalizationRule {
  id: string
  method: SonartraAssessmentPackageV2NormalizationRule['method']
  appliesToDimensionIds: string[]
  appliesToDerivedDimensionIds: string[]
  version: string
  table: SonartraAssessmentPackageV2NormalizationRule['table']
  expression: string | null
}

export interface ExecutableIntegrityRule {
  id: string
  kind: string
  severity: string
  predicate: ExecutablePredicate
  affectedQuestionIds: string[]
  affectedDimensionIds: string[]
  affectedDerivedDimensionIds: string[]
  message: string
}

export interface ExecutableOutputRule {
  id: string
  key: string
  type: string
  predicate: ExecutablePredicate
  severity: string | null
  band: string | null
  narrativeBindingKeys: string[]
  targetReportKeys: string[]
  affectedQuestionIds: string[]
  affectedDimensionIds: string[]
  affectedDerivedDimensionIds: string[]
}

export interface ExecutableReportBinding {
  key: string
  label: string
  contentRef: string | null
  severity: string | null
  explanation: string | null
  outputRuleId: string | null
}

export interface ExecutableAssessmentPackageV2 {
  runtimeVersion: typeof EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION
  metadata: SonartraAssessmentPackageV2ValidatedImport['metadata']
  responseModels: {
    optionSetsById: Record<string, NonNullable<SonartraAssessmentPackageV2ValidatedImport['responseModels']['optionSets']>[number]>
    modelsById: Record<string, SonartraAssessmentPackageV2ValidatedImport['responseModels']['models'][number]>
  }
  sectionsById: Record<string, SonartraAssessmentPackageV2ValidatedImport['sections'][number]>
  questionsById: Record<string, ExecutableQuestionNode>
  dimensionsById: Record<string, ExecutableDimensionNode>
  derivedDimensionsById: Record<string, ExecutableDerivedDimensionNode>
  transformsById: Record<string, ExecutableScoringTransform>
  scoringRulesById: Record<string, ExecutableScoringRule>
  normalizationRulesById: Record<string, ExecutableNormalizationRule>
  integrityRulesById: Record<string, ExecutableIntegrityRule>
  outputRulesById: Record<string, ExecutableOutputRule>
  reportBindingsByKey: Record<string, ExecutableReportBinding>
  executionPlan: {
    questionIds: string[]
    rawDimensionIds: string[]
    derivedDimensionIds: string[]
    normalizationRuleIds: string[]
    integrityRuleIds: string[]
    outputRuleIds: string[]
  }
}

export interface PackageCompileResult {
  ok: boolean
  executablePackage: ExecutableAssessmentPackageV2 | null
  diagnostics: PackageCompileDiagnostic[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function pushDiagnostic(
  diagnostics: PackageCompileDiagnostic[],
  severity: PackageCompileDiagnosticSeverity,
  code: string,
  path: string,
  message: string,
) {
  diagnostics.push({ severity, code, path, message })
}

function extractPredicateReferences(predicate: SonartraAssessmentPackageV2PredicateExpression): {
  questionIds: Set<string>
  dimensionIds: Set<string>
  derivedDimensionIds: Set<string>
  integrityRuleIds: Set<string>
} {
  const refs = {
    questionIds: new Set<string>(),
    dimensionIds: new Set<string>(),
    derivedDimensionIds: new Set<string>(),
    integrityRuleIds: new Set<string>(),
  }

  const visitOperand = (operand: SonartraAssessmentPackageV2PredicateOperand) => {
    switch (operand.type) {
      case 'question_answer':
        refs.questionIds.add(operand.questionId)
        break
      case 'dimension_score':
        refs.dimensionIds.add(operand.dimensionId)
        break
      case 'derived_dimension_score':
        refs.derivedDimensionIds.add(operand.derivedDimensionId)
        break
      case 'integrity_flag':
        refs.integrityRuleIds.add(operand.ruleId)
        break
      default:
        break
    }
  }

  const visit = (node: SonartraAssessmentPackageV2PredicateExpression) => {
    if (node.type === 'comparison') {
      visitOperand(node.left)
      if (Array.isArray(node.right)) {
        node.right.forEach(visitOperand)
      } else {
        visitOperand(node.right)
      }
      return
    }

    if (node.type === 'group') {
      node.conditions.forEach(visit)
      return
    }

    visit(node.condition)
  }

  visit(predicate)
  return refs
}

function createExecutableOperand(
  operand: SonartraAssessmentPackageV2PredicateOperand,
  questionsById: Map<string, SonartraAssessmentPackageV2Question>,
  dimensionsById: Map<string, SonartraAssessmentPackageV2ValidatedImport['dimensions'][number]>,
  derivedById: Map<string, SonartraAssessmentPackageV2DerivedDimension>,
): ExecutablePredicateOperand {
  switch (operand.type) {
    case 'question_answer':
      return {
        kind: 'question_answer',
        questionId: operand.questionId,
        questionCode: questionsById.get(operand.questionId)?.code ?? operand.questionId,
      }
    case 'dimension_score':
      return {
        kind: 'dimension_score',
        dimensionId: operand.dimensionId,
        dimensionLabel: dimensionsById.get(operand.dimensionId)?.label ?? operand.dimensionId,
      }
    case 'derived_dimension_score':
      return {
        kind: 'derived_dimension_score',
        derivedDimensionId: operand.derivedDimensionId,
        derivedDimensionLabel: derivedById.get(operand.derivedDimensionId)?.label ?? operand.derivedDimensionId,
      }
    case 'integrity_flag':
      return {
        kind: 'integrity_flag',
        ruleId: operand.ruleId,
      }
    default:
      return {
        kind: 'constant',
        value: operand.value,
      }
  }
}

function compilePredicate(
  predicate: SonartraAssessmentPackageV2PredicateExpression,
  questionsById: Map<string, SonartraAssessmentPackageV2Question>,
  dimensionsById: Map<string, SonartraAssessmentPackageV2ValidatedImport['dimensions'][number]>,
  derivedById: Map<string, SonartraAssessmentPackageV2DerivedDimension>,
): ExecutablePredicate {
  if (predicate.type === 'comparison') {
    return {
      kind: 'comparison',
      operator: predicate.operator,
      left: createExecutableOperand(predicate.left, questionsById, dimensionsById, derivedById),
      right: Array.isArray(predicate.right)
        ? predicate.right.map((operand) => createExecutableOperand(operand, questionsById, dimensionsById, derivedById))
        : createExecutableOperand(predicate.right, questionsById, dimensionsById, derivedById),
    }
  }

  if (predicate.type === 'group') {
    return {
      kind: 'group',
      operator: predicate.operator,
      conditions: predicate.conditions.map((condition) => compilePredicate(condition, questionsById, dimensionsById, derivedById)),
    }
  }

  return {
    kind: 'not',
    condition: compilePredicate(predicate.condition, questionsById, dimensionsById, derivedById),
  }
}

function parseTransformConfig(
  transform: SonartraAssessmentPackageV2ScoringTransform,
  diagnostics: PackageCompileDiagnostic[],
  path: string,
): ExecutableScoringTransform | null {
  const target = {
    level: transform.target.level,
    questionId: transform.target.questionId ?? null,
    dimensionId: transform.target.dimensionId ?? null,
  }

  if (transform.kind === 'reverse_scale') {
    const min = typeof transform.config.min === 'number' ? transform.config.min : null
    const max = typeof transform.config.max === 'number' ? transform.config.max : null
    if (min === null || max === null || min >= max) {
      pushDiagnostic(diagnostics, 'error', 'invalid_transform_config', `${path}.config`, 'reverse_scale transforms require numeric min/max where min is less than max.')
      return null
    }
    return { id: transform.id, kind: 'reverse_scale', target, config: { min, max }, predicate: null }
  }

  if (transform.kind === 'weight_multiplier') {
    const multiplier = typeof transform.config.multiplier === 'number'
      ? transform.config.multiplier
      : typeof transform.config.weight === 'number'
        ? transform.config.weight
        : null
    if (multiplier === null) {
      pushDiagnostic(diagnostics, 'error', 'invalid_transform_config', `${path}.config`, 'weight_multiplier transforms require a numeric multiplier.')
      return null
    }
    return { id: transform.id, kind: 'weight_multiplier', target, config: { multiplier }, predicate: null }
  }

  if (transform.kind === 'value_remap') {
    const candidate = isRecord(transform.config.map) ? transform.config.map : isRecord(transform.config.mapping) ? transform.config.mapping : null
    if (!candidate) {
      pushDiagnostic(diagnostics, 'error', 'invalid_transform_config', `${path}.config`, 'value_remap transforms require a map/mapping object.')
      return null
    }
    const mapping = Object.fromEntries(
      Object.entries(candidate)
        .filter(([, value]) => isPrimitive(value))
        .map(([key, value]) => [key, value as string | number | boolean | null]),
    )
    return { id: transform.id, kind: 'value_remap', target, config: { mapping }, predicate: null }
  }

  const action = transform.config.action
  if (action !== 'add' && action !== 'set' && action !== 'multiply' && action !== 'flag') {
    pushDiagnostic(diagnostics, 'error', 'invalid_transform_config', `${path}.config.action`, 'conditional_score transforms require an add/set/multiply/flag action.')
    return null
  }
  const value = isPrimitive(transform.config.value) ? transform.config.value : null
  return {
    id: transform.id,
    kind: 'conditional_score',
    target,
    config: { action, value },
    predicate: null,
  }
}

function extractFormulaDependencies(
  formula: string | null | undefined,
  rawDimensionIds: Set<string>,
  derivedDimensionIds: Set<string>,
): { raw: Set<string>; derived: Set<string> } {
  const raw = new Set<string>()
  const derived = new Set<string>()
  if (!formula) {
    return { raw, derived }
  }

  const tokens = formula.match(/[A-Za-z_][A-Za-z0-9_-]*/g) ?? []
  for (const token of tokens) {
    if (rawDimensionIds.has(token)) {
      raw.add(token)
    }
    if (derivedDimensionIds.has(token)) {
      derived.add(token)
    }
  }

  return { raw, derived }
}

function topoSortDerivedDimensions(
  derivedDimensions: SonartraAssessmentPackageV2DerivedDimension[],
  diagnostics: PackageCompileDiagnostic[],
): string[] {
  const ids = new Set(derivedDimensions.map((dimension) => dimension.id))
  const graph = new Map<string, Set<string>>()
  const reverseGraph = new Map<string, Set<string>>()
  const indegree = new Map<string, number>()

  for (const dimension of derivedDimensions) {
    const deps = new Set<string>()
    if (dimension.computation.expression) {
      extractPredicateReferences(dimension.computation.expression).derivedDimensionIds.forEach((id) => {
        if (ids.has(id) && id !== dimension.id) {
          deps.add(id)
        }
      })
    }
    extractFormulaDependencies(dimension.computation.formula, new Set(), ids).derived.forEach((id) => {
      if (id !== dimension.id) {
        deps.add(id)
      }
    })
    graph.set(dimension.id, deps)
    indegree.set(dimension.id, deps.size)
    deps.forEach((dep) => {
      const dependants = reverseGraph.get(dep) ?? new Set<string>()
      dependants.add(dimension.id)
      reverseGraph.set(dep, dependants)
    })
  }

  const queue = derivedDimensions.filter((dimension) => (indegree.get(dimension.id) ?? 0) === 0).map((dimension) => dimension.id)
  const ordered: string[] = []

  while (queue.length > 0) {
    const next = queue.shift()!
    ordered.push(next)
    for (const dependant of reverseGraph.get(next) ?? []) {
      const remaining = (indegree.get(dependant) ?? 0) - 1
      indegree.set(dependant, remaining)
      if (remaining === 0) {
        queue.push(dependant)
      }
    }
  }

  if (ordered.length !== derivedDimensions.length) {
    const cycleIds = derivedDimensions
      .map((dimension) => dimension.id)
      .filter((id) => !ordered.includes(id))
      .sort()
    pushDiagnostic(
      diagnostics,
      'error',
      'circular_derived_dimension_dependency',
      'derivedDimensions',
      `Circular derived dimension dependency detected for: ${cycleIds.join(', ')}.`,
    )
  }

  return ordered
}

export function compileAssessmentPackageV2(
  input: SonartraAssessmentPackageV2ValidatedImport,
): PackageCompileResult {
  const diagnostics: PackageCompileDiagnostic[] = []
  const optionSetsById = new Map((input.responseModels.optionSets ?? []).map((optionSet) => [optionSet.id, optionSet]))
  const responseModelsById = new Map(input.responseModels.models.map((model) => [model.id, model]))
  const sectionsById = new Map(input.sections.map((section) => [section.id, section]))
  const questionsById = new Map(input.questions.map((question) => [question.id, question]))
  const dimensionsById = new Map(input.dimensions.map((dimension) => [dimension.id, dimension]))
  const derivedById = new Map(input.derivedDimensions.map((dimension) => [dimension.id, dimension]))

  const compiledTransforms = new Map<string, ExecutableScoringTransform>()
  input.scoring.transforms.forEach((transform, index) => {
    const path = `scoring.transforms[${index}]`
    const compiled = parseTransformConfig(transform, diagnostics, path)
    if (!compiled) {
      return
    }
    if (transform.predicate) {
      compiled.predicate = compilePredicate(transform.predicate, questionsById, dimensionsById, derivedById)
    }
    if (compiled.kind === 'reverse_scale' && compiled.target.questionId) {
      const question = questionsById.get(compiled.target.questionId)
      const responseModel = question?.responseModelId ? responseModelsById.get(question.responseModelId) : null
      const optionValues = [
        ...(responseModel?.optionSetId ? optionSetsById.get(responseModel.optionSetId)?.options ?? [] : []),
        ...(responseModel?.options ?? []),
      ].map((option) => option.value)
      if (optionValues.length > 0 && optionValues.some((value) => typeof value !== 'number')) {
        pushDiagnostic(diagnostics, 'error', 'incompatible_response_scoring', path, `reverse_scale transform "${transform.id}" targets question "${compiled.target.questionId}" without numeric option values.`)
        return
      }
    }
    compiledTransforms.set(transform.id, compiled)
  })

  const compiledScoringRules = new Map<string, ExecutableScoringRule>()
  input.scoring.rules.forEach((rule) => {
    compiledScoringRules.set(rule.id, {
      id: rule.id,
      scope: rule.scope,
      predicate: compilePredicate(rule.predicate, questionsById, dimensionsById, derivedById),
      effect: rule.effect,
    })
  })

  const normalizationRefsByTarget = new Map<string, string[]>()
  const compiledNormalizationRules = new Map<string, ExecutableNormalizationRule>()
  input.normalization.rules.forEach((rule, index) => {
    const path = `normalization.rules[${index}]`
    const appliesToDimensionIds = rule.appliesTo.dimensionIds ?? []
    const appliesToDerivedDimensionIds = rule.appliesTo.derivedDimensionIds ?? []
    if (appliesToDimensionIds.length === 0 && appliesToDerivedDimensionIds.length === 0) {
      pushDiagnostic(diagnostics, 'warning', 'empty_normalization_target', `${path}.appliesTo`, `Normalization rule "${rule.id}" does not target any dimensions.`)
    }
    compiledNormalizationRules.set(rule.id, {
      id: rule.id,
      method: rule.method,
      appliesToDimensionIds,
      appliesToDerivedDimensionIds,
      version: rule.version,
      table: rule.table,
      expression: rule.expression ?? null,
    })
    appliesToDimensionIds.forEach((dimensionId) => {
      normalizationRefsByTarget.set(dimensionId, [...(normalizationRefsByTarget.get(dimensionId) ?? []), rule.id])
    })
    appliesToDerivedDimensionIds.forEach((dimensionId) => {
      normalizationRefsByTarget.set(dimensionId, [...(normalizationRefsByTarget.get(dimensionId) ?? []), rule.id])
    })
  })

  const reportBindingsByKey = new Map<string, ExecutableReportBinding>()
  input.report.content.forEach((binding, index) => {
    const path = `report.content[${index}]`
    if (!binding.contentRef) {
      pushDiagnostic(diagnostics, 'warning', 'missing_report_content_ref', `${path}.contentRef`, `Report binding "${binding.key}" has no contentRef and may not be renderable.`)
    }
    reportBindingsByKey.set(binding.key, {
      key: binding.key,
      label: binding.label,
      contentRef: binding.contentRef ?? null,
      severity: binding.severity ?? null,
      explanation: binding.explanation ?? null,
      outputRuleId: null,
    })
  })

  const compiledIntegrityRules = new Map<string, ExecutableIntegrityRule>()
  input.integrity.rules.forEach((rule) => {
    const refs = extractPredicateReferences(rule.predicate)
    compiledIntegrityRules.set(rule.id, {
      id: rule.id,
      kind: rule.kind,
      severity: rule.severity,
      predicate: compilePredicate(rule.predicate, questionsById, dimensionsById, derivedById),
      affectedQuestionIds: [...refs.questionIds],
      affectedDimensionIds: [...refs.dimensionIds],
      affectedDerivedDimensionIds: [...refs.derivedDimensionIds],
      message: rule.message,
    })
  })

  const outputRefsByTarget = new Map<string, string[]>()
  const compiledOutputRules = new Map<string, ExecutableOutputRule>()
  input.outputs.rules.forEach((rule, index) => {
    const path = `outputs.rules[${index}]`
    const refs = extractPredicateReferences(rule.predicate)
    const targetReportKeys = input.report.content.filter((binding) => binding.key === rule.key).map((binding) => binding.key)
    const narrativeBindingKeys = rule.metadata?.narrativeKey ? [rule.metadata.narrativeKey] : targetReportKeys

    if (narrativeBindingKeys.length === 0) {
      pushDiagnostic(diagnostics, 'warning', 'missing_output_report_binding', path, `Output rule "${rule.id}" does not resolve to any report metadata binding.`)
    }

    narrativeBindingKeys.forEach((bindingKey) => {
      const binding = reportBindingsByKey.get(bindingKey)
      if (!binding) {
        pushDiagnostic(diagnostics, 'error', 'unresolved_report_binding', `${path}.metadata.narrativeKey`, `Output rule "${rule.id}" references missing report binding "${bindingKey}".`)
        return
      }
      binding.outputRuleId = rule.id
    })

    refs.dimensionIds.forEach((dimensionId) => {
      outputRefsByTarget.set(dimensionId, [...(outputRefsByTarget.get(dimensionId) ?? []), rule.id])
    })
    refs.derivedDimensionIds.forEach((dimensionId) => {
      outputRefsByTarget.set(dimensionId, [...(outputRefsByTarget.get(dimensionId) ?? []), rule.id])
    })

    compiledOutputRules.set(rule.id, {
      id: rule.id,
      key: rule.key,
      type: rule.type,
      predicate: compilePredicate(rule.predicate, questionsById, dimensionsById, derivedById),
      severity: rule.severity ?? null,
      band: rule.metadata?.band ?? null,
      narrativeBindingKeys,
      targetReportKeys,
      affectedQuestionIds: [...refs.questionIds],
      affectedDimensionIds: [...refs.dimensionIds],
      affectedDerivedDimensionIds: [...refs.derivedDimensionIds],
    })
  })

  reportBindingsByKey.forEach((binding) => {
    if (!binding.outputRuleId) {
      pushDiagnostic(diagnostics, 'error', 'orphan_report_binding', `report.content.${binding.key}`, `Report binding "${binding.key}" does not map to any output rule.`)
    }
  })

  const executableQuestions: Record<string, ExecutableQuestionNode> = {}
  input.questions.forEach((question, index) => {
    const path = `questions[${index}]`
    const responseModel = question.responseModelId ? responseModelsById.get(question.responseModelId) : question.responseModel ?? null
    if (!responseModel) {
      pushDiagnostic(diagnostics, 'error', 'missing_response_model', `${path}.responseModelId`, `Question "${question.id}" could not resolve a response model.`)
      return
    }
    const scoringBindings = (question.scoring ?? []).map((binding, bindingIndex) => {
      const transformIds = (binding.transformIds ?? []).filter((transformId) => {
        if (compiledTransforms.has(transformId)) {
          return true
        }
        pushDiagnostic(diagnostics, 'error', 'unresolved_transform', `${path}.scoring[${bindingIndex}].transformIds`, `Question "${question.id}" references missing executable transform "${transformId}".`)
        return false
      })
      const ruleIds = (binding.ruleIds ?? []).filter((ruleId) => {
        if (compiledScoringRules.has(ruleId)) {
          return true
        }
        pushDiagnostic(diagnostics, 'error', 'unresolved_scoring_rule', `${path}.scoring[${bindingIndex}].ruleIds`, `Question "${question.id}" references missing executable scoring rule "${ruleId}".`)
        return false
      })
      return {
        dimensionId: binding.dimensionId ?? null,
        transformIds,
        ruleIds,
      }
    })
    executableQuestions[question.id] = {
      id: question.id,
      code: question.code,
      prompt: question.prompt,
      responseModelId: responseModel.id,
      sectionIds: question.sectionIds ?? [],
      scoringBindings,
    }
  })

  const executableDimensions: Record<string, ExecutableDimensionNode> = {}
  input.dimensions.forEach((dimension, index) => {
    const path = `dimensions[${index}]`
    const bindingsFromWeighted = (dimension.weightedQuestions ?? []).map((mapping) => ({
      questionId: mapping.questionId,
      weight: mapping.weight,
      transformIds: [],
      ruleIds: [],
    }))
    const bindingsFromInputs = (dimension.inputQuestionIds ?? []).map((questionId) => ({
      questionId,
      weight: 1,
      transformIds: [],
      ruleIds: [],
    }))
    const bindingsFromQuestionScoring = input.questions.flatMap((question) =>
      (question.scoring ?? [])
        .filter((binding) => binding.dimensionId === dimension.id)
        .map((binding) => ({
          questionId: question.id,
          weight: 1,
          transformIds: binding.transformIds ?? [],
          ruleIds: binding.ruleIds ?? [],
        })))

    const itemBindings = (bindingsFromWeighted.length > 0 ? bindingsFromWeighted : bindingsFromInputs.length > 0 ? bindingsFromInputs : bindingsFromQuestionScoring)
      .filter((binding, bindingIndex, collection) => collection.findIndex((candidate) => candidate.questionId === binding.questionId) === bindingIndex)

    if (itemBindings.length === 0) {
      pushDiagnostic(diagnostics, 'warning', 'dimension_without_items', path, `Dimension "${dimension.id}" has no executable question bindings.`)
    }

    executableDimensions[dimension.id] = {
      id: dimension.id,
      kind: 'raw',
      label: dimension.label,
      scoringMethod: dimension.scoringMethod,
      dependencies: itemBindings.map((binding) => binding.questionId),
      itemBindings,
      missingDataPolicy: dimension.missingDataPolicy ?? null,
      minimumAnswered: dimension.minimumAnswered ?? null,
      transformIds: input.scoring.transforms
        .filter((transform) => transform.target.dimensionId === dimension.id)
        .map((transform) => transform.id)
        .filter((id) => compiledTransforms.has(id)),
      normalizationRuleIds: normalizationRefsByTarget.get(dimension.id) ?? [],
      downstreamOutputRuleIds: outputRefsByTarget.get(dimension.id) ?? [],
    }
  })

  const derivedExecutionOrder = topoSortDerivedDimensions(input.derivedDimensions, diagnostics)
  const rawDimensionIds = new Set(input.dimensions.map((dimension) => dimension.id))
  const derivedDimensionIds = new Set(input.derivedDimensions.map((dimension) => dimension.id))
  const executableDerivedDimensions: Record<string, ExecutableDerivedDimensionNode> = {}
  input.derivedDimensions.forEach((dimension) => {
    const predicateRefs = dimension.computation.expression ? extractPredicateReferences(dimension.computation.expression) : null
    const formulaDeps = extractFormulaDependencies(dimension.computation.formula, rawDimensionIds, derivedDimensionIds)
    const dependencies = [
      ...new Set([
        ...(dimension.computation.sourceDimensionIds ?? []),
        ...(predicateRefs ? [...predicateRefs.dimensionIds, ...predicateRefs.derivedDimensionIds] : []),
        ...formulaDeps.raw,
        ...formulaDeps.derived,
      ]),
    ]
    executableDerivedDimensions[dimension.id] = {
      id: dimension.id,
      kind: 'derived',
      label: dimension.label,
      dependencies,
      computation: {
        method: dimension.computation.method,
        formula: dimension.computation.formula ?? null,
        expression: dimension.computation.expression
          ? compilePredicate(dimension.computation.expression, questionsById, dimensionsById, derivedById)
          : null,
        ruleId: dimension.computation.ruleId ?? null,
      },
      transformIds: input.scoring.transforms
        .filter((transform) => transform.target.dimensionId === dimension.id)
        .map((transform) => transform.id)
        .filter((id) => compiledTransforms.has(id)),
      normalizationRuleIds: normalizationRefsByTarget.get(dimension.id) ?? [],
      downstreamOutputRuleIds: outputRefsByTarget.get(dimension.id) ?? [],
    }
  })

  const errorCount = diagnostics.filter((diagnostic) => diagnostic.severity === 'error').length
  if (errorCount > 0) {
    return {
      ok: false,
      executablePackage: null,
      diagnostics: diagnostics.sort((left, right) =>
        left.severity.localeCompare(right.severity) || left.path.localeCompare(right.path) || left.code.localeCompare(right.code)),
    }
  }

  const executablePackage: ExecutableAssessmentPackageV2 = {
    runtimeVersion: EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION,
    metadata: input.metadata,
    responseModels: {
      optionSetsById: Object.fromEntries(optionSetsById),
      modelsById: Object.fromEntries(responseModelsById),
    },
    sectionsById: Object.fromEntries(sectionsById),
    questionsById: executableQuestions,
    dimensionsById: executableDimensions,
    derivedDimensionsById: executableDerivedDimensions,
    transformsById: Object.fromEntries(compiledTransforms),
    scoringRulesById: Object.fromEntries(compiledScoringRules),
    normalizationRulesById: Object.fromEntries(compiledNormalizationRules),
    integrityRulesById: Object.fromEntries(compiledIntegrityRules),
    outputRulesById: Object.fromEntries(compiledOutputRules),
    reportBindingsByKey: Object.fromEntries(reportBindingsByKey),
    executionPlan: {
      questionIds: input.questions.map((question) => question.id),
      rawDimensionIds: input.dimensions.map((dimension) => dimension.id),
      derivedDimensionIds: derivedExecutionOrder,
      normalizationRuleIds: input.normalization.rules.map((rule) => rule.id),
      integrityRuleIds: input.integrity.rules.map((rule) => rule.id),
      outputRuleIds: input.outputs.rules.map((rule) => rule.id),
    },
  }

  return {
    ok: true,
    executablePackage,
    diagnostics: diagnostics.sort((left, right) =>
      left.severity.localeCompare(right.severity) || left.path.localeCompare(right.path) || left.code.localeCompare(right.code)),
  }
}

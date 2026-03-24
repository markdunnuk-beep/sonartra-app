import type {
  ExecutableAssessmentPackageV2,
  ExecutableDerivedDimensionNode,
  ExecutableDimensionNode,
  ExecutableIntegrityRule,
  ExecutableOutputRule,
  ExecutablePredicate,
  ExecutablePredicateOperand,
} from '@/lib/admin/domain/assessment-package-v2-compiler'
import type { SonartraAssessmentPackageValidationIssue } from '@/lib/admin/domain/assessment-package'

export const COMPILED_RUNTIME_PLAN_V2_VERSION = 'package-runtime-plan-v2/1'

export type RuntimePlanCompilerDiagnosticStage = 'input' | 'reference_resolution' | 'dependency_planning' | 'declaration_normalization'
export type RuntimePlanCompilerDiagnosticSeverity = 'error' | 'warning'
export type RuntimePlanCompilerDiagnosticCode =
  | 'malformed_compiler_input'
  | 'unresolved_reference'
  | 'duplicate_runtime_key'
  | 'invalid_dependency_order'
  | 'cyclic_dependency'
  | 'unsupported_execution_pattern'

export interface RuntimePlanCompilerDiagnostic {
  stage: RuntimePlanCompilerDiagnosticStage
  severity: RuntimePlanCompilerDiagnosticSeverity
  code: RuntimePlanCompilerDiagnosticCode
  path: string
  message: string
}

export interface RuntimePlanDimensionRef {
  kind: 'raw_dimension' | 'derived_dimension'
  id: string
}

export interface CompiledRuntimeQuestionPlan {
  id: string
  code: string
  responseModelId: string
  sectionIds: string[]
}

export interface CompiledRuntimeRawDimensionPlan {
  id: string
  label: string
  scoringMethod: string
  dependencies: Array<{ questionId: string; questionCode: string; weight: number; transformIds: string[]; ruleIds: string[] }>
  normalizationRuleIds: string[]
  downstreamOutputRuleIds: string[]
}

export interface CompiledRuntimeDerivedDimensionPlan {
  id: string
  label: string
  dependencies: RuntimePlanDimensionRef[]
  transformIds: string[]
  normalizationRuleIds: string[]
  downstreamOutputRuleIds: string[]
}

export interface CompiledRuntimeAggregationPlan {
  id: string
  source: RuntimePlanDimensionRef
  strategy: 'raw_dimension_score' | 'derived_dimension_score'
}

export interface CompiledRuntimeScoringInstruction {
  transformId: string
  target: { level: 'item' | 'dimension'; questionId: string | null; dimensionId: string | null }
}

export interface CompiledRuntimeNormalizationInstruction {
  ruleId: string
  target: RuntimePlanDimensionRef
}

export interface CompiledRuntimeIntegrityInstruction {
  ruleId: string
  dependsOnDimensionIds: string[]
  dependsOnDerivedDimensionIds: string[]
  dependsOnIntegrityRuleIds: string[]
}

export interface CompiledRuntimeOutputInstruction {
  ruleId: string
  targetReportKeys: string[]
  dependsOnDimensionIds: string[]
  dependsOnDerivedDimensionIds: string[]
  dependsOnIntegrityRuleIds: string[]
}

export interface CompiledRuntimeExecutionOrder {
  questionIds: string[]
  rawDimensionIds: string[]
  derivedDimensionIds: string[]
  aggregationIds: string[]
  integrityRuleIds: string[]
  outputRuleIds: string[]
}

export interface CompiledRuntimePlanV2 {
  planVersion: typeof COMPILED_RUNTIME_PLAN_V2_VERSION
  runtimeVersion: ExecutableAssessmentPackageV2['runtimeVersion']
  metadata: ExecutableAssessmentPackageV2['metadata']
  itemMap: Record<string, CompiledRuntimeQuestionPlan>
  rawDimensions: Record<string, CompiledRuntimeRawDimensionPlan>
  derivedDimensions: Record<string, CompiledRuntimeDerivedDimensionPlan>
  aggregations: Record<string, CompiledRuntimeAggregationPlan>
  scoringInstructions: CompiledRuntimeScoringInstruction[]
  normalizationInstructions: CompiledRuntimeNormalizationInstruction[]
  integrityInstructions: Record<string, CompiledRuntimeIntegrityInstruction>
  outputInstructions: Record<string, CompiledRuntimeOutputInstruction>
  executionOrder: CompiledRuntimeExecutionOrder
  diagnosticsSummary: {
    errorCount: number
    warningCount: number
    byStage: Record<RuntimePlanCompilerDiagnosticStage, { errorCount: number; warningCount: number }>
  }
  compilationState: 'compiled'
}

export interface CompileRuntimeContractV2Result {
  ok: boolean
  compiledPlan: CompiledRuntimePlanV2 | null
  diagnostics: RuntimePlanCompilerDiagnostic[]
}

function pushDiagnostic(
  diagnostics: RuntimePlanCompilerDiagnostic[],
  entry: RuntimePlanCompilerDiagnostic,
) {
  diagnostics.push(entry)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function sortDiagnostics(diagnostics: RuntimePlanCompilerDiagnostic[]): RuntimePlanCompilerDiagnostic[] {
  return diagnostics.sort((left, right) =>
    left.stage.localeCompare(right.stage)
    || left.severity.localeCompare(right.severity)
    || left.path.localeCompare(right.path)
    || left.code.localeCompare(right.code))
}

function collectPredicateRefs(predicate: ExecutablePredicate): {
  dimensionIds: Set<string>
  derivedDimensionIds: Set<string>
  integrityRuleIds: Set<string>
} {
  const refs = {
    dimensionIds: new Set<string>(),
    derivedDimensionIds: new Set<string>(),
    integrityRuleIds: new Set<string>(),
  }

  const visitOperand = (operand: ExecutablePredicateOperand) => {
    if (operand.kind === 'dimension_score') {
      refs.dimensionIds.add(operand.dimensionId)
      return
    }
    if (operand.kind === 'derived_dimension_score') {
      refs.derivedDimensionIds.add(operand.derivedDimensionId)
      return
    }
    if (operand.kind === 'integrity_flag') {
      refs.integrityRuleIds.add(operand.ruleId)
    }
  }

  const visit = (node: ExecutablePredicate) => {
    if (node.kind === 'comparison') {
      visitOperand(node.left)
      if (Array.isArray(node.right)) {
        node.right.forEach(visitOperand)
      } else {
        visitOperand(node.right)
      }
      return
    }

    if (node.kind === 'group') {
      node.conditions.forEach(visit)
      return
    }

    visit(node.condition)
  }

  visit(predicate)
  return refs
}

function topoSortByDependencyGraph(input: {
  ids: string[]
  dependencyIdsById: Map<string, Set<string>>
  diagnosticPath: string
  cycleMessagePrefix: string
  diagnostics: RuntimePlanCompilerDiagnostic[]
}): string[] {
  const idSet = new Set(input.ids)
  const indegree = new Map<string, number>()
  const reverseEdges = new Map<string, Set<string>>()

  input.ids.forEach((id) => {
    const deps = new Set([...(input.dependencyIdsById.get(id) ?? new Set<string>())].filter((dep) => idSet.has(dep)))
    indegree.set(id, deps.size)
    deps.forEach((depId) => {
      const dependants = reverseEdges.get(depId) ?? new Set<string>()
      dependants.add(id)
      reverseEdges.set(depId, dependants)
    })
  })

  const queue = input.ids.filter((id) => (indegree.get(id) ?? 0) === 0).sort()
  const ordered: string[] = []

  while (queue.length > 0) {
    const next = queue.shift()!
    ordered.push(next)
    for (const dependant of reverseEdges.get(next) ?? []) {
      const remaining = (indegree.get(dependant) ?? 0) - 1
      indegree.set(dependant, remaining)
      if (remaining === 0) {
        queue.push(dependant)
        queue.sort()
      }
    }
  }

  if (ordered.length !== input.ids.length) {
    const cyclicIds = input.ids.filter((id) => !ordered.includes(id)).sort()
    pushDiagnostic(input.diagnostics, {
      stage: 'dependency_planning',
      severity: 'error',
      code: 'cyclic_dependency',
      path: input.diagnosticPath,
      message: `${input.cycleMessagePrefix}: ${cyclicIds.join(', ')}.`,
    })
  }

  return ordered
}

function ensureKnownDimensionRef(
  dependency: RuntimePlanDimensionRef,
  diagnostics: RuntimePlanCompilerDiagnostic[],
  path: string,
  rawDimensionIds: Set<string>,
  derivedDimensionIds: Set<string>,
): boolean {
  if (dependency.kind === 'raw_dimension') {
    if (!rawDimensionIds.has(dependency.id)) {
      pushDiagnostic(diagnostics, {
        stage: 'reference_resolution',
        severity: 'error',
        code: 'unresolved_reference',
        path,
        message: `Unknown raw dimension reference "${dependency.id}".`,
      })
      return false
    }
    return true
  }

  if (!derivedDimensionIds.has(dependency.id)) {
    pushDiagnostic(diagnostics, {
      stage: 'reference_resolution',
      severity: 'error',
      code: 'unresolved_reference',
      path,
      message: `Unknown derived dimension reference "${dependency.id}".`,
    })
    return false
  }
  return true
}

function normalizeDerivedDependencyKinds(
  node: ExecutableDerivedDimensionNode,
  rawDimensionIds: Set<string>,
  derivedDimensionIds: Set<string>,
): RuntimePlanDimensionRef[] {
  return node.dependencies.map((dependencyId) => ({
    kind: derivedDimensionIds.has(dependencyId) && !rawDimensionIds.has(dependencyId) ? 'derived_dimension' : 'raw_dimension',
    id: dependencyId,
  }))
}

function normalizeRuntimeDiagnosticIssues(
  diagnostics: RuntimePlanCompilerDiagnostic[],
): { errors: SonartraAssessmentPackageValidationIssue[]; warnings: SonartraAssessmentPackageValidationIssue[] } {
  return {
    errors: diagnostics
      .filter((entry) => entry.severity === 'error')
      .map((entry) => ({ path: entry.path, message: `[${entry.stage}:${entry.code}] ${entry.message}` })),
    warnings: diagnostics
      .filter((entry) => entry.severity === 'warning')
      .map((entry) => ({ path: entry.path, message: `[${entry.stage}:${entry.code}] ${entry.message}` })),
  }
}

export function compileRuntimeContractV2(input: ExecutableAssessmentPackageV2): CompileRuntimeContractV2Result {
  const diagnostics: RuntimePlanCompilerDiagnostic[] = []

  if (!isRecord(input)) {
    pushDiagnostic(diagnostics, {
      stage: 'input',
      severity: 'error',
      code: 'malformed_compiler_input',
      path: 'package',
      message: 'Runtime contract payload must be an object.',
    })
    return { ok: false, compiledPlan: null, diagnostics }
  }

  const questionIds = Object.keys(input.questionsById ?? {})
  const rawDimensionIdsOrdered = Object.keys(input.dimensionsById ?? {})
  const derivedDimensionIdsOrdered = Object.keys(input.derivedDimensionsById ?? {})
  const integrityRuleIds = Object.keys(input.integrityRulesById ?? {})
  const outputRuleIds = Object.keys(input.outputRulesById ?? {})
  const transformIds = Object.keys(input.transformsById ?? {})
  const scoringRuleIds = Object.keys(input.scoringRulesById ?? {})
  const normalizationRuleIds = Object.keys(input.normalizationRulesById ?? {})

  const rawDimensionIds = new Set(rawDimensionIdsOrdered)
  const derivedDimensionIds = new Set(derivedDimensionIdsOrdered)

  const itemMap = Object.fromEntries(questionIds.map((questionId) => {
    const question = input.questionsById[questionId]
    return [questionId, {
      id: question.id,
      code: question.code,
      responseModelId: question.responseModelId,
      sectionIds: [...question.sectionIds],
    }]
  }))

  const rawDimensions: Record<string, CompiledRuntimeRawDimensionPlan> = {}
  rawDimensionIdsOrdered.forEach((dimensionId) => {
    const dimension: ExecutableDimensionNode = input.dimensionsById[dimensionId]

    const dependencies = dimension.itemBindings.map((binding, index) => {
      const question = input.questionsById[binding.questionId]
      if (!question) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `dimensionsById.${dimensionId}.itemBindings[${index}].questionId`,
          message: `Raw dimension "${dimensionId}" references missing question "${binding.questionId}".`,
        })
      }

      binding.transformIds.forEach((transformId) => {
        if (!input.transformsById[transformId]) {
          pushDiagnostic(diagnostics, {
            stage: 'reference_resolution',
            severity: 'error',
            code: 'unresolved_reference',
            path: `dimensionsById.${dimensionId}.itemBindings[${index}].transformIds`,
            message: `Raw dimension "${dimensionId}" references missing transform "${transformId}".`,
          })
        }
      })

      binding.ruleIds.forEach((ruleId) => {
        if (!input.scoringRulesById[ruleId]) {
          pushDiagnostic(diagnostics, {
            stage: 'reference_resolution',
            severity: 'error',
            code: 'unresolved_reference',
            path: `dimensionsById.${dimensionId}.itemBindings[${index}].ruleIds`,
            message: `Raw dimension "${dimensionId}" references missing scoring rule "${ruleId}".`,
          })
        }
      })

      return {
        questionId: binding.questionId,
        questionCode: question?.code ?? binding.questionId,
        weight: binding.weight,
        transformIds: [...binding.transformIds],
        ruleIds: [...binding.ruleIds],
      }
    })

    dimension.normalizationRuleIds.forEach((ruleId) => {
      if (!input.normalizationRulesById[ruleId]) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `dimensionsById.${dimensionId}.normalizationRuleIds`,
          message: `Raw dimension "${dimensionId}" references missing normalization rule "${ruleId}".`,
        })
      }
    })

    rawDimensions[dimensionId] = {
      id: dimension.id,
      label: dimension.label,
      scoringMethod: dimension.scoringMethod,
      dependencies,
      normalizationRuleIds: [...dimension.normalizationRuleIds],
      downstreamOutputRuleIds: [...dimension.downstreamOutputRuleIds],
    }
  })

  const derivedDimensions: Record<string, CompiledRuntimeDerivedDimensionPlan> = {}
  derivedDimensionIdsOrdered.forEach((derivedDimensionId) => {
    const node = input.derivedDimensionsById[derivedDimensionId]
    const dependencies = normalizeDerivedDependencyKinds(node, rawDimensionIds, derivedDimensionIds)
    dependencies.forEach((dependency, index) => {
      ensureKnownDimensionRef(dependency, diagnostics, `derivedDimensionsById.${derivedDimensionId}.dependencies[${index}]`, rawDimensionIds, derivedDimensionIds)
    })

    node.transformIds.forEach((transformId) => {
      if (!input.transformsById[transformId]) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `derivedDimensionsById.${derivedDimensionId}.transformIds`,
          message: `Derived dimension "${derivedDimensionId}" references missing transform "${transformId}".`,
        })
      }
    })

    node.normalizationRuleIds.forEach((ruleId) => {
      if (!input.normalizationRulesById[ruleId]) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `derivedDimensionsById.${derivedDimensionId}.normalizationRuleIds`,
          message: `Derived dimension "${derivedDimensionId}" references missing normalization rule "${ruleId}".`,
        })
      }
    })

    derivedDimensions[derivedDimensionId] = {
      id: node.id,
      label: node.label,
      dependencies,
      transformIds: [...node.transformIds],
      normalizationRuleIds: [...node.normalizationRuleIds],
      downstreamOutputRuleIds: [...node.downstreamOutputRuleIds],
    }
  })

  const duplicateKeys = [...rawDimensionIdsOrdered.filter((id) => derivedDimensionIds.has(id))]
  if (duplicateKeys.length > 0) {
    pushDiagnostic(diagnostics, {
      stage: 'reference_resolution',
      severity: 'error',
      code: 'duplicate_runtime_key',
      path: 'dimensionsById',
      message: `Raw and derived dimensions share ids: ${duplicateKeys.sort().join(', ')}.`,
    })
  }

  const derivedDepsById = new Map<string, Set<string>>()
  derivedDimensionIdsOrdered.forEach((id) => {
    const deps = new Set<string>()
    derivedDimensions[id].dependencies.forEach((dep) => {
      if (dep.kind === 'derived_dimension') {
        deps.add(dep.id)
      }
    })
    derivedDepsById.set(id, deps)
  })

  const orderedDerivedDimensionIds = topoSortByDependencyGraph({
    ids: derivedDimensionIdsOrdered,
    dependencyIdsById: derivedDepsById,
    diagnosticPath: 'derivedDimensionsById',
    cycleMessagePrefix: 'Cyclic derived dimension dependency detected',
    diagnostics,
  })

  const aggregations: Record<string, CompiledRuntimeAggregationPlan> = {}
  rawDimensionIdsOrdered.forEach((id) => {
    aggregations[`raw:${id}`] = {
      id: `raw:${id}`,
      source: { kind: 'raw_dimension', id },
      strategy: 'raw_dimension_score',
    }
  })
  orderedDerivedDimensionIds.forEach((id) => {
    aggregations[`derived:${id}`] = {
      id: `derived:${id}`,
      source: { kind: 'derived_dimension', id },
      strategy: 'derived_dimension_score',
    }
  })

  const normalizationInstructions: CompiledRuntimeNormalizationInstruction[] = []
  normalizationRuleIds.forEach((ruleId) => {
    const rule = input.normalizationRulesById[ruleId]
    rule.appliesToDimensionIds.forEach((dimensionId) => {
      if (!rawDimensionIds.has(dimensionId)) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `normalizationRulesById.${ruleId}.appliesToDimensionIds`,
          message: `Normalization rule "${ruleId}" references unknown dimension "${dimensionId}".`,
        })
        return
      }
      normalizationInstructions.push({
        ruleId,
        target: { kind: 'raw_dimension', id: dimensionId },
      })
    })
    rule.appliesToDerivedDimensionIds.forEach((dimensionId) => {
      if (!derivedDimensionIds.has(dimensionId)) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `normalizationRulesById.${ruleId}.appliesToDerivedDimensionIds`,
          message: `Normalization rule "${ruleId}" references unknown derived dimension "${dimensionId}".`,
        })
        return
      }
      normalizationInstructions.push({
        ruleId,
        target: { kind: 'derived_dimension', id: dimensionId },
      })
    })
  })

  const integrityInstructions: Record<string, CompiledRuntimeIntegrityInstruction> = {}
  const integrityDepsById = new Map<string, Set<string>>()
  integrityRuleIds.forEach((ruleId) => {
    const rule: ExecutableIntegrityRule = input.integrityRulesById[ruleId]
    const refs = collectPredicateRefs(rule.predicate)

    refs.dimensionIds.forEach((dimensionId) => {
      if (!rawDimensionIds.has(dimensionId)) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `integrityRulesById.${ruleId}.predicate`,
          message: `Integrity rule "${ruleId}" references unknown raw dimension "${dimensionId}".`,
        })
      }
    })

    refs.derivedDimensionIds.forEach((dimensionId) => {
      if (!derivedDimensionIds.has(dimensionId)) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `integrityRulesById.${ruleId}.predicate`,
          message: `Integrity rule "${ruleId}" references unknown derived dimension "${dimensionId}".`,
        })
      }
    })

    refs.integrityRuleIds.forEach((dependencyRuleId) => {
      if (!input.integrityRulesById[dependencyRuleId]) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `integrityRulesById.${ruleId}.predicate`,
          message: `Integrity rule "${ruleId}" references unknown integrity rule "${dependencyRuleId}".`,
        })
      }
    })

    integrityDepsById.set(ruleId, refs.integrityRuleIds)
    integrityInstructions[ruleId] = {
      ruleId,
      dependsOnDimensionIds: [...refs.dimensionIds].sort(),
      dependsOnDerivedDimensionIds: [...refs.derivedDimensionIds].sort(),
      dependsOnIntegrityRuleIds: [...refs.integrityRuleIds].sort(),
    }
  })

  const orderedIntegrityRuleIds = topoSortByDependencyGraph({
    ids: integrityRuleIds,
    dependencyIdsById: integrityDepsById,
    diagnosticPath: 'integrityRulesById',
    cycleMessagePrefix: 'Cyclic integrity dependency detected',
    diagnostics,
  })

  const outputInstructions: Record<string, CompiledRuntimeOutputInstruction> = {}
  const outputDepsById = new Map<string, Set<string>>()
  outputRuleIds.forEach((ruleId) => {
    const rule: ExecutableOutputRule = input.outputRulesById[ruleId]
    const refs = collectPredicateRefs(rule.predicate)

    refs.integrityRuleIds.forEach((dependencyRuleId) => {
      if (!input.integrityRulesById[dependencyRuleId]) {
        pushDiagnostic(diagnostics, {
          stage: 'reference_resolution',
          severity: 'error',
          code: 'unresolved_reference',
          path: `outputRulesById.${ruleId}.predicate`,
          message: `Output rule "${ruleId}" references unknown integrity rule "${dependencyRuleId}".`,
        })
      }
    })

    outputDepsById.set(ruleId, refs.integrityRuleIds)
    outputInstructions[ruleId] = {
      ruleId,
      targetReportKeys: [...rule.targetReportKeys].sort(),
      dependsOnDimensionIds: [...refs.dimensionIds].sort(),
      dependsOnDerivedDimensionIds: [...refs.derivedDimensionIds].sort(),
      dependsOnIntegrityRuleIds: [...refs.integrityRuleIds].sort(),
    }
  })

  const orderedOutputRuleIds = topoSortByDependencyGraph({
    ids: outputRuleIds,
    dependencyIdsById: outputDepsById,
    diagnosticPath: 'outputRulesById',
    cycleMessagePrefix: 'Cyclic output dependency detected',
    diagnostics,
  })

  transformIds.forEach((transformId) => {
    const transform = input.transformsById[transformId]
    if (transform.target.level === 'item' && !transform.target.questionId) {
      pushDiagnostic(diagnostics, {
        stage: 'declaration_normalization',
        severity: 'error',
        code: 'unsupported_execution_pattern',
        path: `transformsById.${transformId}.target.questionId`,
        message: `Transform "${transformId}" targets item level without questionId.`,
      })
    }
    if (transform.target.level === 'dimension' && !transform.target.dimensionId) {
      pushDiagnostic(diagnostics, {
        stage: 'declaration_normalization',
        severity: 'error',
        code: 'unsupported_execution_pattern',
        path: `transformsById.${transformId}.target.dimensionId`,
        message: `Transform "${transformId}" targets dimension level without dimensionId.`,
      })
    }
  })

  const scoringInstructions: CompiledRuntimeScoringInstruction[] = transformIds
    .sort()
    .map((transformId) => ({
      transformId,
      target: {
        level: input.transformsById[transformId].target.level,
        questionId: input.transformsById[transformId].target.questionId,
        dimensionId: input.transformsById[transformId].target.dimensionId,
      },
    }))

  scoringRuleIds.forEach((ruleId) => {
    const rule = input.scoringRulesById[ruleId]
    if (!rule.effect.targetId) {
      pushDiagnostic(diagnostics, {
        stage: 'declaration_normalization',
        severity: 'error',
        code: 'malformed_compiler_input',
        path: `scoringRulesById.${ruleId}.effect.targetId`,
        message: `Scoring rule "${ruleId}" is missing effect.targetId.`,
      })
    }
  })

  const sortedDiagnostics = sortDiagnostics(diagnostics)
  const errorCount = sortedDiagnostics.filter((entry) => entry.severity === 'error').length

  if (errorCount > 0) {
    return {
      ok: false,
      compiledPlan: null,
      diagnostics: sortedDiagnostics,
    }
  }

  const executionOrder: CompiledRuntimeExecutionOrder = {
    questionIds: [...(input.executionPlan.questionIds ?? questionIds)],
    rawDimensionIds: [...(input.executionPlan.rawDimensionIds ?? rawDimensionIdsOrdered)],
    derivedDimensionIds: orderedDerivedDimensionIds,
    aggregationIds: Object.keys(aggregations).sort(),
    integrityRuleIds: orderedIntegrityRuleIds,
    outputRuleIds: orderedOutputRuleIds,
  }

  executionOrder.rawDimensionIds.forEach((dimensionId, index) => {
    if (!rawDimensionIds.has(dimensionId)) {
      pushDiagnostic(diagnostics, {
        stage: 'dependency_planning',
        severity: 'error',
        code: 'invalid_dependency_order',
        path: `executionOrder.rawDimensionIds[${index}]`,
        message: `Execution order references unknown raw dimension "${dimensionId}".`,
      })
    }
  })

  const diagnosticsSummary: CompiledRuntimePlanV2['diagnosticsSummary'] = {
    errorCount: 0,
    warningCount: 0,
    byStage: {
      input: { errorCount: 0, warningCount: 0 },
      reference_resolution: { errorCount: 0, warningCount: 0 },
      dependency_planning: { errorCount: 0, warningCount: 0 },
      declaration_normalization: { errorCount: 0, warningCount: 0 },
    },
  }

  const finalizedDiagnostics = sortDiagnostics(diagnostics)
  finalizedDiagnostics.forEach((diagnostic) => {
    if (diagnostic.severity === 'error') {
      diagnosticsSummary.errorCount += 1
      diagnosticsSummary.byStage[diagnostic.stage].errorCount += 1
      return
    }

    diagnosticsSummary.warningCount += 1
    diagnosticsSummary.byStage[diagnostic.stage].warningCount += 1
  })

  return {
    ok: diagnosticsSummary.errorCount === 0,
    compiledPlan: {
      planVersion: COMPILED_RUNTIME_PLAN_V2_VERSION,
      runtimeVersion: input.runtimeVersion,
      metadata: input.metadata,
      itemMap,
      rawDimensions,
      derivedDimensions,
      aggregations,
      scoringInstructions,
      normalizationInstructions: normalizationInstructions.sort((left, right) =>
        left.ruleId.localeCompare(right.ruleId) || left.target.id.localeCompare(right.target.id)),
      integrityInstructions,
      outputInstructions,
      executionOrder,
      diagnosticsSummary,
      compilationState: 'compiled',
    },
    diagnostics: finalizedDiagnostics,
  }
}

export function compileRuntimeContractV2DiagnosticsToIssues(
  diagnostics: RuntimePlanCompilerDiagnostic[],
): { errors: SonartraAssessmentPackageValidationIssue[]; warnings: SonartraAssessmentPackageValidationIssue[] } {
  return normalizeRuntimeDiagnosticIssues(diagnostics)
}

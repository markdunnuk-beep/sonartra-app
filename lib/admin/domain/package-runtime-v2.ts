import type {
  PackageContractV2Canonical,
  PackageContractV2NormalizationGroup,
} from '@/lib/admin/domain/package-contract-v2-canonical'
import type {
  SonartraAssessmentPackageV2IntegrityRule,
  SonartraAssessmentPackageV2NormalizationRule,
  SonartraAssessmentPackageV2PredicateExpression,
  SonartraAssessmentPackageV2ValidationIssue,
} from '@/lib/admin/domain/assessment-package-v2'
import { normalizeCanonicalPackageContractV2 } from '@/lib/admin/domain/package-contract-v2-canonical'
import { isRecord } from '@/lib/admin/domain/assessment-package-content'

export const SONARTRA_EXECUTABLE_RUNTIME_PACKAGE_V2_SCHEMA = 'sonartra-assessment-runtime-package/v2'

export interface RuntimeContractV2Metadata {
  packageSlug: string
  versionLabel: string
  assessmentId: string
  assessmentSlug: string
  title: string
  packageContractVersion: '2'
  runtimeSchemaVersion: typeof SONARTRA_EXECUTABLE_RUNTIME_PACKAGE_V2_SCHEMA
}

export interface RuntimeContractV2Section {
  id: string
  title: string
  order: number
}

export interface RuntimeContractV2Option {
  id: string
  label: string
  order: number
}

export interface RuntimeContractV2Question {
  id: string
  code: string
  prompt: string
  sectionId: string
  order: number
  questionType: 'single_select'
  options: RuntimeContractV2Option[]
  tags: string[]
}

export interface RuntimeContractV2RawDimension {
  id: string
  label: string
  order: number
  groupId: string | null
  family: string | null
}

export interface RuntimeContractV2DimensionInput {
  dimensionId: string
  weight: number
}

export interface RuntimeContractV2DerivedDimension {
  id: string
  label: string
  order: number
  method: 'weighted_average' | 'sum'
  inputs: RuntimeContractV2DimensionInput[]
  dependencies: string[]
}

export interface RuntimeContractV2DimensionGroup {
  id: string
  label: string
  dimensionIds: string[]
}

export interface RuntimeContractV2ScoringContribution {
  dimensionId: string
  weight: number
}

export interface RuntimeContractV2ScoringInstruction {
  questionId: string
  optionId: string
  contributions: RuntimeContractV2ScoringContribution[]
}

export interface RuntimeContractV2NormalizationGroup {
  id: string
  label: string
  dimensionIds: string[]
  derivedDimensionIds: string[]
  displayGroupId: string | null
  rankingGroupId: string | null
  comparisonOrder: string[]
}

export interface RuntimeContractV2AggregationComparableGroup {
  id: string
  label: string
  dimensionIds: string[]
  derivedDimensionIds: string[]
  comparisonBasis: 'shared_scale' | 'shared_construct'
}

export interface RuntimeContractV2AggregationDistributionGroup {
  id: string
  label: string
  dimensionIds: string[]
  derivedDimensionIds: string[]
}

export interface RuntimeContractV2AggregationRollupHint {
  id: string
  label: string
  comparableGroupId: string | null
  distributionGroupId: string | null
  teamRollup: 'mean' | 'median' | 'distribution'
}

export interface RuntimeContractV2IntegrityRule {
  id: string
  kind: SonartraAssessmentPackageV2IntegrityRule['kind']
  severity: SonartraAssessmentPackageV2IntegrityRule['severity']
  predicate: SonartraAssessmentPackageV2PredicateExpression
  message: string
  affectedQuestionIds: string[]
  affectedDimensionIds: string[]
  affectedDerivedDimensionIds: string[]
}

export interface RuntimeContractV2OutputRule {
  id: string
  key: string
  label: string
  type: 'summary' | 'warning' | 'flag' | 'report_section' | 'recommendation'
  predicate: SonartraAssessmentPackageV2PredicateExpression
  severity: 'info' | 'warning' | 'critical' | null
  metadata: {
    narrativeKey: string | null
    targetReportKey: string | null
  }
  integrityRuleIds: string[]
  affectedQuestionIds: string[]
  affectedDimensionIds: string[]
  affectedDerivedDimensionIds: string[]
}

export interface RuntimeContractV2 {
  contractKind: 'runtime_v2'
  packageVersion: '2'
  metadata: RuntimeContractV2Metadata
  itemBank: {
    sections: RuntimeContractV2Section[]
    questions: RuntimeContractV2Question[]
  }
  dimensions: {
    raw: RuntimeContractV2RawDimension[]
    derived: RuntimeContractV2DerivedDimension[]
    groups: RuntimeContractV2DimensionGroup[]
  }
  scoring: {
    instructions: RuntimeContractV2ScoringInstruction[]
  }
  integrity: {
    rules: RuntimeContractV2IntegrityRule[]
  }
  normalization: {
    groups: RuntimeContractV2NormalizationGroup[]
    rules: SonartraAssessmentPackageV2NormalizationRule[]
  }
  aggregation: {
    comparableGroups: RuntimeContractV2AggregationComparableGroup[]
    distributionGroups: RuntimeContractV2AggregationDistributionGroup[]
    rollupHints: RuntimeContractV2AggregationRollupHint[]
  }
  outputs: {
    rules: RuntimeContractV2OutputRule[]
    reportBindings: Array<{
      key: string
      label: string
      contentRef: string | null
      audience: 'individual' | 'team' | 'org' | 'internal' | null
      severity: string | null
      explanation: string | null
    }>
  }
  diagnostics?: {
    sourceSchema: string
    compileWarnings: string[]
  }
}

export interface RuntimeContractV2ValidationResult {
  ok: boolean
  errors: SonartraAssessmentPackageV2ValidationIssue[]
  warnings: SonartraAssessmentPackageV2ValidationIssue[]
  runtimePackage: RuntimeContractV2 | null
}

export interface CanonicalToRuntimeV2CompileResult {
  ok: boolean
  errors: SonartraAssessmentPackageV2ValidationIssue[]
  warnings: SonartraAssessmentPackageV2ValidationIssue[]
  runtimePackage: RuntimeContractV2 | null
}

function asTrimmedString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => asTrimmedString(entry)).filter((entry): entry is string => Boolean(entry))
    : []
}

function pushIssue(collection: SonartraAssessmentPackageV2ValidationIssue[], path: string, message: string) {
  collection.push({ path, message })
}

function toNormalizationGroup(group: PackageContractV2NormalizationGroup): RuntimeContractV2NormalizationGroup {
  return {
    id: group.id,
    label: group.label,
    dimensionIds: group.dimensionKeys ?? [],
    derivedDimensionIds: group.derivedDimensionKeys ?? [],
    displayGroupId: group.displayGroupKey ?? null,
    rankingGroupId: group.rankingGroupKey ?? null,
    comparisonOrder: group.comparisonOrder ?? [],
  }
}

export function isRuntimeContractV2(input: unknown): input is RuntimeContractV2 {
  return isRecord(input)
    && input.contractKind === 'runtime_v2'
    && input.packageVersion === '2'
    && isRecord(input.metadata)
    && input.metadata.runtimeSchemaVersion === SONARTRA_EXECUTABLE_RUNTIME_PACKAGE_V2_SCHEMA
}

export function validateRuntimeContractV2(input: unknown): RuntimeContractV2ValidationResult {
  const errors: SonartraAssessmentPackageV2ValidationIssue[] = []
  const warnings: SonartraAssessmentPackageV2ValidationIssue[] = []

  if (!isRecord(input)) {
    pushIssue(errors, 'package', 'Runtime package must be an object.')
    return { ok: false, errors, warnings, runtimePackage: null }
  }

  if (input.contractKind !== 'runtime_v2') {
    pushIssue(errors, 'contractKind', 'Runtime package must declare contractKind "runtime_v2".')
  }
  if (input.packageVersion !== '2') {
    pushIssue(errors, 'packageVersion', 'Runtime package must declare packageVersion "2".')
  }

  const metadata = isRecord(input.metadata) ? input.metadata : null
  if (!metadata) {
    pushIssue(errors, 'metadata', 'Runtime metadata is required.')
  }

  if (metadata?.runtimeSchemaVersion !== SONARTRA_EXECUTABLE_RUNTIME_PACKAGE_V2_SCHEMA) {
    pushIssue(errors, 'metadata.runtimeSchemaVersion', `Runtime schemaVersion must be "${SONARTRA_EXECUTABLE_RUNTIME_PACKAGE_V2_SCHEMA}".`)
  }

  const sectionsInput = isRecord(input.itemBank) && Array.isArray(input.itemBank.sections) ? input.itemBank.sections : []
  const questionsInput = isRecord(input.itemBank) && Array.isArray(input.itemBank.questions) ? input.itemBank.questions : []
  const rawDimensionsInput = isRecord(input.dimensions) && Array.isArray(input.dimensions.raw) ? input.dimensions.raw : []
  const derivedDimensionsInput = isRecord(input.dimensions) && Array.isArray(input.dimensions.derived) ? input.dimensions.derived : []
  const groupsInput = isRecord(input.dimensions) && Array.isArray(input.dimensions.groups) ? input.dimensions.groups : []
  const scoringInput = isRecord(input.scoring) && Array.isArray(input.scoring.instructions) ? input.scoring.instructions : []
  const integrityRulesInput = isRecord(input.integrity) && Array.isArray(input.integrity.rules) ? input.integrity.rules : []
  const normalizationGroupsInput = isRecord(input.normalization) && Array.isArray(input.normalization.groups) ? input.normalization.groups : []
  const normalizationRulesInput = isRecord(input.normalization) && Array.isArray(input.normalization.rules) ? input.normalization.rules : []
  const comparableGroupsInput = isRecord(input.aggregation) && Array.isArray(input.aggregation.comparableGroups) ? input.aggregation.comparableGroups : []
  const distributionGroupsInput = isRecord(input.aggregation) && Array.isArray(input.aggregation.distributionGroups) ? input.aggregation.distributionGroups : []
  const rollupHintsInput = isRecord(input.aggregation) && Array.isArray(input.aggregation.rollupHints) ? input.aggregation.rollupHints : []
  const outputRulesInput = isRecord(input.outputs) && Array.isArray(input.outputs.rules) ? input.outputs.rules : []
  const outputBindingsInput = isRecord(input.outputs) && Array.isArray(input.outputs.reportBindings) ? input.outputs.reportBindings : []

  const sectionIds = new Set<string>()
  for (const [index, section] of sectionsInput.entries()) {
    const path = `itemBank.sections[${index}]`
    if (!isRecord(section)) {
      pushIssue(errors, path, 'Sections must be objects.')
      continue
    }
    const id = asTrimmedString(section.id)
    const title = asTrimmedString(section.title)
    const order = asFiniteNumber(section.order)
    if (!id) pushIssue(errors, `${path}.id`, 'Section id is required.')
    if (!title) pushIssue(errors, `${path}.title`, 'Section title is required.')
    if (order === null) pushIssue(errors, `${path}.order`, 'Section order must be numeric.')
    if (id && sectionIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate section id "${id}".`)
    if (id) sectionIds.add(id)
  }

  const questionIds = new Set<string>()
  const questionOptionIds = new Map<string, Set<string>>()
  for (const [index, question] of questionsInput.entries()) {
    const path = `itemBank.questions[${index}]`
    if (!isRecord(question)) {
      pushIssue(errors, path, 'Questions must be objects.')
      continue
    }
    const questionId = asTrimmedString(question.id)
    const sectionId = asTrimmedString(question.sectionId)
    if (!questionId) pushIssue(errors, `${path}.id`, 'Question id is required.')
    if (questionId && questionIds.has(questionId)) pushIssue(errors, `${path}.id`, `Duplicate question id "${questionId}".`)
    if (questionId) questionIds.add(questionId)
    if (!sectionId || !sectionIds.has(sectionId)) pushIssue(errors, `${path}.sectionId`, `Unknown section reference "${sectionId}".`)
    if (question.questionType !== 'single_select') pushIssue(errors, `${path}.questionType`, 'Only single_select questions are currently supported in runtime v2.')

    const options = Array.isArray(question.options) ? question.options : []
    if (options.length === 0) pushIssue(errors, `${path}.options`, 'Question options are required.')
    const optionIds = new Set<string>()
    for (const [optionIndex, option] of options.entries()) {
      const optionPath = `${path}.options[${optionIndex}]`
      if (!isRecord(option)) {
        pushIssue(errors, optionPath, 'Question options must be objects.')
        continue
      }
      const optionId = asTrimmedString(option.id)
      if (!optionId) pushIssue(errors, `${optionPath}.id`, 'Option id is required.')
      if (optionId && optionIds.has(optionId)) pushIssue(errors, `${optionPath}.id`, `Duplicate option id "${optionId}" within question.`)
      if (optionId) optionIds.add(optionId)
    }
    if (questionId) questionOptionIds.set(questionId, optionIds)
  }

  const rawDimensionIds = new Set<string>()
  for (const [index, dimension] of rawDimensionsInput.entries()) {
    const path = `dimensions.raw[${index}]`
    if (!isRecord(dimension)) {
      pushIssue(errors, path, 'Raw dimensions must be objects.')
      continue
    }
    const id = asTrimmedString(dimension.id)
    if (!id) pushIssue(errors, `${path}.id`, 'Raw dimension id is required.')
    if (id && rawDimensionIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate raw dimension id "${id}".`)
    if (id) rawDimensionIds.add(id)
  }

  const derivedDimensionIds = new Set<string>()
  for (const [index, derived] of derivedDimensionsInput.entries()) {
    const path = `dimensions.derived[${index}]`
    if (!isRecord(derived)) {
      pushIssue(errors, path, 'Derived dimensions must be objects.')
      continue
    }
    const id = asTrimmedString(derived.id)
    const method = asTrimmedString(derived.method)
    const inputs = Array.isArray(derived.inputs) ? derived.inputs : []
    if (!id) pushIssue(errors, `${path}.id`, 'Derived dimension id is required.')
    if (id && derivedDimensionIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate derived dimension id "${id}".`)
    if (id && rawDimensionIds.has(id)) pushIssue(errors, `${path}.id`, `Derived dimension id "${id}" conflicts with raw dimension id.`)
    if (id) derivedDimensionIds.add(id)
    if (!method || !['weighted_average', 'sum'].includes(method)) pushIssue(errors, `${path}.method`, 'Derived dimension method must be weighted_average or sum.')
    if (inputs.length === 0) pushIssue(errors, `${path}.inputs`, 'Derived dimensions require at least one input.')

    for (const [inputIndex, inputEntry] of inputs.entries()) {
      const inputPath = `${path}.inputs[${inputIndex}]`
      if (!isRecord(inputEntry)) {
        pushIssue(errors, inputPath, 'Derived dimension inputs must be objects.')
        continue
      }
      const dimensionId = asTrimmedString(inputEntry.dimensionId)
      if (!dimensionId || !rawDimensionIds.has(dimensionId)) {
        pushIssue(errors, `${inputPath}.dimensionId`, `Unknown raw dimension reference "${dimensionId}".`)
      }
      if (asFiniteNumber(inputEntry.weight) === null) {
        pushIssue(errors, `${inputPath}.weight`, 'Derived dimension input weight must be numeric.')
      }
    }
  }

  for (const [index, group] of groupsInput.entries()) {
    const path = `dimensions.groups[${index}]`
    if (!isRecord(group)) {
      pushIssue(errors, path, 'Dimension groups must be objects.')
      continue
    }
    for (const ref of asStringArray(group.dimensionIds)) {
      if (!rawDimensionIds.has(ref)) {
        pushIssue(errors, `${path}.dimensionIds`, `Unknown raw dimension reference "${ref}".`)
      }
    }
  }

  const scoringKeys = new Set<string>()
  for (const [index, instruction] of scoringInput.entries()) {
    const path = `scoring.instructions[${index}]`
    if (!isRecord(instruction)) {
      pushIssue(errors, path, 'Scoring instructions must be objects.')
      continue
    }
    const questionId = asTrimmedString(instruction.questionId)
    const optionId = asTrimmedString(instruction.optionId)
    if (!questionId || !questionIds.has(questionId)) pushIssue(errors, `${path}.questionId`, `Unknown question reference "${questionId}".`)
    if (!optionId || !questionOptionIds.get(questionId ?? '')?.has(optionId)) pushIssue(errors, `${path}.optionId`, `Unknown option reference "${optionId}" for question "${questionId}".`)
    const key = `${questionId ?? ''}::${optionId ?? ''}`
    if (scoringKeys.has(key)) pushIssue(errors, path, `Duplicate scoring instruction for ${key}.`)
    scoringKeys.add(key)

    const contributions = Array.isArray(instruction.contributions) ? instruction.contributions : []
    if (contributions.length === 0) pushIssue(errors, `${path}.contributions`, 'Scoring instruction contributions are required.')
    const targetIds = new Set<string>()
    for (const [targetIndex, target] of contributions.entries()) {
      const targetPath = `${path}.contributions[${targetIndex}]`
      if (!isRecord(target)) {
        pushIssue(errors, targetPath, 'Scoring contributions must be objects.')
        continue
      }
      const dimensionId = asTrimmedString(target.dimensionId)
      const weight = asFiniteNumber(target.weight)
      if (!dimensionId || !rawDimensionIds.has(dimensionId)) pushIssue(errors, `${targetPath}.dimensionId`, `Unknown raw dimension reference "${dimensionId}".`)
      if (weight === null) pushIssue(errors, `${targetPath}.weight`, 'Scoring contribution weight must be numeric.')
      if (dimensionId && targetIds.has(dimensionId)) pushIssue(errors, `${targetPath}.dimensionId`, `Duplicate contribution target "${dimensionId}" in one instruction.`)
      if (dimensionId) targetIds.add(dimensionId)
    }
  }

  for (const [index, group] of normalizationGroupsInput.entries()) {
    const path = `normalization.groups[${index}]`
    if (!isRecord(group)) {
      pushIssue(errors, path, 'Normalization groups must be objects.')
      continue
    }
    for (const ref of asStringArray(group.dimensionIds)) {
      if (!rawDimensionIds.has(ref)) pushIssue(errors, `${path}.dimensionIds`, `Unknown raw dimension reference "${ref}".`)
    }
    for (const ref of asStringArray(group.derivedDimensionIds)) {
      if (!derivedDimensionIds.has(ref)) pushIssue(errors, `${path}.derivedDimensionIds`, `Unknown derived dimension reference "${ref}".`)
    }
  }

  const outputBindingKeys = new Set<string>()
  for (const [index, binding] of outputBindingsInput.entries()) {
    const path = `outputs.reportBindings[${index}]`
    if (!isRecord(binding)) {
      pushIssue(errors, path, 'Output report bindings must be objects.')
      continue
    }
    const key = asTrimmedString(binding.key)
    if (!key) pushIssue(errors, `${path}.key`, 'Output report binding key is required.')
    if (key && outputBindingKeys.has(key)) pushIssue(errors, `${path}.key`, `Duplicate output report binding key "${key}".`)
    if (key) outputBindingKeys.add(key)
  }

  const integrityRuleIds = new Set<string>()
  for (const rule of integrityRulesInput) {
    if (isRecord(rule) && asTrimmedString(rule.id)) {
      integrityRuleIds.add(rule.id as string)
    }
  }

  for (const [index, rule] of outputRulesInput.entries()) {
    const path = `outputs.rules[${index}]`
    if (!isRecord(rule)) {
      pushIssue(errors, path, 'Output rules must be objects.')
      continue
    }
    const metadata = isRecord(rule.metadata) ? rule.metadata : null
    const targetKey = metadata ? asTrimmedString(metadata.targetReportKey) : null
    if (targetKey && !outputBindingKeys.has(targetKey)) {
      pushIssue(errors, `${path}.metadata.targetReportKey`, `Unknown report binding key "${targetKey}".`)
    }
    const affectedDimensionIds = Array.isArray(rule.affectedDimensionIds) ? rule.affectedDimensionIds : []
    for (const ref of affectedDimensionIds) {
      if (!rawDimensionIds.has(ref)) pushIssue(errors, `${path}.affectedDimensionIds`, `Unknown raw dimension reference "${String(ref)}".`)
    }
    const affectedDerivedIds = Array.isArray(rule.affectedDerivedDimensionIds) ? rule.affectedDerivedDimensionIds : []
    for (const ref of affectedDerivedIds) {
      if (!derivedDimensionIds.has(ref)) pushIssue(errors, `${path}.affectedDerivedDimensionIds`, `Unknown derived dimension reference "${String(ref)}".`)
    }
    const refs = Array.isArray(rule.integrityRuleIds) ? rule.integrityRuleIds : []
    for (const ref of refs) {
      if (!integrityRuleIds.has(String(ref))) pushIssue(errors, `${path}.integrityRuleIds`, `Unknown integrity rule reference "${String(ref)}".`)
    }
  }

  for (const [index, rule] of normalizationRulesInput.entries()) {
    const path = `normalization.rules[${index}]`
    if (!isRecord(rule) || !isRecord(rule.appliesTo)) {
      pushIssue(errors, path, 'Normalization rules must include appliesTo metadata.')
      continue
    }
    const dimensionIds = asStringArray(rule.appliesTo.dimensionIds)
    const derivedIds = asStringArray(rule.appliesTo.derivedDimensionIds)
    if (dimensionIds.length === 0 && derivedIds.length === 0) {
      pushIssue(errors, `${path}.appliesTo`, 'Normalization rule must target dimensions and/or derived dimensions.')
    }
    for (const ref of dimensionIds) {
      if (!rawDimensionIds.has(ref)) pushIssue(errors, `${path}.appliesTo.dimensionIds`, `Unknown raw dimension reference "${ref}".`)
    }
    for (const ref of derivedIds) {
      if (!derivedDimensionIds.has(ref)) pushIssue(errors, `${path}.appliesTo.derivedDimensionIds`, `Unknown derived dimension reference "${ref}".`)
    }
  }

  for (const [index, group] of comparableGroupsInput.entries()) {
    const path = `aggregation.comparableGroups[${index}]`
    if (!isRecord(group)) {
      pushIssue(errors, path, 'Comparable groups must be objects.')
      continue
    }
    for (const ref of [...asStringArray(group.dimensionIds), ...asStringArray(group.derivedDimensionIds)]) {
      if (!rawDimensionIds.has(ref) && !derivedDimensionIds.has(ref)) {
        pushIssue(errors, `${path}.dimensionIds`, `Unknown dimension reference "${ref}".`)
      }
    }
  }

  for (const [index, group] of distributionGroupsInput.entries()) {
    const path = `aggregation.distributionGroups[${index}]`
    if (!isRecord(group)) {
      pushIssue(errors, path, 'Distribution groups must be objects.')
      continue
    }
    for (const ref of [...asStringArray(group.dimensionIds), ...asStringArray(group.derivedDimensionIds)]) {
      if (!rawDimensionIds.has(ref) && !derivedDimensionIds.has(ref)) {
        pushIssue(errors, `${path}.dimensionIds`, `Unknown dimension reference "${ref}".`)
      }
    }
  }

  const comparableIds = new Set(asStringArray(comparableGroupsInput.map((entry) => isRecord(entry) ? entry.id : null)))
  const distributionIds = new Set(asStringArray(distributionGroupsInput.map((entry) => isRecord(entry) ? entry.id : null)))

  for (const [index, hint] of rollupHintsInput.entries()) {
    const path = `aggregation.rollupHints[${index}]`
    if (!isRecord(hint)) {
      pushIssue(errors, path, 'Rollup hints must be objects.')
      continue
    }
    const comparableId = asTrimmedString(hint.comparableGroupId)
    const distributionId = asTrimmedString(hint.distributionGroupId)
    if (comparableId && !comparableIds.has(comparableId)) pushIssue(errors, `${path}.comparableGroupId`, `Unknown comparable group reference "${comparableId}".`)
    if (distributionId && !distributionIds.has(distributionId)) pushIssue(errors, `${path}.distributionGroupId`, `Unknown distribution group reference "${distributionId}".`)
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    runtimePackage: errors.length === 0 ? (input as unknown as RuntimeContractV2) : null,
  }
}

function sortByOrder<T extends { order: number }>(entries: T[]): T[] {
  return entries.slice().sort((left, right) => left.order - right.order)
}

function sortedScoringInstructions(canonical: PackageContractV2Canonical): RuntimeContractV2ScoringInstruction[] {
  return canonical.scoring.optionMappings
    .map((entry) => ({
      questionId: entry.questionId,
      optionId: entry.optionId,
      contributions: entry.targets
        .map((target) => ({ dimensionId: target.dimensionKey, weight: target.weight }))
        .sort((left, right) => left.dimensionId.localeCompare(right.dimensionId)),
    }))
    .sort((left, right) => {
      const leftKey = `${left.questionId}::${left.optionId}`
      const rightKey = `${right.questionId}::${right.optionId}`
      return leftKey.localeCompare(rightKey)
    })
}

function toRuntimeOutputRule(rule: RuntimeContractV2OutputRule): RuntimeContractV2OutputRule {
  return {
    ...rule,
    affectedQuestionIds: [...(rule.affectedQuestionIds ?? [])].sort(),
    affectedDimensionIds: [...(rule.affectedDimensionIds ?? [])].sort(),
    affectedDerivedDimensionIds: [...(rule.affectedDerivedDimensionIds ?? [])].sort(),
    integrityRuleIds: [...(rule.integrityRuleIds ?? [])].sort(),
  }
}

function toRuntimePredicate(predicate: SonartraAssessmentPackageV2PredicateExpression): SonartraAssessmentPackageV2PredicateExpression {
  if (predicate.type === 'comparison') {
    return {
      ...predicate,
      right: Array.isArray(predicate.right) ? predicate.right.slice() : predicate.right,
    }
  }

  if (predicate.type === 'group') {
    return {
      ...predicate,
      conditions: predicate.conditions.map((entry) => toRuntimePredicate(entry)),
    }
  }

  return {
    type: 'not',
    condition: toRuntimePredicate(predicate.condition),
  }
}

export function compileCanonicalToRuntimeContractV2(input: unknown): CanonicalToRuntimeV2CompileResult {
  const canonicalNormalization = normalizeCanonicalPackageContractV2(input)
  if (!canonicalNormalization) {
    return {
      ok: false,
      errors: [{ path: 'package', message: 'Input payload is not a canonical package-contract-v2 object.' }],
      warnings: [],
      runtimePackage: null,
    }
  }

  if (!canonicalNormalization.ok || !isRecord(input)) {
    return {
      ok: false,
      errors: canonicalNormalization.errors,
      warnings: canonicalNormalization.warnings,
      runtimePackage: null,
    }
  }

  const canonical = input as unknown as PackageContractV2Canonical

  const runtimePackage: RuntimeContractV2 = {
    contractKind: 'runtime_v2',
    packageVersion: '2',
    metadata: {
      packageSlug: canonical.identity.slug,
      versionLabel: canonical.identity.versionLabel,
      assessmentId: canonical.identity.assessmentKey,
      assessmentSlug: canonical.identity.slug,
      title: canonical.identity.title,
      packageContractVersion: '2',
      runtimeSchemaVersion: SONARTRA_EXECUTABLE_RUNTIME_PACKAGE_V2_SCHEMA,
    },
    itemBank: {
      sections: sortByOrder(canonical.structure.sections).map((section) => ({
        id: section.id,
        title: section.title,
        order: section.order,
      })),
      questions: sortByOrder(canonical.structure.questions).map((question) => ({
        id: question.id,
        code: question.key,
        prompt: question.text,
        sectionId: question.sectionId,
        order: question.order,
        questionType: question.type,
        options: question.options
          .slice()
          .sort((left, right) => left.order - right.order)
          .map((option) => ({
            id: option.id,
            label: option.label,
            order: option.order,
          })),
        tags: [...(question.tags ?? [])],
      })),
    },
    dimensions: {
      raw: sortByOrder(canonical.dimensionCatalog.dimensions).map((dimension) => ({
        id: dimension.key,
        label: dimension.label,
        order: dimension.order,
        groupId: dimension.groupKey ?? null,
        family: dimension.family ?? null,
      })),
      derived: sortByOrder(canonical.dimensionCatalog.derivedDimensions ?? []).map((derived) => ({
        id: derived.key,
        label: derived.label,
        order: derived.order,
        method: derived.rule.kind,
        inputs: derived.rule.inputs.map((inputEntry) => ({
          dimensionId: inputEntry.key,
          weight: inputEntry.weight ?? 1,
        })),
        dependencies: derived.rule.inputs.map((inputEntry) => inputEntry.key),
      })),
      groups: (canonical.dimensionCatalog.groups ?? [])
        .map((group) => ({ id: group.key, label: group.label, dimensionIds: [...group.dimensionKeys].sort() }))
        .sort((left, right) => left.id.localeCompare(right.id)),
    },
    scoring: {
      instructions: sortedScoringInstructions(canonical),
    },
    integrity: {
      rules: (canonical.integrity?.rules ?? []).map((rule) => ({
        id: rule.id,
        kind: rule.kind,
        severity: rule.severity,
        predicate: toRuntimePredicate(rule.predicate),
        message: rule.message,
        affectedQuestionIds: [],
        affectedDimensionIds: [],
        affectedDerivedDimensionIds: [],
      })),
    },
    normalization: {
      groups: (canonical.normalization?.groups ?? []).map((group) => toNormalizationGroup(group)),
      rules: [...(canonical.normalization?.rules ?? [])],
    },
    aggregation: {
      comparableGroups: (canonical.aggregation?.comparableGroups ?? []).map((group) => ({
        id: group.id,
        label: group.label,
        dimensionIds: [...group.dimensionKeys].filter((entry) => canonical.dimensionCatalog.dimensions.some((dimension) => dimension.key === entry)).sort(),
        derivedDimensionIds: [...group.dimensionKeys].filter((entry) => (canonical.dimensionCatalog.derivedDimensions ?? []).some((dimension) => dimension.key === entry)).sort(),
        comparisonBasis: group.comparisonBasis,
      })),
      distributionGroups: (canonical.aggregation?.distributionGroups ?? []).map((group) => ({
        id: group.id,
        label: group.label,
        dimensionIds: [...group.dimensionKeys].filter((entry) => canonical.dimensionCatalog.dimensions.some((dimension) => dimension.key === entry)).sort(),
        derivedDimensionIds: [...group.dimensionKeys].filter((entry) => (canonical.dimensionCatalog.derivedDimensions ?? []).some((dimension) => dimension.key === entry)).sort(),
      })),
      rollupHints: (canonical.aggregation?.rollupHints ?? []).map((hint) => ({
        id: hint.id,
        label: hint.label,
        comparableGroupId: hint.comparableGroupId ?? null,
        distributionGroupId: hint.distributionGroupId ?? null,
        teamRollup: hint.teamRollup,
      })),
    },
    outputs: {
      rules: (canonical.outputs?.blocks ?? []).map((rule) => toRuntimeOutputRule({
        id: rule.id,
        key: rule.key,
        label: rule.title,
        type: rule.type,
        predicate: toRuntimePredicate(rule.condition),
        severity: rule.severity ?? null,
        metadata: {
          narrativeKey: rule.key,
          targetReportKey: rule.reportBindingKey ?? null,
        },
        affectedQuestionIds: [],
        affectedDimensionIds: [...(rule.dimensionKeys ?? [])],
        affectedDerivedDimensionIds: [...(rule.derivedDimensionKeys ?? [])],
        integrityRuleIds: [...(rule.integrityRuleIds ?? [])],
      })),
      reportBindings: (canonical.outputs?.reportBindings ?? []).map((binding) => ({
        key: binding.key,
        label: binding.label,
        contentRef: binding.contentRef ?? null,
        audience: binding.audience ?? null,
        severity: binding.severity ?? null,
        explanation: binding.explanation ?? null,
      })),
    },
    diagnostics: {
      sourceSchema: canonical.schemaVersion,
      compileWarnings: canonicalNormalization.warnings.map((entry) => `${entry.path}: ${entry.message}`),
    },
  }

  const runtimeValidation = validateRuntimeContractV2(runtimePackage)
  return {
    ok: runtimeValidation.ok,
    errors: runtimeValidation.errors,
    warnings: [...canonicalNormalization.warnings, ...runtimeValidation.warnings],
    runtimePackage: runtimeValidation.runtimePackage,
  }
}

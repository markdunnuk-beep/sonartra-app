import { isRecord } from '@/lib/admin/domain/assessment-package-content'

/**
 * Canonical schema id for additive Package Contract v2 payloads.
 *
 * The uploaded package remains the source of truth for authoring, while later
 * compiler steps can materialize narrower runtime shapes from this contract.
 */
export const SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 = 'sonartra-assessment-package/v2'

/**
 * Author-facing contract used by package authors and import tooling.
 * This shape is intentionally expressive and generic enough for non-WPLP assessments.
 */
export interface SonartraAssessmentPackageV2Authoring {
  packageVersion: '2'
  schemaVersion: typeof SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
  metadata: SonartraAssessmentPackageV2Metadata
  responseModels: SonartraAssessmentPackageV2ResponseModelsBlock
  questions: SonartraAssessmentPackageV2Question[]
  sections: SonartraAssessmentPackageV2Section[]
  dimensions: SonartraAssessmentPackageV2Dimension[]
  derivedDimensions?: SonartraAssessmentPackageV2DerivedDimension[]
  scoring?: SonartraAssessmentPackageV2ScoringBlock
  normalization?: SonartraAssessmentPackageV2NormalizationBlock
  integrity?: SonartraAssessmentPackageV2IntegrityBlock
  outputs?: SonartraAssessmentPackageV2OutputBlock
  report?: SonartraAssessmentPackageV2ReportBlock
}

/**
 * Validated import contract returned by the package validator.
 * IDs and references are preserved, while duplicates and invalid references are rejected.
 */
export interface SonartraAssessmentPackageV2ValidatedImport extends SonartraAssessmentPackageV2Authoring {
  derivedDimensions: SonartraAssessmentPackageV2DerivedDimension[]
  scoring: SonartraAssessmentPackageV2ScoringBlock
  normalization: SonartraAssessmentPackageV2NormalizationBlock
  integrity: SonartraAssessmentPackageV2IntegrityBlock
  outputs: SonartraAssessmentPackageV2OutputBlock
  report: SonartraAssessmentPackageV2ReportBlock
}

export interface SonartraAssessmentPackageV2Metadata {
  assessmentKey: string
  assessmentName: string
  description?: string | null
  locales: {
    defaultLocale: string
    supportedLocales: string[]
  }
  authoring: {
    author?: string | null
    organization?: string | null
    source?: string | null
  }
  compatibility: {
    packageSemver: string
    contractVersion: '2'
    compatibleRuntimeRange?: string | null
  }
  tags?: string[]
}

export type SonartraAssessmentPackageV2ResponseType =
  | 'likert'
  | 'numeric'
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'forced_choice'

export interface SonartraAssessmentPackageV2ResponseModelsBlock {
  optionSets?: SonartraAssessmentPackageV2OptionSet[]
  models: SonartraAssessmentPackageV2ResponseModel[]
}

export interface SonartraAssessmentPackageV2Option {
  id: string
  code?: string | null
  label: string
  value?: string | number | boolean | null
  scoreMap?: Record<string, number>
}

export interface SonartraAssessmentPackageV2OptionSet {
  id: string
  label: string
  options: SonartraAssessmentPackageV2Option[]
}

export interface SonartraAssessmentPackageV2ResponseModel {
  id: string
  type: SonartraAssessmentPackageV2ResponseType
  optionSetId?: string | null
  options?: SonartraAssessmentPackageV2Option[]
  numericRange?: {
    min: number
    max: number
    step?: number | null
  }
  multiSelect?: {
    minSelections?: number | null
    maxSelections?: number | null
  }
  forcedChoice?: {
    groupSize: number
  }
  valueMappings?: Record<string, number | string | boolean>
}

export interface SonartraAssessmentPackageV2QuestionScoringBinding {
  dimensionId?: string | null
  transformIds?: string[]
  ruleIds?: string[]
}

export interface SonartraAssessmentPackageV2Question {
  id: string
  code: string
  prompt: string
  helpText?: string | null
  responseModelId?: string | null
  responseModel?: SonartraAssessmentPackageV2ResponseModel
  sectionIds?: string[]
  tags?: string[]
  scoring?: SonartraAssessmentPackageV2QuestionScoringBinding[]
}

export interface SonartraAssessmentPackageV2SectionCompletionRule {
  kind: 'all_required' | 'minimum_answered' | 'custom'
  minimumAnswered?: number | null
  predicate?: SonartraAssessmentPackageV2PredicateExpression | null
}

export interface SonartraAssessmentPackageV2Section {
  id: string
  title: string
  description?: string | null
  order: number
  parentSectionId?: string | null
  completion?: SonartraAssessmentPackageV2SectionCompletionRule | null
}

export type SonartraAssessmentPackageV2DimensionScoringMethod =
  | 'sum'
  | 'average'
  | 'weighted_sum'
  | 'weighted_average'
  | 'rule_based'

export type SonartraAssessmentPackageV2MissingDataPolicy =
  | 'error'
  | 'skip'
  | 'mean_impute'
  | 'minimum_answer_threshold'

export interface SonartraAssessmentPackageV2WeightedQuestionMapping {
  questionId: string
  weight: number
}

export interface SonartraAssessmentPackageV2Dimension {
  id: string
  label: string
  description?: string | null
  scoringMethod: SonartraAssessmentPackageV2DimensionScoringMethod
  inputQuestionIds?: string[]
  weightedQuestions?: SonartraAssessmentPackageV2WeightedQuestionMapping[]
  minimumAnswered?: number | null
  missingDataPolicy?: SonartraAssessmentPackageV2MissingDataPolicy | null
}

export type SonartraAssessmentPackageV2DerivedDimensionComputationMethod = 'formula' | 'expression' | 'rule_reference'

export interface SonartraAssessmentPackageV2DerivedDimension {
  id: string
  label: string
  description?: string | null
  computation: {
    method: SonartraAssessmentPackageV2DerivedDimensionComputationMethod
    formula?: string | null
    expression?: SonartraAssessmentPackageV2PredicateExpression | null
    ruleId?: string | null
    sourceDimensionIds?: string[]
  }
}

export type SonartraAssessmentPackageV2PredicateOperand =
  | { type: 'question_answer'; questionId: string }
  | { type: 'dimension_score'; dimensionId: string }
  | { type: 'derived_dimension_score'; derivedDimensionId: string }
  | { type: 'constant'; value: string | number | boolean | null }
  | { type: 'integrity_flag'; ruleId: string }

export interface SonartraAssessmentPackageV2PredicateComparisonNode {
  type: 'comparison'
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'contains'
  left: SonartraAssessmentPackageV2PredicateOperand
  right: SonartraAssessmentPackageV2PredicateOperand | SonartraAssessmentPackageV2PredicateOperand[]
}

export interface SonartraAssessmentPackageV2PredicateGroupNode {
  type: 'group'
  operator: 'and' | 'or'
  conditions: SonartraAssessmentPackageV2PredicateExpression[]
}

export interface SonartraAssessmentPackageV2PredicateNotNode {
  type: 'not'
  condition: SonartraAssessmentPackageV2PredicateExpression
}

export type SonartraAssessmentPackageV2PredicateExpression =
  | SonartraAssessmentPackageV2PredicateComparisonNode
  | SonartraAssessmentPackageV2PredicateGroupNode
  | SonartraAssessmentPackageV2PredicateNotNode

export type SonartraAssessmentPackageV2ScoringTransformKind =
  | 'reverse_scale'
  | 'weight_multiplier'
  | 'value_remap'
  | 'conditional_score'

export interface SonartraAssessmentPackageV2ScoringTransform {
  id: string
  kind: SonartraAssessmentPackageV2ScoringTransformKind
  target: {
    level: 'item' | 'dimension'
    questionId?: string | null
    dimensionId?: string | null
  }
  config: Record<string, unknown>
  predicate?: SonartraAssessmentPackageV2PredicateExpression | null
}

export interface SonartraAssessmentPackageV2ScoringRule {
  id: string
  scope: 'item' | 'dimension' | 'derived_dimension'
  predicate: SonartraAssessmentPackageV2PredicateExpression
  effect: {
    action: 'add' | 'set' | 'multiply' | 'flag'
    targetId: string
    value: number | string | boolean
  }
}

export interface SonartraAssessmentPackageV2ScoringBlock {
  transforms: SonartraAssessmentPackageV2ScoringTransform[]
  rules: SonartraAssessmentPackageV2ScoringRule[]
}

export type SonartraAssessmentPackageV2NormalizationMethod =
  | 'band_table'
  | 'percentile_table'
  | 'scaled_score_table'
  | 'stanine_table'
  | 'expression'

export interface SonartraAssessmentPackageV2NormalizationTableEntry {
  rawMin: number
  rawMax: number
  normalizedValue?: number | null
  percentile?: number | null
  band?: string | null
  label?: string | null
}

export interface SonartraAssessmentPackageV2NormalizationRule {
  id: string
  method: SonartraAssessmentPackageV2NormalizationMethod
  appliesTo: {
    dimensionIds?: string[]
    derivedDimensionIds?: string[]
    groupKey?: string | null
  }
  version: string
  table?: SonartraAssessmentPackageV2NormalizationTableEntry[]
  expression?: string | null
}

export interface SonartraAssessmentPackageV2NormalizationBlock {
  rules: SonartraAssessmentPackageV2NormalizationRule[]
}

export type SonartraAssessmentPackageV2IntegrityRuleKind =
  | 'contradiction'
  | 'consistency'
  | 'minimum_completion'
  | 'response_pattern'

export interface SonartraAssessmentPackageV2IntegrityRule {
  id: string
  kind: SonartraAssessmentPackageV2IntegrityRuleKind
  severity: 'info' | 'warning' | 'error'
  predicate: SonartraAssessmentPackageV2PredicateExpression
  message: string
}

export interface SonartraAssessmentPackageV2IntegrityBlock {
  rules: SonartraAssessmentPackageV2IntegrityRule[]
}

export type SonartraAssessmentPackageV2OutputType =
  | 'summary'
  | 'warning'
  | 'flag'
  | 'report_section'
  | 'recommendation'

export interface SonartraAssessmentPackageV2OutputRule {
  id: string
  key: string
  type: SonartraAssessmentPackageV2OutputType
  predicate: SonartraAssessmentPackageV2PredicateExpression
  severity?: 'info' | 'warning' | 'critical' | null
  metadata?: {
    label?: string | null
    narrativeKey?: string | null
    explanation?: string | null
    band?: string | null
  }
}

export interface SonartraAssessmentPackageV2OutputBlock {
  rules: SonartraAssessmentPackageV2OutputRule[]
}

export interface SonartraAssessmentPackageV2ReportContentBinding {
  key: string
  label: string
  contentRef?: string | null
  severity?: string | null
  explanation?: string | null
}

export interface SonartraAssessmentPackageV2ReportBlock {
  content: SonartraAssessmentPackageV2ReportContentBinding[]
}

export interface SonartraAssessmentPackageV2Summary {
  questionCount: number
  sectionCount: number
  dimensionCount: number
  derivedDimensionCount: number
  responseModelCount: number
  transformCount: number
  normalizationRuleCount: number
  integrityRuleCount: number
  outputRuleCount: number
}

export interface SonartraAssessmentPackageV2ValidationIssue {
  path: string
  message: string
}

export interface SonartraAssessmentPackageV2ValidationResult {
  ok: boolean
  errors: SonartraAssessmentPackageV2ValidationIssue[]
  warnings: SonartraAssessmentPackageV2ValidationIssue[]
  summary: SonartraAssessmentPackageV2Summary
  normalizedPackage: SonartraAssessmentPackageV2ValidatedImport | null
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

function toNumericRecord(input: Record<string, unknown>): Record<string, number> {
  const normalized: Record<string, number> = {}
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      normalized[key] = value
    }
  }
  return normalized
}

function toPrimitiveRecord(input: Record<string, unknown>): Record<string, string | number | boolean> {
  const normalized: Record<string, string | number | boolean> = {}
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      normalized[key] = value
    }
  }
  return normalized
}

function createEmptySummary(): SonartraAssessmentPackageV2Summary {
  return {
    questionCount: 0,
    sectionCount: 0,
    dimensionCount: 0,
    derivedDimensionCount: 0,
    responseModelCount: 0,
    transformCount: 0,
    normalizationRuleCount: 0,
    integrityRuleCount: 0,
    outputRuleCount: 0,
  }
}

function isPredicateOperand(value: unknown): value is SonartraAssessmentPackageV2PredicateOperand {
  return isRecord(value) && typeof value.type === 'string'
}

function validatePredicateOperand(
  input: unknown,
  path: string,
  questionIds: Set<string>,
  dimensionIds: Set<string>,
  derivedDimensionIds: Set<string>,
  integrityRuleIds: Set<string>,
  errors: SonartraAssessmentPackageV2ValidationIssue[],
): SonartraAssessmentPackageV2PredicateOperand | null {
  if (!isPredicateOperand(input)) {
    pushIssue(errors, path, 'Predicate operands must be objects.')
    return null
  }

  switch (input.type) {
    case 'question_answer': {
      const questionId = asTrimmedString(input.questionId)
      if (!questionId) {
        pushIssue(errors, `${path}.questionId`, 'questionId is required.')
        return null
      }
      if (!questionIds.has(questionId)) {
        pushIssue(errors, `${path}.questionId`, `Unknown question reference "${questionId}".`)
      }
      return { type: 'question_answer', questionId }
    }
    case 'dimension_score': {
      const dimensionId = asTrimmedString(input.dimensionId)
      if (!dimensionId) {
        pushIssue(errors, `${path}.dimensionId`, 'dimensionId is required.')
        return null
      }
      if (!dimensionIds.has(dimensionId)) {
        pushIssue(errors, `${path}.dimensionId`, `Unknown dimension reference "${dimensionId}".`)
      }
      return { type: 'dimension_score', dimensionId }
    }
    case 'derived_dimension_score': {
      const derivedDimensionId = asTrimmedString(input.derivedDimensionId)
      if (!derivedDimensionId) {
        pushIssue(errors, `${path}.derivedDimensionId`, 'derivedDimensionId is required.')
        return null
      }
      if (!derivedDimensionIds.has(derivedDimensionId)) {
        pushIssue(errors, `${path}.derivedDimensionId`, `Unknown derived dimension reference "${derivedDimensionId}".`)
      }
      return { type: 'derived_dimension_score', derivedDimensionId }
    }
    case 'integrity_flag': {
      const ruleId = asTrimmedString(input.ruleId)
      if (!ruleId) {
        pushIssue(errors, `${path}.ruleId`, 'ruleId is required.')
        return null
      }
      if (!integrityRuleIds.has(ruleId)) {
        pushIssue(errors, `${path}.ruleId`, `Unknown integrity rule reference "${ruleId}".`)
      }
      return { type: 'integrity_flag', ruleId }
    }
    case 'constant':
      return { type: 'constant', value: input.value ?? null }
    default: {
      const unsupportedType = (input as { type?: unknown }).type
      pushIssue(errors, `${path}.type`, `Unsupported predicate operand type "${String(unsupportedType)}".`)
      return null
    }
  }
}

function validatePredicateExpression(
  input: unknown,
  path: string,
  questionIds: Set<string>,
  dimensionIds: Set<string>,
  derivedDimensionIds: Set<string>,
  integrityRuleIds: Set<string>,
  errors: SonartraAssessmentPackageV2ValidationIssue[],
): SonartraAssessmentPackageV2PredicateExpression | null {
  if (!isRecord(input)) {
    pushIssue(errors, path, 'Predicates must be objects.')
    return null
  }

  if (input.type === 'comparison') {
    const left = validatePredicateOperand(input.left, `${path}.left`, questionIds, dimensionIds, derivedDimensionIds, integrityRuleIds, errors)
    const right = Array.isArray(input.right)
      ? input.right
        .map((entry, index) => validatePredicateOperand(entry, `${path}.right[${index}]`, questionIds, dimensionIds, derivedDimensionIds, integrityRuleIds, errors))
        .filter((entry): entry is SonartraAssessmentPackageV2PredicateOperand => Boolean(entry))
      : validatePredicateOperand(input.right, `${path}.right`, questionIds, dimensionIds, derivedDimensionIds, integrityRuleIds, errors)
    const operator = asTrimmedString(input.operator)
    if (!operator || !['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains'].includes(operator)) {
      pushIssue(errors, `${path}.operator`, 'Predicates require a supported comparison operator.')
      return null
    }
    if (!left || (!right || (Array.isArray(right) && right.length === 0))) {
      return null
    }
    return {
      type: 'comparison',
      operator: operator as SonartraAssessmentPackageV2PredicateComparisonNode['operator'],
      left,
      right,
    }
  }

  if (input.type === 'group') {
    const operator = asTrimmedString(input.operator)
    if (!operator || !['and', 'or'].includes(operator)) {
      pushIssue(errors, `${path}.operator`, 'Predicate groups require an and/or operator.')
      return null
    }
    if (!Array.isArray(input.conditions) || input.conditions.length === 0) {
      pushIssue(errors, `${path}.conditions`, 'Predicate groups require one or more conditions.')
      return null
    }
    const conditions = input.conditions
      .map((condition, index) => validatePredicateExpression(condition, `${path}.conditions[${index}]`, questionIds, dimensionIds, derivedDimensionIds, integrityRuleIds, errors))
      .filter((condition): condition is SonartraAssessmentPackageV2PredicateExpression => Boolean(condition))
    if (conditions.length === 0) {
      return null
    }
    return { type: 'group', operator: operator as 'and' | 'or', conditions }
  }

  if (input.type === 'not') {
    const condition = validatePredicateExpression(input.condition, `${path}.condition`, questionIds, dimensionIds, derivedDimensionIds, integrityRuleIds, errors)
    return condition ? { type: 'not', condition } : null
  }

  pushIssue(errors, `${path}.type`, 'Predicates must declare a supported node type.')
  return null
}

export function validateSonartraAssessmentPackageV2(input: unknown): SonartraAssessmentPackageV2ValidationResult {
  const errors: SonartraAssessmentPackageV2ValidationIssue[] = []
  const warnings: SonartraAssessmentPackageV2ValidationIssue[] = []
  const summary = createEmptySummary()

  if (!isRecord(input)) {
    pushIssue(errors, 'package', 'Package payload must be an object.')
    return { ok: false, errors, warnings, summary, normalizedPackage: null }
  }

  if (input.packageVersion !== '2') {
    pushIssue(errors, 'packageVersion', 'Package Contract v2 requires packageVersion "2".')
  }
  if (input.schemaVersion !== SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
    pushIssue(errors, 'schemaVersion', `Package Contract v2 requires schemaVersion "${SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2}".`)
  }

  const metadataInput = isRecord(input.metadata) ? input.metadata : null
  if (!metadataInput) {
    pushIssue(errors, 'metadata', 'metadata is required.')
  }

  const defaultLocale = asTrimmedString(metadataInput?.locales && isRecord(metadataInput.locales) ? metadataInput.locales.defaultLocale : null) ?? 'en'
  const supportedLocales = asStringArray(metadataInput?.locales && isRecord(metadataInput.locales) ? metadataInput.locales.supportedLocales : null)
  if (supportedLocales.length === 0) {
    pushIssue(errors, 'metadata.locales.supportedLocales', 'At least one supported locale is required.')
  }
  if (supportedLocales.length > 0 && !supportedLocales.includes(defaultLocale)) {
    pushIssue(errors, 'metadata.locales.defaultLocale', 'defaultLocale must also appear in supportedLocales.')
  }

  const optionSetInputs = isRecord(input.responseModels) && Array.isArray(input.responseModels.optionSets) ? input.responseModels.optionSets : []
  const optionSets: SonartraAssessmentPackageV2OptionSet[] = []
  const optionSetIds = new Set<string>()
  for (const [index, entry] of optionSetInputs.entries()) {
    const path = `responseModels.optionSets[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Option sets must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const label = asTrimmedString(entry.label)
    if (!id) pushIssue(errors, `${path}.id`, 'Option set id is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Option set label is required.')
    if (id && optionSetIds.has(id)) {
      pushIssue(errors, `${path}.id`, `Duplicate option set id "${id}".`)
    }
    const options = Array.isArray(entry.options) ? entry.options : []
    if (options.length === 0) {
      pushIssue(errors, `${path}.options`, 'Option sets require at least one option.')
    }
    const normalizedOptions: SonartraAssessmentPackageV2Option[] = []
    const optionIds = new Set<string>()
    for (const [optionIndex, option] of options.entries()) {
      const optionPath = `${path}.options[${optionIndex}]`
      if (!isRecord(option)) {
        pushIssue(errors, optionPath, 'Options must be objects.')
        continue
      }
      const optionId = asTrimmedString(option.id)
      const optionLabel = asTrimmedString(option.label)
      if (!optionId) pushIssue(errors, `${optionPath}.id`, 'Option id is required.')
      if (!optionLabel) pushIssue(errors, `${optionPath}.label`, 'Option label is required.')
      if (optionId && optionIds.has(optionId)) {
        pushIssue(errors, `${optionPath}.id`, `Duplicate option id "${optionId}".`)
      }
      if (optionId) optionIds.add(optionId)
      normalizedOptions.push({
        id: optionId ?? `invalid-option-${optionIndex}`,
        code: asTrimmedString(option.code),
        label: optionLabel ?? '',
        value: (typeof option.value === 'string' || typeof option.value === 'number' || typeof option.value === 'boolean' || option.value === null || option.value === undefined) ? option.value ?? null : null,
        scoreMap: isRecord(option.scoreMap) ? toNumericRecord(option.scoreMap) : undefined,
      })
    }
    if (id) optionSetIds.add(id)
    optionSets.push({ id: id ?? `invalid-option-set-${index}`, label: label ?? '', options: normalizedOptions })
  }

  const responseModelsInput = isRecord(input.responseModels) && Array.isArray(input.responseModels.models) ? input.responseModels.models : null
  if (!responseModelsInput || responseModelsInput.length === 0) {
    pushIssue(errors, 'responseModels.models', 'At least one response model is required.')
  }
  const responseModels: SonartraAssessmentPackageV2ResponseModel[] = []
  const responseModelIds = new Set<string>()
  for (const [index, entry] of (responseModelsInput ?? []).entries()) {
    const path = `responseModels.models[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Response models must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const type = asTrimmedString(entry.type)
    if (!id) pushIssue(errors, `${path}.id`, 'Response model id is required.')
    if (!type || !['likert', 'numeric', 'boolean', 'single_select', 'multi_select', 'forced_choice'].includes(type)) {
      pushIssue(errors, `${path}.type`, 'Response model type is invalid.')
      continue
    }
    if (id && responseModelIds.has(id)) {
      pushIssue(errors, `${path}.id`, `Duplicate response model id "${id}".`)
    }
    const optionSetId = asTrimmedString(entry.optionSetId)
    if (optionSetId && !optionSetIds.has(optionSetId)) {
      pushIssue(errors, `${path}.optionSetId`, `Unknown option set reference "${optionSetId}".`)
    }
    const inlineOptions = Array.isArray(entry.options) ? entry.options : []
    if (!optionSetId && inlineOptions.length === 0 && type !== 'numeric' && type !== 'boolean') {
      pushIssue(errors, path, 'Selectable response models require either optionSetId or inline options.')
    }
    responseModelIds.add(id ?? `invalid-response-model-${index}`)
    responseModels.push({
      id: id ?? `invalid-response-model-${index}`,
      type: type as SonartraAssessmentPackageV2ResponseType,
      optionSetId,
      options: inlineOptions.map((option, optionIndex) => ({
        id: asTrimmedString(isRecord(option) ? option.id : null) ?? `inline-option-${optionIndex}`,
        code: asTrimmedString(isRecord(option) ? option.code : null),
        label: asTrimmedString(isRecord(option) ? option.label : null) ?? '',
        value: isRecord(option) ? (typeof option.value === 'string' || typeof option.value === 'number' || typeof option.value === 'boolean' || option.value === null || option.value === undefined ? option.value ?? null : null) : null,
        scoreMap: isRecord(option) && isRecord(option.scoreMap) ? toNumericRecord(option.scoreMap) : undefined,
      })),
      numericRange: isRecord(entry.numericRange) && asFiniteNumber(entry.numericRange.min) !== null && asFiniteNumber(entry.numericRange.max) !== null
        ? { min: entry.numericRange.min as number, max: entry.numericRange.max as number, step: asFiniteNumber(entry.numericRange.step) }
        : undefined,
      multiSelect: isRecord(entry.multiSelect)
        ? {
          minSelections: asFiniteNumber(entry.multiSelect.minSelections),
          maxSelections: asFiniteNumber(entry.multiSelect.maxSelections),
        }
        : undefined,
      forcedChoice: isRecord(entry.forcedChoice) && asFiniteNumber(entry.forcedChoice.groupSize) !== null
        ? { groupSize: entry.forcedChoice.groupSize as number }
        : undefined,
      valueMappings: isRecord(entry.valueMappings) ? toPrimitiveRecord(entry.valueMappings) : undefined,
    })
  }

  const sectionsInput = Array.isArray(input.sections) ? input.sections : null
  if (!sectionsInput || sectionsInput.length === 0) {
    pushIssue(errors, 'sections', 'At least one section is required.')
  }
  const sections: SonartraAssessmentPackageV2Section[] = []
  const sectionIds = new Set<string>()
  for (const [index, entry] of (sectionsInput ?? []).entries()) {
    const path = `sections[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Sections must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const title = asTrimmedString(entry.title)
    const order = asFiniteNumber(entry.order)
    if (!id) pushIssue(errors, `${path}.id`, 'Section id is required.')
    if (!title) pushIssue(errors, `${path}.title`, 'Section title is required.')
    if (order === null) pushIssue(errors, `${path}.order`, 'Section order is required.')
    if (id && sectionIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate section id "${id}".`)
    if (id) sectionIds.add(id)
    sections.push({
      id: id ?? `invalid-section-${index}`,
      title: title ?? '',
      description: asTrimmedString(entry.description),
      order: order ?? index,
      parentSectionId: asTrimmedString(entry.parentSectionId),
      completion: isRecord(entry.completion)
        ? {
          kind: (asTrimmedString(entry.completion.kind) as SonartraAssessmentPackageV2SectionCompletionRule['kind']) ?? 'custom',
          minimumAnswered: asFiniteNumber(entry.completion.minimumAnswered),
          predicate: entry.completion.predicate as SonartraAssessmentPackageV2PredicateExpression,
        }
        : null,
    })
  }
  for (const [index, section] of sections.entries()) {
    if (section.parentSectionId && !sectionIds.has(section.parentSectionId)) {
      pushIssue(errors, `sections[${index}].parentSectionId`, `Unknown parent section reference "${section.parentSectionId}".`)
    }
  }

  const questionsInput = Array.isArray(input.questions) ? input.questions : null
  if (!questionsInput || questionsInput.length === 0) {
    pushIssue(errors, 'questions', 'At least one question is required.')
  }
  const questions: SonartraAssessmentPackageV2Question[] = []
  const questionIds = new Set<string>()
  const questionCodes = new Set<string>()
  for (const [index, entry] of (questionsInput ?? []).entries()) {
    const path = `questions[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Questions must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const code = asTrimmedString(entry.code)
    const prompt = asTrimmedString(entry.prompt)
    if (!id) pushIssue(errors, `${path}.id`, 'Question id is required.')
    if (!code) pushIssue(errors, `${path}.code`, 'Question code is required.')
    if (!prompt) pushIssue(errors, `${path}.prompt`, 'Question prompt is required.')
    if (id && questionIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate question id "${id}".`)
    if (code && questionCodes.has(code)) pushIssue(errors, `${path}.code`, `Duplicate question code "${code}".`)
    if (id) questionIds.add(id)
    if (code) questionCodes.add(code)
    const responseModelId = asTrimmedString(entry.responseModelId)
    const responseModel = isRecord(entry.responseModel) ? entry.responseModel : null
    if (!responseModelId && !responseModel) {
      pushIssue(errors, path, 'Questions require responseModelId or an inline responseModel.')
    }
    if (responseModelId && !responseModelIds.has(responseModelId)) {
      pushIssue(errors, `${path}.responseModelId`, `Unknown response model reference "${responseModelId}".`)
    }
    const sectionMembership = asStringArray(entry.sectionIds)
    for (const sectionId of sectionMembership) {
      if (!sectionIds.has(sectionId)) {
        pushIssue(errors, `${path}.sectionIds`, `Unknown section reference "${sectionId}".`)
      }
    }
    questions.push({
      id: id ?? `invalid-question-${index}`,
      code: code ?? '',
      prompt: prompt ?? '',
      helpText: asTrimmedString(entry.helpText),
      responseModelId,
      responseModel: undefined,
      sectionIds: sectionMembership,
      tags: asStringArray(entry.tags),
      scoring: Array.isArray(entry.scoring)
        ? entry.scoring.filter(isRecord).map((binding) => ({
          dimensionId: asTrimmedString(binding.dimensionId),
          transformIds: asStringArray(binding.transformIds),
          ruleIds: asStringArray(binding.ruleIds),
        }))
        : undefined,
    })
  }

  const dimensionsInput = Array.isArray(input.dimensions) ? input.dimensions : null
  if (!dimensionsInput || dimensionsInput.length === 0) {
    pushIssue(errors, 'dimensions', 'At least one raw dimension is required.')
  }
  const dimensions: SonartraAssessmentPackageV2Dimension[] = []
  const dimensionIds = new Set<string>()
  for (const [index, entry] of (dimensionsInput ?? []).entries()) {
    const path = `dimensions[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Dimensions must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const label = asTrimmedString(entry.label)
    const scoringMethod = asTrimmedString(entry.scoringMethod)
    if (!id) pushIssue(errors, `${path}.id`, 'Dimension id is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Dimension label is required.')
    if (!scoringMethod || !['sum', 'average', 'weighted_sum', 'weighted_average', 'rule_based'].includes(scoringMethod)) {
      pushIssue(errors, `${path}.scoringMethod`, 'Dimension scoringMethod is invalid.')
    }
    if (id && dimensionIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate dimension id "${id}".`)
    if (id) dimensionIds.add(id)
    const inputQuestionIds = asStringArray(entry.inputQuestionIds)
    for (const questionId of inputQuestionIds) {
      if (!questionIds.has(questionId)) {
        pushIssue(errors, `${path}.inputQuestionIds`, `Unknown question reference "${questionId}".`)
      }
    }
    const weightedQuestions = Array.isArray(entry.weightedQuestions)
      ? entry.weightedQuestions.filter(isRecord).map((mapping) => ({
        questionId: asTrimmedString(mapping.questionId) ?? '',
        weight: asFiniteNumber(mapping.weight) ?? 0,
      }))
      : []
    for (const [mappingIndex, mapping] of weightedQuestions.entries()) {
      if (!mapping.questionId || !questionIds.has(mapping.questionId)) {
        pushIssue(errors, `${path}.weightedQuestions[${mappingIndex}].questionId`, `Unknown question reference "${mapping.questionId}".`)
      }
    }
    dimensions.push({
      id: id ?? `invalid-dimension-${index}`,
      label: label ?? '',
      description: asTrimmedString(entry.description),
      scoringMethod: (scoringMethod as SonartraAssessmentPackageV2DimensionScoringMethod) ?? 'sum',
      inputQuestionIds,
      weightedQuestions,
      minimumAnswered: asFiniteNumber(entry.minimumAnswered),
      missingDataPolicy: (asTrimmedString(entry.missingDataPolicy) as SonartraAssessmentPackageV2MissingDataPolicy) ?? null,
    })
  }

  const derivedDimensionsInput = Array.isArray(input.derivedDimensions) ? input.derivedDimensions : []
  const derivedDimensions: SonartraAssessmentPackageV2DerivedDimension[] = []
  const derivedDimensionIds = new Set<string>()
  for (const [index, entry] of derivedDimensionsInput.entries()) {
    const path = `derivedDimensions[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Derived dimensions must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const label = asTrimmedString(entry.label)
    const computation = isRecord(entry.computation) ? entry.computation : null
    const method = asTrimmedString(computation?.method)
    if (!id) pushIssue(errors, `${path}.id`, 'Derived dimension id is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Derived dimension label is required.')
    if (!computation || !method || !['formula', 'expression', 'rule_reference'].includes(method)) {
      pushIssue(errors, `${path}.computation.method`, 'Derived dimensions require a supported computation method.')
    }
    if (id && derivedDimensionIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate derived dimension id "${id}".`)
    if (id) derivedDimensionIds.add(id)
    const sourceDimensionIds = asStringArray(computation?.sourceDimensionIds)
    for (const dimensionId of sourceDimensionIds) {
      if (!dimensionIds.has(dimensionId)) {
        pushIssue(errors, `${path}.computation.sourceDimensionIds`, `Unknown dimension reference "${dimensionId}".`)
      }
    }
    derivedDimensions.push({
      id: id ?? `invalid-derived-dimension-${index}`,
      label: label ?? '',
      description: asTrimmedString(entry.description),
      computation: {
        method: (method as SonartraAssessmentPackageV2DerivedDimensionComputationMethod) ?? 'formula',
        formula: asTrimmedString(computation?.formula),
        expression: computation?.expression as SonartraAssessmentPackageV2PredicateExpression,
        ruleId: asTrimmedString(computation?.ruleId),
        sourceDimensionIds,
      },
    })
  }

  const scoringTransformsInput = isRecord(input.scoring) && Array.isArray(input.scoring.transforms) ? input.scoring.transforms : []
  const scoringRulesInput = isRecord(input.scoring) && Array.isArray(input.scoring.rules) ? input.scoring.rules : []
  const transformIds = new Set<string>()
  const transforms: SonartraAssessmentPackageV2ScoringTransform[] = []
  for (const [index, entry] of scoringTransformsInput.entries()) {
    const path = `scoring.transforms[${index}]`
    if (!isRecord(entry) || !isRecord(entry.target) || !isRecord(entry.config)) {
      pushIssue(errors, path, 'Scoring transforms require object target and config blocks.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const kind = asTrimmedString(entry.kind)
    const level = asTrimmedString(entry.target.level)
    if (!id) pushIssue(errors, `${path}.id`, 'Transform id is required.')
    if (!kind || !['reverse_scale', 'weight_multiplier', 'value_remap', 'conditional_score'].includes(kind)) {
      pushIssue(errors, `${path}.kind`, 'Transform kind is invalid.')
    }
    if (!level || !['item', 'dimension'].includes(level)) {
      pushIssue(errors, `${path}.target.level`, 'Transform target level is invalid.')
    }
    if (id && transformIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate transform id "${id}".`)
    const questionId = asTrimmedString(entry.target.questionId)
    const dimensionId = asTrimmedString(entry.target.dimensionId)
    if (questionId && !questionIds.has(questionId)) {
      pushIssue(errors, `${path}.target.questionId`, `Unknown question reference "${questionId}".`)
    }
    if (dimensionId && !dimensionIds.has(dimensionId)) {
      pushIssue(errors, `${path}.target.dimensionId`, `Unknown dimension reference "${dimensionId}".`)
    }
    if (id) transformIds.add(id)
    transforms.push({
      id: id ?? `invalid-transform-${index}`,
      kind: (kind as SonartraAssessmentPackageV2ScoringTransformKind) ?? 'reverse_scale',
      target: { level: (level as 'item' | 'dimension') ?? 'item', questionId, dimensionId },
      config: entry.config,
      predicate: null,
    })
  }

  const scoringRuleIds = new Set<string>()
  const scoringRules: SonartraAssessmentPackageV2ScoringRule[] = []
  for (const [index, entry] of scoringRulesInput.entries()) {
    const path = `scoring.rules[${index}]`
    if (!isRecord(entry) || !isRecord(entry.effect)) {
      pushIssue(errors, path, 'Scoring rules must be objects with an effect block.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const scope = asTrimmedString(entry.scope)
    if (!id) pushIssue(errors, `${path}.id`, 'Scoring rule id is required.')
    if (!scope || !['item', 'dimension', 'derived_dimension'].includes(scope)) {
      pushIssue(errors, `${path}.scope`, 'Scoring rule scope is invalid.')
    }
    if (id && scoringRuleIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate scoring rule id "${id}".`)
    const predicate = validatePredicateExpression(entry.predicate, `${path}.predicate`, questionIds, dimensionIds, derivedDimensionIds, new Set(), errors)
    const action = asTrimmedString(entry.effect.action)
    const targetId = asTrimmedString(entry.effect.targetId)
    const effectValue = entry.effect.value
    if (!action || !['add', 'set', 'multiply', 'flag'].includes(action)) {
      pushIssue(errors, `${path}.effect.action`, 'Scoring rule actions must be add, set, multiply, or flag.')
    }
    if (!targetId) {
      pushIssue(errors, `${path}.effect.targetId`, 'Scoring rule effect targetId is required.')
    } else if (scope === 'dimension' && !dimensionIds.has(targetId)) {
      pushIssue(errors, `${path}.effect.targetId`, `Unknown dimension reference "${targetId}".`)
    } else if (scope === 'derived_dimension' && !derivedDimensionIds.has(targetId)) {
      pushIssue(errors, `${path}.effect.targetId`, `Unknown derived dimension reference "${targetId}".`)
    } else if (scope === 'item' && !questionIds.has(targetId)) {
      pushIssue(errors, `${path}.effect.targetId`, `Unknown question reference "${targetId}".`)
    }
    if (id) scoringRuleIds.add(id)
    if (id && predicate && targetId && action && ['number', 'string', 'boolean'].includes(typeof effectValue)) {
      scoringRules.push({
        id,
        scope: scope as SonartraAssessmentPackageV2ScoringRule['scope'],
        predicate,
        effect: { action: action as SonartraAssessmentPackageV2ScoringRule['effect']['action'], targetId, value: effectValue as number | string | boolean },
      })
    }
  }

  for (const [questionIndex, question] of questions.entries()) {
    for (const [bindingIndex, binding] of (question.scoring ?? []).entries()) {
      if (binding.dimensionId && !dimensionIds.has(binding.dimensionId)) {
        pushIssue(errors, `questions[${questionIndex}].scoring[${bindingIndex}].dimensionId`, `Unknown dimension reference "${binding.dimensionId}".`)
      }
      for (const transformId of binding.transformIds ?? []) {
        if (!transformIds.has(transformId)) {
          pushIssue(errors, `questions[${questionIndex}].scoring[${bindingIndex}].transformIds`, `Unknown transform reference "${transformId}".`)
        }
      }
      for (const ruleId of binding.ruleIds ?? []) {
        if (!scoringRuleIds.has(ruleId)) {
          pushIssue(errors, `questions[${questionIndex}].scoring[${bindingIndex}].ruleIds`, `Unknown scoring rule reference "${ruleId}".`)
        }
      }
    }
  }

  const normalizationRulesInput = isRecord(input.normalization) && Array.isArray(input.normalization.rules) ? input.normalization.rules : []
  const normalizationRules: SonartraAssessmentPackageV2NormalizationRule[] = []
  const normalizationRuleIds = new Set<string>()
  for (const [index, entry] of normalizationRulesInput.entries()) {
    const path = `normalization.rules[${index}]`
    if (!isRecord(entry) || !isRecord(entry.appliesTo)) {
      pushIssue(errors, path, 'Normalization rules require an appliesTo block.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const method = asTrimmedString(entry.method)
    const version = asTrimmedString(entry.version)
    if (!id) pushIssue(errors, `${path}.id`, 'Normalization rule id is required.')
    if (!method || !['band_table', 'percentile_table', 'scaled_score_table', 'stanine_table', 'expression'].includes(method)) {
      pushIssue(errors, `${path}.method`, 'Normalization rule method is invalid.')
    }
    if (!version) pushIssue(errors, `${path}.version`, 'Normalization rule version is required.')
    if (id && normalizationRuleIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate normalization rule id "${id}".`)
    const appliesToDimensionIds = asStringArray(entry.appliesTo.dimensionIds)
    const appliesToDerivedDimensionIds = asStringArray(entry.appliesTo.derivedDimensionIds)
    if (appliesToDimensionIds.length === 0 && appliesToDerivedDimensionIds.length === 0) {
      pushIssue(errors, `${path}.appliesTo`, 'Normalization rules must target at least one dimension or derived dimension.')
    }
    for (const dimensionId of appliesToDimensionIds) {
      if (!dimensionIds.has(dimensionId)) pushIssue(errors, `${path}.appliesTo.dimensionIds`, `Unknown dimension reference "${dimensionId}".`)
    }
    for (const derivedDimensionId of appliesToDerivedDimensionIds) {
      if (!derivedDimensionIds.has(derivedDimensionId)) pushIssue(errors, `${path}.appliesTo.derivedDimensionIds`, `Unknown derived dimension reference "${derivedDimensionId}".`)
    }
    if (id) normalizationRuleIds.add(id)
    normalizationRules.push({
      id: id ?? `invalid-normalization-rule-${index}`,
      method: (method as SonartraAssessmentPackageV2NormalizationMethod) ?? 'band_table',
      appliesTo: {
        dimensionIds: appliesToDimensionIds,
        derivedDimensionIds: appliesToDerivedDimensionIds,
        groupKey: asTrimmedString(entry.appliesTo.groupKey),
      },
      version: version ?? '',
      table: Array.isArray(entry.table)
        ? entry.table.filter(isRecord).map((row) => ({
          rawMin: asFiniteNumber(row.rawMin) ?? 0,
          rawMax: asFiniteNumber(row.rawMax) ?? 0,
          normalizedValue: asFiniteNumber(row.normalizedValue),
          percentile: asFiniteNumber(row.percentile),
          band: asTrimmedString(row.band),
          label: asTrimmedString(row.label),
        }))
        : undefined,
      expression: asTrimmedString(entry.expression),
    })
  }

  const integrityRulesInput = isRecord(input.integrity) && Array.isArray(input.integrity.rules) ? input.integrity.rules : []
  const integrityRules: SonartraAssessmentPackageV2IntegrityRule[] = []
  const integrityRuleIds = new Set<string>()
  for (const [index, entry] of integrityRulesInput.entries()) {
    const path = `integrity.rules[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Integrity rules must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const kind = asTrimmedString(entry.kind)
    const severity = asTrimmedString(entry.severity)
    const message = asTrimmedString(entry.message)
    if (!id) pushIssue(errors, `${path}.id`, 'Integrity rule id is required.')
    if (!kind || !['contradiction', 'consistency', 'minimum_completion', 'response_pattern'].includes(kind)) {
      pushIssue(errors, `${path}.kind`, 'Integrity rule kind is invalid.')
    }
    if (!severity || !['info', 'warning', 'error'].includes(severity)) {
      pushIssue(errors, `${path}.severity`, 'Integrity rule severity is invalid.')
    }
    if (!message) pushIssue(errors, `${path}.message`, 'Integrity rule message is required.')
    if (id && integrityRuleIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate integrity rule id "${id}".`)
    if (id) integrityRuleIds.add(id)
    const predicate = validatePredicateExpression(entry.predicate, `${path}.predicate`, questionIds, dimensionIds, derivedDimensionIds, integrityRuleIds, errors)
    if (predicate && id && kind && severity && message) {
      integrityRules.push({
        id,
        kind: kind as SonartraAssessmentPackageV2IntegrityRuleKind,
        severity: severity as SonartraAssessmentPackageV2IntegrityRule['severity'],
        predicate,
        message,
      })
    }
  }

  const outputRulesInput = isRecord(input.outputs) && Array.isArray(input.outputs.rules) ? input.outputs.rules : []
  const outputRules: SonartraAssessmentPackageV2OutputRule[] = []
  const outputRuleIds = new Set<string>()
  for (const [index, entry] of outputRulesInput.entries()) {
    const path = `outputs.rules[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Output rules must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const key = asTrimmedString(entry.key)
    const type = asTrimmedString(entry.type)
    if (!id) pushIssue(errors, `${path}.id`, 'Output rule id is required.')
    if (!key) pushIssue(errors, `${path}.key`, 'Output rule key is required.')
    if (!type || !['summary', 'warning', 'flag', 'report_section', 'recommendation'].includes(type)) {
      pushIssue(errors, `${path}.type`, 'Output rule type is invalid.')
    }
    if (id && outputRuleIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate output rule id "${id}".`)
    if (id) outputRuleIds.add(id)
    const predicate = validatePredicateExpression(entry.predicate, `${path}.predicate`, questionIds, dimensionIds, derivedDimensionIds, integrityRuleIds, errors)
    if (predicate && id && key && type) {
      outputRules.push({
        id,
        key,
        type: type as SonartraAssessmentPackageV2OutputType,
        predicate,
        severity: (asTrimmedString(entry.severity) as SonartraAssessmentPackageV2OutputRule['severity']) ?? null,
        metadata: isRecord(entry.metadata)
          ? {
            label: asTrimmedString(entry.metadata.label),
            narrativeKey: asTrimmedString(entry.metadata.narrativeKey),
            explanation: asTrimmedString(entry.metadata.explanation),
            band: asTrimmedString(entry.metadata.band),
          }
          : undefined,
      })
    }
  }

  const reportContentInput = isRecord(input.report) && Array.isArray(input.report.content) ? input.report.content : []
  const reportContent: SonartraAssessmentPackageV2ReportContentBinding[] = []
  const reportContentKeys = new Set<string>()
  for (const [index, entry] of reportContentInput.entries()) {
    const path = `report.content[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Report content bindings must be objects.')
      continue
    }
    const key = asTrimmedString(entry.key)
    const label = asTrimmedString(entry.label)
    if (!key) pushIssue(errors, `${path}.key`, 'Report content key is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Report content label is required.')
    if (key && reportContentKeys.has(key)) pushIssue(errors, `${path}.key`, `Duplicate report content key "${key}".`)
    if (key) reportContentKeys.add(key)
    reportContent.push({
      key: key ?? `invalid-report-key-${index}`,
      label: label ?? '',
      contentRef: asTrimmedString(entry.contentRef),
      severity: asTrimmedString(entry.severity),
      explanation: asTrimmedString(entry.explanation),
    })
  }

  for (const [index, outputRule] of outputRules.entries()) {
    if (outputRule.metadata?.narrativeKey && !reportContentKeys.has(outputRule.metadata.narrativeKey)) {
      pushIssue(errors, `outputs.rules[${index}].metadata.narrativeKey`, `Unknown report content reference "${outputRule.metadata.narrativeKey}".`)
    }
  }

  for (const [index, derivedDimension] of derivedDimensions.entries()) {
    if (derivedDimension.computation.method === 'expression') {
      const expression = validatePredicateExpression(
        derivedDimension.computation.expression,
        `derivedDimensions[${index}].computation.expression`,
        questionIds,
        dimensionIds,
        derivedDimensionIds,
        integrityRuleIds,
        errors,
      )
      if (!expression) {
        pushIssue(errors, `derivedDimensions[${index}].computation.expression`, 'Derived dimension expressions must be structurally valid.')
      }
    }
    if (derivedDimension.computation.method === 'rule_reference' && derivedDimension.computation.ruleId && !scoringRuleIds.has(derivedDimension.computation.ruleId)) {
      pushIssue(errors, `derivedDimensions[${index}].computation.ruleId`, `Unknown scoring rule reference "${derivedDimension.computation.ruleId}".`)
    }
    if (derivedDimension.computation.method === 'formula' && !derivedDimension.computation.formula) {
      pushIssue(errors, `derivedDimensions[${index}].computation.formula`, 'Formula-based derived dimensions require a formula string.')
    }
  }

  summary.questionCount = questions.length
  summary.sectionCount = sections.length
  summary.dimensionCount = dimensions.length
  summary.derivedDimensionCount = derivedDimensions.length
  summary.responseModelCount = responseModels.length
  summary.transformCount = transforms.length + scoringRules.length
  summary.normalizationRuleCount = normalizationRules.length
  summary.integrityRuleCount = integrityRules.length
  summary.outputRuleCount = outputRules.length

  if (errors.length > 0) {
    return { ok: false, errors, warnings, summary, normalizedPackage: null }
  }

  const normalizedPackage: SonartraAssessmentPackageV2ValidatedImport = {
    packageVersion: '2',
    schemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
    metadata: {
      assessmentKey: asTrimmedString(metadataInput?.assessmentKey) ?? '',
      assessmentName: asTrimmedString(metadataInput?.assessmentName) ?? '',
      description: asTrimmedString(metadataInput?.description),
      locales: {
        defaultLocale,
        supportedLocales,
      },
      authoring: {
        author: asTrimmedString(metadataInput?.authoring && isRecord(metadataInput.authoring) ? metadataInput.authoring.author : null),
        organization: asTrimmedString(metadataInput?.authoring && isRecord(metadataInput.authoring) ? metadataInput.authoring.organization : null),
        source: asTrimmedString(metadataInput?.authoring && isRecord(metadataInput.authoring) ? metadataInput.authoring.source : null),
      },
      compatibility: {
        packageSemver: asTrimmedString(metadataInput?.compatibility && isRecord(metadataInput.compatibility) ? metadataInput.compatibility.packageSemver : null) ?? '0.0.0',
        contractVersion: '2',
        compatibleRuntimeRange: asTrimmedString(metadataInput?.compatibility && isRecord(metadataInput.compatibility) ? metadataInput.compatibility.compatibleRuntimeRange : null),
      },
      tags: asStringArray(metadataInput?.tags),
    },
    responseModels: {
      optionSets,
      models: responseModels,
    },
    questions,
    sections,
    dimensions,
    derivedDimensions,
    scoring: {
      transforms,
      rules: scoringRules,
    },
    normalization: {
      rules: normalizationRules,
    },
    integrity: {
      rules: integrityRules,
    },
    outputs: {
      rules: outputRules,
    },
    report: {
      content: reportContent,
    },
  }

  if (!normalizedPackage.metadata.assessmentKey) {
    pushIssue(errors, 'metadata.assessmentKey', 'assessmentKey is required.')
  }
  if (!normalizedPackage.metadata.assessmentName) {
    pushIssue(errors, 'metadata.assessmentName', 'assessmentName is required.')
  }
  if (!normalizedPackage.metadata.compatibility.packageSemver) {
    pushIssue(errors, 'metadata.compatibility.packageSemver', 'packageSemver is required.')
  }

  if (errors.length > 0) {
    return { ok: false, errors, warnings, summary, normalizedPackage: null }
  }

  return {
    ok: true,
    errors,
    warnings,
    summary,
    normalizedPackage,
  }
}

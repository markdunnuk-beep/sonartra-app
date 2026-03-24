import type {
  SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
  SonartraAssessmentPackageV2IntegrityBlock,
  SonartraAssessmentPackageV2IntegrityRule,
  SonartraAssessmentPackageV2NormalizationBlock,
  SonartraAssessmentPackageV2NormalizationRule,
  SonartraAssessmentPackageV2OutputBlock,
  SonartraAssessmentPackageV2OutputRule,
  SonartraAssessmentPackageV2PredicateExpression,
  SonartraAssessmentPackageV2ScoringBlock,
  SonartraAssessmentPackageV2ScoringRule,
  SonartraAssessmentPackageV2ScoringTransform,
  SonartraAssessmentPackageV2Section,
  SonartraAssessmentPackageV2ValidationIssue,
} from '@/lib/admin/domain/assessment-package-v2'
import { isRecord } from '@/lib/admin/domain/assessment-package-content'

export interface PackageContractV2Identity {
  assessmentKey: string
  slug: string
  versionLabel: string
  title: string
  shortDescription?: string | null
  category: string
  status?: 'draft' | 'active' | 'deprecated' | 'archived' | null
  supportedLanguages: {
    defaultLanguage: string
    supportedLanguages: string[]
  }
  authoring?: {
    author?: string | null
    organization?: string | null
    notes?: string | null
  }
  provenance?: {
    sourcePackageId?: string | null
    sourceRevision?: string | null
    importedFrom?: string | null
  }
  tags?: string[]
}

export interface PackageContractV2StructurePresentation {
  layout?: 'stacked' | 'paged' | 'matrix' | null
  emphasis?: 'standard' | 'supporting' | 'primary' | null
  runtimeIgnorable?: boolean | null
}

export interface PackageContractV2Section {
  id: string
  title: string
  description?: string | null
  order: number
  presentation?: PackageContractV2StructurePresentation | null
}

export interface PackageContractV2Option {
  id: string
  label: string
  order: number
  tags?: string[]
}

export interface PackageContractV2Question {
  id: string
  key: string
  text: string
  helpText?: string | null
  order: number
  sectionId: string
  type: 'single_select'
  options: PackageContractV2Option[]
  tags?: string[]
  presentation?: PackageContractV2StructurePresentation | null
}

export interface PackageContractV2Dimension {
  key: string
  label: string
  description?: string | null
  groupKey?: string | null
  family?: string | null
  order: number
  visibility?: 'visible' | 'hidden' | 'internal_only' | null
  reporting?: {
    audience?: 'individual' | 'team' | 'org' | 'internal' | null
    blockHint?: string | null
  }
}

export interface PackageContractV2DerivedDimensionInput {
  sourceType: 'dimension'
  key: string
  weight?: number | null
}

export interface PackageContractV2DerivedDimension {
  key: string
  label: string
  description?: string | null
  groupKey?: string | null
  family?: string | null
  order: number
  rule: {
    kind: 'weighted_average' | 'sum'
    inputs: PackageContractV2DerivedDimensionInput[]
  }
}

export interface PackageContractV2DimensionGroup {
  key: string
  label: string
  description?: string | null
  dimensionKeys: string[]
}

export interface PackageContractV2ScoringTarget {
  dimensionKey: string
  weight: number
}

export interface PackageContractV2OptionScoringMapping {
  questionId: string
  optionId: string
  targets: PackageContractV2ScoringTarget[]
}

export interface PackageContractV2ScoringBlock {
  optionMappings: PackageContractV2OptionScoringMapping[]
  transforms?: SonartraAssessmentPackageV2ScoringTransform[]
  rules?: SonartraAssessmentPackageV2ScoringRule[]
}

export interface PackageContractV2NormalizationGroup {
  id: string
  label: string
  dimensionKeys?: string[]
  derivedDimensionKeys?: string[]
  displayGroupKey?: string | null
  rankingGroupKey?: string | null
  comparisonOrder?: string[]
}

export interface PackageContractV2AggregationGroup {
  id: string
  label: string
  dimensionKeys: string[]
  comparisonBasis: 'shared_scale' | 'shared_construct'
}

export interface PackageContractV2DistributionGroup {
  id: string
  label: string
  dimensionKeys: string[]
}

export interface PackageContractV2RollupHint {
  id: string
  label: string
  comparableGroupId?: string | null
  distributionGroupId?: string | null
  teamRollup: 'mean' | 'median' | 'distribution'
}

export interface PackageContractV2AggregationBlock {
  comparableGroups: PackageContractV2AggregationGroup[]
  distributionGroups: PackageContractV2DistributionGroup[]
  rollupHints: PackageContractV2RollupHint[]
}

export interface PackageContractV2OutputBlockDeclaration {
  id: string
  key: string
  title: string
  type: 'summary' | 'warning' | 'flag' | 'report_section' | 'recommendation'
  priority?: number | null
  audience?: 'individual' | 'team' | 'org' | 'internal' | null
  condition: SonartraAssessmentPackageV2PredicateExpression
  dimensionKeys?: string[]
  derivedDimensionKeys?: string[]
  integrityRuleIds?: string[]
  reportBindingKey?: string | null
  severity?: 'info' | 'warning' | 'critical' | null
}

export interface PackageContractV2ReportBinding {
  key: string
  label: string
  contentRef?: string | null
  audience?: 'individual' | 'team' | 'org' | 'internal' | null
  severity?: string | null
  explanation?: string | null
}

export interface PackageContractV2Outputs {
  blocks: PackageContractV2OutputBlockDeclaration[]
  reportBindings: PackageContractV2ReportBinding[]
}

export interface PackageContractV2Canonical {
  packageVersion: '2'
  schemaVersion: typeof SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2
  identity: PackageContractV2Identity
  structure: {
    sections: PackageContractV2Section[]
    questions: PackageContractV2Question[]
  }
  dimensionCatalog: {
    dimensions: PackageContractV2Dimension[]
    derivedDimensions?: PackageContractV2DerivedDimension[]
    groups?: PackageContractV2DimensionGroup[]
  }
  scoring: PackageContractV2ScoringBlock
  integrity?: SonartraAssessmentPackageV2IntegrityBlock
  normalization?: {
    groups?: PackageContractV2NormalizationGroup[]
    rules?: SonartraAssessmentPackageV2NormalizationRule[]
  }
  aggregation?: PackageContractV2AggregationBlock
  outputs?: PackageContractV2Outputs
}

export interface CanonicalPackageContractV2NormalizationResult {
  ok: boolean
  errors: SonartraAssessmentPackageV2ValidationIssue[]
  warnings: SonartraAssessmentPackageV2ValidationIssue[]
  legacyPayload: Record<string, unknown> | null
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

function buildDerivedFormula(inputs: PackageContractV2DerivedDimensionInput[], kind: PackageContractV2DerivedDimension['rule']['kind']) {
  if (kind === 'sum') {
    return inputs.map((input) => input.key).join(' + ')
  }

  const weightedTerms = inputs.map((input) => {
    const weight = typeof input.weight === 'number' ? input.weight : 1
    return weight === 1 ? input.key : `${input.key} * ${weight}`
  })
  const denominator = inputs.reduce((sum, input) => sum + (typeof input.weight === 'number' ? input.weight : 1), 0)
  return denominator === 0 ? weightedTerms.join(' + ') : `(${weightedTerms.join(' + ')}) / ${denominator}`
}

function cloneQuestionOptions(question: PackageContractV2Question) {
  return question.options
    .slice()
    .sort((left, right) => left.order - right.order)
    .map((option) => ({
      id: option.id,
      label: option.label,
      value: null,
    }))
}

export function normalizeCanonicalPackageContractV2(input: unknown): CanonicalPackageContractV2NormalizationResult | null {
  if (!isRecord(input) || (!('identity' in input) && !('structure' in input) && !('dimensionCatalog' in input))) {
    return null
  }

  const errors: SonartraAssessmentPackageV2ValidationIssue[] = []
  const warnings: SonartraAssessmentPackageV2ValidationIssue[] = []

  if (input.packageVersion !== '2') {
    pushIssue(errors, 'packageVersion', 'Package Contract v2 requires packageVersion "2".')
  }

  const identity = isRecord(input.identity) ? input.identity : null
  if (!identity) {
    pushIssue(errors, 'identity', 'identity is required.')
  }

  const sectionsInput = isRecord(input.structure) && Array.isArray(input.structure.sections) ? input.structure.sections : null
  const questionsInput = isRecord(input.structure) && Array.isArray(input.structure.questions) ? input.structure.questions : null
  const dimensionsInput = isRecord(input.dimensionCatalog) && Array.isArray(input.dimensionCatalog.dimensions) ? input.dimensionCatalog.dimensions : null
  const derivedDimensionsInput = isRecord(input.dimensionCatalog) && Array.isArray(input.dimensionCatalog.derivedDimensions) ? input.dimensionCatalog.derivedDimensions : []
  const dimensionGroupsInput = isRecord(input.dimensionCatalog) && Array.isArray(input.dimensionCatalog.groups) ? input.dimensionCatalog.groups : []
  const scoring = isRecord(input.scoring) ? input.scoring : null
  const optionMappingsInput = scoring && Array.isArray(scoring.optionMappings) ? scoring.optionMappings : null

  if (!sectionsInput || sectionsInput.length === 0) pushIssue(errors, 'structure.sections', 'At least one section is required.')
  if (!questionsInput || questionsInput.length === 0) pushIssue(errors, 'structure.questions', 'At least one question is required.')
  if (!dimensionsInput || dimensionsInput.length === 0) pushIssue(errors, 'dimensionCatalog.dimensions', 'At least one raw dimension is required.')
  if (!optionMappingsInput || optionMappingsInput.length === 0) pushIssue(errors, 'scoring.optionMappings', 'At least one option scoring mapping is required.')

  const sectionIds = new Set<string>()
  const normalizedSections: SonartraAssessmentPackageV2Section[] = []
  for (const [index, entry] of (sectionsInput ?? []).entries()) {
    const path = `structure.sections[${index}]`
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
    normalizedSections.push({ id: id ?? `invalid-section-${index}`, title: title ?? '', description: asTrimmedString(entry.description), order: order ?? index + 1 })
  }

  const normalizedResponseModels: Array<Record<string, unknown>> = []
  const normalizedQuestions: Array<Record<string, unknown>> = []
  const questionIds = new Set<string>()
  const allQuestionOptionKeys = new Set<string>()
  const questionOptionLookup = new Map<string, Set<string>>()
  for (const [index, entry] of (questionsInput ?? []).entries()) {
    const path = `structure.questions[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Questions must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const key = asTrimmedString(entry.key)
    const text = asTrimmedString(entry.text)
    const order = asFiniteNumber(entry.order)
    const sectionId = asTrimmedString(entry.sectionId)
    const type = asTrimmedString(entry.type)
    if (!id) pushIssue(errors, `${path}.id`, 'Question id is required.')
    if (!key) pushIssue(errors, `${path}.key`, 'Question key is required.')
    if (!text) pushIssue(errors, `${path}.text`, 'Question text is required.')
    if (order === null) pushIssue(errors, `${path}.order`, 'Question order is required.')
    if (!sectionId) pushIssue(errors, `${path}.sectionId`, 'Question sectionId is required.')
    if (sectionId && !sectionIds.has(sectionId)) pushIssue(errors, `${path}.sectionId`, `Unknown section reference "${sectionId}".`)
    if (!type || type !== 'single_select') pushIssue(errors, `${path}.type`, 'Question type must currently be single_select.')
    if (id && questionIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate question id "${id}".`)
    if (id) questionIds.add(id)

    const options = Array.isArray(entry.options) ? entry.options : []
    if (options.length === 0) pushIssue(errors, `${path}.options`, 'Questions require one or more options.')
    const optionIds = new Set<string>()
    const normalizedOptions = options.map((option, optionIndex) => {
      const optionPath = `${path}.options[${optionIndex}]`
      if (!isRecord(option)) {
        pushIssue(errors, optionPath, 'Question options must be objects.')
        return { id: `invalid-option-${optionIndex}`, label: '', value: null }
      }
      const optionId = asTrimmedString(option.id)
      const label = asTrimmedString(option.label)
      const optionOrder = asFiniteNumber(option.order)
      if (!optionId) pushIssue(errors, `${optionPath}.id`, 'Option id is required.')
      if (!label) pushIssue(errors, `${optionPath}.label`, 'Option label is required.')
      if (optionOrder === null) pushIssue(errors, `${optionPath}.order`, 'Option order is required.')
      if (optionId && optionIds.has(optionId)) pushIssue(errors, `${optionPath}.id`, `Duplicate option id "${optionId}" within question "${id ?? path}".`)
      if (optionId) optionIds.add(optionId)
      if (id && optionId) allQuestionOptionKeys.add(`${id}::${optionId}`)
      return { id: optionId ?? `invalid-option-${optionIndex}`, label: label ?? '', value: optionOrder ?? optionIndex + 1 }
    })
    if (id) questionOptionLookup.set(id, optionIds)

    normalizedResponseModels.push({
      id: `${id ?? `invalid-question-${index}`}__single_select`,
      type: 'single_select',
      options: normalizedOptions,
    })
    normalizedQuestions.push({
      id: id ?? `invalid-question-${index}`,
      code: key ?? '',
      prompt: text ?? '',
      helpText: asTrimmedString(entry.helpText),
      responseModelId: `${id ?? `invalid-question-${index}`}__single_select`,
      sectionIds: sectionId ? [sectionId] : [],
      tags: asStringArray(entry.tags),
      scoring: [],
    })
  }

  const dimensionKeys = new Set<string>()
  const normalizedDimensions: Array<Record<string, unknown>> = []
  for (const [index, entry] of (dimensionsInput ?? []).entries()) {
    const path = `dimensionCatalog.dimensions[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Dimensions must be objects.')
      continue
    }
    const key = asTrimmedString(entry.key)
    const label = asTrimmedString(entry.label)
    const order = asFiniteNumber(entry.order)
    if (!key) pushIssue(errors, `${path}.key`, 'Dimension key is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Dimension label is required.')
    if (order === null) pushIssue(errors, `${path}.order`, 'Dimension order is required.')
    if (key && dimensionKeys.has(key)) pushIssue(errors, `${path}.key`, `Duplicate dimension key "${key}".`)
    if (key) dimensionKeys.add(key)
    normalizedDimensions.push({
      id: key ?? `invalid-dimension-${index}`,
      label: label ?? '',
      description: asTrimmedString(entry.description),
      scoringMethod: 'sum',
    })
  }

  const derivedDimensionKeys = new Set<string>()
  const normalizedDerivedDimensions: Array<Record<string, unknown>> = []
  for (const [index, entry] of derivedDimensionsInput.entries()) {
    const path = `dimensionCatalog.derivedDimensions[${index}]`
    if (!isRecord(entry) || !isRecord(entry.rule)) {
      pushIssue(errors, path, 'Derived dimensions must declare a structured rule.')
      continue
    }
    const key = asTrimmedString(entry.key)
    const label = asTrimmedString(entry.label)
    const order = asFiniteNumber(entry.order)
    const kind = asTrimmedString(entry.rule.kind)
    const inputs = Array.isArray(entry.rule.inputs) ? entry.rule.inputs : []
    if (!key) pushIssue(errors, `${path}.key`, 'Derived dimension key is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Derived dimension label is required.')
    if (order === null) pushIssue(errors, `${path}.order`, 'Derived dimension order is required.')
    if (!kind || !['weighted_average', 'sum'].includes(kind)) pushIssue(errors, `${path}.rule.kind`, 'Derived dimension rule kind is invalid.')
    if (key && derivedDimensionKeys.has(key)) pushIssue(errors, `${path}.key`, `Duplicate derived dimension key "${key}".`)
    if (key) derivedDimensionKeys.add(key)
    if (inputs.length === 0) pushIssue(errors, `${path}.rule.inputs`, 'Derived dimensions require one or more inputs.')
    const normalizedInputs: PackageContractV2DerivedDimensionInput[] = []
    for (const [inputIndex, inputEntry] of inputs.entries()) {
      const inputPath = `${path}.rule.inputs[${inputIndex}]`
      if (!isRecord(inputEntry)) {
        pushIssue(errors, inputPath, 'Derived dimension inputs must be objects.')
        continue
      }
      const sourceType = asTrimmedString(inputEntry.sourceType)
      const inputKey = asTrimmedString(inputEntry.key)
      const weight = inputEntry.weight === undefined ? 1 : asFiniteNumber(inputEntry.weight)
      if (sourceType !== 'dimension') pushIssue(errors, `${inputPath}.sourceType`, 'Derived dimension inputs currently support sourceType "dimension" only.')
      if (!inputKey) pushIssue(errors, `${inputPath}.key`, 'Derived dimension input key is required.')
      if (inputKey && !dimensionKeys.has(inputKey)) pushIssue(errors, `${inputPath}.key`, `Unknown dimension reference "${inputKey}".`)
      if (inputEntry.weight !== undefined && weight === null) pushIssue(errors, `${inputPath}.weight`, 'Derived dimension input weight must be numeric when provided.')
      if (inputKey) normalizedInputs.push({ sourceType: 'dimension', key: inputKey, weight: weight ?? 1 })
    }
    normalizedDerivedDimensions.push({
      id: key ?? `invalid-derived-dimension-${index}`,
      label: label ?? '',
      description: asTrimmedString(entry.description),
      computation: {
        method: 'formula',
        formula: buildDerivedFormula(normalizedInputs, (kind as PackageContractV2DerivedDimension['rule']['kind']) ?? 'weighted_average'),
        sourceDimensionIds: normalizedInputs.map((inputEntry) => inputEntry.key),
      },
    })
  }

  const groupKeys = new Set<string>()
  for (const [index, entry] of dimensionGroupsInput.entries()) {
    const path = `dimensionCatalog.groups[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Dimension groups must be objects.')
      continue
    }
    const key = asTrimmedString(entry.key)
    const label = asTrimmedString(entry.label)
    const memberKeys = asStringArray(entry.dimensionKeys)
    if (!key) pushIssue(errors, `${path}.key`, 'Dimension group key is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Dimension group label is required.')
    if (key && groupKeys.has(key)) pushIssue(errors, `${path}.key`, `Duplicate dimension group key "${key}".`)
    if (key) groupKeys.add(key)
    for (const memberKey of memberKeys) {
      if (!dimensionKeys.has(memberKey)) pushIssue(errors, `${path}.dimensionKeys`, `Unknown dimension reference "${memberKey}".`)
    }
  }

  const mappingKeys = new Set<string>()
  const mappingsByQuestion = new Map<string, Array<{ dimensionKey: string }>>()
  for (const [index, entry] of (optionMappingsInput ?? []).entries()) {
    const path = `scoring.optionMappings[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Option scoring mappings must be objects.')
      continue
    }
    const questionId = asTrimmedString(entry.questionId)
    const optionId = asTrimmedString(entry.optionId)
    const targets = Array.isArray(entry.targets) ? entry.targets : []
    if (!questionId) pushIssue(errors, `${path}.questionId`, 'questionId is required.')
    if (!optionId) pushIssue(errors, `${path}.optionId`, 'optionId is required.')
    if (questionId && !questionIds.has(questionId)) pushIssue(errors, `${path}.questionId`, `Unknown question reference "${questionId}".`)
    if (questionId && optionId && !questionOptionLookup.get(questionId)?.has(optionId)) {
      pushIssue(errors, `${path}.optionId`, `Unknown option reference "${optionId}" for question "${questionId}".`)
    }
    if (targets.length === 0) pushIssue(errors, `${path}.targets`, 'At least one scoring target is required.')
    const mappingKey = `${questionId ?? 'unknown'}::${optionId ?? 'unknown'}`
    if (mappingKeys.has(mappingKey)) pushIssue(errors, `${path}`, `Duplicate scoring mapping for ${mappingKey}.`)
    mappingKeys.add(mappingKey)

    const targetDimensions = new Set<string>()
    for (const [targetIndex, targetEntry] of targets.entries()) {
      const targetPath = `${path}.targets[${targetIndex}]`
      if (!isRecord(targetEntry)) {
        pushIssue(errors, targetPath, 'Scoring targets must be objects.')
        continue
      }
      const dimensionKey = asTrimmedString(targetEntry.dimensionKey)
      const weight = asFiniteNumber(targetEntry.weight)
      if (!dimensionKey) pushIssue(errors, `${targetPath}.dimensionKey`, 'dimensionKey is required.')
      if (!dimensionKey || !dimensionKeys.has(dimensionKey)) pushIssue(errors, `${targetPath}.dimensionKey`, `Unknown dimension reference "${dimensionKey}".`)
      if (weight === null) pushIssue(errors, `${targetPath}.weight`, 'weight must be numeric.')
      if (dimensionKey && targetDimensions.has(dimensionKey)) pushIssue(errors, `${targetPath}.dimensionKey`, `Duplicate target dimension "${dimensionKey}" in one mapping.`)
      if (dimensionKey) targetDimensions.add(dimensionKey)
      if (questionId && dimensionKey) {
        mappingsByQuestion.set(questionId, [...(mappingsByQuestion.get(questionId) ?? []), { dimensionKey }])
      }
    }
  }

  for (const optionKey of allQuestionOptionKeys) {
    if (!mappingKeys.has(optionKey)) {
      pushIssue(warnings, 'scoring.optionMappings', `No explicit scoring mapping was provided for ${optionKey}. This option will remain unmapped until later scoring stages fill it.`)
    }
  }

  const normalizedScoring: SonartraAssessmentPackageV2ScoringBlock = {
    transforms: Array.isArray(scoring?.transforms) ? scoring.transforms as SonartraAssessmentPackageV2ScoringTransform[] : [],
    rules: Array.isArray(scoring?.rules) ? scoring.rules as SonartraAssessmentPackageV2ScoringRule[] : [],
  }

  const responseModelById = new Map(normalizedResponseModels.map((model) => [String(model.id), model]))
  for (const mappingEntry of (optionMappingsInput ?? [])) {
    if (!isRecord(mappingEntry)) continue
    const questionId = asTrimmedString(mappingEntry.questionId)
    const optionId = asTrimmedString(mappingEntry.optionId)
    const targets = Array.isArray(mappingEntry.targets) ? mappingEntry.targets : []
    if (!questionId || !optionId) continue
    const responseModel = responseModelById.get(`${questionId}__single_select`)
    if (!responseModel || !Array.isArray(responseModel.options)) continue
    const option = responseModel.options.find((entry) => isRecord(entry) && entry.id === optionId)
    if (!option || !isRecord(option)) continue
    const scoreMap: Record<string, number> = isRecord(option.scoreMap) ? Object.fromEntries(Object.entries(option.scoreMap).filter(([, value]) => typeof value === 'number')) : {}
    for (const targetEntry of targets) {
      if (!isRecord(targetEntry)) continue
      const dimensionKey = asTrimmedString(targetEntry.dimensionKey)
      const weight = asFiniteNumber(targetEntry.weight)
      if (!dimensionKey || weight === null) continue
      scoreMap[dimensionKey] = weight
    }
    option.scoreMap = scoreMap
  }

  for (const question of normalizedQuestions) {
    if (!isRecord(question)) continue
    const questionId = asTrimmedString(question.id)
    if (!questionId) continue
    const dimensionBindings = [...new Set((mappingsByQuestion.get(questionId) ?? []).map((entry) => entry.dimensionKey))]
    question.scoring = dimensionBindings.map((dimensionId) => ({ dimensionId }))
  }

  const normalizationInput = isRecord(input.normalization) ? input.normalization : null
  const normalizationGroupsInput = normalizationInput && Array.isArray(normalizationInput.groups) ? normalizationInput.groups : []
  const normalizationRules = normalizationInput && Array.isArray(normalizationInput.rules)
    ? normalizationInput.rules as SonartraAssessmentPackageV2NormalizationRule[]
    : []
  const normalizationGroupIds = new Set<string>()
  for (const [index, entry] of normalizationGroupsInput.entries()) {
    const path = `normalization.groups[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Normalization groups must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const label = asTrimmedString(entry.label)
    const dimensionRefs = asStringArray(entry.dimensionKeys)
    const derivedRefs = asStringArray(entry.derivedDimensionKeys)
    const comparisonOrder = asStringArray(entry.comparisonOrder)
    if (!id) pushIssue(errors, `${path}.id`, 'Normalization group id is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Normalization group label is required.')
    if (id && normalizationGroupIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate normalization group id "${id}".`)
    if (id) normalizationGroupIds.add(id)
    if (dimensionRefs.length === 0 && derivedRefs.length === 0) pushIssue(errors, `${path}`, 'Normalization groups must reference at least one dimension or derived dimension.')
    for (const ref of dimensionRefs) {
      if (!dimensionKeys.has(ref)) pushIssue(errors, `${path}.dimensionKeys`, `Unknown dimension reference "${ref}".`)
    }
    for (const ref of derivedRefs) {
      if (!derivedDimensionKeys.has(ref)) pushIssue(errors, `${path}.derivedDimensionKeys`, `Unknown derived dimension reference "${ref}".`)
    }
    for (const ref of comparisonOrder) {
      if (!dimensionKeys.has(ref) && !derivedDimensionKeys.has(ref)) pushIssue(errors, `${path}.comparisonOrder`, `Unknown comparisonOrder reference "${ref}".`)
    }
  }

  const normalizedNormalization: SonartraAssessmentPackageV2NormalizationBlock = { rules: normalizationRules }

  const aggregationInput = isRecord(input.aggregation) ? input.aggregation : null
  const comparableGroups = aggregationInput && Array.isArray(aggregationInput.comparableGroups) ? aggregationInput.comparableGroups : []
  const distributionGroups = aggregationInput && Array.isArray(aggregationInput.distributionGroups) ? aggregationInput.distributionGroups : []
  const rollupHints = aggregationInput && Array.isArray(aggregationInput.rollupHints) ? aggregationInput.rollupHints : []
  const comparableGroupIds = new Set<string>()
  for (const [index, entry] of comparableGroups.entries()) {
    const path = `aggregation.comparableGroups[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Comparable groups must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const label = asTrimmedString(entry.label)
    const refs = asStringArray(entry.dimensionKeys)
    if (!id) pushIssue(errors, `${path}.id`, 'Comparable group id is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Comparable group label is required.')
    if (id && comparableGroupIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate comparable group id "${id}".`)
    if (id) comparableGroupIds.add(id)
    if (refs.length === 0) pushIssue(errors, `${path}.dimensionKeys`, 'Comparable groups require one or more dimension keys.')
    for (const ref of refs) {
      if (!dimensionKeys.has(ref) && !derivedDimensionKeys.has(ref)) pushIssue(errors, `${path}.dimensionKeys`, `Unknown aggregation dimension reference "${ref}".`)
    }
  }

  const distributionGroupIds = new Set<string>()
  for (const [index, entry] of distributionGroups.entries()) {
    const path = `aggregation.distributionGroups[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Distribution groups must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const refs = asStringArray(entry.dimensionKeys)
    if (!id) pushIssue(errors, `${path}.id`, 'Distribution group id is required.')
    if (id && distributionGroupIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate distribution group id "${id}".`)
    if (id) distributionGroupIds.add(id)
    for (const ref of refs) {
      if (!dimensionKeys.has(ref) && !derivedDimensionKeys.has(ref)) pushIssue(errors, `${path}.dimensionKeys`, `Unknown distribution dimension reference "${ref}".`)
    }
  }

  for (const [index, entry] of rollupHints.entries()) {
    const path = `aggregation.rollupHints[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Rollup hints must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const label = asTrimmedString(entry.label)
    const teamRollup = asTrimmedString(entry.teamRollup)
    const comparableGroupId = asTrimmedString(entry.comparableGroupId)
    const distributionGroupId = asTrimmedString(entry.distributionGroupId)
    if (!id) pushIssue(errors, `${path}.id`, 'Rollup hint id is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Rollup hint label is required.')
    if (!teamRollup || !['mean', 'median', 'distribution'].includes(teamRollup)) pushIssue(errors, `${path}.teamRollup`, 'Rollup hint teamRollup is invalid.')
    if (comparableGroupId && !comparableGroupIds.has(comparableGroupId)) pushIssue(errors, `${path}.comparableGroupId`, `Unknown comparableGroupId "${comparableGroupId}".`)
    if (distributionGroupId && !distributionGroupIds.has(distributionGroupId)) pushIssue(errors, `${path}.distributionGroupId`, `Unknown distributionGroupId "${distributionGroupId}".`)
  }

  const integrityBlock: SonartraAssessmentPackageV2IntegrityBlock = {
    rules: isRecord(input.integrity) && Array.isArray(input.integrity.rules)
      ? input.integrity.rules as SonartraAssessmentPackageV2IntegrityRule[]
      : [],
  }

  const outputsInput = isRecord(input.outputs) ? input.outputs : null
  const outputBlocks = outputsInput && Array.isArray(outputsInput.blocks) ? outputsInput.blocks : []
  const reportBindings = outputsInput && Array.isArray(outputsInput.reportBindings) ? outputsInput.reportBindings : []
  const outputRules: SonartraAssessmentPackageV2OutputRule[] = []
  const reportContent: Array<Record<string, unknown>> = []
  const reportBindingKeys = new Set<string>()
  for (const [index, entry] of reportBindings.entries()) {
    const path = `outputs.reportBindings[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Report bindings must be objects.')
      continue
    }
    const key = asTrimmedString(entry.key)
    const label = asTrimmedString(entry.label)
    if (!key) pushIssue(errors, `${path}.key`, 'Report binding key is required.')
    if (!label) pushIssue(errors, `${path}.label`, 'Report binding label is required.')
    if (key && reportBindingKeys.has(key)) pushIssue(errors, `${path}.key`, `Duplicate report binding key "${key}".`)
    if (key) reportBindingKeys.add(key)
    reportContent.push({
      key: key ?? `invalid-report-binding-${index}`,
      label: label ?? '',
      contentRef: asTrimmedString(entry.contentRef),
      severity: asTrimmedString(entry.severity),
      explanation: asTrimmedString(entry.explanation),
    })
  }

  const outputBlockIds = new Set<string>()
  for (const [index, entry] of outputBlocks.entries()) {
    const path = `outputs.blocks[${index}]`
    if (!isRecord(entry)) {
      pushIssue(errors, path, 'Output blocks must be objects.')
      continue
    }
    const id = asTrimmedString(entry.id)
    const key = asTrimmedString(entry.key)
    const title = asTrimmedString(entry.title)
    const type = asTrimmedString(entry.type)
    const reportBindingKey = asTrimmedString(entry.reportBindingKey)
    const dimensionRefs = asStringArray(entry.dimensionKeys)
    const derivedRefs = asStringArray(entry.derivedDimensionKeys)
    const integrityRuleIds = asStringArray(entry.integrityRuleIds)
    if (!id) pushIssue(errors, `${path}.id`, 'Output block id is required.')
    if (!key) pushIssue(errors, `${path}.key`, 'Output block key is required.')
    if (!title) pushIssue(errors, `${path}.title`, 'Output block title is required.')
    if (!type || !['summary', 'warning', 'flag', 'report_section', 'recommendation'].includes(type)) pushIssue(errors, `${path}.type`, 'Output block type is invalid.')
    if (id && outputBlockIds.has(id)) pushIssue(errors, `${path}.id`, `Duplicate output block id "${id}".`)
    if (id) outputBlockIds.add(id)
    for (const ref of dimensionRefs) {
      if (!dimensionKeys.has(ref)) pushIssue(errors, `${path}.dimensionKeys`, `Unknown dimension reference "${ref}".`)
    }
    for (const ref of derivedRefs) {
      if (!derivedDimensionKeys.has(ref)) pushIssue(errors, `${path}.derivedDimensionKeys`, `Unknown derived dimension reference "${ref}".`)
    }
    for (const integrityRuleId of integrityRuleIds) {
      if (!integrityBlock.rules.some((rule) => rule.id === integrityRuleId)) pushIssue(errors, `${path}.integrityRuleIds`, `Unknown integrity rule reference "${integrityRuleId}".`)
    }
    if (reportBindingKey && !reportBindingKeys.has(reportBindingKey)) pushIssue(errors, `${path}.reportBindingKey`, `Unknown report binding reference "${reportBindingKey}".`)
    outputRules.push({
      id: id ?? `invalid-output-${index}`,
      key: key ?? '',
      type: (type as SonartraAssessmentPackageV2OutputRule['type']) ?? 'summary',
      predicate: (entry.condition as SonartraAssessmentPackageV2PredicateExpression) ?? {
        type: 'comparison',
        operator: 'eq',
        left: { type: 'constant', value: true },
        right: { type: 'constant', value: true },
      },
      severity: (asTrimmedString(entry.severity) as SonartraAssessmentPackageV2OutputRule['severity']) ?? null,
      metadata: {
        label: title ?? '',
        narrativeKey: reportBindingKey,
      },
    })
  }

  const normalizedOutputs: SonartraAssessmentPackageV2OutputBlock = { rules: outputRules }

  const legacyPayload: Record<string, unknown> = {
    packageVersion: '2',
    schemaVersion: input.schemaVersion,
    metadata: {
      assessmentKey: asTrimmedString(identity?.assessmentKey),
      assessmentName: asTrimmedString(identity?.title),
      slug: asTrimmedString(identity?.slug),
      category: asTrimmedString(identity?.category),
      description: asTrimmedString(identity?.shortDescription),
      locales: {
        defaultLocale: asTrimmedString(identity?.supportedLanguages && isRecord(identity.supportedLanguages) ? identity.supportedLanguages.defaultLanguage : null),
        supportedLocales: asStringArray(identity?.supportedLanguages && isRecord(identity.supportedLanguages) ? identity.supportedLanguages.supportedLanguages : null),
      },
      authoring: {
        author: asTrimmedString(identity?.authoring && isRecord(identity.authoring) ? identity.authoring.author : null),
        organization: asTrimmedString(identity?.authoring && isRecord(identity.authoring) ? identity.authoring.organization : null),
        source: asTrimmedString(identity?.provenance && isRecord(identity.provenance) ? identity.provenance.importedFrom : null),
      },
      compatibility: {
        packageSemver: asTrimmedString(identity?.versionLabel),
        contractVersion: '2',
      },
      tags: asStringArray(identity?.tags),
    },
    responseModels: {
      optionSets: [],
      models: normalizedResponseModels,
    },
    sections: normalizedSections,
    questions: normalizedQuestions,
    dimensions: normalizedDimensions,
    derivedDimensions: normalizedDerivedDimensions,
    scoring: normalizedScoring,
    normalization: normalizedNormalization,
    integrity: integrityBlock,
    outputs: normalizedOutputs,
    report: {
      content: reportContent,
    },
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    legacyPayload,
  }
}

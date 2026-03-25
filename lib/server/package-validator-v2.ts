import {
  isSonartraAssessmentPackageV2,
  type SonartraAssessmentPackageV2,
  type SonartraAssessmentPackageV2Option,
  type SonartraAssessmentPackageV2Question,
} from '@/lib/contracts/package-contract-v2'

interface ValidatePackageV2Result {
  valid: boolean
  errors: string[]
  normalized?: SonartraAssessmentPackageV2
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeId(value: string): string {
  return value.trim()
}

function normalizeSignalKey(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeDomain(value: string | undefined): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim().toLowerCase()
  return trimmed.length > 0 ? trimmed : undefined
}

function compareByOrderThenId<T extends { order: number; id: string }>(left: T, right: T): number {
  return left.order - right.order || left.id.localeCompare(right.id)
}

function ensureUniqueIds(items: Array<{ id: string }>, label: string, errors: string[]): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (seen.has(item.id)) {
      errors.push(`Duplicate ${label} id: ${item.id}`)
      continue
    }

    seen.add(item.id)
  }
}

function validateOrderConsistency<T extends { order: number; id: string }>(items: T[], label: string, errors: string[]): void {
  const duplicateOrderIndex = new Map<number, string>()
  const sorted = [...items].sort(compareByOrderThenId)

  for (const item of sorted) {
    const existing = duplicateOrderIndex.get(item.order)
    if (existing) {
      errors.push(`Duplicate ${label} order ${item.order} for ids ${existing} and ${item.id}`)
      continue
    }

    duplicateOrderIndex.set(item.order, item.id)
  }

  for (let index = 0; index < sorted.length; index += 1) {
    const expectedOrder = index + 1
    if (sorted[index].order !== expectedOrder) {
      errors.push(`${label} order must be contiguous starting at 1`)
      break
    }
  }
}

function validateQuestionOrderingWithinSets(questions: SonartraAssessmentPackageV2Question[], errors: string[]): void {
  const questionsBySet = new Map<string, SonartraAssessmentPackageV2Question[]>()

  for (const question of questions) {
    const group = questionsBySet.get(question.questionSetId) ?? []
    group.push(question)
    questionsBySet.set(question.questionSetId, group)
  }

  for (const [questionSetId, groupedQuestions] of questionsBySet.entries()) {
    validateOrderConsistency(groupedQuestions, `question in set ${questionSetId}`, errors)
  }
}

function validateOptionOrderingWithinQuestions(options: SonartraAssessmentPackageV2Option[], errors: string[]): void {
  const optionsByQuestion = new Map<string, SonartraAssessmentPackageV2Option[]>()

  for (const option of options) {
    const group = optionsByQuestion.get(option.questionId) ?? []
    group.push(option)
    optionsByQuestion.set(option.questionId, group)
  }

  for (const [questionId, groupedOptions] of optionsByQuestion.entries()) {
    validateOrderConsistency(groupedOptions, `option in question ${questionId}`, errors)
  }
}

export function validatePackageV2(pkg: unknown): ValidatePackageV2Result {
  const errors: string[] = []

  if (!isSonartraAssessmentPackageV2(pkg)) {
    return {
      valid: false,
      errors: ['Payload does not match SonartraAssessmentPackageV2 shape.'],
    }
  }

  const normalized: SonartraAssessmentPackageV2 = {
    metadata: {
      definitionId: normalizeId(pkg.metadata.definitionId),
      version: normalizeText(pkg.metadata.version),
      title: normalizeText(pkg.metadata.title),
      description: pkg.metadata.description ? normalizeText(pkg.metadata.description) : undefined,
    },
    questionSets: pkg.questionSets
      .map((entry) => ({
        id: normalizeId(entry.id),
        title: normalizeText(entry.title),
        order: entry.order,
      }))
      .sort(compareByOrderThenId),
    questions: pkg.questions
      .map((entry) => ({
        id: normalizeId(entry.id),
        questionSetId: normalizeId(entry.questionSetId),
        text: normalizeText(entry.text),
        order: entry.order,
      }))
      .sort(compareByOrderThenId),
    options: pkg.options
      .map((entry) => ({
        id: normalizeId(entry.id),
        questionId: normalizeId(entry.questionId),
        text: normalizeText(entry.text),
        order: entry.order,
      }))
      .sort(compareByOrderThenId),
    signalMappings: pkg.signalMappings
      .map((entry) => ({
        optionId: normalizeId(entry.optionId),
        signalKey: normalizeSignalKey(entry.signalKey),
        weight: entry.weight,
        domain: normalizeDomain(entry.domain),
      }))
      .sort((left, right) => left.optionId.localeCompare(right.optionId) || left.signalKey.localeCompare(right.signalKey)),
    scoring: { method: 'weighted_sum' },
    normalization: { method: 'percentage_distribution', enforceTotal: 100 },
    output: {
      generateRankings: pkg.output.generateRankings,
      generateDomainSummaries: pkg.output.generateDomainSummaries,
      generateOverview: pkg.output.generateOverview,
    },
  }

  ensureUniqueIds(normalized.questionSets, 'questionSet', errors)
  ensureUniqueIds(normalized.questions, 'question', errors)
  ensureUniqueIds(normalized.options, 'option', errors)

  validateOrderConsistency(normalized.questionSets, 'questionSet', errors)
  validateQuestionOrderingWithinSets(normalized.questions, errors)
  validateOptionOrderingWithinQuestions(normalized.options, errors)

  const questionSetIds = new Set(normalized.questionSets.map((entry) => entry.id))
  const questionIds = new Set(normalized.questions.map((entry) => entry.id))
  const optionIds = new Set(normalized.options.map((entry) => entry.id))

  for (const question of normalized.questions) {
    if (!questionSetIds.has(question.questionSetId)) {
      errors.push(`Question ${question.id} references unknown questionSetId ${question.questionSetId}`)
    }
  }

  for (const option of normalized.options) {
    if (!questionIds.has(option.questionId)) {
      errors.push(`Option ${option.id} references unknown questionId ${option.questionId}`)
    }
  }

  const optionsByQuestion = new Map<string, SonartraAssessmentPackageV2Option[]>()
  for (const option of normalized.options) {
    const list = optionsByQuestion.get(option.questionId) ?? []
    list.push(option)
    optionsByQuestion.set(option.questionId, list)
  }

  for (const question of normalized.questions) {
    if ((optionsByQuestion.get(question.id) ?? []).length < 1) {
      errors.push(`Question ${question.id} must have at least one option`)
    }
  }

  const mappingsByOption = new Map<string, typeof normalized.signalMappings>()
  for (const mapping of normalized.signalMappings) {
    if (!optionIds.has(mapping.optionId)) {
      errors.push(`Signal mapping references unknown optionId ${mapping.optionId}`)
      continue
    }

    if (!Number.isFinite(mapping.weight)) {
      errors.push(`Signal mapping weight for optionId ${mapping.optionId} must be numeric`)
    }

    const list = mappingsByOption.get(mapping.optionId) ?? []
    list.push(mapping)
    mappingsByOption.set(mapping.optionId, list)
  }

  for (const option of normalized.options) {
    if ((mappingsByOption.get(option.id) ?? []).length < 1) {
      errors.push(`Option ${option.id} must have at least one signal mapping`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized,
  }
}

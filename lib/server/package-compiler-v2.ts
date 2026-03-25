import type {
  SonartraAssessmentPackageV2,
  SonartraAssessmentPackageV2Option,
  SonartraAssessmentPackageV2Question,
} from '@/lib/contracts/package-contract-v2'
import type {
  SonartraRuntimeContractV2,
  SonartraRuntimeContractV2CompiledOption,
  SonartraRuntimeContractV2CompiledSignalMapping,
} from '@/lib/contracts/runtime-contract-v2'

function compareByOrderThenId<T extends { order: number; id: string }>(left: T, right: T): number {
  return left.order - right.order || left.id.localeCompare(right.id)
}

function createQuestionIndex(questions: SonartraAssessmentPackageV2Question[]): Map<string, SonartraAssessmentPackageV2Question> {
  return new Map(questions.map((question) => [question.id, question]))
}

function createOptionsByQuestion(options: SonartraAssessmentPackageV2Option[]): Map<string, SonartraAssessmentPackageV2Option[]> {
  const grouped = new Map<string, SonartraAssessmentPackageV2Option[]>()

  for (const option of options) {
    const list = grouped.get(option.questionId) ?? []
    list.push(option)
    grouped.set(option.questionId, list)
  }

  for (const [questionId, list] of grouped.entries()) {
    grouped.set(questionId, [...list].sort(compareByOrderThenId))
  }

  return grouped
}

export function compilePackageToRuntimeContract(pkg: SonartraAssessmentPackageV2): SonartraRuntimeContractV2 {
  const sortedQuestions = [...pkg.questions].sort(compareByOrderThenId)
  const sortedOptions = [...pkg.options].sort(compareByOrderThenId)
  const questionIndex = createQuestionIndex(sortedQuestions)
  const optionsByQuestion = createOptionsByQuestion(sortedOptions)

  const optionToQuestionId = new Map<string, string>()
  for (const option of sortedOptions) {
    if (!questionIndex.has(option.questionId)) {
      throw new Error(`Compiler invariant: option ${option.id} has unresolved question ${option.questionId}`)
    }

    optionToQuestionId.set(option.id, option.questionId)
  }

  const compiledOptions: SonartraRuntimeContractV2CompiledOption[] = sortedOptions.map((option) => ({
    id: option.id,
    questionId: option.questionId,
    text: option.text,
    order: option.order,
  }))

  const compiledSignalMappings = new Map<string, SonartraRuntimeContractV2CompiledSignalMapping[]>()

  const sortedMappings = [...pkg.signalMappings].sort((left, right) => {
    const leftQuestionId = optionToQuestionId.get(left.optionId) ?? ''
    const rightQuestionId = optionToQuestionId.get(right.optionId) ?? ''
    return leftQuestionId.localeCompare(rightQuestionId)
      || left.optionId.localeCompare(right.optionId)
      || left.signalKey.localeCompare(right.signalKey)
  })

  const signalDomainRegistry = new Map<string, Set<string>>()

  for (const mapping of sortedMappings) {
    const questionId = optionToQuestionId.get(mapping.optionId)
    if (!questionId) {
      throw new Error(`Compiler invariant: mapping for option ${mapping.optionId} cannot resolve question`)
    }

    const perQuestion = compiledSignalMappings.get(questionId) ?? []
    perQuestion.push({
      optionId: mapping.optionId,
      signalKey: mapping.signalKey,
      weight: mapping.weight,
      domain: mapping.domain,
    })
    compiledSignalMappings.set(questionId, perQuestion)

    const domains = signalDomainRegistry.get(mapping.signalKey) ?? new Set<string>()
    if (mapping.domain) {
      domains.add(mapping.domain)
    }
    signalDomainRegistry.set(mapping.signalKey, domains)
  }

  const signalKeys = [...signalDomainRegistry.keys()].sort((left, right) => left.localeCompare(right))
  const domains = [...new Set(
    signalKeys.flatMap((signalKey) => [...(signalDomainRegistry.get(signalKey) ?? new Set<string>())]),
  )].sort((left, right) => left.localeCompare(right))

  const compiledQuestions = sortedQuestions.map((question) => ({
    id: question.id,
    questionSetId: question.questionSetId,
    text: question.text,
    order: question.order,
    options: (optionsByQuestion.get(question.id) ?? []).map((option) => ({
      id: option.id,
      questionId: option.questionId,
      text: option.text,
      order: option.order,
    })),
  }))

  const compiledSignalMappingsRecord: SonartraRuntimeContractV2['compiledSignalMappings'] = {}
  for (const question of compiledQuestions) {
    compiledSignalMappingsRecord[question.id] = [...(compiledSignalMappings.get(question.id) ?? [])]
  }

  return {
    metadata: {
      definitionId: pkg.metadata.definitionId,
      version: pkg.metadata.version,
      title: pkg.metadata.title,
      description: pkg.metadata.description,
    },
    compiledQuestions,
    compiledOptions,
    compiledSignalMappings: compiledSignalMappingsRecord,
    signalRegistry: {
      signalKeys,
      domains,
      entries: signalKeys.map((signalKey) => ({
        signalKey,
        domains: [...(signalDomainRegistry.get(signalKey) ?? new Set<string>())].sort((left, right) => left.localeCompare(right)),
      })),
    },
    scoringConfig: { method: pkg.scoring.method },
    normalizationConfig: {
      method: pkg.normalization.method,
      enforceTotal: pkg.normalization.enforceTotal,
    },
    normalizationPrep: {
      expectedSignalKeys: signalKeys,
      expectedDomains: domains,
      method: pkg.normalization.method,
    },
    outputConfig: {
      generateRankings: pkg.output.generateRankings,
      generateDomainSummaries: pkg.output.generateDomainSummaries,
      generateOverview: pkg.output.generateOverview,
    },
  }
}

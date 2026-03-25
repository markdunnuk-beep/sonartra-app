import { readFileSync } from 'node:fs'
import { validatePackageV2 } from '../lib/server/package-validator-v2'
import { compilePackageToRuntimeContract } from '../lib/server/package-compiler-v2'

type LitePackage = {
  assessmentId?: string
  metadata?: { assessmentName?: string; version?: string; compatibility?: { packageSemver?: string }; description?: string }
  sections: Array<{ id: string; title?: string; name?: string }>
  questions: Array<{ id: string; prompt: string; sectionIds?: string[]; responseModelId: string; scoring?: Array<{ dimensionId?: string }> }>
  responseModels: { models: Array<{ id: string; options?: Array<{ id: string; label?: string; value?: number | string; scoreMap?: Record<string, number> }> }> }
}

const source = JSON.parse(
  readFileSync('./tests/fixtures/package-contract-v2-wplp80-lite.json', 'utf8'),
) as LitePackage

const questionSets = source.sections.map((section, index) => ({
  id: section.id,
  title: section.title ?? section.name ?? section.id,
  order: index + 1,
}))

const responseModelsById = new Map(source.responseModels.models.map((model) => [model.id, model]))

const questionOrderBySet = new Map<string, number>()

const questions = source.questions.map((question) => {
  const questionSetId = question.sectionIds?.[0] ?? questionSets[0]?.id ?? 'default'
  const nextOrder = (questionOrderBySet.get(questionSetId) ?? 0) + 1
  questionOrderBySet.set(questionSetId, nextOrder)

  return {
    id: question.id,
    questionSetId,
    text: question.prompt,
    order: nextOrder,
  }
})

const options: Array<{ id: string; questionId: string; text: string; order: number }> = []
const signalMappings: Array<{ optionId: string; signalKey: string; weight: number; domain: string | null }> = []

for (const question of source.questions) {
  const model = responseModelsById.get(question.responseModelId)
  const modelOptions = Array.isArray(model?.options) ? model.options : []

  modelOptions.forEach((option, index) => {
    const optionId = `${question.id}__${option.id}`

    options.push({
      id: optionId,
      questionId: question.id,
      text: option.label ?? String(option.value ?? option.id),
      order: index + 1,
    })

    const entries = Object.entries(option.scoreMap ?? {}).filter(([, weight]) => Number.isFinite(Number(weight)))

    if (entries.length === 0) {
      signalMappings.push({
        optionId,
        signalKey: question.scoring?.[0]?.dimensionId ?? 'unmapped.signal',
        weight: 1,
        domain: question.sectionIds?.[0] ?? null,
      })
      return
    }

    entries.forEach(([signalKey, weight]) => {
      signalMappings.push({
        optionId,
        signalKey,
        weight: Number(weight),
        domain: question.sectionIds?.[0] ?? null,
      })
    })
  })
}

const packageV2Payload = {
  metadata: {
    definitionId: source.assessmentId ?? 'wplp80-lite',
    version: source.metadata?.version ?? source.metadata?.compatibility?.packageSemver ?? '1.0.0',
    title: source.metadata?.assessmentName ?? 'WPLP-80 Lite',
    description: source.metadata?.description ?? undefined,
  },
  questionSets,
  questions,
  options,
  signalMappings,
  scoring: { method: 'weighted_sum' as const },
  normalization: { method: 'percentage_distribution' as const, enforceTotal: 100 },
  output: { generateRankings: true, generateDomainSummaries: true, generateOverview: true },
}

const validation = validatePackageV2(packageV2Payload)

if (!validation.valid || !validation.normalized) {
  console.error(JSON.stringify({ ok: false, errors: validation.errors }, null, 2))
  process.exit(1)
}

const runtime = compilePackageToRuntimeContract(validation.normalized)
const mappings = Object.values(runtime.compiledSignalMappings).flat()

const summary = {
  definitionId: runtime.metadata.definitionId,
  version: runtime.metadata.version,
  questionSetCount: new Set(runtime.compiledQuestions.map((question) => question.questionSetId)).size,
  questionCount: runtime.compiledQuestions.length,
  optionCount: runtime.compiledOptions.length,
  mappingCount: mappings.length,
  everyQuestionHasFourOptions: runtime.compiledQuestions.every((question) => question.options.length === 4),
  everyOptionResolvesToQuestion: runtime.compiledOptions.every((option) => runtime.compiledQuestions.some((question) => question.id === option.questionId)),
  everyOptionHasAtLeastOneMapping: runtime.compiledOptions.every((option) => mappings.some((mapping) => mapping.optionId === option.id)),
  uniqueSignalKeyCount: runtime.signalRegistry.signalKeys.length,
  uniqueDomainCount: runtime.signalRegistry.domains.length,
  domains: runtime.signalRegistry.domains,
  deterministicQuestionOrdering: runtime.compiledQuestions.every((question, index, all) => {
    if (index === 0) {
      return true
    }

    const previous = all[index - 1]
    return previous.order < question.order || (previous.order === question.order && previous.id.localeCompare(question.id) <= 0)
  }),
  blankIds: [...runtime.compiledQuestions.map((question) => question.id), ...runtime.compiledOptions.map((option) => option.id)].filter((id) => !id.trim()).length,
  malformedTextValues: [...runtime.compiledQuestions.map((question) => question.text), ...runtime.compiledOptions.map((option) => option.text)].filter((text) => !text.trim()).length,
  normalizationPrep: runtime.normalizationPrep,
}

console.log(JSON.stringify({ ok: true, summary }, null, 2))

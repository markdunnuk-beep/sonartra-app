import type { RuntimeV2ExecutionModel } from '@/lib/server/runtime-v2-repository'

export type RuntimeV2AssessmentExecutionModel = RuntimeV2ExecutionModel

export interface RuntimeV2ResponseInput {
  questionId: string
  optionId: string
}

export interface RuntimeV2UnmatchedResponse {
  questionId: string
  optionId: string
  reason: string
}

export interface RuntimeV2ScoringResult {
  rawSignalScores: Record<string, number>
  domainSignalScores: Record<string, Record<string, number>>
  answeredQuestionCount: number
  matchedResponseCount: number
  unmatchedResponses: RuntimeV2UnmatchedResponse[]
}

function toFiniteNumber(value: unknown): number {
  const numeric = typeof value === 'string' ? Number(value) : (typeof value === 'number' ? value : Number.NaN)
  return Number.isFinite(numeric) ? numeric : 0
}

function buildAllowedOptionIndex(executionModel: RuntimeV2AssessmentExecutionModel): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>()

  for (const [questionId, options] of Object.entries(executionModel.optionsByQuestionId)) {
    index.set(questionId, new Set(options.map((option) => option.option_id)))
  }

  return index
}

function buildMappingIndex(executionModel: RuntimeV2AssessmentExecutionModel): Map<string, Array<{ signalKey: string; domain: string | null; weight: number }>> {
  const index = new Map<string, Array<{ signalKey: string; domain: string | null; weight: number }>>()

  for (const mappings of Object.values(executionModel.mappingsByQuestionId)) {
    for (const mapping of mappings) {
      const key = `${mapping.question_id}::${mapping.option_id}`
      const list = index.get(key) ?? []
      list.push({
        signalKey: mapping.signal_key,
        domain: mapping.domain,
        weight: toFiniteNumber(mapping.weight),
      })
      index.set(key, list)
    }
  }

  return index
}

export function scoreRuntimeV2Assessment(args: {
  runtimeVersionId: string
  responses: RuntimeV2ResponseInput[]
  executionModel: RuntimeV2AssessmentExecutionModel
}): RuntimeV2ScoringResult {
  const optionIndex = buildAllowedOptionIndex(args.executionModel)
  const mappingIndex = buildMappingIndex(args.executionModel)
  const uniqueResponsesByQuestion = new Map<string, string>()

  for (const response of args.responses) {
    if (!uniqueResponsesByQuestion.has(response.questionId)) {
      uniqueResponsesByQuestion.set(response.questionId, response.optionId)
    }
  }

  const rawSignalScores: Record<string, number> = {}
  const domainSignalScores: Record<string, Record<string, number>> = {}
  const unmatchedResponses: RuntimeV2UnmatchedResponse[] = []
  let matchedResponseCount = 0

  for (const [questionId, optionId] of uniqueResponsesByQuestion.entries()) {
    const allowedOptions = optionIndex.get(questionId)
    if (!allowedOptions) {
      unmatchedResponses.push({ questionId, optionId, reason: 'question_not_found_in_runtime_v2_execution_model' })
      continue
    }

    if (!allowedOptions.has(optionId)) {
      unmatchedResponses.push({ questionId, optionId, reason: 'option_not_found_for_question_in_runtime_v2_execution_model' })
      continue
    }

    const mappings = mappingIndex.get(`${questionId}::${optionId}`)
    if (!mappings || mappings.length === 0) {
      unmatchedResponses.push({ questionId, optionId, reason: 'no_signal_mapping_for_question_option_in_runtime_v2_execution_model' })
      continue
    }

    matchedResponseCount += 1
    for (const mapping of mappings) {
      rawSignalScores[mapping.signalKey] = (rawSignalScores[mapping.signalKey] ?? 0) + mapping.weight
      if (mapping.domain) {
        const domainBucket = domainSignalScores[mapping.domain] ?? {}
        domainBucket[mapping.signalKey] = (domainBucket[mapping.signalKey] ?? 0) + mapping.weight
        domainSignalScores[mapping.domain] = domainBucket
      }
    }
  }

  return {
    rawSignalScores,
    domainSignalScores,
    answeredQuestionCount: uniqueResponsesByQuestion.size,
    matchedResponseCount,
    unmatchedResponses,
  }
}

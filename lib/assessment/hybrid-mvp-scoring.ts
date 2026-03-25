import { buildHybridMvpTemplatedReport } from '@/lib/assessment/hybrid-mvp-output'

export const HYBRID_MVP_CONTRACT_VERSION = 'hybrid_mvp_v1' as const

export interface HybridMvpSignalDefinition {
  id: string
  key: string
  label: string
  domainId: string | null
}

export interface HybridMvpDomainDefinition {
  id: string
  key: string
  label: string
}

export interface HybridMvpSignalWeight {
  signalId: string
  weight: number
}

export interface HybridMvpQuestionOption {
  id: string
  label: string
  signalWeights: HybridMvpSignalWeight[]
}

export type HybridMvpResponseModel = 'single_select' | 'multi_select'

export interface HybridMvpQuestionDefinition {
  id: string
  prompt: string
  responseModel: HybridMvpResponseModel
  options: HybridMvpQuestionOption[]
  required?: boolean
}

export interface HybridMvpAssessmentDefinition {
  contractVersion: typeof HYBRID_MVP_CONTRACT_VERSION
  assessmentId: string
  assessmentKey: string
  signals: HybridMvpSignalDefinition[]
  domains: HybridMvpDomainDefinition[]
  questions: HybridMvpQuestionDefinition[]
  outputTemplates?: {
    overview?: {
      highPerformer?: string
      balancedProfile?: string
      developingProfile?: string
      default?: string
    }
    signalNarratives?: Record<
      string,
      {
        high?: string
        balanced?: string
        low?: string
        default?: string
      }
    >
    domainNarratives?: Record<
      string,
      {
        summary?: string
      }
    >
  }
}

export type HybridMvpResponseValue = string | string[]
export type HybridMvpResponseSet = Record<string, HybridMvpResponseValue | undefined>

export interface HybridMvpRankedSignal {
  signalId: string
  signalKey: string
  domainId: string | null
  rawScore: number
  normalizedScore: number
  rank: number
}

export interface HybridMvpDomainVector {
  domainId: string | null
  totalRawScore: number
  vector: Array<{
    signalId: string
    rawScore: number
    normalizedScore: number
    rank: number
  }>
}

export interface HybridMvpScoringResult {
  contractVersion: typeof HYBRID_MVP_CONTRACT_VERSION
  assessmentId: string
  assessmentKey: string
  rawSignalScores: Record<string, number>
  normalizedSignalScores: Record<string, number>
  rankedSignals: HybridMvpRankedSignal[]
  aggregationVectors: {
    global: HybridMvpDomainVector
    byDomain: HybridMvpDomainVector[]
  }
  report: {
    summary: HybridMvpReportSummary | null
    sections: HybridMvpReportSection[]
    trace: HybridMvpReportTrace[]
  }
}

export interface HybridMvpReportSummary {
  id: string
  headline: string
  text: string
  meta: {
    topSignalId: string | null
    topSignalRank: number | null
    topSignalBucket: 'high' | 'balanced' | 'low' | null
    templateRef: string
  }
}

export interface HybridMvpReportBlock {
  id: string
  kind: 'narrative' | 'signal' | 'watchout' | 'domain'
  title: string
  body: string
  value?: string
  meta: {
    sourceType: 'signal' | 'domain' | 'overview'
    sourceId: string
    templateRef: string
    rank?: number
    bucket?: 'high' | 'balanced' | 'low'
  }
}

export interface HybridMvpReportSection {
  id: 'overview' | 'strengths' | 'watchouts' | 'development_focus' | 'domain_summaries'
  title: string
  blocks: HybridMvpReportBlock[]
}

export interface HybridMvpReportTrace {
  outputId: string
  sectionKey: string
  sourceType: 'signal' | 'domain' | 'overview' | 'fallback'
  sourceId: string
  reason: string
  templateRef: string
  rank?: number
  normalizedScore?: number
  bucket?: 'high' | 'balanced' | 'low'
}

export interface HybridMvpScoringIssue {
  code:
    | 'unsupported_contract_version'
    | 'invalid_assessment_definition'
    | 'missing_response'
    | 'invalid_response_shape'
    | 'unknown_option'
  questionId?: string
  optionId?: string
  message: string
}

export type HybridMvpScoringResponse =
  | { ok: true; result: HybridMvpScoringResult; issues: [] }
  | { ok: false; result: null; issues: HybridMvpScoringIssue[] }

const GLOBAL_DOMAIN_ID = '__global__'

function sortDeterministically<T>(values: T[], resolver: (value: T) => string): T[] {
  return [...values].sort((left, right) => resolver(left).localeCompare(resolver(right)))
}

function toDomainBucket(signalDomainId: string | null): string {
  return signalDomainId ?? GLOBAL_DOMAIN_ID
}

function toNumberRecord(keys: string[]): Record<string, number> {
  return keys.reduce<Record<string, number>>((acc, key) => {
    acc[key] = 0
    return acc
  }, {})
}

function validateAssessmentCompatibility(definition: HybridMvpAssessmentDefinition): HybridMvpScoringIssue[] {
  const issues: HybridMvpScoringIssue[] = []

  if (definition.contractVersion !== HYBRID_MVP_CONTRACT_VERSION) {
    issues.push({
      code: 'unsupported_contract_version',
      message: `Expected contractVersion "${HYBRID_MVP_CONTRACT_VERSION}" but received "${definition.contractVersion}".`,
    })
    return issues
  }

  const signalIds = new Set(definition.signals.map((signal) => signal.id))

  for (const question of definition.questions) {
    if (!Array.isArray(question.options) || question.options.length === 0) {
      issues.push({
        code: 'invalid_assessment_definition',
        questionId: question.id,
        message: `Question "${question.id}" must include at least one option.`,
      })
      continue
    }

    for (const option of question.options) {
      if (!Array.isArray(option.signalWeights) || option.signalWeights.length === 0) {
        issues.push({
          code: 'invalid_assessment_definition',
          questionId: question.id,
          optionId: option.id,
          message: `Option "${option.id}" in question "${question.id}" must include at least one signal weight.`,
        })
        continue
      }

      for (const weight of option.signalWeights) {
        if (!signalIds.has(weight.signalId)) {
          issues.push({
            code: 'invalid_assessment_definition',
            questionId: question.id,
            optionId: option.id,
            message: `Option "${option.id}" references unknown signal "${weight.signalId}".`,
          })
        }
      }
    }
  }

  return issues
}

function normalizeQuestionResponse(question: HybridMvpQuestionDefinition, value: HybridMvpResponseValue | undefined): string[] | null {
  if (value === undefined) {
    return null
  }

  if (question.responseModel === 'single_select') {
    return typeof value === 'string' && value.trim().length > 0 ? [value] : null
  }

  if (question.responseModel === 'multi_select') {
    if (!Array.isArray(value)) {
      return null
    }

    const canonical = value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    if (canonical.length === 0) {
      return null
    }

    return Array.from(new Set(canonical)).sort((left, right) => left.localeCompare(right))
  }

  return null
}

export function normalizeHybridSignalScores(input: {
  rawSignalScores: Record<string, number>
}): Record<string, number> {
  const total = Object.values(input.rawSignalScores).reduce((sum, rawScore) => sum + Math.max(0, rawScore), 0)

  const normalized: Record<string, number> = {}
  for (const [signalId, rawScore] of Object.entries(input.rawSignalScores)) {
    normalized[signalId] = total > 0 ? Number((Math.max(0, rawScore) / total).toFixed(6)) : 0
  }

  return normalized
}

export function rankHybridSignals(input: {
  rawSignalScores: Record<string, number>
  normalizedSignalScores: Record<string, number>
  signalKeyById: Record<string, string>
  signalDomainById: Record<string, string | null>
}): HybridMvpRankedSignal[] {
  const rows = Object.keys(input.signalKeyById).map((signalId) => ({
    signalId,
    signalKey: input.signalKeyById[signalId],
    domainId: input.signalDomainById[signalId] ?? null,
    rawScore: input.rawSignalScores[signalId] ?? 0,
    normalizedScore: input.normalizedSignalScores[signalId] ?? 0,
  }))

  const sorted = [...rows].sort((left, right) => {
    if (right.normalizedScore !== left.normalizedScore) return right.normalizedScore - left.normalizedScore
    if (right.rawScore !== left.rawScore) return right.rawScore - left.rawScore
    return left.signalId.localeCompare(right.signalId)
  })

  return sorted.map((row, index) => ({ ...row, rank: index + 1 }))
}

export function buildHybridAggregationVectors(rankedSignals: HybridMvpRankedSignal[]): { global: HybridMvpDomainVector; byDomain: HybridMvpDomainVector[] } {
  const globalVector: HybridMvpDomainVector = {
    domainId: null,
    totalRawScore: rankedSignals.reduce((total, signal) => total + signal.rawScore, 0),
    vector: rankedSignals.map((signal) => ({
      signalId: signal.signalId,
      rawScore: signal.rawScore,
      normalizedScore: signal.normalizedScore,
      rank: signal.rank,
    })),
  }

  const grouped = new Map<string, HybridMvpRankedSignal[]>()
  for (const signal of rankedSignals) {
    const domainId = signal.domainId ?? GLOBAL_DOMAIN_ID
    const existing = grouped.get(domainId) ?? []
    existing.push(signal)
    grouped.set(domainId, existing)
  }

  const byDomain = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([domainId, signals]) => {
      const domainTotalRawScore = signals.reduce((total, signal) => total + Math.max(0, signal.rawScore), 0)
      const sortedSignals = [...signals].sort((left, right) => {
        if (right.normalizedScore !== left.normalizedScore) return right.normalizedScore - left.normalizedScore
        if (right.rawScore !== left.rawScore) return right.rawScore - left.rawScore
        return left.signalId.localeCompare(right.signalId)
      })

      return {
        domainId: domainId === GLOBAL_DOMAIN_ID ? null : domainId,
        totalRawScore: domainTotalRawScore,
        vector: sortedSignals.map((signal, index) => ({
          signalId: signal.signalId,
          rawScore: signal.rawScore,
          normalizedScore: domainTotalRawScore > 0 ? Number((Math.max(0, signal.rawScore) / domainTotalRawScore).toFixed(6)) : 0,
          rank: index + 1,
        })),
      }
    })

  return { global: globalVector, byDomain }
}

export function scoreHybridMvpAssessment(definition: HybridMvpAssessmentDefinition, responses: HybridMvpResponseSet): HybridMvpScoringResponse {
  const compatibilityIssues = validateAssessmentCompatibility(definition)
  if (compatibilityIssues.length > 0) {
    return { ok: false, result: null, issues: compatibilityIssues }
  }

  const signalIds = sortDeterministically(definition.signals, (signal) => signal.id).map((signal) => signal.id)
  const rawSignalScores = toNumberRecord(signalIds)
  const signalKeyById = definition.signals.reduce<Record<string, string>>((acc, signal) => {
    acc[signal.id] = signal.key
    return acc
  }, {})
  const signalDomainById = definition.signals.reduce<Record<string, string | null>>((acc, signal) => {
    acc[signal.id] = signal.domainId ?? null
    return acc
  }, {})

  const issues: HybridMvpScoringIssue[] = []

  for (const question of definition.questions) {
    const normalizedResponse = normalizeQuestionResponse(question, responses[question.id])

    if (!normalizedResponse) {
      if (question.required !== false) {
        issues.push({
          code: 'missing_response',
          questionId: question.id,
          message: `Required response missing for question "${question.id}".`,
        })
      }
      continue
    }

    const optionsById = question.options.reduce<Record<string, HybridMvpQuestionOption>>((acc, option) => {
      acc[option.id] = option
      return acc
    }, {})

    if (question.responseModel === 'single_select' && normalizedResponse.length !== 1) {
      issues.push({
        code: 'invalid_response_shape',
        questionId: question.id,
        message: `Question "${question.id}" expects a single option response.`,
      })
      continue
    }

    for (const optionId of normalizedResponse) {
      const option = optionsById[optionId]
      if (!option) {
        issues.push({
          code: 'unknown_option',
          questionId: question.id,
          optionId,
          message: `Question "${question.id}" received unknown option "${optionId}".`,
        })
        continue
      }

      for (const weight of option.signalWeights) {
        rawSignalScores[weight.signalId] = Number(((rawSignalScores[weight.signalId] ?? 0) + weight.weight).toFixed(6))
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, result: null, issues }
  }

  const normalizedSignalScores = normalizeHybridSignalScores({ rawSignalScores })
  const rankedSignals = rankHybridSignals({ rawSignalScores, normalizedSignalScores, signalKeyById, signalDomainById })
  const aggregationVectors = buildHybridAggregationVectors(rankedSignals)
  const report = buildHybridMvpTemplatedReport({
    definition,
    scored: {
      assessmentId: definition.assessmentId,
      assessmentKey: definition.assessmentKey,
      rankedSignals,
      aggregationVectors,
    },
  })

  return {
    ok: true,
    issues: [],
    result: {
      contractVersion: HYBRID_MVP_CONTRACT_VERSION,
      assessmentId: definition.assessmentId,
      assessmentKey: definition.assessmentKey,
      rawSignalScores,
      normalizedSignalScores,
      rankedSignals,
      aggregationVectors,
      report,
    },
  }
}

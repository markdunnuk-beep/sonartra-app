import type { RuntimeV2AssessmentExecutionModel } from '@/lib/server/runtime-v2-scorer'

export interface RuntimeV2RankedSignal {
  signalKey: string
  score: number
  percentage: number
  domain?: string
  rank: number
}

export interface RuntimeV2DomainSummary {
  domain: string
  signals: Array<{
    signalKey: string
    score: number
    percentage: number
    rank: number
  }>
  topSignalKey: string | null
  totalScore: number
}

export interface RuntimeV2NormalizationResult {
  normalizedSignalPercentages: Record<string, number>
  rankedSignals: RuntimeV2RankedSignal[]
  domainSummaries: RuntimeV2DomainSummary[]
  topSignalKey: string | null
  normalizationDiagnostics: {
    method: string
    totalRawScore: number
    totalNormalizedPercentage: number
    signalCount: number
    domainCount: number
  }
}

function round4(value: number): number {
  return Math.round(value * 10_000) / 10_000
}

function deriveSignalDomainMap(executionModel: RuntimeV2AssessmentExecutionModel): Map<string, string> {
  const map = new Map<string, string>()
  for (const mappings of Object.values(executionModel.mappingsByQuestionId)) {
    for (const mapping of mappings) {
      if (mapping.domain && !map.has(mapping.signal_key)) {
        map.set(mapping.signal_key, mapping.domain)
      }
    }
  }
  return map
}

function getRegistrySignalKeys(executionModel: RuntimeV2AssessmentExecutionModel): string[] {
  const fromRegistry = Array.isArray(executionModel.signalRegistry.signalKeys)
    ? executionModel.signalRegistry.signalKeys.filter((value): value is string => typeof value === 'string')
    : []
  return [...new Set(fromRegistry)].sort((a, b) => a.localeCompare(b))
}

export function normalizeRuntimeV2Scores(args: {
  rawSignalScores: Record<string, number>
  executionModel: RuntimeV2AssessmentExecutionModel
}): RuntimeV2NormalizationResult {
  const method = typeof args.executionModel.normalizationConfig.method === 'string'
    ? args.executionModel.normalizationConfig.method
    : 'sum_to_100'
  const signalKeys = getRegistrySignalKeys(args.executionModel)
  const signalDomainMap = deriveSignalDomainMap(args.executionModel)

  const totals = signalKeys.map((signalKey) => ({ signalKey, score: Math.max(0, args.rawSignalScores[signalKey] ?? 0) }))
  const totalRawScore = totals.reduce((sum, entry) => sum + entry.score, 0)

  const normalizedSignalPercentages: Record<string, number> = {}
  for (const entry of totals) {
    const percentage = totalRawScore > 0 ? (entry.score / totalRawScore) * 100 : 0
    normalizedSignalPercentages[entry.signalKey] = round4(percentage)
  }

  const rankedSignals = totals
    .map((entry) => ({
      signalKey: entry.signalKey,
      score: round4(entry.score),
      percentage: normalizedSignalPercentages[entry.signalKey] ?? 0,
      domain: signalDomainMap.get(entry.signalKey),
    }))
    .sort((left, right) => right.score - left.score || right.percentage - left.percentage || left.signalKey.localeCompare(right.signalKey))
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  const byDomain = new Map<string, RuntimeV2DomainSummary['signals']>()
  for (const signal of rankedSignals) {
    if (!signal.domain) continue
    const bucket = byDomain.get(signal.domain) ?? []
    bucket.push({ signalKey: signal.signalKey, score: signal.score, percentage: signal.percentage, rank: signal.rank })
    byDomain.set(signal.domain, bucket)
  }

  const domainSummaries: RuntimeV2DomainSummary[] = [...byDomain.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([domain, signals]) => {
      const sortedSignals = [...signals].sort((left, right) => right.score - left.score || left.signalKey.localeCompare(right.signalKey))
      return {
        domain,
        signals: sortedSignals.map((signal, index) => ({ ...signal, rank: index + 1 })),
        topSignalKey: sortedSignals[0]?.signalKey ?? null,
        totalScore: round4(sortedSignals.reduce((sum, signal) => sum + signal.score, 0)),
      }
    })

  return {
    normalizedSignalPercentages,
    rankedSignals,
    domainSummaries,
    topSignalKey: rankedSignals[0]?.signalKey ?? null,
    normalizationDiagnostics: {
      method,
      totalRawScore: round4(totalRawScore),
      totalNormalizedPercentage: round4(Object.values(normalizedSignalPercentages).reduce((sum, value) => sum + value, 0)),
      signalCount: rankedSignals.length,
      domainCount: domainSummaries.length,
    },
  }
}

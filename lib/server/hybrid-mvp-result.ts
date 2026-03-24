import type { AssessmentResultRow } from '@/lib/assessment-types'

export interface HybridMvpResultSummaryViewModel {
  id: string
  headline: string
  text: string
}

export interface HybridMvpResultBlockViewModel {
  id: string
  kind: 'narrative' | 'signal' | 'watchout' | 'domain'
  title: string
  body: string
  value: string | null
}

export interface HybridMvpResultSectionViewModel {
  id: 'overview' | 'strengths' | 'watchouts' | 'development_focus' | 'domain_summaries'
  title: string
  blocks: HybridMvpResultBlockViewModel[]
}

export interface HybridMvpRankedSignalViewModel {
  signalId: string
  signalKey: string
  domainId: string | null
  rawScore: number
  normalizedScore: number
  rank: number
}

export interface HybridMvpDomainSummaryViewModel {
  domainId: string | null
  totalRawScore: number
  signalCount: number
  topSignalId: string | null
  topNormalizedScore: number | null
}

export interface HybridMvpResultPayloadViewModel {
  contractVersion: 'hybrid_mvp_v1'
  assessmentMeta: {
    assessmentId: string | null
    assessmentKey: string | null
    assessmentVersionKey: string | null
    assessmentVersionName: string | null
  }
  summary: HybridMvpResultSummaryViewModel | null
  sections: HybridMvpResultSectionViewModel[]
  rankedSignals: HybridMvpRankedSignalViewModel[]
  normalizedSignalScores: Record<string, number>
  normalizedSignalPercentages: Record<string, number>
  topSignal: {
    signalId: string
    signalKey: string
    signalLabel: string | null
    normalizedPercent: number
    rank: number
  } | null
  domainSummaries: HybridMvpDomainSummaryViewModel[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function parseSummary(value: unknown): HybridMvpResultSummaryViewModel | null {
  if (!isRecord(value)) return null

  const id = toStringOrNull(value.id)
  const headline = toStringOrNull(value.headline)
  const text = toStringOrNull(value.text)

  if (!id || !headline || !text) return null

  return { id, headline, text }
}

function parseBlocks(value: unknown): HybridMvpResultBlockViewModel[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []

    const id = toStringOrNull(entry.id)
    const kind = entry.kind
    const title = toStringOrNull(entry.title)
    const body = toStringOrNull(entry.body)

    if (!id || !title || !body) return []
    if (kind !== 'narrative' && kind !== 'signal' && kind !== 'watchout' && kind !== 'domain') return []

    return [{
      id,
      kind,
      title,
      body,
      value: toStringOrNull(entry.value),
    }]
  })
}

function parseSections(value: unknown): HybridMvpResultSectionViewModel[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []

    const id = entry.id
    const title = toStringOrNull(entry.title)
    if (!title) return []
    if (id !== 'overview' && id !== 'strengths' && id !== 'watchouts' && id !== 'development_focus' && id !== 'domain_summaries') return []

    return [{
      id,
      title,
      blocks: parseBlocks(entry.blocks),
    }]
  })
}

function parseRankedSignals(value: unknown): HybridMvpRankedSignalViewModel[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((entry) => {
    if (!isRecord(entry)) return []

    const signalId = toStringOrNull(entry.signalId)
    const signalKey = toStringOrNull(entry.signalKey)

    if (!signalId || !signalKey) return []

    return [{
      signalId,
      signalKey,
      domainId: toStringOrNull(entry.domainId),
      rawScore: toNumber(entry.rawScore),
      normalizedScore: toNumber(entry.normalizedScore),
      rank: Math.max(1, Math.trunc(toNumber(entry.rank))),
    }]
  }).sort((left, right) => {
    if (left.rank !== right.rank) return left.rank - right.rank
    return left.signalId.localeCompare(right.signalId)
  })
}

function parseNormalizedScores(value: unknown): Record<string, number> {
  if (!isRecord(value)) return {}

  return Object.entries(value).reduce<Record<string, number>>((acc, [signalId, score]) => {
    acc[signalId] = toNumber(score)
    return acc
  }, {})
}

function parseDomainSummaries(value: unknown): HybridMvpDomainSummaryViewModel[] {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => {
      if (!isRecord(entry)) return []
      return [{
        domainId: toStringOrNull(entry.domainId),
        totalRawScore: toNumber(entry.totalRawScore),
        signalCount: Math.max(0, Math.trunc(toNumber(entry.signalCount))),
        topSignalId: toStringOrNull(entry.topSignalId),
        topNormalizedScore: entry.topSignalNormalizedPercent !== undefined
          ? toNumber(entry.topSignalNormalizedPercent) / 100
          : toNumber(entry.topNormalizedScore),
      }]
    })
  }

  if (!isRecord(value)) return []

  const byDomain = Array.isArray(value.byDomain) ? value.byDomain : []

  return byDomain.flatMap((entry) => {
    if (!isRecord(entry)) return []

    const vector = Array.isArray(entry.vector) ? entry.vector : []
    const topSignal = vector[0]
    const topSignalId = isRecord(topSignal) ? toStringOrNull(topSignal.signalId) : null
    const topNormalizedScore = isRecord(topSignal) ? toNumber(topSignal.normalizedScore) : null

    return [{
      domainId: toStringOrNull(entry.domainId),
      totalRawScore: toNumber(entry.totalRawScore),
      signalCount: vector.length,
      topSignalId,
      topNormalizedScore,
    }]
  })
}

function parseTopSignal(value: unknown): HybridMvpResultPayloadViewModel['topSignal'] {
  if (!isRecord(value)) return null

  const signalId = toStringOrNull(value.signalId)
  const signalKey = toStringOrNull(value.signalKey)
  if (!signalId || !signalKey) return null

  return {
    signalId,
    signalKey,
    signalLabel: toStringOrNull(value.signalLabel),
    normalizedPercent: toNumber(value.normalizedPercent),
    rank: Math.max(1, Math.trunc(toNumber(value.rank))),
  }
}

export function parseHybridMvpResultPayload(payload: Record<string, unknown> | null): HybridMvpResultPayloadViewModel | null {
  if (!isRecord(payload) || payload.contractVersion !== 'hybrid_mvp_v1') {
    return null
  }

  const report = isRecord(payload.report) ? payload.report : null
  const assessmentMeta = isRecord(payload.assessmentMeta) ? payload.assessmentMeta : null

  const sections = parseSections(report?.sections)
  const rankedSignals = parseRankedSignals(payload.rankedSignals)
  const normalizedSignalPercentages = parseNormalizedScores(payload.normalizedSignalPercentages)
  const topSignal = parseTopSignal(payload.topSignal)
  const domainSummaries = parseDomainSummaries(payload.domainSummaries ?? payload.aggregationVectors)
  const summary = parseSummary(payload.overviewSummary ?? report?.summary)

  if (sections.length === 0 || rankedSignals.length === 0 || !summary || domainSummaries.length === 0 || !topSignal || Object.keys(normalizedSignalPercentages).length === 0) {
    return null
  }

  return {
    contractVersion: 'hybrid_mvp_v1',
    assessmentMeta: {
      assessmentId: toStringOrNull(assessmentMeta?.assessmentId),
      assessmentKey: toStringOrNull(assessmentMeta?.assessmentKey),
      assessmentVersionKey: toStringOrNull(assessmentMeta?.assessmentVersionKey),
      assessmentVersionName: toStringOrNull(assessmentMeta?.assessmentVersionName),
    },
    summary,
    sections,
    rankedSignals,
    normalizedSignalScores: parseNormalizedScores(payload.normalizedSignalScores),
    normalizedSignalPercentages,
    topSignal,
    domainSummaries,
  }
}

export function isHybridMvpReadyResult(result: AssessmentResultRow | null | undefined): boolean {
  if (!result || result.status !== 'complete') {
    return false
  }

  return parseHybridMvpResultPayload(result.result_payload) !== null
}

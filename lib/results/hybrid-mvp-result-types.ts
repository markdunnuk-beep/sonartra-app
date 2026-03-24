import type {
  HybridMvpAssessmentIdentity,
  HybridMvpAssessmentVersionMetadata,
  HybridMvpAudience,
} from '@/lib/assessment/hybrid-mvp-contract'

export const HYBRID_MVP_RESULT_SCHEMA_VERSION = 'hybrid_mvp_result_v1' as const

export interface HybridMvpRawSignalScore {
  signalKey: string
  domainKey: string
  rawScore: number
  rawMaxScore: number
  answeredQuestionCount: number
}

export interface HybridMvpNormalisedSignalScore {
  signalKey: string
  domainKey: string
  rawScore: number
  rawMaxScore: number
  normalisedScore: number
  percentile: number | null
}

export interface HybridMvpRankedSignalScore extends HybridMvpNormalisedSignalScore {
  rank: number
  isPrimary: boolean
  isSecondary: boolean
}

export interface HybridMvpDomainSummary {
  domainKey: string
  score: number
  signalCount: number
  topSignalKey: string | null
}

export interface HybridMvpNarrativeOutputBlock {
  blockKey: string
  audience: HybridMvpAudience
  title: string
  renderedBody: string
  sourceTemplateKey: string
  displayOrder: number
}

export interface HybridMvpIndividualReportPayload {
  reportSchemaVersion: typeof HYBRID_MVP_RESULT_SCHEMA_VERSION
  title: string
  subtitle: string | null
  highlights: string[]
  narrativeBlocks: HybridMvpNarrativeOutputBlock[]
}

export interface HybridMvpAggregationVector {
  aggregationKey: string
  signalKey: string
  domainKey: string
  normalisedScore: number
  measuredAt: string
}

export interface HybridMvpResultPayload {
  schemaVersion: typeof HYBRID_MVP_RESULT_SCHEMA_VERSION
  assessment: Pick<HybridMvpAssessmentIdentity, 'assessmentId' | 'assessmentKey' | 'title' | 'category' | 'assessmentType'>
  version: Pick<HybridMvpAssessmentVersionMetadata, 'assessmentVersionId' | 'versionKey' | 'semanticVersion'>
  generatedAt: string
  individualUserId: string
  rawSignals: HybridMvpRawSignalScore[]
  normalisedSignals: HybridMvpNormalisedSignalScore[]
  rankedSignals: HybridMvpRankedSignalScore[]
  domainSummaries: HybridMvpDomainSummary[]
  narrativeOutput: HybridMvpNarrativeOutputBlock[]
  report: HybridMvpIndividualReportPayload
  aggregationVectors: HybridMvpAggregationVector[]
}

export interface HybridMvpResultEnvelope {
  resultId: string
  assessmentId: string
  assessmentVersionId: string
  status: 'pending' | 'complete' | 'failed'
  payload: HybridMvpResultPayload | null
  failureCode?: string | null
  failureMessage?: string | null
}

import type { RuntimeV2AssessmentExecutionModel, RuntimeV2ScoringResult } from '@/lib/server/runtime-v2-scorer'
import type { RuntimeV2NormalizationResult } from '@/lib/server/runtime-v2-normalizer'

export interface RuntimeV2ResultPayload {
  resultFormat: 'runtime_v2'
  metadata: {
    definitionId: string
    assessmentVersionId: string
    runtimeVersionId: string
    runtimeContractVersion: 'v2'
  }
  overviewSummary: string
  topSignal: {
    signalKey: string
    percentage: number
    domain?: string
  } | null
  rankedSignals: RuntimeV2NormalizationResult['rankedSignals']
  normalizedScores: Record<string, number>
  domainSummaries: RuntimeV2NormalizationResult['domainSummaries']
  strengths: string[]
  watchouts: string[]
  developmentFocus: string[]
  diagnostics: {
    answeredQuestionCount: number
    matchedResponseCount: number
    unmatchedResponseCount: number
    normalization: RuntimeV2NormalizationResult['normalizationDiagnostics']
    materializationFingerprint?: Record<string, number>
  }
}

function summarizeTopSignal(topSignal: RuntimeV2ResultPayload['topSignal']): string {
  if (!topSignal) {
    return 'No dominant signal could be derived from the submitted responses.'
  }
  const percentageText = `${Math.round(topSignal.percentage * 100) / 100}%`
  const domainText = topSignal.domain ? ` in ${topSignal.domain}` : ''
  return `Top signal is ${topSignal.signalKey}${domainText} at ${percentageText}.`
}

export function buildRuntimeV2ResultPayload(args: {
  executionModel: RuntimeV2AssessmentExecutionModel
  scoring: RuntimeV2ScoringResult
  normalization: RuntimeV2NormalizationResult
  assessmentVersionId: string
  materializationFingerprint?: Record<string, number>
}): RuntimeV2ResultPayload {
  const rankedSignals = args.normalization.rankedSignals
  const topRanked = rankedSignals[0]
  const topSignal = topRanked
    ? {
        signalKey: topRanked.signalKey,
        percentage: topRanked.percentage,
        domain: topRanked.domain,
      }
    : null

  const strengths = rankedSignals.slice(0, 2).map((entry) => entry.signalKey)
  const watchouts = rankedSignals.slice(-2).map((entry) => entry.signalKey).reverse()
  const developmentFocus = rankedSignals.slice(1, 3).map((entry) => entry.signalKey)

  return {
    resultFormat: 'runtime_v2',
    metadata: {
      definitionId: String(args.executionModel.metadata.definitionId ?? ''),
      assessmentVersionId: args.assessmentVersionId,
      runtimeVersionId: args.executionModel.runtimeVersionId,
      runtimeContractVersion: 'v2',
    },
    overviewSummary: summarizeTopSignal(topSignal),
    topSignal,
    rankedSignals,
    normalizedScores: args.normalization.normalizedSignalPercentages,
    domainSummaries: args.normalization.domainSummaries,
    strengths,
    watchouts,
    developmentFocus,
    diagnostics: {
      answeredQuestionCount: args.scoring.answeredQuestionCount,
      matchedResponseCount: args.scoring.matchedResponseCount,
      unmatchedResponseCount: args.scoring.unmatchedResponses.length,
      normalization: args.normalization.normalizationDiagnostics,
      materializationFingerprint: args.materializationFingerprint,
    },
  }
}

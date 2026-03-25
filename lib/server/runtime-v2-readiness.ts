import type { RuntimeV2ResultPayload } from '@/lib/server/runtime-v2-result-builder'

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isRankedSignals(value: unknown): value is RuntimeV2ResultPayload['rankedSignals'] {
  return Array.isArray(value)
    && value.every((entry) => isRecord(entry)
      && typeof entry.signalKey === 'string'
      && typeof entry.score === 'number'
      && typeof entry.percentage === 'number'
      && typeof entry.rank === 'number')
}

function isDomainSummaries(value: unknown): value is RuntimeV2ResultPayload['domainSummaries'] {
  return Array.isArray(value)
    && value.every((summary) => isRecord(summary)
      && typeof summary.domain === 'string'
      && Array.isArray(summary.signals)
      && (summary.topSignalKey === null || typeof summary.topSignalKey === 'string')
      && typeof summary.totalScore === 'number')
}

export function parseRuntimeV2ReadyPayload(payload: unknown):
  | { state: 'ready'; payload: RuntimeV2ResultPayload }
  | { state: 'processing' | 'failed'; reason: string } {
  if (!isRecord(payload)) {
    return { state: 'failed', reason: 'result_payload_not_object' }
  }
  if (payload.resultFormat !== 'runtime_v2') {
    return { state: 'failed', reason: 'result_format_not_runtime_v2' }
  }

  const metadata = isRecord(payload.metadata) ? payload.metadata : null
  if (!metadata
    || typeof metadata.definitionId !== 'string'
    || typeof metadata.assessmentVersionId !== 'string'
    || typeof metadata.runtimeVersionId !== 'string'
    || metadata.runtimeContractVersion !== 'v2') {
    return { state: 'failed', reason: 'metadata_missing_or_invalid' }
  }

  if (!isRecord(payload.normalizedScores) || Object.keys(payload.normalizedScores).length === 0) {
    return { state: 'processing', reason: 'normalized_scores_missing' }
  }

  if (!isRankedSignals(payload.rankedSignals) || payload.rankedSignals.length === 0) {
    return { state: 'processing', reason: 'ranked_signals_missing' }
  }

  if (!isDomainSummaries(payload.domainSummaries)) {
    return { state: 'processing', reason: 'domain_summaries_missing' }
  }

  if (typeof payload.overviewSummary !== 'string') {
    return { state: 'processing', reason: 'overview_summary_missing' }
  }

  if (!(payload.topSignal === null || (isRecord(payload.topSignal) && typeof payload.topSignal.signalKey === 'string' && typeof payload.topSignal.percentage === 'number'))) {
    return { state: 'processing', reason: 'top_signal_invalid' }
  }

  if (!isRecord(payload.diagnostics)) {
    return { state: 'processing', reason: 'diagnostics_missing' }
  }

  return { state: 'ready', payload: payload as unknown as RuntimeV2ResultPayload }
}

export function isRuntimeV2ReadyResultRow(input: { status: string; result_payload: unknown }): boolean {
  if (input.status !== 'complete') {
    return false
  }
  return parseRuntimeV2ReadyPayload(input.result_payload).state === 'ready'
}

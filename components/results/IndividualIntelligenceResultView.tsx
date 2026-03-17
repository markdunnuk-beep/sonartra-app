import React from 'react'

import { IndividualResultApiResponse, IndividualResultSignalSummary } from '@/lib/server/individual-results'
import {
  ResultEmptyStatePanel,
  ResultFailedStatePanel,
  ResultsSectionBlock,
  ResultsWorkspaceShell,
  ResultMetadataGrid,
  ResultStatusBadge,
  SignalChip,
  SignalScoreRow,
} from '@/components/results/ResultsPrimitives'

const LAYER_LABELS: Record<string, string> = {
  behaviour_style: 'Behaviour Style',
  motivators: 'Motivators',
  leadership: 'Leadership',
  conflict: 'Conflict',
  risk_pressure: 'Risk and Pressure Response',
  culture: 'Cultural Layer',
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return date.toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const titleCase = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

const groupSignalsByLayer = (signals: IndividualResultSignalSummary[]) => {
  const byLayer = new Map<string, IndividualResultSignalSummary[]>()

  for (const signal of signals) {
    const list = byLayer.get(signal.layerKey) ?? []
    list.push(signal)
    byLayer.set(signal.layerKey, list)
  }

  return byLayer
}

function ReadyStateView({ response }: { response: Extract<IndividualResultApiResponse, { state: 'ready' }> }) {
  const layerSignals = groupSignalsByLayer(response.data.signals)

  return (
    <>
      <section className="surface space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <ResultStatusBadge status="ready" />
          <SignalChip tone="neutral">Assessment version: {response.data.assessment.versionKey ?? '—'}</SignalChip>
          <SignalChip tone="neutral">Completed: {formatDateTime(response.data.assessment.completedAt)}</SignalChip>
          <SignalChip tone="neutral">Signals: {response.data.signals.length}</SignalChip>
        </div>
      </section>

      <ResultsSectionBlock title="Layer breakdown" description="Persisted layer summaries and ranked signals.">
        <div className="space-y-5">
          {response.data.layers.map((layer) => {
            const signals = layerSignals.get(layer.layerKey) ?? []

            return (
              <div key={layer.layerKey} className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                <h3 className="text-base font-semibold text-textPrimary">{LAYER_LABELS[layer.layerKey] ?? titleCase(layer.layerKey)}</h3>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <SignalChip tone="neutral">Signals: {layer.signalCount}</SignalChip>
                  <SignalChip tone="neutral">Layer total: {Math.round(layer.totalRawValue)}</SignalChip>
                  {layer.primarySignalKey ? <SignalChip tone="accent">Primary: {titleCase(layer.primarySignalKey)}</SignalChip> : null}
                  {layer.secondarySignalKey ? <SignalChip tone="neutral">Secondary: {titleCase(layer.secondarySignalKey)}</SignalChip> : null}
                </div>

                <div className="mt-4 space-y-3">
                  {signals.map((signal) => (
                    <SignalScoreRow
                      key={signal.signalKey}
                      label={titleCase(signal.signalKey)}
                      normalisedScore={signal.normalisedScore}
                      relativeShare={signal.relativeShare}
                      rank={signal.rank}
                      isPrimary={signal.isPrimary}
                      isSecondary={signal.isSecondary}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </ResultsSectionBlock>

      <ResultsSectionBlock title="Metadata" description="Assessment and snapshot context.">
        <ResultMetadataGrid
          items={[
            { label: 'Assessment status', value: 'completed' },
            { label: 'Assessment completed', value: formatDateTime(response.data.assessment.completedAt) },
            { label: 'Scored at', value: formatDateTime(response.data.snapshot.scoredAt) },
            { label: 'Version key', value: response.data.assessment.versionKey ?? '—' },
            { label: 'Scoring model', value: response.data.snapshot.scoringModelKey },
            { label: 'Snapshot version', value: response.data.snapshot.snapshotVersion.toString() },
            { label: 'Snapshot status', value: response.data.snapshot.status },
          ]}
        />
      </ResultsSectionBlock>
    </>
  )
}

export function IndividualIntelligenceResultView({ response }: { response: IndividualResultApiResponse }) {
  if (response.state === 'empty') {
    return (
      <ResultsWorkspaceShell title="Individual Results" subtitle="Persisted individual performance signal output.">
        <ResultEmptyStatePanel
          title="No completed assessment found"
          description={response.message}
          ctaLabel="Start assessment"
          ctaHref="/assessment"
        />
      </ResultsWorkspaceShell>
    )
  }

  if (response.state === 'incomplete') {
    return (
      <ResultsWorkspaceShell title="Individual Results" subtitle="Persisted individual performance signal output.">
        <ResultFailedStatePanel
          title="Results are not available yet"
          description={response.message}
          detail={response.data?.assessment?.assessmentId ? `Assessment: ${response.data.assessment.assessmentId}` : undefined}
        />
      </ResultsWorkspaceShell>
    )
  }

  if (response.state === 'error') {
    return (
      <ResultsWorkspaceShell title="Individual Results" subtitle="Persisted individual performance signal output.">
        <ResultFailedStatePanel title="Unable to load results" description={response.message} />
      </ResultsWorkspaceShell>
    )
  }

  if (response.state === 'unauthenticated') {
    return (
      <ResultsWorkspaceShell title="Individual Results" subtitle="Persisted individual performance signal output.">
        <ResultFailedStatePanel title="Authentication required" description={response.message} />
      </ResultsWorkspaceShell>
    )
  }

  return (
    <ResultsWorkspaceShell title="Individual Results" subtitle="Persisted individual performance signal output." statusLabel="Results available">
      <ReadyStateView response={response} />
    </ResultsWorkspaceShell>
  )
}

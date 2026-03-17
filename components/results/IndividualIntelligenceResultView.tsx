import React from 'react'

import { IndividualResultApiResponse, IndividualResultLayerSummary, IndividualResultReadyData, IndividualResultSignalSummary } from '@/lib/server/individual-results'
import {
  ResultEmptyStatePanel,
  ResultFailedStatePanel,
  ResultsSectionBlock,
  ResultsWorkspaceShell,
  ResultMetadataGrid,
  SignalChip,
  SignalRankList,
  SignalScoreRow,
} from '@/components/results/ResultsPrimitives'
import { buildIndividualResultInterpretation } from '@/lib/results-interpretation'
import { ResultInterpretationSections } from '@/components/results/ResultInterpretationSections'

type ViewModel = IndividualResultApiResponse | { state: string; message?: string }

const LAYER_COPY: Record<string, { title: string; description: string }> = {
  behaviour_style: {
    title: 'Behaviour Style',
    description: 'How this person tends to organise work, prioritise effort, and execute decisions.',
  },
  motivators: {
    title: 'Motivators',
    description: 'The conditions and drivers that are most likely to sustain performance energy.',
  },
  leadership: {
    title: 'Leadership',
    description: 'How influence is likely to be expressed in planning, delegation, and accountability.',
  },
  conflict: {
    title: 'Conflict',
    description: 'Typical response posture when priorities clash or delivery tension rises.',
  },
  risk: {
    title: 'Risk and Pressure Response',
    description: 'Likely decision and execution tendencies under uncertainty, urgency, or stress.',
  },
  culture: {
    title: 'Cultural Layer',
    description: 'The operating environment where this profile is most likely to align and contribute.',
  },
}

const formatDateTime = (value: string | null) => {
  if (!value) return '—'
  return new Date(value).toLocaleString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

const titleCase = (value: string) => value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase())

function buildSummary(data: IndividualResultReadyData) {
  const ranked = [...data.signals].sort((a, b) => b.normalisedScore - a.normalisedScore)
  const primary = ranked.find((signal) => signal.isPrimary) ?? ranked[0]
  const secondary = ranked.find((signal) => signal.isSecondary) ?? ranked[1]

  if (!primary) return 'No scored signal data is currently available for this assessment completion.'

  return `Primary concentration sits in ${titleCase(primary.signalKey)} (${formatPercent(primary.normalisedScore)}). ${
    secondary
      ? `${titleCase(secondary.signalKey)} is a supporting signal (${formatPercent(secondary.normalisedScore)}), suggesting additional leverage through that operating style.`
      : 'Secondary concentration is currently limited in the persisted output.'
  }`
}

const withDevelopmentDiagnostic = (state: string, children: React.ReactNode) => (
  <>
    {process.env.NODE_ENV !== 'production' ? <p className="text-xs uppercase tracking-[0.14em] text-textSecondary">Rendering state: {state}</p> : null}
    {children}
  </>
)

const renderReady = (data: IndividualResultReadyData, state: string, firstName?: string | null) => (
  <ResultsWorkspaceShell
    title="Individual Intelligence"
    subtitle="Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure."
    statusLabel="Persisted Result"
  >
    {withDevelopmentDiagnostic(
      state,
      <>
        <ResultInterpretationSections interpretation={buildIndividualResultInterpretation(data, { firstName })} />

        <section className="surface space-y-4 p-6">
          <div className="flex flex-wrap items-center gap-2">
            <SignalChip tone="accent">Status: ready</SignalChip>
            <SignalChip tone="neutral">Assessment version: {data.assessment.versionKey ?? '—'}</SignalChip>
            <SignalChip tone="neutral">Completed: {formatDateTime(data.assessment.completedAt)}</SignalChip>
          </div>
          <p className="text-sm leading-6 text-textSecondary">{buildSummary(data)}</p>
        </section>

        <ResultsSectionBlock title="Layer breakdown" description="Per-layer signal ranking and relative contribution.">
          <div className="space-y-5">
            {data.layers.map((layer: IndividualResultLayerSummary) => {
              const meta = LAYER_COPY[layer.layerKey]
              const layerSignals = data.signals.filter((signal: IndividualResultSignalSummary) => signal.layerKey === layer.layerKey)

              return (
                <div key={layer.layerKey} className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                  <h3 className="text-base font-semibold text-textPrimary">{meta?.title ?? titleCase(layer.layerKey)}</h3>
                  <p className="mt-1 text-sm text-textSecondary">{meta?.description ?? 'Layer-level behavioural signal summary.'}</p>
                  <div className="mt-4 space-y-3">
                    {layerSignals.map((signal: IndividualResultSignalSummary) => (
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

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ResultsSectionBlock title="Signal ranking" description="Highest-to-lowest signal order across all measured layers.">
            <SignalRankList
              title="Ranked signals"
              items={data.signals.map((signal: IndividualResultSignalSummary) => ({
                label: titleCase(signal.signalKey),
                score: Math.round(signal.normalisedScore * 100),
                note: `${titleCase(signal.layerKey)} • Share ${formatPercent(signal.relativeShare)}`,
              }))}
            />
          </ResultsSectionBlock>

          <ResultsSectionBlock title="Metadata" description="Persisted completion and scoring metadata.">
            <ResultMetadataGrid
              items={[
                { label: 'Assessment ID', value: data.assessment.assessmentId },
                { label: 'Completion date', value: formatDateTime(data.assessment.completedAt) },
                { label: 'Scored at', value: formatDateTime(data.snapshot.scoredAt) },
                { label: 'Version key', value: data.assessment.versionKey ?? '—' },
                { label: 'Scoring model', value: data.snapshot.scoringModelKey ?? '—' },
                { label: 'Snapshot version', value: data.snapshot.snapshotVersion.toString() },
              ]}
            />
          </ResultsSectionBlock>
        </div>
      </>,
    )}
  </ResultsWorkspaceShell>
)

export function IndividualIntelligenceResultView({ model, firstName }: { model: ViewModel; firstName?: string | null }) {
  if (model.state === 'ready' && 'data' in model) {
    return renderReady(model.data, model.state, firstName)
  }

  if (model.state === 'empty') {
    return (
      <ResultsWorkspaceShell title="Individual Intelligence" subtitle="Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure." statusLabel="No Result Yet">
        {withDevelopmentDiagnostic(
          model.state,
          <ResultEmptyStatePanel
            title="No completed Individual Intelligence result is available yet"
            description={model.message ?? 'Complete the assessment flow to generate your persisted Individual Intelligence result.'}
            ctaLabel="Start or resume assessment"
            ctaHref="/assessment"
          />,
        )}
      </ResultsWorkspaceShell>
    )
  }

  if (model.state === 'incomplete') {
    return (
      <ResultsWorkspaceShell title="Individual Intelligence" subtitle="Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure." statusLabel="Assessment In Progress">
        {withDevelopmentDiagnostic(
          model.state,
          <ResultEmptyStatePanel
            title="Assessment is in progress"
            description={model.message ?? 'Your latest assessment is still in progress, so results are not available yet.'}
            ctaLabel="Resume assessment"
            ctaHref="/assessment"
          />,
        )}
      </ResultsWorkspaceShell>
    )
  }

  if (model.state === 'error') {
    return (
      <ResultsWorkspaceShell title="Individual Intelligence" subtitle="Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure." statusLabel="Temporarily Unavailable">
        {withDevelopmentDiagnostic(
          model.state,
          <ResultFailedStatePanel
            title="Your latest report is not currently available"
            description="Results are unavailable right now. Please refresh or try again shortly."
          />,
        )}
      </ResultsWorkspaceShell>
    )
  }

  if (model.state === 'unauthenticated') {
    return null
  }

  return (
    <ResultsWorkspaceShell title="Individual Intelligence" subtitle="Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure." statusLabel="Unexpected State">
      {withDevelopmentDiagnostic(
        model.state,
        <ResultFailedStatePanel
          title="Results are temporarily unavailable"
          description="We could not interpret the latest results state. Please refresh and try again."
        />,
      )}
    </ResultsWorkspaceShell>
  )
}

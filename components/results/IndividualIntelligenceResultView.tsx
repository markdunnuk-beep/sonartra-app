import React from 'react'
import {
  IndividualIntelligenceResultContract,
  IndividualIntelligenceSignalSummary,
} from '@/lib/server/individual-intelligence-result'
import {
  InsightCard,
  ResultEmptyStatePanel,
  ResultFailedStatePanel,
  ResultsSectionBlock,
  ResultsWorkspaceShell,
  ResultMetadataGrid,
  ResultStatusBadge,
  SignalChip,
  SignalScoreRow,
  SignalRankList,
} from '@/components/results/ResultsPrimitives'

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
  risk_pressure: {
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

const titleCase = (value: string) =>
  value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())

function groupSignalsByLayer(signals: IndividualIntelligenceSignalSummary[]) {
  const grouped = new Map<string, IndividualIntelligenceSignalSummary[]>()

  signals.forEach((signal) => {
    const current = grouped.get(signal.layerKey) ?? []
    current.push(signal)
    grouped.set(signal.layerKey, current)
  })

  return [...grouped.entries()].map(([layerKey, items]) => ({
    layerKey,
    items: [...items].sort((a, b) => (a.rankInLayer ?? 99) - (b.rankInLayer ?? 99)),
  }))
}

function buildSummary(signals: IndividualIntelligenceSignalSummary[]) {
  const ranked = [...signals].sort((a, b) => b.normalisedScore - a.normalisedScore)
  const primary = ranked.find((signal) => signal.isPrimary) ?? ranked[0]
  const secondary = ranked.find((signal) => signal.isSecondary) ?? ranked[1]

  if (!primary) {
    return 'No scored signal data is currently available for this assessment completion.'
  }

  return `Primary concentration sits in ${titleCase(primary.signalKey)} (${formatPercent(primary.normalisedScore)}). ${
    secondary
      ? `${titleCase(secondary.signalKey)} is a supporting signal (${formatPercent(secondary.normalisedScore)}), suggesting additional leverage through that operating style.`
      : 'Secondary concentration is currently limited in the persisted output.'
  }`
}

export function IndividualIntelligenceResultView({ model }: { model: IndividualIntelligenceResultContract }) {
  if (model.resultStatus === 'empty') {
    return (
      <ResultsWorkspaceShell
        title="Individual Intelligence"
        subtitle="Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure."
      >
        <ResultEmptyStatePanel
          title="No completed Individual Intelligence result is available yet"
          description={model.emptyState?.message ?? 'Complete the assessment flow to generate your persisted Individual Intelligence result.'}
          ctaLabel="Start or resume assessment"
          ctaHref="/assessment"
        />
      </ResultsWorkspaceShell>
    )
  }

  if (model.resultStatus === 'failed') {
    return (
      <ResultsWorkspaceShell
        title="Individual Intelligence"
        subtitle="Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure."
      >
        <ResultFailedStatePanel
          title="Your latest report is not currently available"
          description={model.failedState?.message ?? 'Assessment completion exists, but report generation did not complete successfully.'}
          detail={model.failedState?.failure?.code ? `Reference code: ${model.failedState.failure.code}` : undefined}
        />
      </ResultsWorkspaceShell>
    )
  }

  const groupedLayers = groupSignalsByLayer(model.signalSummaries)

  return (
    <ResultsWorkspaceShell
      title="Individual Intelligence"
      subtitle="Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure."
      statusLabel="Persisted Result"
    >
      <section className="surface space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <ResultStatusBadge status={model.resultStatus} />
          <SignalChip tone="neutral">Assessment version: {model.versionKey ?? '—'}</SignalChip>
          <SignalChip tone="neutral">Completed: {formatDateTime(model.completedAt)}</SignalChip>
        </div>
        <p className="text-sm leading-6 text-textSecondary">{buildSummary(model.signalSummaries)}</p>
      </section>

      <ResultsSectionBlock
        title="Core profile summary"
        description="Dominant patterns and execution implications based on persisted scored signals."
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <InsightCard
            title="How work is approached"
            detail="The strongest ranked signals indicate where this individual is most likely to structure priorities, sequencing, and day-to-day execution behaviour."
            compact
          />
          <InsightCard
            title="Performance drivers"
            detail="Relative share and normalised score reveal where motivation and focus are likely to stay strongest across sustained delivery cycles."
            compact
          />
          <InsightCard
            title="Pressure watchouts"
            detail="Lower-ranked signals indicate where decision quality may flatten under ambiguity unless expectations and escalation paths are explicit."
            compact
          />
        </div>
      </ResultsSectionBlock>

      <ResultsSectionBlock title="Layer breakdown" description="Per-layer signal ranking and relative contribution.">
        <div className="space-y-5">
          {groupedLayers.map((layer) => {
            const meta = LAYER_COPY[layer.layerKey]
            return (
              <div key={layer.layerKey} className="rounded-2xl border border-border/70 bg-panel/60 p-4">
                <h3 className="text-base font-semibold text-textPrimary">{meta?.title ?? titleCase(layer.layerKey)}</h3>
                <p className="mt-1 text-sm text-textSecondary">{meta?.description ?? 'Layer-level behavioural signal summary.'}</p>
                <div className="mt-4 space-y-3">
                  {layer.items.map((signal) => (
                    <SignalScoreRow
                      key={signal.signalKey}
                      label={titleCase(signal.signalKey)}
                      normalisedScore={signal.normalisedScore}
                      relativeShare={signal.relativeShare}
                      rank={signal.rankInLayer}
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
            items={model.signalSummaries.map((signal) => ({
              label: titleCase(signal.signalKey),
              score: Math.round(signal.normalisedScore * 100),
              note: `${titleCase(signal.layerKey)} • Share ${formatPercent(signal.relativeShare)}`,
            }))}
          />
        </ResultsSectionBlock>

        <ResultsSectionBlock title="Metadata" description="Persisted completion and scoring metadata.">
          <ResultMetadataGrid
            items={[
              { label: 'Completion date', value: formatDateTime(model.completedAt) },
              { label: 'Scored at', value: formatDateTime(model.summary?.scoredAt ?? null) },
              { label: 'Version key', value: model.versionKey ?? '—' },
              { label: 'Scoring model', value: model.summary?.scoringModelKey ?? '—' },
              { label: 'Snapshot version', value: model.summary?.snapshotVersion.toString() ?? '—' },
              { label: 'Result status', value: model.resultStatus },
              {
                label: 'Completion duration',
                value:
                  model.responseQuality?.completionDurationSeconds === null || model.responseQuality?.completionDurationSeconds === undefined
                    ? '—'
                    : `${model.responseQuality.completionDurationSeconds}s`,
              },
              { label: 'Response quality', value: model.responseQuality?.responseQualityStatus ?? '—' },
            ]}
          />
        </ResultsSectionBlock>
      </div>

      <ResultsSectionBlock
        title="Strategic interpretation"
        description="Operational guidance to apply this profile effectively in team and delivery contexts."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <InsightCard
            title="Communication"
            detail="Use direct briefings with explicit trade-offs and deadlines. This profile usually responds best when expectations are concrete and observable."
          />
          <InsightCard
            title="Decision-making"
            detail="Assign clear decision rights and escalation thresholds. Signal concentration suggests higher consistency when authority boundaries are explicit."
          />
          <InsightCard
            title="Team strengths"
            detail="Deploy in roles where structured execution and measured judgement need to stabilise programmes with high coordination demand."
          />
          <InsightCard
            title="Environment fit"
            detail="Best fit is typically environments with transparent accountability, cadence-based reviews, and low ambiguity on ownership."
          />
        </div>
      </ResultsSectionBlock>
    </ResultsWorkspaceShell>
  )
}

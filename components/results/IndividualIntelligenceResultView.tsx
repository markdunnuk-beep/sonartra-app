import React from 'react'

import { IndividualResultApiResponse, IndividualResultReadyData } from '@/lib/server/individual-results'
import {
  ResultEmptyStatePanel,
  ResultFailedStatePanel,
  ResultsWorkspaceShell,
  ResultMetadataGrid,
  SignalChip,
} from '@/components/results/ResultsPrimitives'
import { IndividualDashboard } from '@/components/individual/IndividualDashboard'
import { ArchetypeOverview } from '@/components/results/ArchetypeOverview'
import { ResultInterpretationSections } from '@/components/results/ResultInterpretationSections'
import { buildLiveIndividualDashboardProfile } from '@/lib/interpretation/buildLiveIndividualDashboardProfile'
import { buildIndividualResultInterpretation, type IndividualResultInterpretation } from '@/lib/results-interpretation'

type ViewModel = IndividualResultApiResponse | { state: string; message?: string }

export type ReadyIndividualResultViewModel = {
  dashboardProfile: ReturnType<typeof buildLiveIndividualDashboardProfile>
  interpretation: IndividualResultInterpretation
}

export type ReadyIndividualResultPresentationModel = ReadyIndividualResultViewModel

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

export function buildReadyIndividualResultViewModel(data: IndividualResultReadyData, firstName?: string | null): ReadyIndividualResultViewModel {
  return {
    dashboardProfile: buildLiveIndividualDashboardProfile(data, firstName),
    interpretation: buildIndividualResultInterpretation(data, { firstName }),
  }
}

const withDevelopmentDiagnostic = (state: string, children: React.ReactNode) => (
  <>
    {process.env.NODE_ENV !== 'production' ? <p className="text-xs uppercase tracking-[0.14em] text-textSecondary">Rendering state: {state}</p> : null}
    {children}
  </>
)

export function ReadyIndividualResultSections({
  data,
  readyViewModel,
}: {
  data: IndividualResultReadyData
  readyViewModel: ReadyIndividualResultPresentationModel
}) {
  const hasArchetypeSummary = Boolean(readyViewModel.interpretation.archetypeSummary)

  return (
    <>
      {hasArchetypeSummary ? <ArchetypeOverview summary={readyViewModel.interpretation.archetypeSummary} /> : null}

      <IndividualDashboard profile={readyViewModel.dashboardProfile} showOverview={!hasArchetypeSummary} />

      <ResultInterpretationSections interpretation={readyViewModel.interpretation} />

      <section className="surface space-y-4 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <SignalChip tone="accent">Status: ready</SignalChip>
          <SignalChip tone="neutral">Assessment version: {data.assessment.versionKey ?? '—'}</SignalChip>
          <SignalChip tone="neutral">Completed: {formatDateTime(data.assessment.completedAt)}</SignalChip>
        </div>
        <p className="text-sm leading-6 text-textSecondary">{buildSummary(data)}</p>
      </section>

      <section className="surface space-y-4 p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight text-textPrimary">Result metadata</h2>
          <p className="text-sm text-textSecondary">Persisted completion and scoring metadata for this dashboard.</p>
        </div>
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
      </section>
    </>
  )
}

const RESULT_TITLE = 'Individual Intelligence'
const RESULT_SUBTITLE = 'Structured analysis of how this individual tends to operate, decide, lead, and respond under pressure.'

const renderReady = (data: IndividualResultReadyData, state: string, firstName?: string | null) => {
  const readyViewModel = buildReadyIndividualResultViewModel(data, firstName)

  return (
    <ResultsWorkspaceShell
      title={RESULT_TITLE}
      subtitle={RESULT_SUBTITLE}
      statusLabel="Persisted Result"
    >
      {withDevelopmentDiagnostic(state, <ReadyIndividualResultSections data={data} readyViewModel={readyViewModel} />)}
    </ResultsWorkspaceShell>
  )
}

export function IndividualIntelligenceResultView({ model, firstName }: { model: ViewModel; firstName?: string | null }) {
  if (model.state === 'ready' && 'data' in model) {
    return renderReady(model.data, model.state, firstName)
  }

  if (model.state === 'empty') {
    return (
      <ResultsWorkspaceShell title={RESULT_TITLE} subtitle={RESULT_SUBTITLE} statusLabel="No Result Yet">
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
      <ResultsWorkspaceShell title={RESULT_TITLE} subtitle={RESULT_SUBTITLE} statusLabel="Assessment In Progress">
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
      <ResultsWorkspaceShell title={RESULT_TITLE} subtitle={RESULT_SUBTITLE} statusLabel="Temporarily Unavailable">
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
    <ResultsWorkspaceShell title={RESULT_TITLE} subtitle={RESULT_SUBTITLE} statusLabel="Unexpected State">
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

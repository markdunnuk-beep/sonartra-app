'use client'

import React from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Archive, CopyPlus, FlaskConical, Play, Save } from 'lucide-react'
import {
  submitAdminAssessmentRegressionSuiteRunAction,
  submitAdminAssessmentScenarioArchiveAction,
  submitAdminAssessmentScenarioRunAction,
  submitAdminAssessmentScenarioSaveAction,
  type AdminAssessmentRegressionSuiteState,
  type AdminAssessmentScenarioEditorState,
  type AdminAssessmentScenarioRunState,
} from '@/app/admin/assessments/[assessmentId]/versions/[versionNumber]/scenarios/actions'
import { Badge, EmptyState, MetaGrid, SurfaceSection, Table } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import type { AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import type { AdminAssessmentRegressionSuiteSummary, AdminAssessmentScenarioSummary, AdminSavedAssessmentScenarioRecord } from '@/lib/admin/domain/assessment-regression'
import { buildAdminAssessmentSimulationPayloadText, getAdminAssessmentSimulationScenarioOptions } from '@/lib/admin/domain/assessment-simulation'
import { formatAdminTimestamp } from '@/lib/admin/wireframe'

const INITIAL_EDITOR_STATE: AdminAssessmentScenarioEditorState = { status: 'idle' }
const INITIAL_RUN_STATE: AdminAssessmentScenarioRunState = { status: 'idle' }
const INITIAL_SUITE_STATE: AdminAssessmentRegressionSuiteState = { status: 'idle' }

function scenarioTone(status: AdminAssessmentScenarioSummary['quickStatus']) {
  return status === 'ready' ? 'emerald' as const : status === 'archived' ? 'slate' as const : 'amber' as const
}

function comparisonTone(status: NonNullable<AdminAssessmentScenarioRunState['result']>['comparison']['status']) {
  switch (status) {
    case 'no_change': return 'emerald' as const
    case 'changed_expected': return 'sky' as const
    case 'changed_review_required': return 'amber' as const
    default: return 'rose' as const
  }
}

function suiteTone(status: NonNullable<AdminAssessmentRegressionSuiteSummary>['status']) {
  return status === 'clean' ? 'emerald' as const : status === 'review_required' ? 'amber' as const : 'rose' as const
}

function PendingButton({ children, icon }: { children: string; icon: React.ReactNode }) {
  const { pending } = useFormStatus()
  return <Button type="submit" variant="secondary" disabled={pending}>{icon}{pending ? 'Working…' : children}</Button>
}

function ScenarioRunCard({ assessmentId, version, scenario }: { assessmentId: string; version: AdminAssessmentVersionRecord; scenario: AdminAssessmentScenarioSummary }) {
  const [state, action] = useFormState(submitAdminAssessmentScenarioRunAction, INITIAL_RUN_STATE)

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-textPrimary">{scenario.name}</p>
          <p className="mt-1 text-xs text-textSecondary">{scenario.validationSummary}</p>
        </div>
        <form action={action}>
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="versionId" value={version.id} />
          <input type="hidden" name="scenarioId" value={scenario.id} />
          <PendingButton icon={<Play className="mr-2 h-4 w-4" />}>Run regression</PendingButton>
        </form>
      </div>

      {state.message ? <p className="text-sm text-textSecondary">{state.message}</p> : null}
      {state.result ? (
        <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-panel/50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={state.result.comparison.status.replace(/_/g, ' ')} tone={comparisonTone(state.result.comparison.status)} />
            <Badge label={`Baseline ${state.result.baseline.type.replace(/_/g, ' ')}`} tone="slate" />
            <span className="text-xs text-textSecondary">Current v{state.result.current.versionLabel}{state.result.baseline.versionLabel ? ` vs v${state.result.baseline.versionLabel}` : ''}</span>
          </div>
          <p className="text-sm leading-6 text-textPrimary">{state.result.comparison.summary}</p>
          <ul className="space-y-2 text-sm leading-6 text-textPrimary">
            {state.result.comparison.changeSummary.summaries.map((line) => <li key={line}>• {line}</li>)}
          </ul>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-bg/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Warnings</p>
              <p className="mt-2 text-sm text-textPrimary">{state.result.comparison.changeSummary.warningDelta.versionWarnings} current · {state.result.comparison.changeSummary.warningDelta.baselineWarnings} baseline</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-bg/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Triggered outputs</p>
              <p className="mt-2 text-sm text-textPrimary">+{state.result.comparison.changeSummary.outputRuleChanges.added.length} / -{state.result.comparison.changeSummary.outputRuleChanges.removed.length}</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-bg/60 p-3">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Quality verdict</p>
              <p className="mt-2 text-sm text-textPrimary">{state.result.current.reportOutput?.quality.verdict ?? 'blocked'}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ScenarioArchiveForm({ assessmentId, version, scenarioId }: { assessmentId: string; version: AdminAssessmentVersionRecord; scenarioId: string }) {
  const [state, action] = useFormState(submitAdminAssessmentScenarioArchiveAction, INITIAL_EDITOR_STATE)
  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="versionId" value={version.id} />
      <input type="hidden" name="versionLabel" value={version.versionLabel} />
      <input type="hidden" name="scenarioId" value={scenarioId} />
      <PendingButton icon={<Archive className="mr-2 h-4 w-4" />}>Archive</PendingButton>
      {state.message ? <p className="text-xs text-textSecondary">{state.message}</p> : null}
    </form>
  )
}

export function AdminAssessmentScenarioLibraryWorkspace({
  assessmentId,
  version,
  scenarios,
  selectedScenario,
}: {
  assessmentId: string
  version: AdminAssessmentVersionRecord
  scenarios: AdminAssessmentScenarioSummary[]
  selectedScenario: AdminAssessmentScenarioSummary | null
}) {
  const defaultScenario = getAdminAssessmentSimulationScenarioOptions(version.normalizedPackage).find((entry) => entry.key === 'balanced')?.request
  const [editorState, editorAction] = useFormState(submitAdminAssessmentScenarioSaveAction, INITIAL_EDITOR_STATE)
  const [suiteState, suiteAction] = useFormState(submitAdminAssessmentRegressionSuiteRunAction, INITIAL_SUITE_STATE)
  const [editingScenarioId, setEditingScenarioId] = React.useState<string | null>(selectedScenario?.id ?? null)
  const editingScenario = scenarios.find((entry) => entry.id === editingScenarioId) ?? selectedScenario ?? null
  const [name, setName] = React.useState(editingScenario?.name ?? '')
  const [description, setDescription] = React.useState(editingScenario?.description ?? '')
  const [scenarioType, setScenarioType] = React.useState<AdminSavedAssessmentScenarioRecord['scenarioType']>(editingScenario?.scenarioType ?? 'regression')
  const [locale, setLocale] = React.useState(editingScenario?.locale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.meta?.defaultLocale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.metadata?.locales?.defaultLocale ?? '')
  const [payloadText, setPayloadText] = React.useState(editingScenario?.sampleResponsePayload ?? buildAdminAssessmentSimulationPayloadText(defaultScenario ?? { answers: [], locale: (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.meta?.defaultLocale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.metadata?.locales?.defaultLocale ?? null, source: 'manual_json', scenarioKey: null }))

  React.useEffect(() => {
    if (!editingScenario) return
    setName(editingScenario.name)
    setDescription(editingScenario.description ?? '')
    setScenarioType(editingScenario.scenarioType)
    setLocale(editingScenario.locale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.meta?.defaultLocale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.metadata?.locales?.defaultLocale ?? '')
    setPayloadText(editingScenario.sampleResponsePayload)
  }, [editingScenario, version.normalizedPackage])

  const activeScenarios = scenarios.filter((entry) => entry.status === 'active')
  const archivedScenarios = scenarios.filter((entry) => entry.status === 'archived')

  return (
    <div className="space-y-6">
      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Saved scenarios</p>
          <p className="mt-3 text-2xl font-semibold text-textPrimary">{scenarios.length}</p>
          <p className="mt-2 text-sm text-textSecondary">{activeScenarios.length} active · {archivedScenarios.length} archived.</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Regression baseline</p>
          <p className="mt-3 text-sm font-semibold text-textPrimary">Published → previous version → source version</p>
          <p className="mt-2 text-sm text-textSecondary">Baseline selection stays deterministic per scenario run.</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Scenario source</p>
          <p className="mt-3 text-sm font-semibold text-textPrimary">Version v{version.versionLabel}</p>
          <p className="mt-2 text-sm text-textSecondary">Scenarios stay attached to this version for publish QA traceability.</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Execution mode</p>
          <p className="mt-3 text-sm font-semibold text-textPrimary">Synchronous suite run</p>
          <p className="mt-2 text-sm text-textSecondary">Runs execute inline to keep outcomes truthful and operational.</p>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceSection
          title={editingScenario ? 'Edit saved scenario' : 'Create saved scenario'}
          eyebrow="Scenario library"
          description="Save deterministic QA payloads for this assessment version. Payloads are validated against the current normalized package before they can be stored."
          actions={<button type="button" onClick={() => { setEditingScenarioId(null); setName(''); setDescription(''); setScenarioType('regression'); setLocale((version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.meta?.defaultLocale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.metadata?.locales?.defaultLocale ?? ''); setPayloadText(buildAdminAssessmentSimulationPayloadText(defaultScenario ?? { answers: [], locale: (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.meta?.defaultLocale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.metadata?.locales?.defaultLocale ?? null, source: 'manual_json', scenarioKey: null })) }} className="inline-flex min-h-10 items-center rounded-xl border border-white/[0.1] bg-bg/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary hover:border-accent/35 hover:text-textPrimary"><CopyPlus className="mr-2 h-4 w-4" />New scenario</button>}
        >
          <form action={editorAction} className="space-y-4">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <input type="hidden" name="versionId" value={version.id} />
            <input type="hidden" name="versionLabel" value={version.versionLabel} />
            <input type="hidden" name="scenarioId" value={editingScenario?.id ?? ''} />
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Scenario name</span>
                <input name="name" value={name} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-xl border border-border/90 bg-panel/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring" />
                {editorState.fieldErrors?.name ? <p className="text-xs text-rose-200">{editorState.fieldErrors.name}</p> : null}
              </label>
              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Type</span>
                <select name="scenarioType" value={scenarioType} onChange={(event) => setScenarioType(event.target.value as AdminSavedAssessmentScenarioRecord['scenarioType'])} className="h-11 w-full rounded-xl border border-border/90 bg-panel/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
                  <option value="baseline">Baseline</option>
                  <option value="edge_case">Edge case</option>
                  <option value="regression">Regression</option>
                  <option value="stress">Stress</option>
                  <option value="custom">Custom</option>
                </select>
              </label>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Locale</span>
                <input name="locale" value={locale} onChange={(event) => setLocale(event.target.value)} className="h-11 w-full rounded-xl border border-border/90 bg-panel/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring" />
              </label>
              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Description</span>
                <input name="description" value={description} onChange={(event) => setDescription(event.target.value)} className="h-11 w-full rounded-xl border border-border/90 bg-panel/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring" />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              {getAdminAssessmentSimulationScenarioOptions(version.normalizedPackage).map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => option.request ? setPayloadText(buildAdminAssessmentSimulationPayloadText(option.request)) : null}
                  className="rounded-xl border border-white/[0.08] bg-bg/60 px-3 py-2 text-xs uppercase tracking-[0.14em] text-textSecondary hover:border-accent/30 hover:text-textPrimary"
                >
                  Load {option.label}
                </button>
              ))}
            </div>
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Sample response payload</span>
              <textarea name="sampleResponsePayload" value={payloadText} onChange={(event) => setPayloadText(event.target.value)} rows={16} className="min-h-[22rem] w-full rounded-2xl border border-border/90 bg-panel/70 px-4 py-3 text-sm leading-6 text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring" />
              <p className="text-xs leading-5 text-textSecondary">Stored payloads remain QA-only and never create respondent persistence.</p>
              {editorState.fieldErrors?.sampleResponsePayload ? <p className="text-xs text-rose-200">{editorState.fieldErrors.sampleResponsePayload}</p> : null}
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <PendingButton icon={<Save className="mr-2 h-4 w-4" />}>{editingScenario ? 'Update scenario' : 'Save scenario'}</PendingButton>
              {editorState.message ? <p className="text-sm text-textSecondary">{editorState.message}</p> : null}
            </div>
          </form>
        </SurfaceSection>

        <SurfaceSection
          title="Scenario library"
          eyebrow="Saved QA scenarios"
          description="Use saved scenarios as repeatable publish-confidence benchmarks. Archived scenarios remain visible for traceability but are excluded from the suite."
        >
          {scenarios.length ? (
            <Table
              columns={['Scenario', 'Coverage', 'Updated', 'Status', 'Actions']}
              rows={scenarios.map((scenario) => [
                <div key={`${scenario.id}-name`}>
                  <p className="text-sm font-medium text-textPrimary">{scenario.name}</p>
                  <p className="mt-1 text-xs text-textSecondary">{scenario.scenarioType.replace(/_/g, ' ')} · {scenario.locale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.meta?.defaultLocale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.metadata?.locales?.defaultLocale ?? 'default locale'}</p>
                </div>,
                <div key={`${scenario.id}-coverage`}>
                  <p className="text-sm text-textPrimary">{scenario.questionCoverage ?? 'n/a'}</p>
                  <p className="mt-1 text-xs text-textSecondary">{scenario.validationSummary}</p>
                </div>,
                <p key={`${scenario.id}-updated`} className="text-sm text-textPrimary">{formatAdminTimestamp(scenario.updatedAt)}</p>,
                <div key={`${scenario.id}-status`} className="flex flex-wrap gap-2"><Badge label={scenario.status} tone={scenario.status === 'active' ? 'sky' : 'slate'} /><Badge label={scenario.quickStatus.replace(/_/g, ' ')} tone={scenarioTone(scenario.quickStatus)} /></div>,
                <div key={`${scenario.id}-actions`} className="flex flex-wrap gap-2">
                  <Button href={`/admin/assessments/${assessmentId}/versions/${version.versionLabel}/simulate?scenarioId=${scenario.id}`} variant="ghost">Load in simulate</Button>
                  <Button href={`/admin/assessments/${assessmentId}/versions/${version.versionLabel}/report-preview?scenarioId=${scenario.id}`} variant="ghost">Load in report preview</Button>
                  <button type="button" onClick={() => setEditingScenarioId(scenario.id)} className="inline-flex min-h-10 items-center rounded-xl border border-white/[0.1] bg-bg/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary hover:border-accent/35 hover:text-textPrimary">Edit</button>
                  {scenario.status === 'active' ? <ScenarioArchiveForm assessmentId={assessmentId} version={version} scenarioId={scenario.id} /> : null}
                </div>,
              ])}
            />
          ) : (
            <EmptyState title="No saved scenarios yet" detail="Create the first deterministic QA scenario for this version to unlock repeatable regression runs." />
          )}
        </SurfaceSection>
      </div>

      <SurfaceSection
        title="Regression summary"
        eyebrow="Batch suite"
        description="Run every active saved scenario against the current version and the strongest deterministic baseline. Results stay synchronous and immediately reviewable."
        actions={(
          <form action={suiteAction}>
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <input type="hidden" name="versionId" value={version.id} />
            <PendingButton icon={<FlaskConical className="mr-2 h-4 w-4" />}>Run full suite</PendingButton>
          </form>
        )}
      >
        <MetaGrid
          columns={4}
          items={[
            { label: 'Active scenarios', value: String(activeScenarios.length) },
            { label: 'Archived scenarios', value: String(archivedScenarios.length) },
            { label: 'Package status', value: version.packageInfo.status },
            { label: 'Version', value: `v${version.versionLabel}` },
          ]}
        />
        {suiteState.message ? <p className="mt-4 text-sm text-textSecondary">{suiteState.message}</p> : null}
        {suiteState.suite ? (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={suiteState.suite.status.replace(/_/g, ' ')} tone={suiteTone(suiteState.suite.status)} />
              <Badge label={`Baseline ${suiteState.suite.baseline.type.replace(/_/g, ' ')}`} tone="slate" />
              <p className="text-sm text-textSecondary">{suiteState.suite.summary}</p>
            </div>
            <Table
              columns={['Scenario', 'Comparison', 'Evidence']}
              rows={suiteState.suite.results.map((entry) => [
                <div key={`${entry.scenario.id}-scenario`}>
                  <p className="text-sm font-medium text-textPrimary">{entry.scenario.name}</p>
                  <p className="mt-1 text-xs text-textSecondary">{entry.scenario.scenarioType.replace(/_/g, ' ')} · {entry.scenario.questionCoverage ?? 'n/a'}</p>
                </div>,
                <div key={`${entry.scenario.id}-comparison`} className="flex flex-wrap gap-2"><Badge label={entry.comparison.status.replace(/_/g, ' ')} tone={comparisonTone(entry.comparison.status)} /></div>,
                <ul key={`${entry.scenario.id}-summary`} className="space-y-1 text-sm leading-6 text-textPrimary">{entry.comparison.changeSummary.summaries.map((line) => <li key={line}>• {line}</li>)}</ul>,
              ])}
            />
          </div>
        ) : null}
      </SurfaceSection>

      <SurfaceSection title="Per-scenario regression runs" eyebrow="Drill-in" description="Run single scenarios when you need focused comparison evidence before rerunning the full suite.">
        {activeScenarios.length ? (
          <div className="space-y-4">
            {activeScenarios.map((scenario) => <ScenarioRunCard key={scenario.id} assessmentId={assessmentId} version={version} scenario={scenario} />)}
          </div>
        ) : (
          <EmptyState title="No active scenarios" detail="Activate or create at least one scenario before running per-scenario regression checks." />
        )}
      </SurfaceSection>
    </div>
  )
}

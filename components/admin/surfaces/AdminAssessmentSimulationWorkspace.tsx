'use client'

import React from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { FlaskConical, Play, RefreshCcw, RotateCcw } from 'lucide-react'
import { submitAdminAssessmentSimulationAction } from '@/app/admin/assessments/[assessmentId]/actions'
import { Badge, EmptyState, MetaGrid, SurfaceSection, Table } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import type { AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import {
  buildAdminAssessmentSimulationPayloadText,
  getAdminAssessmentSimulationPackageStatusSummary,
  getAdminAssessmentSimulationScenarioOptions,
  getAdminAssessmentSimulationWorkspaceStatus,
  type AdminAssessmentSimulationActionState,
  type AdminAssessmentSimulationInputMode,
  type AdminAssessmentSimulationRequest,
  type AdminAssessmentSimulationResult,
} from '@/lib/admin/domain/assessment-simulation'

type FormMode = AdminAssessmentSimulationInputMode

interface AdminAssessmentSimulationWorkspaceCopy {
  title?: string
  eyebrow?: string
  description?: string
  resultsTitle?: string
  resultsEyebrow?: string
  resultsDescription?: string
}

const INITIAL_STATE: AdminAssessmentSimulationActionState = { status: 'idle' }

function toneForState(status: AdminAssessmentSimulationActionState['status']) {
  switch (status) {
    case 'success':
      return 'emerald' as const
    case 'blocked':
      return 'rose' as const
    case 'error':
      return 'amber' as const
    default:
      return 'slate' as const
  }
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="secondary" disabled={pending} className="min-h-10 px-4 py-2 text-xs">
      <Play className="mr-2 h-4 w-4" />
      {pending ? 'Running simulation…' : 'Run simulation'}
    </Button>
  )
}

function buildRequestFromAnswers(
  answers: Record<string, string>,
  version: AdminAssessmentVersionRecord,
  source: AdminAssessmentSimulationRequest['source'],
  scenarioKey: AdminAssessmentSimulationRequest['scenarioKey'] = null,
): AdminAssessmentSimulationRequest {
  return {
    answers: version.normalizedPackage?.questions.map((question) => ({
      questionId: question.id,
      optionId: answers[question.id] ?? '',
    })).filter((answer) => answer.optionId) ?? [],
    locale: version.normalizedPackage?.meta.defaultLocale ?? null,
    source,
    scenarioKey,
  }
}

export function AdminAssessmentSimulationWorkspace({
  assessmentId,
  version,
  workspaceCopy,
  renderPostResults,
}: {
  assessmentId: string
  version: AdminAssessmentVersionRecord
  workspaceCopy?: AdminAssessmentSimulationWorkspaceCopy
  renderPostResults?: (result: AdminAssessmentSimulationResult) => React.ReactNode
}) {
  const [state, action] = useFormState(submitAdminAssessmentSimulationAction, INITIAL_STATE)
  const copy = {
    title: workspaceCopy?.title ?? 'Simulation input',
    eyebrow: workspaceCopy?.eyebrow ?? 'Sample responses',
    description: workspaceCopy?.description ?? 'Use generated inputs for fast QA or switch to raw JSON when you need exact payload control. All questions are treated as required in this admin simulation layer.',
    resultsTitle: workspaceCopy?.resultsTitle ?? 'Simulation results',
    resultsEyebrow: workspaceCopy?.resultsEyebrow ?? 'Scoring, normalization, and output trace',
    resultsDescription: workspaceCopy?.resultsDescription ?? 'Compact admin evidence for whether the attached package behaves as expected with the supplied sample responses.',
  }
  const eligibility = getAdminAssessmentSimulationWorkspaceStatus(version)
  const scenarioOptions = getAdminAssessmentSimulationScenarioOptions(version.normalizedPackage)
  const initialScenario = scenarioOptions.find((scenario) => scenario.key === 'sensible_defaults')?.request
  const initialPayload = initialScenario ? buildAdminAssessmentSimulationPayloadText(initialScenario) : '{\n  "answers": []\n}'
  const [mode, setMode] = React.useState<FormMode>('generated_form')
  const [answers, setAnswers] = React.useState<Record<string, string>>(() => Object.fromEntries(initialScenario?.answers.map((answer) => [answer.questionId, answer.optionId]) ?? []))
  const [payloadText, setPayloadText] = React.useState(initialPayload)

  React.useEffect(() => {
    if (mode !== 'generated_form') {
      return
    }

    const generated = buildRequestFromAnswers(answers, version, 'generated_form')
    setPayloadText(buildAdminAssessmentSimulationPayloadText(generated))
  }, [answers, mode, version])

  const applyScenario = React.useCallback((key: NonNullable<AdminAssessmentSimulationRequest['scenarioKey']>) => {
    const scenario = scenarioOptions.find((entry) => entry.key === key)?.request
    if (!scenario) {
      return
    }

    setAnswers(Object.fromEntries(scenario.answers.map((answer) => [answer.questionId, answer.optionId])))
    setPayloadText(buildAdminAssessmentSimulationPayloadText(scenario))
    setMode('generated_form')
  }, [scenarioOptions])

  const clearAnswers = React.useCallback(() => {
    setAnswers({})
    setPayloadText(buildAdminAssessmentSimulationPayloadText({ answers: [], locale: version.normalizedPackage?.meta.defaultLocale ?? null, source: 'manual_json', scenarioKey: null }))
  }, [version.normalizedPackage])

  if (!eligibility.canRunSimulation || !version.normalizedPackage) {
    return (
      <SurfaceSection
        title="Simulation workspace"
        eyebrow="Controlled QA execution"
        description="Simulation requires a valid normalized package because it reuses the stored package as the single source of truth."
      >
        <EmptyState
          title="Simulation is blocked"
          detail={eligibility.blockingReason ?? 'Attach and validate a package before simulation can run.'}
          action={<Button href={`/admin/assessments/${assessmentId}/versions/${version.versionLabel}/import`} variant="secondary">Open package import</Button>}
        />
      </SurfaceSection>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceSection
          title={copy.title}
          eyebrow={copy.eyebrow}
          description={copy.description}
        >
          <form action={action} className="space-y-4">
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <input type="hidden" name="versionId" value={version.id} />
            <input type="hidden" name="responsePayload" value={payloadText} />

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setMode('generated_form')} className={`rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.14em] ${mode === 'generated_form' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/[0.08] bg-bg/60 text-textSecondary'}`}>
                Generated form
              </button>
              <button type="button" onClick={() => setMode('manual_json')} className={`rounded-xl border px-3 py-2 text-xs uppercase tracking-[0.14em] ${mode === 'manual_json' ? 'border-accent/40 bg-accent/10 text-accent' : 'border-white/[0.08] bg-bg/60 text-textSecondary'}`}>
                Manual JSON
              </button>
            </div>

            {mode === 'generated_form' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => applyScenario('sensible_defaults')} className="rounded-xl border border-white/[0.08] bg-panel/50 px-3 py-2 text-xs uppercase tracking-[0.14em] text-textPrimary">Load defaults</button>
                  <button type="button" onClick={() => applyScenario('high')} className="rounded-xl border border-white/[0.08] bg-panel/50 px-3 py-2 text-xs uppercase tracking-[0.14em] text-textPrimary">High profile</button>
                  <button type="button" onClick={() => applyScenario('balanced')} className="rounded-xl border border-white/[0.08] bg-panel/50 px-3 py-2 text-xs uppercase tracking-[0.14em] text-textPrimary">Balanced profile</button>
                  <button type="button" onClick={() => applyScenario('low')} className="rounded-xl border border-white/[0.08] bg-panel/50 px-3 py-2 text-xs uppercase tracking-[0.14em] text-textPrimary">Low profile</button>
                  <button type="button" onClick={clearAnswers} className="rounded-xl border border-white/[0.08] bg-bg/60 px-3 py-2 text-xs uppercase tracking-[0.14em] text-textSecondary"><RotateCcw className="mr-2 inline h-3.5 w-3.5" />Clear</button>
                </div>

                <div className="space-y-3">
                  {version.normalizedPackage.questions.map((question) => {
                    const prompt = version.normalizedPackage?.language.locales.find((locale) => locale.locale === version.normalizedPackage?.meta.defaultLocale)?.text[question.promptKey] ?? question.promptKey

                    return (
                      <label key={question.id} className="block rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{question.id}</p>
                            <p className="mt-2 text-sm font-medium leading-6 text-textPrimary">{prompt}</p>
                          </div>
                          {question.reverseScored ? <Badge label="Reverse scored" tone="amber" /> : null}
                        </div>
                        <select
                          value={answers[question.id] ?? ''}
                          onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))}
                          className="mt-4 h-11 w-full rounded-xl border border-border/90 bg-panel/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring"
                        >
                          <option value="">Select an option</option>
                          {question.options.map((option) => {
                            const optionLabel = version.normalizedPackage?.language.locales.find((locale) => locale.locale === version.normalizedPackage?.meta.defaultLocale)?.text[option.labelKey] ?? option.labelKey
                            return <option key={option.id} value={option.id}>{optionLabel}</option>
                          })}
                        </select>
                      </label>
                    )
                  })}
                </div>
              </div>
            ) : (
              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Simulation JSON payload</span>
                <textarea
                  value={payloadText}
                  onChange={(event) => setPayloadText(event.target.value)}
                  rows={18}
                  className="min-h-[28rem] w-full rounded-2xl border border-border/90 bg-panel/70 px-4 py-3 text-sm leading-6 text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring"
                />
                <p className="text-xs leading-5 text-textSecondary">Accepted shapes: {`{"answers":[{"questionId":"q1","optionId":"q1.a"}]}`} or a compact map such as {`{"q1":"q1.a"}`}. </p>
              </label>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <SubmitButton />
              <button type="button" onClick={() => setPayloadText(buildAdminAssessmentSimulationPayloadText(buildRequestFromAnswers(answers, version, mode)))} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/[0.1] bg-bg/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary transition hover:border-accent/35 hover:text-textPrimary">
                <RefreshCcw className="mr-2 h-4 w-4" />Refresh payload
              </button>
            </div>

            {state.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${state.status === 'success' ? 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100' : state.status === 'blocked' ? 'border-rose-400/25 bg-rose-400/[0.08] text-rose-100' : 'border-amber-400/25 bg-amber-400/[0.08] text-amber-100'}`}>
                {state.message}
              </div>
            ) : null}

            {state.fieldErrors?.responsePayload ? <p className="text-sm text-rose-200">{state.fieldErrors.responsePayload}</p> : null}
          </form>
        </SurfaceSection>

        <SurfaceSection
          title="Execution posture"
          eyebrow="Readiness signal"
          description="Simulation is additive evidence before publish: it verifies score paths, normalization, and output references without rendering the final respondent or PDF experience."
        >
          <div className="space-y-4">
            <MetaGrid
              columns={2}
              items={[
                { label: 'Simulation eligibility', value: eligibility.statusLabel },
                { label: 'Package state', value: version.packageInfo.status },
                { label: 'Questions in scope', value: String(version.normalizedPackage.questions.length) },
                { label: 'Output rules in scope', value: String(version.normalizedPackage.outputs?.reportRules.length ?? 0) },
                { label: 'Default locale', value: version.normalizedPackage.meta.defaultLocale },
                { label: 'Lifecycle', value: version.lifecycleStatus },
              ]}
            />

            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4 text-sm leading-6 text-textSecondary">
              <p className="font-medium text-textPrimary">Simulation notes</p>
              <ul className="mt-3 space-y-2">
                <li>• {eligibility.summary}</li>
                <li>• {getAdminAssessmentSimulationPackageStatusSummary(version.packageInfo.status)}</li>
                <li>• Simulation does not persist respondent sessions or render final reports.</li>
                <li>• Audit captures explicit run attempts only, never passive form edits or answer payload contents.</li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-accent" />
                <p className="text-sm font-medium text-textPrimary">Latest in-session result</p>
                <Badge label={state.status === 'idle' ? 'Not run yet' : state.status} tone={toneForState(state.status)} />
              </div>
              <p className="mt-3 text-sm leading-6 text-textSecondary">
                {state.result
                  ? `${state.result.responseSummary.answeredCount}/${state.result.responseSummary.totalQuestions} answers evaluated · ${state.result.outputs.filter((output) => output.triggered).length} outputs fired.`
                  : 'Run a simulation to populate operational evidence for this draft or published version.'}
              </p>
            </div>
          </div>
        </SurfaceSection>
      </div>

      <SurfaceSection
        title={copy.resultsTitle}
        eyebrow={copy.resultsEyebrow}
        description={copy.resultsDescription}
      >
        {state.result ? (
          <div className="space-y-5">
            <MetaGrid
              columns={3}
              items={[
                { label: 'Input summary', value: `${state.result.responseSummary.answeredCount}/${state.result.responseSummary.totalQuestions} questions answered` },
                { label: 'Execution source', value: state.result.responseSummary.source.replace(/_/g, ' ') },
                { label: 'Locale', value: state.result.responseSummary.locale },
                { label: 'Scenario', value: state.result.responseSummary.scenarioKey?.replace(/_/g, ' ') ?? 'Custom' },
                { label: 'Triggered outputs', value: String(state.result.outputs.filter((output) => output.triggered).length) },
                { label: 'Warnings', value: String(state.result.warnings.length) },
              ]}
            />

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Raw scores</p>
                <Table
                  columns={['Dimension', 'Raw score', 'Range', 'Raw %']}
                  rows={state.result.rawScores.map((result) => [
                    <p key={`${result.dimensionId}-label`} className="text-sm font-medium text-textPrimary">{result.label}</p>,
                    <p key={`${result.dimensionId}-raw`} className="text-sm text-textPrimary">{result.rawScore}</p>,
                    <p key={`${result.dimensionId}-range`} className="text-sm text-textPrimary">{result.minimumPossibleScore} → {result.maximumPossibleScore}</p>,
                    <p key={`${result.dimensionId}-pct`} className="text-sm text-textPrimary">{result.rawPercentage === null ? 'n/a' : `${result.rawPercentage}%`}</p>,
                  ])}
                />
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Normalized scores</p>
                <Table
                  columns={['Dimension', 'Scale', 'Normalized', 'Band']}
                  rows={state.result.normalizedScores.map((result) => [
                    <p key={`${result.dimensionId}-label`} className="text-sm font-medium text-textPrimary">{result.label}</p>,
                    <p key={`${result.dimensionId}-scale`} className="text-sm text-textPrimary">{result.scaleId}</p>,
                    <p key={`${result.dimensionId}-value`} className="text-sm text-textPrimary">{result.normalizedScore ?? 'n/a'} <span className="text-textSecondary">({result.range.min} → {result.range.max})</span></p>,
                    <p key={`${result.dimensionId}-band`} className="text-sm text-textPrimary">{result.band?.label ?? 'No band matched'}</p>,
                  ])}
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Output results</p>
              <Table
                columns={['Output', 'State', 'Why it fired', 'Warnings']}
                rows={state.result.outputs.map((output) => [
                  <div key={`${output.key}-label`} className="space-y-2">
                    <p className="text-sm font-medium text-textPrimary">{output.label}</p>
                    <p className="text-xs text-textSecondary">{output.key}{output.normalizationScaleId ? ` · scale ${output.normalizationScaleId}` : ''}</p>
                  </div>,
                  <Badge key={`${output.key}-state`} label={output.triggered ? 'Triggered' : 'Unresolved'} tone={output.triggered ? 'emerald' : 'amber'} />,
                  <ul key={`${output.key}-reasons`} className="space-y-1 text-sm leading-6 text-textPrimary">{output.reasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul>,
                  <ul key={`${output.key}-warnings`} className="space-y-1 text-sm leading-6 text-textPrimary">{(output.warnings.length ? output.warnings : ['—']).map((warning) => <li key={warning}>{warning === '—' ? warning : `• ${warning}`}</li>)}</ul>,
                ])}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
              <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Trace / evidence</p>
                <ul className="space-y-3 text-sm leading-6 text-textPrimary">
                  {state.result.trace.questions.map((trace) => (
                    <li key={trace.questionId} className="rounded-2xl border border-white/[0.07] bg-panel/40 px-4 py-3">
                      <p className="font-medium">{trace.questionId} · {trace.prompt}</p>
                      <p className="mt-1 text-textSecondary">Selected {trace.selectedOptionLabel}{trace.reverseScored ? `, reverse-scored via ${trace.effectiveOptionLabel}` : ''}.</p>
                      <p className="mt-2 text-textSecondary">{trace.contributions.map((entry) => `${entry.dimensionId}: ${entry.contribution}`).join(' · ')}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Readiness notes</p>
                <ul className="space-y-2 text-sm leading-6 text-textPrimary">
                  {state.result.readinessNotes.map((note) => <li key={note}>• {note}</li>)}
                </ul>
                <div className="mt-4 border-t border-white/[0.06] pt-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Simulation warnings</p>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-textPrimary">
                    {(state.result.warnings.length ? state.result.warnings.map((warning) => `${warning.path} · ${warning.message}`) : ['No warnings emitted during simulation.']).map((warning) => <li key={warning}>• {warning}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <details className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <summary className="cursor-pointer text-sm font-medium text-textPrimary">Debug payload</summary>
              <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/[0.06] bg-panel/40 p-4 text-xs leading-6 text-textSecondary">{JSON.stringify({ input: state.result.debug.responsePayload, request: state.result.request }, null, 2)}</pre>
            </details>
            {renderPostResults ? <div className="pt-2">{renderPostResults(state.result)}</div> : null}
          </div>
        ) : (
          <EmptyState title="No simulation result yet" detail="Run a simulation to inspect input coverage, raw scoring, normalization, output triggers, and trace evidence for this version." />
        )}
      </SurfaceSection>
    </div>
  )
}

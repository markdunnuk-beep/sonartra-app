'use client'

import React from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { submitAdminAssessmentImportPackageAction } from '@/app/admin/assessments/[assessmentId]/actions'
import {
  normalizeAdminAssessmentPackageImportState,
  type AdminAssessmentPackageImportState,
  type AdminAssessmentVersionRecord,
} from '@/lib/admin/domain/assessment-management'

const INITIAL_STATE: AdminAssessmentPackageImportState = { status: 'idle' }

class PackageImportErrorBoundary extends React.Component<{
  children: React.ReactNode
}, {
  hasError: boolean
}> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('[admin-assessment-import] Import form render failed.', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-100">
          The import workspace hit an unexpected client-side error. Reload the page and retry the import. If the issue persists, inspect the browser console and the last import payload.
        </div>
      )
    }

    return this.props.children
  }
}

function SubmitButton() {
  const { pending } = typeof useFormStatus === 'function' ? useFormStatus() : { pending: false }

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent transition hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? 'Importing…' : 'Validate + attach package'}
    </button>
  )
}

function InlineStateMessage({ state }: { state: AdminAssessmentPackageImportState }) {
  if (!state.message) {
    return null
  }

  const styles = state.status === 'success'
    ? 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100'
    : 'border-rose-400/20 bg-rose-400/[0.06] text-rose-100'

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>
      {state.message}
    </div>
  )
}

function ValidationResults({ state }: { state: AdminAssessmentPackageImportState }) {
  const validationErrors = state.validationResult?.errors ?? []
  const validationWarnings = state.validationResult?.warnings ?? []
  const summary = state.validationResult?.summary
  const readiness = state.validationResult?.readiness

  if (validationErrors.length === 0 && validationWarnings.length === 0 && !summary && !state.validationResult?.detectedVersion) {
    return null
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-panel/40 p-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Validation results</p>
        <p className="mt-1 text-sm text-textPrimary">{validationErrors.length} error(s) · {validationWarnings.length} warning(s)</p>
        <p className="mt-1 text-xs text-textSecondary">
          Detected package version: {state.validationResult?.detectedVersion?.replace(/_/g, ' ') ?? 'unknown'}
          {state.validationResult?.schemaVersion ? ` · schema ${state.validationResult.schemaVersion}` : ''}
        </p>
        {state.validationResult?.packageName || state.validationResult?.versionLabel ? (
          <p className="mt-1 text-xs text-textSecondary">
            {(state.validationResult?.packageName ?? 'Unnamed package')}
            {state.validationResult?.versionLabel ? ` · version ${state.validationResult.versionLabel}` : ''}
          </p>
        ) : null}
      </div>

      {summary ? (
        <div className="grid gap-2 text-xs text-textSecondary sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.08] bg-bg/30 px-3 py-2">Questions · <span className="text-textPrimary">{summary.questionsCount}</span></div>
          <div className="rounded-xl border border-white/[0.08] bg-bg/30 px-3 py-2">Dimensions · <span className="text-textPrimary">{summary.dimensionsCount}</span></div>
          <div className="rounded-xl border border-white/[0.08] bg-bg/30 px-3 py-2">Sections · <span className="text-textPrimary">{summary.sectionCount ?? 0}</span></div>
          <div className="rounded-xl border border-white/[0.08] bg-bg/30 px-3 py-2">Outputs · <span className="text-textPrimary">{summary.outputRuleCount}</span></div>
        </div>
      ) : null}

      {readiness ? (
        <div className="rounded-xl border border-white/[0.08] bg-bg/30 px-3 py-3 text-xs text-textSecondary">
          <p className="font-semibold uppercase tracking-[0.14em] text-textPrimary">Readiness</p>
          <p className="mt-2">Structurally valid: {readiness.structurallyValid ? 'Yes' : 'No'} · Importable: {readiness.importable ? 'Yes' : 'No'}</p>
          <p className="mt-1">Compilable: {readiness.compilable ? 'Yes' : 'No'} · Evaluatable: {readiness.evaluatable ? 'Yes' : 'No'} · Admin simulatable: {readiness.simulatable ? 'Yes' : 'No'}</p>
          <p className="mt-1">Runtime executable: {readiness.runtimeExecutable ? 'Yes' : 'No'} · Live runtime enabled: {readiness.liveRuntimeEnabled ? 'Yes' : 'No'} · Publishable: {readiness.publishable ? 'Yes' : 'No'}</p>
        </div>
      ) : null}

      {validationErrors.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Errors</p>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-rose-100">
            {validationErrors.map((issue) => (
              <li key={`${issue.path}-${issue.message}`} className="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] px-3 py-2">
                <span className="font-medium">{issue.path}</span> · {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {validationWarnings.length ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Warnings</p>
          <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-100">
            {validationWarnings.map((issue) => (
              <li key={`${issue.path}-${issue.message}`} className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2">
                <span className="font-medium">{issue.path}</span> · {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export function AdminAssessmentVersionPackageImportForm({
  assessmentId,
  version,
}: {
  assessmentId: string
  version: AdminAssessmentVersionRecord
}) {
  const supportsFormState = typeof useFormState === 'function'
  const [rawState, action] = supportsFormState
    ? useFormState(submitAdminAssessmentImportPackageAction, INITIAL_STATE)
    : [INITIAL_STATE, undefined as unknown as never]
  const state = normalizeAdminAssessmentPackageImportState(rawState)

  return (
    <PackageImportErrorBoundary>
      <form action={action} className="space-y-4 rounded-[1.25rem] border border-white/[0.08] bg-bg/55 p-4">
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <input type="hidden" name="versionId" value={version.id} />
        <input type="hidden" name="versionLabel" value={version.versionLabel} />
        <input type="hidden" name="expectedUpdatedAt" value={version.updatedAt} />

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <label className="block space-y-2">
            <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Package JSON</span>
            <textarea
              name="packageText"
              rows={18}
              placeholder='Paste a Sonartra package JSON payload (legacy v1, Package Contract v2, or hybrid_mvp_v1), for example {"meta": {"schemaVersion": "sonartra-assessment-package/v1"}}, {"packageVersion":"2","schemaVersion":"sonartra-assessment-package/v2"}, or {"contractVersion":"hybrid_mvp_v1","assessmentId":"...","assessmentKey":"..."}'
              className="min-h-[28rem] w-full rounded-2xl border border-border/90 bg-panel/70 px-4 py-3 text-sm leading-6 text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring"
            />
            {state.fieldErrors?.packageText ? <p className="text-sm text-rose-200">{state.fieldErrors.packageText}</p> : null}
          </label>

          <div className="space-y-4">
            <label className="block space-y-2 rounded-2xl border border-white/[0.06] bg-panel/40 p-4">
              <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Optional .json upload</span>
              <input
                name="packageFile"
                type="file"
                accept="application/json,.json"
                className="block w-full text-sm text-textSecondary file:mr-4 file:rounded-xl file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.14em] file:text-textPrimary"
              />
              <p className="text-xs leading-5 text-textSecondary">If both file upload and pasted JSON are supplied, the uploaded file is used.</p>
              {state.fieldErrors?.packageFile ? <p className="text-sm text-rose-200">{state.fieldErrors.packageFile}</p> : null}
            </label>

            <div className="rounded-2xl border border-white/[0.06] bg-panel/40 p-4 text-sm leading-6 text-textSecondary">
              <p className="font-medium text-textPrimary">Import rules</p>
              <ul className="mt-3 space-y-2">
                <li>• Only draft versions can accept package imports.</li>
                <li>• Valid packages replace the current draft payload in-place.</li>
                <li>• Legacy v1 packages can continue through the current simulation/publish workflow.</li>
                <li>• Package Contract v2 imports validate and persist safely, but publish remains blocked until the runtime path supports v2 execution.</li>
                <li>• hybrid_mvp_v1 imports validate against the fixed hybrid contract and can be published without the legacy package-engine path.</li>
                <li>• Invalid imports are rejected and block publish until a valid package is attached.</li>
              </ul>
            </div>

            <SubmitButton />
            <InlineStateMessage state={state} />
            <ValidationResults state={state} />
          </div>
        </div>
      </form>
    </PackageImportErrorBoundary>
  )
}

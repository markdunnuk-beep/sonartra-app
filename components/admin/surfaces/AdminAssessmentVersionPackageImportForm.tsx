'use client'

import React from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { submitAdminAssessmentImportPackageAction } from '@/app/admin/assessments/[assessmentId]/actions'
import type { AdminAssessmentPackageImportState, AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'

const INITIAL_STATE: AdminAssessmentPackageImportState = { status: 'idle' }

function SubmitButton() {
  const { pending } = useFormStatus()

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

export function AdminAssessmentVersionPackageImportForm({
  assessmentId,
  version,
}: {
  assessmentId: string
  version: AdminAssessmentVersionRecord
}) {
  const [state, action] = useFormState(submitAdminAssessmentImportPackageAction, INITIAL_STATE)

  return (
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
            placeholder='Paste a Sonartra package spec v1 JSON payload, for example {"meta": {"schemaVersion": "sonartra-assessment-package/v1"}}'
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
              <li>• Warning-level imports remain publishable, but the warnings stay visible in admin.</li>
              <li>• Invalid imports are rejected and block publish until a valid package is attached.</li>
            </ul>
          </div>

          <SubmitButton />

          {state.message ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-100">
              {state.message}
            </div>
          ) : null}

          {state.validationResult ? (
            <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-panel/40 p-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Validation results</p>
                <p className="mt-1 text-sm text-textPrimary">{state.validationResult.errors.length} error(s) · {state.validationResult.warnings.length} warning(s)</p>
              </div>

              {state.validationResult.errors.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Errors</p>
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-rose-100">
                    {state.validationResult.errors.map((issue) => (
                      <li key={`${issue.path}-${issue.message}`} className="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] px-3 py-2">
                        <span className="font-medium">{issue.path}</span> · {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {state.validationResult.warnings.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Warnings</p>
                  <ul className="mt-2 space-y-2 text-xs leading-5 text-amber-100">
                    {state.validationResult.warnings.map((issue) => (
                      <li key={`${issue.path}-${issue.message}`} className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2">
                        <span className="font-medium">{issue.path}</span> · {issue.message}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </form>
  )
}

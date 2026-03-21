'use client'

import React from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  submitAdminAssessmentRefreshReadinessAction,
  submitAdminAssessmentReleaseNotesAction,
  submitAdminAssessmentRemoveSignOffAction,
  submitAdminAssessmentSignOffAction,
} from '@/app/admin/assessments/[assessmentId]/actions'
import { Button } from '@/components/ui/Button'
import type { AdminAssessmentVersionMutationState, AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'

const INITIAL_STATE: AdminAssessmentVersionMutationState = { status: 'idle' }

function PendingButton({ label, variant = 'secondary' }: { label: string; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const status = typeof useFormStatus === 'function' ? useFormStatus() : { pending: false }
  return <Button type="submit" variant={variant} disabled={status.pending} className="min-h-9 px-3 py-2 text-xs">{status.pending ? 'Saving…' : label}</Button>
}

function InlineMessage({ state }: { state: AdminAssessmentVersionMutationState }) {
  if (!state.message) {
    return null
  }

  return <p className={`text-xs ${state.status === 'success' ? 'text-emerald-100' : 'text-rose-200'}`}>{state.message}</p>
}

export function AdminAssessmentVersionReleaseControls({
  assessmentId,
  version,
}: {
  assessmentId: string
  version: AdminAssessmentVersionRecord
}) {
  const governance = version.releaseGovernance ?? { signOff: { status: 'unsigned' as const }, releaseNotes: null }
  const supportsFormState = typeof useFormState === 'function'
  const [refreshState, refreshAction] = supportsFormState ? useFormState(submitAdminAssessmentRefreshReadinessAction, INITIAL_STATE) : [INITIAL_STATE, undefined as unknown as never]
  const [signOffState, signOffAction] = supportsFormState ? useFormState(submitAdminAssessmentSignOffAction, INITIAL_STATE) : [INITIAL_STATE, undefined as unknown as never]
  const [removeState, removeAction] = supportsFormState ? useFormState(submitAdminAssessmentRemoveSignOffAction, INITIAL_STATE) : [INITIAL_STATE, undefined as unknown as never]
  const [notesState, notesAction] = supportsFormState ? useFormState(submitAdminAssessmentReleaseNotesAction, INITIAL_STATE) : [INITIAL_STATE, undefined as unknown as never]

  if (!supportsFormState) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary">Run readiness check</Button>
          {version.lifecycleStatus === 'draft' ? <Button variant={governance.signOff.status === 'signed_off' ? 'ghost' : 'secondary'}>{governance.signOff.status === 'signed_off' ? 'Remove sign-off' : 'Sign off version'}</Button> : null}
        </div>
        <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-bg/45 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Release notes</p>
          <textarea defaultValue={governance.releaseNotes ?? ''} rows={7} className="min-h-[10rem] w-full rounded-2xl border border-border/90 bg-panel/70 px-4 py-3 text-sm leading-6 text-textPrimary" />
          <Button variant="secondary">Save release notes</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <form action={refreshAction} className="space-y-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="versionId" value={version.id} />
          <input type="hidden" name="versionLabel" value={version.versionLabel} />
          <PendingButton label="Run readiness check" variant="secondary" />
          <InlineMessage state={refreshState} />
        </form>

        {version.lifecycleStatus === 'draft' ? (
          governance.signOff.status === 'signed_off' ? (
            <form action={removeAction} className="space-y-2">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input type="hidden" name="versionId" value={version.id} />
              <input type="hidden" name="versionLabel" value={version.versionLabel} />
              <PendingButton label="Remove sign-off" variant="ghost" />
              <InlineMessage state={removeState} />
            </form>
          ) : (
            <form action={signOffAction} className="space-y-2">
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input type="hidden" name="versionId" value={version.id} />
              <input type="hidden" name="versionLabel" value={version.versionLabel} />
              <PendingButton label="Sign off version" variant="secondary" />
              <InlineMessage state={signOffState} />
            </form>
          )
        ) : null}
      </div>

      <form action={notesAction} className="space-y-3 rounded-2xl border border-white/[0.06] bg-bg/45 p-4">
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <input type="hidden" name="versionId" value={version.id} />
        <input type="hidden" name="versionLabel" value={version.versionLabel} />
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Release notes</span>
          <textarea
            name="releaseNotes"
            defaultValue={governance.releaseNotes ?? ''}
            rows={7}
            placeholder="Internal release notes, exceptions, or operator context for this version."
            className="min-h-[10rem] w-full rounded-2xl border border-border/90 bg-panel/70 px-4 py-3 text-sm leading-6 text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring"
          />
        </label>
        {notesState.fieldErrors?.releaseNotes ? <p className="text-xs text-rose-200">{notesState.fieldErrors.releaseNotes}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <PendingButton label="Save release notes" variant="secondary" />
          <InlineMessage state={notesState} />
        </div>
      </form>
    </div>
  )
}

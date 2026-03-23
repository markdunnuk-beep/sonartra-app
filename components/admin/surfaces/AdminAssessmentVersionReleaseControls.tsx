'use client'

import React from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  submitAdminAssessmentPublishVersionAction,
  submitAdminAssessmentRefreshReadinessAction,
  submitAdminAssessmentReleaseNotesAction,
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
  mode = 'actions',
}: {
  assessmentId: string
  version: AdminAssessmentVersionRecord
  mode?: 'actions' | 'notes'
}) {
  const governance = version.releaseGovernance ?? { releaseNotes: null }
  const supportsFormState = typeof useFormState === 'function'
  const [refreshState, refreshAction] = supportsFormState ? useFormState(submitAdminAssessmentRefreshReadinessAction, INITIAL_STATE) : [INITIAL_STATE, undefined as unknown as never]
  const [publishState, publishAction] = supportsFormState ? useFormState(submitAdminAssessmentPublishVersionAction, INITIAL_STATE) : [INITIAL_STATE, undefined as unknown as never]
  const [notesState, notesAction] = supportsFormState ? useFormState(submitAdminAssessmentReleaseNotesAction, INITIAL_STATE) : [INITIAL_STATE, undefined as unknown as never]
  const publishDisabled = version.lifecycleStatus !== 'draft'

  if (mode === 'notes') {
    if (!supportsFormState) {
      return (
        <div className="space-y-3 rounded-2xl border border-white/[0.06] bg-bg/45 p-4">
          <textarea defaultValue={governance.releaseNotes ?? ''} rows={6} className="min-h-[9rem] w-full rounded-2xl border border-border/90 bg-panel/70 px-4 py-3 text-sm leading-6 text-textPrimary" />
          <Button variant="secondary">Save notes</Button>
        </div>
      )
    }

    return (
      <form action={notesAction} className="space-y-3 rounded-2xl border border-white/[0.06] bg-bg/45 p-4">
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <input type="hidden" name="versionId" value={version.id} />
        <input type="hidden" name="versionLabel" value={version.versionLabel} />
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Internal notes</span>
          <textarea
            name="releaseNotes"
            defaultValue={governance.releaseNotes ?? ''}
            rows={6}
            placeholder="Optional notes for your team."
            className="min-h-[9rem] w-full rounded-2xl border border-border/90 bg-panel/70 px-4 py-3 text-sm leading-6 text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring"
          />
        </label>
        {notesState.fieldErrors?.releaseNotes ? <p className="text-xs text-rose-200">{notesState.fieldErrors.releaseNotes}</p> : null}
        <div className="flex flex-wrap items-center gap-3">
          <PendingButton label="Save notes" variant="secondary" />
          <InlineMessage state={notesState} />
        </div>
      </form>
    )
  }

  if (!supportsFormState) {
    return (
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary">Run test</Button>
        <Button variant="secondary">Check readiness</Button>
        <Button variant="primary" disabled={publishDisabled}>Publish version</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      <Button href={`/admin/assessments/${assessmentId}/versions/${version.versionLabel}/simulate`} variant="secondary">Run test</Button>

      <form action={refreshAction} className="space-y-2">
        <input type="hidden" name="assessmentId" value={assessmentId} />
        <input type="hidden" name="versionId" value={version.id} />
        <input type="hidden" name="versionLabel" value={version.versionLabel} />
        <PendingButton label="Check readiness" variant="secondary" />
        <InlineMessage state={refreshState} />
      </form>

      {publishDisabled ? (
        <div className="space-y-2">
          <Button variant="primary" disabled>Publish version</Button>
          <p className="text-xs text-textSecondary">Only draft versions can be published from this page.</p>
        </div>
      ) : (
        <form action={publishAction} className="space-y-2">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input type="hidden" name="versionId" value={version.id} />
          <input type="hidden" name="expectedUpdatedAt" value={version.updatedAt} />
          <PendingButton label="Publish version" variant="primary" />
          <InlineMessage state={publishState} />
        </form>
      )}
    </div>
  )
}

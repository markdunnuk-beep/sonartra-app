'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { submitAdminAssessmentCreateOrAttachPackageAction } from '@/app/admin/assessments/import/actions'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge, SurfaceSection } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import {
  normalizeAdminAssessmentPackageCreateOrAttachState,
  type AdminAssessmentPackageCreateOrAttachState,
} from '@/lib/admin/domain/assessment-management'

const INITIAL_STATE: AdminAssessmentPackageCreateOrAttachState = { status: 'idle', packageText: '' }

function SubmitButton({ intent, label, pendingLabel }: { intent: 'review' | 'confirm'; label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      name="intent"
      value={intent}
      disabled={pending}
      className="inline-flex min-h-10 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-accent transition hover:bg-accent/15 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  )
}

function ReviewPanel({ state }: { state: ReturnType<typeof normalizeAdminAssessmentPackageCreateOrAttachState> }) {
  const review = state.review
  if (!review) {
    return null
  }

  const identity = review.packageIdentity
  const decision = review.decision
  const errors = review.conflicts.filter((conflict) => conflict.severity === 'error')
  const warnings = review.conflicts.filter((conflict) => conflict.severity === 'warning')

  return (
    <div className="space-y-4 rounded-[1.25rem] border border-white/[0.08] bg-panel/45 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge label={decision?.action === 'create_assessment' ? 'Create assessment' : 'Attach version'} tone={decision?.action === 'create_assessment' ? 'emerald' : 'slate'} />
        <Badge label={review.validationResult?.detectedVersion?.replace(/_/g, ' ') ?? 'Unknown package'} tone="slate" />
        {review.validationResult?.schemaVersion ? <Badge label={review.validationResult.schemaVersion} tone="slate" /> : null}
      </div>

      {identity ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.08] bg-bg/35 p-3 text-sm text-textSecondary"><p className="text-[11px] uppercase tracking-[0.16em]">Assessment name</p><p className="mt-2 text-textPrimary">{identity.assessmentName}</p></div>
          <div className="rounded-2xl border border-white/[0.08] bg-bg/35 p-3 text-sm text-textSecondary"><p className="text-[11px] uppercase tracking-[0.16em]">Assessment key</p><p className="mt-2 break-all text-textPrimary">{identity.assessmentKey}</p><p className="mt-2 text-xs text-textSecondary">Canonical stable identity. Previously called library key.</p></div>
          <div className="rounded-2xl border border-white/[0.08] bg-bg/35 p-3 text-sm text-textSecondary"><p className="text-[11px] uppercase tracking-[0.16em]">Slug</p><p className="mt-2 break-all text-textPrimary">{identity.slug}</p></div>
          <div className="rounded-2xl border border-white/[0.08] bg-bg/35 p-3 text-sm text-textSecondary"><p className="text-[11px] uppercase tracking-[0.16em]">Category</p><p className="mt-2 text-textPrimary">{identity.category}</p></div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-white/[0.08] bg-bg/35 p-4 text-sm leading-6 text-textSecondary">
        <p className="font-medium text-textPrimary">Import decision</p>
        <p className="mt-2">
          {decision?.action === 'create_assessment'
            ? 'The assessment key is new, so confirmation will create a new parent assessment and import the package as its first version.'
            : decision?.matchedAssessment
              ? `The assessment key already exists, so confirmation will attach a new version to ${decision.matchedAssessment.name}.`
              : 'Review the package metadata before importing.'}
        </p>
        {decision?.matchedAssessment ? (
          <p className="mt-2 text-xs text-textSecondary">
            Matched assessment: {decision.matchedAssessment.name} · {decision.matchedAssessment.key} · {decision.matchedAssessment.slug}
          </p>
        ) : null}
        {decision?.versionLabel ? <p className="mt-2 text-xs text-textSecondary">Version label: {decision.versionLabel}</p> : null}
      </div>

      {errors.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Blocking conflicts</p>
          <ul className="mt-2 space-y-2">
            {errors.map((conflict) => (
              <li key={`${conflict.code}-${conflict.message}`} className="rounded-xl border border-rose-400/15 bg-rose-400/[0.05] px-3 py-2 text-sm text-rose-100">
                {conflict.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Warnings</p>
          <ul className="mt-2 space-y-2">
            {warnings.map((conflict) => (
              <li key={`${conflict.code}-${conflict.message}`} className="rounded-xl border border-amber-400/15 bg-amber-400/[0.05] px-3 py-2 text-sm text-amber-100">
                {conflict.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.05] px-4 py-3 text-sm text-emerald-100">
        <ShieldCheck className="mr-2 inline h-4 w-4" />
        {review.governanceNotice}
      </div>
    </div>
  )
}

export function AdminAssessmentPackageCreateOrAttachForm() {
  const [rawState, action] = useFormState(submitAdminAssessmentCreateOrAttachPackageAction, INITIAL_STATE)
  const state = normalizeAdminAssessmentPackageCreateOrAttachState(rawState)
  const hasBlockingConflicts = Boolean(state.review?.conflicts.some((conflict) => conflict.severity === 'error'))

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessments"
        title="Import assessment package"
        description="Upload a package to create a new assessment or add a new version to an existing one."
        actions={<Button href="/admin/assessments" variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />← Back to Assessments</Button>}
      />

      <div className="mx-auto w-full max-w-5xl">
        <SurfaceSection
          title="Upload package"
          description="Paste your package or upload a JSON file. You’ll be able to review it before anything is saved."
        >
          <form action={action} className="space-y-4">
            {state.message ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${state.status === 'success' ? 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100' : 'border-white/[0.08] bg-panel/45 text-textPrimary'}`}>
                {state.message}
              </div>
            ) : null}

            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Package JSON</span>
              <textarea
                name="packageText"
                rows={18}
                defaultValue={state.packageText}
                placeholder='Paste your assessment package JSON here'
                className="min-h-[28rem] w-full rounded-2xl border border-border/90 bg-panel/70 px-4 py-3 text-sm leading-6 text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring"
              />
              {state.fieldErrors?.packageText ? <p className="text-sm text-rose-200">{state.fieldErrors.packageText}</p> : null}
            </label>

            <label className="block space-y-2 rounded-2xl border border-white/[0.06] bg-panel/40 p-4">
              <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Optional .json upload</span>
              <input
                name="packageFile"
                type="file"
                accept="application/json,.json"
                className="block w-full text-sm text-textSecondary file:mr-4 file:rounded-xl file:border-0 file:bg-white/[0.08] file:px-3 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.14em] file:text-textPrimary"
              />
              <p className="text-xs leading-5 text-textSecondary">If both file upload and pasted JSON are supplied, the uploaded file is used for review and confirmation.</p>
              {state.fieldErrors?.packageFile ? <p className="text-sm text-rose-200">{state.fieldErrors.packageFile}</p> : null}
            </label>

            <ReviewPanel state={state} />

            <div className="flex flex-wrap gap-3 border-t border-white/[0.06] pt-4">
              <SubmitButton intent="review" label="Review package import" pendingLabel="Reviewing…" />
              {state.review && !hasBlockingConflicts ? <SubmitButton intent="confirm" label="Confirm import" pendingLabel="Importing…" /> : null}
              <Button href="/admin/assessments" variant="secondary">Cancel</Button>
            </div>
          </form>
        </SurfaceSection>

      </div>
    </div>
  )
}

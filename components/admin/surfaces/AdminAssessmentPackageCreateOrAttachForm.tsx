'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ArrowLeft, FileJson2, GitBranchPlus, ShieldCheck } from 'lucide-react'
import { submitAdminAssessmentCreateOrAttachPackageAction } from '@/app/admin/assessments/import/actions'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge, SurfaceSection } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  ADMIN_ASSESSMENT_IDENTITY_MUTABILITY_RULES,
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
        description="Package-first workflow for parsing canonical identity metadata, matching by stable assessment key, and either creating a new assessment or attaching a new version."
        actions={<Button href="/admin/assessments" variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to registry</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceSection
          title="Upload package"
          eyebrow="Package-first import"
          description="Upload or paste a JSON package, review what the package says, confirm the system decision, and inspect warnings or overrides before anything is persisted."
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
                placeholder='Paste a Sonartra package JSON payload. The package is the source of truth for assessment name, assessment key, slug, category, and version metadata during import.'
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

        <div className="space-y-4">
          <Card className="px-6 py-5 sm:px-7 sm:py-6">
            <div className="flex items-center gap-2 text-textPrimary">
              <FileJson2 className="h-4 w-4" />
              <p className="eyebrow">Workflow framing</p>
            </div>
            <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-textPrimary">Package owns identity</h2>
            <div className="mt-4 space-y-3 text-sm leading-6 text-textSecondary">
              <p>Assessment name, assessment key, slug, category, and package version now come from the uploaded package instead of being re-keyed by hand in admin.</p>
              <p>The import review matches by stable assessment key, shows whether the system will create a new assessment or attach a new version, and surfaces conflicts before persistence.</p>
              <p>Admin keeps control of governance fields such as publish status, release notes, runtime enablement, and availability after the package is imported.</p>
            </div>
          </Card>

          <Card className="px-6 py-5 sm:px-7 sm:py-6">
            <div className="flex items-center gap-2 text-textPrimary">
              <GitBranchPlus className="h-4 w-4" />
              <p className="eyebrow">Identity mutability</p>
            </div>
            <div className="mt-4 space-y-3">
              {ADMIN_ASSESSMENT_IDENTITY_MUTABILITY_RULES.map((rule) => (
                <div key={rule.field} className="rounded-2xl border border-white/[0.08] bg-bg/35 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium capitalize text-textPrimary">{rule.field}</p>
                    <Badge label={rule.mutability.replace(/_/g, ' ')} tone={rule.mutability === 'immutable' ? 'rose' : 'slate'} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-textSecondary">{rule.summary}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="px-6 py-5 sm:px-7 sm:py-6">
            <p className="eyebrow">Transitional fallback</p>
            <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-textPrimary">Manual draft container remains available</h2>
            <p className="mt-4 text-sm leading-6 text-textSecondary">Use the manual draft fallback only when you need an exceptional draft shell before a package exists. It is an advanced fallback, not the primary authoring path.</p>
            <div className="mt-4">
              <Button href="/admin/assessments/new" variant="secondary">Open manual draft fallback</Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

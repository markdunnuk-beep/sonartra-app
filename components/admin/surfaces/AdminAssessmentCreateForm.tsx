'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { ArrowLeft } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge, SurfaceSection } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { submitAdminAssessmentCreateAction } from '@/app/admin/assessments/new/actions'
import { type AdminAssessmentCreateState } from '@/lib/admin/domain/assessment-management'

const INITIAL_STATE: AdminAssessmentCreateState = { status: 'idle' }

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending ? 'Creating…' : 'Create manual draft container'}
    </Button>
  )
}

function Field({
  label,
  name,
  defaultValue,
  description,
  error,
}: {
  label: string
  name: string
  defaultValue?: string
  description: string
  error?: string
}) {
  return (
    <label className="block space-y-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">{label}</p>
        <p className="mt-1 text-xs leading-5 text-textSecondary">{description}</p>
      </div>
      <Input name={name} defaultValue={defaultValue} aria-invalid={error ? true : undefined} aria-describedby={error ? `${name}-error` : undefined} />
      {error ? <p id={`${name}-error`} className="text-sm text-rose-200">{error}</p> : null}
    </label>
  )
}

export function AdminAssessmentCreateForm() {
  const [state, action] = useFormState(submitAdminAssessmentCreateAction, INITIAL_STATE)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessments"
        title="Create manual assessment container"
        description="Fallback workflow for creating a draft container before a package exists. Package import is now the preferred way to create assessment identity and attach versions."
        actions={<Button href="/admin/assessments" variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to registry</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceSection
          title="Manual container metadata"
          eyebrow="Fallback workflow"
          description="Use this only when operators need an exceptional draft shell. In the primary workflow, uploaded packages supply the canonical name, assessment key, slug, and category."
        >
          <form action={action} className="space-y-5">
            {state.message ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
                {state.message}
              </div>
            ) : null}

            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Assessment name" name="name" description="Fallback operator-entered title. In the preferred path, this comes from the uploaded package." error={state.fieldErrors?.name} />
              <Field label="Assessment key" name="key" description="Fallback stable key for manual shells only. Package-first import now treats assessment key as the canonical matching anchor. Previously called library key." error={state.fieldErrors?.key} />
              <Field label="Slug" name="slug" description="URL-safe slug used until a package import updates mutable metadata under the same assessment key." error={state.fieldErrors?.slug} />
              <label className="block space-y-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Category</p>
                  <p className="mt-1 text-xs leading-5 text-textSecondary">Fallback taxonomy only. Package imports can later update this mutable category metadata.</p>
                </div>
                <select name="category" defaultValue="behavioural_intelligence" aria-invalid={state.fieldErrors?.category ? true : undefined} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
                  <option value="behavioural_intelligence">Behavioural intelligence</option>
                  <option value="team_dynamics">Team dynamics</option>
                  <option value="organisational_performance">Organisational performance</option>
                  <option value="leadership">Leadership</option>
                  <option value="culture">Culture</option>
                  <option value="other">Other</option>
                </select>
                {state.fieldErrors?.category ? <p className="text-sm text-rose-200">{state.fieldErrors.category}</p> : null}
              </label>
            </div>

            <label className="block space-y-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Internal summary</p>
                <p className="mt-1 text-xs leading-5 text-textSecondary">Optional operator note. This is not the package definition and it does not replace package-owned identity metadata.</p>
              </div>
              <textarea
                name="description"
                rows={4}
                aria-invalid={state.fieldErrors?.description ? true : undefined}
                className="w-full rounded-2xl border border-border/90 bg-bg/70 px-3.5 py-3 text-sm text-textPrimary outline-none ring-accent/40 placeholder:text-textSecondary focus:border-accent/50 focus:ring"
                placeholder="Describe the assessment line, audience, or internal ownership context."
              />
              {state.fieldErrors?.description ? <p className="text-sm text-rose-200">{state.fieldErrors.description}</p> : null}
            </label>

            <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
              <SubmitButton />
              <Button href="/admin/assessments/import" variant="secondary">Prefer package import</Button>
              <Button href="/admin/assessments" variant="secondary">Cancel</Button>
              <Badge label="Initial lifecycle: Draft" tone="slate" />
            </div>
          </form>
        </SurfaceSection>

        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="eyebrow">Transitional path</p>
          <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-textPrimary">Manual draft container only</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-textSecondary">
            <p>The preferred route is to import a package first so the package supplies canonical identity metadata and the system can decide whether to create a new assessment or attach a new version.</p>
            <p>This manual path creates only the governed parent shell. No package validation, assessment-definition payload, or runtime deployment payload is created here.</p>
            <p>After creation you land on the assessment workspace, where draft versions can still be created and packages can be imported if you had to establish the shell record first.</p>
          </div>
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-bg/55 px-4 py-3 text-sm text-textSecondary">
            Uniqueness for <span className="font-medium text-textPrimary">key</span> and <span className="font-medium text-textPrimary">slug</span> is enforced server-side so later package imports can match or update the correct assessment line safely.
          </div>
        </Card>
      </div>
    </div>
  )
}

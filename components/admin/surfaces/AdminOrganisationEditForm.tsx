'use client'

import type { ReactNode } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react'
import { Badge, StatusBadge, SurfaceSection } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { submitAdminOrganisationEditAction, submitAdminOrganisationLifecycleAction } from '@/app/admin/organisations/[organisationId]/edit/actions'
import {
  ADMIN_ORGANISATION_MUTABLE_STATUSES,
  type AdminOrganisationMutationState,
} from '@/lib/admin/domain/organisation-mutations'
import type { AdminOrganisationDetailData } from '@/lib/admin/domain/organisation-detail'
import { formatAdminTimestamp } from '@/lib/admin/wireframe'

const INITIAL_STATE: AdminOrganisationMutationState = { status: 'idle' }

function Field({
  label,
  name,
  defaultValue,
  error,
  description,
  children,
}: {
  label: string
  name: string
  defaultValue?: string
  error?: string
  description?: string
  children?: ReactNode
}) {
  return (
    <label className="block space-y-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">{label}</p>
        {description ? <p className="mt-1 text-xs leading-5 text-textSecondary">{description}</p> : null}
      </div>
      {children ?? (
        <Input
          name={name}
          defaultValue={defaultValue}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-error` : undefined}
        />
      )}
      {error ? <p id={`${name}-error`} className="text-sm text-rose-200">{error}</p> : null}
    </label>
  )
}

function SubmitButton({ children, variant = 'primary' }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? 'Submitting…' : children}
    </Button>
  )
}

function StatusSelect({ defaultValue, error }: { defaultValue: string; error?: string }) {
  return (
    <label className="block space-y-2">
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Lifecycle status</p>
        <p className="mt-1 text-xs leading-5 text-textSecondary">Use the existing schema status field to reflect the organisation’s operational posture.</p>
      </div>
      <select
        name="status"
        defaultValue={defaultValue}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? 'status-error' : undefined}
        className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring"
      >
        {ADMIN_ORGANISATION_MUTABLE_STATUSES.map((status) => (
          <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
        ))}
      </select>
      {error ? <p id="status-error" className="text-sm text-rose-200">{error}</p> : null}
    </label>
  )
}

export function AdminOrganisationEditForm({ detailData }: { detailData: AdminOrganisationDetailData }) {
  const { organisation } = detailData
  const [editState, editAction] = useFormState(submitAdminOrganisationEditAction, INITIAL_STATE)
  const [lifecycleState, lifecycleAction] = useFormState(submitAdminOrganisationLifecycleAction, INITIAL_STATE)
  const nextLifecycleStatus = organisation.status === 'suspended' ? 'active' : 'suspended'

  return (
    <div className="space-y-6 lg:space-y-8">
      <SurfaceSection
        title="Organisation identity"
        eyebrow="Edit workspace"
        description="Compact admin form for safe organisation metadata, canonical slug governance, and lifecycle posture updates."
        actions={<Button href={`/admin/organisations/${organisation.id}`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to detail</Button>}
      >
        <form action={editAction} className="space-y-5">
          <input type="hidden" name="organisationId" value={organisation.id} />
          <input type="hidden" name="expectedUpdatedAt" value={organisation.updatedAt} />

          {editState.message ? (
            <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
              {editState.message}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <Field
              label="Organisation name"
              name="name"
              defaultValue={organisation.name}
              error={editState.fieldErrors?.name}
              description="Operator-facing organisation label shown throughout the admin registry and detail workspace."
            />
            <Field
              label="Slug"
              name="slug"
              defaultValue={organisation.slug}
              error={editState.fieldErrors?.slug}
              description="Canonical unique slug used for support references and internal cross-checks."
            />
            <StatusSelect defaultValue={organisation.status} error={editState.fieldErrors?.status} />
            <Field
              label="Country"
              name="country"
              defaultValue={organisation.country ?? ''}
              error={editState.fieldErrors?.country}
              description="Optional regional metadata retained in the current organisations schema."
            />
            <Field
              label="Plan tier"
              name="planTier"
              defaultValue={organisation.planTier ?? ''}
              error={editState.fieldErrors?.planTier}
              description="Safe internal service-tier descriptor from the current schema."
            />
            <Field
              label="Seat band"
              name="seatBand"
              defaultValue={organisation.seatBand ?? ''}
              error={editState.fieldErrors?.seatBand}
              description="Optional internal capacity signal already modelled on the organisation record."
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-white/[0.06] pt-4">
            <SubmitButton>Save organisation</SubmitButton>
            <Button href={`/admin/organisations/${organisation.id}`} variant="secondary">Cancel</Button>
            <div className="flex flex-wrap gap-2 text-xs text-textSecondary">
              <Badge label={`Updated ${formatAdminTimestamp(organisation.updatedAt)}`} tone="slate" />
              <StatusBadge status={organisation.status} />
            </div>
          </div>
        </form>
      </SurfaceSection>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceSection
          title="Lifecycle management"
          eyebrow="Destructive control"
          description={organisation.status === 'suspended'
            ? 'Restore this organisation to an active lifecycle state while keeping the audit trail intact.'
            : 'Suspend operational use without deleting the organisation record. Existing admin visibility is preserved.'}
        >
          <form action={lifecycleAction} className="space-y-4">
            <input type="hidden" name="organisationId" value={organisation.id} />
            <input type="hidden" name="expectedUpdatedAt" value={organisation.updatedAt} />
            <input type="hidden" name="targetStatus" value={nextLifecycleStatus} />

            <div className="rounded-2xl border border-white/[0.08] bg-bg/55 px-4 py-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-200" />
                <div className="space-y-2 text-sm leading-6 text-textSecondary">
                  <p className="font-semibold text-textPrimary">{organisation.status === 'suspended' ? 'Restore organisation' : 'Deactivate organisation'}</p>
                  <p>
                    {organisation.status === 'suspended'
                      ? 'Restoring sets the lifecycle back to active so the registry and header return to an operational posture.'
                      : 'Deactivation uses the existing suspended status. The organisation stays visible in admin detail and registry views, but the lifecycle badge and audit trail will reflect the pause.'}
                  </p>
                </div>
              </div>
            </div>

            {lifecycleState.message ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
                {lifecycleState.message}
              </div>
            ) : null}

            {organisation.status !== 'suspended' ? (
              <label className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-panel/45 px-4 py-3 text-sm text-textSecondary">
                <input name="confirmation" type="checkbox" className="mt-1 h-4 w-4 rounded border-white/20 bg-bg/80 text-accent focus:ring-accent/60" />
                <span>
                  I understand this will move the organisation to <span className="font-medium text-textPrimary">suspended</span> and append a lifecycle event to the organisation audit trail.
                </span>
              </label>
            ) : null}
            {lifecycleState.fieldErrors?.confirmation ? <p className="text-sm text-rose-200">{lifecycleState.fieldErrors.confirmation}</p> : null}

            <div className="flex flex-wrap gap-3">
              <SubmitButton variant={organisation.status === 'suspended' ? 'secondary' : 'ghost'}>
                {organisation.status === 'suspended' ? 'Restore organisation' : 'Deactivate organisation'}
              </SubmitButton>
              <Button href={`/admin/organisations/${organisation.id}?tab=activity`} variant="ghost">Review scoped audit trail</Button>
            </div>
          </form>
        </SurfaceSection>

        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="eyebrow">Operator notes</p>
          <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-textPrimary">What changes here</h2>
          <div className="mt-4 space-y-3 text-sm leading-6 text-textSecondary">
            <p>Name, slug, status, and safe internal metadata write back on the server with conflict and concurrency checks.</p>
            <p>Slug changes always return to the canonical detail route keyed by organisation ID, so support bookmarks remain stable.</p>
            <p>The lifecycle action uses the existing <span className="font-medium text-textPrimary">suspended</span> status rather than deleting the record or inventing a new destructive model.</p>
          </div>
          <div className="mt-5 rounded-2xl border border-white/[0.08] bg-bg/55 px-4 py-3 text-sm text-textSecondary">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-200" />
              <p>Concurrent updates are guarded using the record’s current <span className="font-medium text-textPrimary">updated_at</span> value. If another admin edits this organisation first, the action fails loudly and asks you to reload.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

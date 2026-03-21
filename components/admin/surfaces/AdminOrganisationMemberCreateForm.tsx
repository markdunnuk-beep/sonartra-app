'use client'

import React from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { ArrowLeft, MailPlus, UserPlus } from 'lucide-react'
import { submitAdminOrganisationMembershipInviteAction, submitAdminOrganisationMembershipLinkAction } from '@/app/admin/organisations/[organisationId]/members/actions'
import {
  Badge,
  EmptyState,
  StatusBadge,
  SurfaceSection,
  Table,
} from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import {
  ADMIN_ORGANISATION_MEMBERSHIP_ROLES,
  type AdminOrganisationMembershipCandidate,
} from '@/lib/admin/domain/organisation-memberships'
import type { AdminOrganisationDetailData } from '@/lib/admin/domain/organisation-detail'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

const INITIAL_STATE = { status: 'idle' as const }

function SubmitButton({ children, variant = 'primary' }: { children: React.ReactNode; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending}>
      {pending ? 'Submitting…' : children}
    </Button>
  )
}

function RoleSelect({ name = 'role', defaultValue = 'manager' }: { name?: string; defaultValue?: string }) {
  return (
    <select name={name} defaultValue={defaultValue} className="h-10 rounded-xl border border-border/90 bg-bg/70 px-3 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
      {ADMIN_ORGANISATION_MEMBERSHIP_ROLES.map((role) => (
        <option key={role} value={role}>{role}</option>
      ))}
    </select>
  )
}

export function AdminOrganisationMemberCreateForm({
  detailData,
  candidates,
  search,
}: {
  detailData: AdminOrganisationDetailData
  candidates: AdminOrganisationMembershipCandidate[]
  search: string
}) {
  const { organisation } = detailData
  const [linkState, linkAction] = useFormState(submitAdminOrganisationMembershipLinkAction, INITIAL_STATE)
  const [inviteState, inviteAction] = useFormState(submitAdminOrganisationMembershipInviteAction, INITIAL_STATE)

  return (
    <div className="space-y-6 lg:space-y-8">
      <SurfaceSection
        title="Add or invite member"
        eyebrow="Membership management"
        description="Link an existing Sonartra identity immediately when a bound account exists, or create a truthful invited membership placeholder when only an email is available."
        actions={<Button href={`/admin/organisations/${organisation.id}?tab=members`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to members</Button>}
      >
        <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <form method="get" action={`/admin/organisations/${organisation.id}/members/new`} className="rounded-[1.25rem] border border-white/[0.08] bg-bg/55 p-4">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <label className="block space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Search existing user</span>
                  <Input name="q" defaultValue={search} placeholder="Search by name or email" />
                </label>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <Button type="submit" variant="secondary">Search directory</Button>
                  <Button href={`/admin/organisations/${organisation.id}/members/new`} variant="ghost">Clear</Button>
                </div>
              </div>
            </form>

            {candidates.length ? (
              <Table
                columns={["User", "Identity state", "Existing membership", "Last activity", "Link"]}
                rows={candidates.map((candidate) => [
                  <div key={`${candidate.identityId}-user`} className="space-y-1">
                    <p className="text-sm font-semibold text-textPrimary">{candidate.fullName}</p>
                    <p className="break-all text-xs text-textSecondary">{candidate.email}</p>
                  </div>,
                  <div key={`${candidate.identityId}-identity`} className="space-y-2">
                    <StatusBadge status={candidate.identityStatus} />
                    <Badge label={candidate.authBound ? 'Account linked' : 'No auth binding'} tone={candidate.authBound ? 'emerald' : 'amber'} />
                  </div>,
                  <div key={`${candidate.identityId}-membership`} className="space-y-2">
                    {candidate.membershipStatus ? <StatusBadge status={candidate.membershipStatus} /> : <Badge label="Not linked" tone="slate" />}
                    {candidate.membershipRole ? <Badge label={candidate.membershipRole} tone="slate" /> : null}
                  </div>,
                  <div key={`${candidate.identityId}-activity`} className="space-y-1">
                    <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(candidate.lastActivityAt)}</p>
                    <p className="text-xs text-textSecondary">{formatAdminTimestamp(candidate.lastActivityAt)}</p>
                  </div>,
                  <form key={`${candidate.identityId}-link`} action={linkAction} className="space-y-2">
                    <input type="hidden" name="organisationId" value={organisation.id} />
                    <input type="hidden" name="identityId" value={candidate.identityId} />
                    <div className="flex flex-wrap items-center gap-2">
                      <RoleSelect defaultValue={candidate.membershipRole ?? 'manager'} />
                      <SubmitButton variant="secondary">{candidate.membershipStatus && candidate.membershipStatus !== 'active' ? 'Restore' : 'Add'}</SubmitButton>
                    </div>
                  </form>,
                ])}
              />
            ) : (
              <EmptyState
                title="No matching directory users"
                detail={search
                  ? `No existing organisation identities matched “${search}”. Invite by email instead if the person has not been linked before.`
                  : 'Search the access registry to link an existing person to this organisation without creating duplicate active memberships.'}
              />
            )}

            {linkState.message ? (
              <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
                {linkState.message}
              </div>
            ) : null}
          </div>

          <div className="space-y-4">
            <SurfaceSection
              title="Invite by email"
              eyebrow="Pending access"
              description="Creates or reuses an invited organisation identity and stores a pending membership. Email delivery is not yet connected in this admin surface."
            >
              <form action={inviteAction} className="space-y-4">
                <input type="hidden" name="organisationId" value={organisation.id} />

                {inviteState.message ? (
                  <div className="rounded-2xl border border-rose-400/25 bg-rose-400/[0.08] px-4 py-3 text-sm text-rose-100">
                    {inviteState.message}
                  </div>
                ) : null}

                <label className="block space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Full name</span>
                  <Input name="fullName" placeholder="Jordan Lee" aria-invalid={inviteState.fieldErrors?.fullName ? true : undefined} />
                  {inviteState.fieldErrors?.fullName ? <p className="text-sm text-rose-200">{inviteState.fieldErrors.fullName}</p> : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Email</span>
                  <Input name="email" type="email" placeholder="jordan@example.com" aria-invalid={inviteState.fieldErrors?.email ? true : undefined} />
                  {inviteState.fieldErrors?.email ? <p className="text-sm text-rose-200">{inviteState.fieldErrors.email}</p> : null}
                </label>

                <label className="block space-y-2">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Organisation role</span>
                  <RoleSelect />
                  {inviteState.fieldErrors?.role ? <p className="text-sm text-rose-200">{inviteState.fieldErrors.role}</p> : null}
                </label>

                <div className="flex flex-wrap gap-3 pt-2">
                  <SubmitButton><MailPlus className="mr-2 h-4 w-4" />Create invite</SubmitButton>
                  <Button href={`/admin/organisations/${organisation.id}?tab=members`} variant="ghost">Cancel</Button>
                </div>
              </form>
            </SurfaceSection>

            <Card className="px-6 py-5 sm:px-7 sm:py-6">
              <p className="eyebrow">How this works</p>
              <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-textPrimary">Truthful organisation access model</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-textSecondary">
                <p>Existing users are linked through <span className="font-medium text-textPrimary">organisation_memberships</span> and organisation-scoped role assignments.</p>
                <p>Invites create an <span className="font-medium text-textPrimary">admin_identities</span> record in invited state plus a pending membership for the target organisation.</p>
                <p>No email is sent from this workflow yet. The invited state is still visible in the Members and Activity tabs for operator follow-up.</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-textSecondary">
                <Badge label={`${detailData.members.length} current memberships`} tone="slate" />
                <Badge label={`${detailData.organisation.activeMembers} active`} tone="emerald" />
                <Badge label={`${detailData.organisation.invitedMembers} invited`} tone="amber" />
              </div>
            </Card>
          </div>
        </div>
      </SurfaceSection>

      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="eyebrow">Organisation context</p>
            <h2 className="mt-2 text-[1.15rem] font-semibold tracking-tight text-textPrimary">{organisation.name}</h2>
            <p className="mt-2 text-sm leading-6 text-textSecondary">Use this route-first surface when adding or inviting members so the organisation detail workspace stays focused on operating the current roster.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/organisations/${organisation.id}?tab=members`} variant="secondary"><UserPlus className="mr-2 h-4 w-4" />Review members tab</Button>
          </div>
        </div>
      </Card>
    </div>
  )
}

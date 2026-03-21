'use client'

import React from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Search, UserPlus } from 'lucide-react'
import { submitAdminOrganisationMembershipRoleAction, submitAdminOrganisationMembershipStatusAction } from '@/app/admin/organisations/[organisationId]/members/actions'
import {
  Badge,
  EmptyState,
  StatusBadge,
  SurfaceSection,
  Table,
} from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import {
  ADMIN_ORGANISATION_MEMBERSHIP_ROLES,
  type AdminOrganisationMemberFilters,
} from '@/lib/admin/domain/organisation-memberships'
import type { AdminOrganisationMemberRecord } from '@/lib/admin/domain/organisation-detail'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

const INITIAL_STATE = { status: 'idle' as const }

function InlineSubmitButton({ label, variant = 'ghost' }: { label: string; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending} className="min-h-9 px-3 py-2 text-xs">
      {pending ? 'Saving…' : label}
    </Button>
  )
}

function RoleUpdateForm({ organisationId, member }: { organisationId: string; member: AdminOrganisationMemberRecord }) {
  const [state, action] = useFormState(submitAdminOrganisationMembershipRoleAction, INITIAL_STATE)

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="organisationId" value={organisationId} />
      <input type="hidden" name="identityId" value={member.identityId} />
      <div className="flex flex-wrap items-center gap-2">
        <select
          name="role"
          defaultValue={member.role}
          aria-label={`Role for ${member.fullName}`}
          className="h-9 rounded-xl border border-border/90 bg-bg/70 px-3 text-xs text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring"
        >
          {ADMIN_ORGANISATION_MEMBERSHIP_ROLES.map((role) => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
        <InlineSubmitButton label="Update role" variant="secondary" />
      </div>
      {state.message ? <p className="text-xs text-rose-200">{state.message}</p> : null}
    </form>
  )
}

function StatusActionForm({
  organisationId,
  member,
  nextStatus,
  label,
  variant,
  requiresConfirmation = false,
}: {
  organisationId: string
  member: AdminOrganisationMemberRecord
  nextStatus: 'active' | 'suspended' | 'inactive'
  label: string
  variant?: 'primary' | 'secondary' | 'ghost'
  requiresConfirmation?: boolean
}) {
  const [state, action] = useFormState(submitAdminOrganisationMembershipStatusAction, INITIAL_STATE)

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="organisationId" value={organisationId} />
      <input type="hidden" name="identityId" value={member.identityId} />
      <input type="hidden" name="nextStatus" value={nextStatus} />
      {requiresConfirmation ? (
        <label className="flex items-start gap-2 rounded-xl border border-white/[0.08] bg-panel/40 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-textSecondary">
          <input name="confirmation" type="checkbox" value="confirm" className="mt-0.5 h-3.5 w-3.5 rounded border-white/20 bg-bg/80 text-accent focus:ring-accent/60" />
          <span>Confirm removal</span>
        </label>
      ) : null}
      <InlineSubmitButton label={label} variant={variant} />
      {state.fieldErrors?.confirmation ? <p className="text-xs text-rose-200">{state.fieldErrors.confirmation}</p> : null}
      {state.message && !state.fieldErrors?.confirmation ? <p className="text-xs text-rose-200">{state.message}</p> : null}
    </form>
  )
}

function MemberActions({ organisationId, member }: { organisationId: string; member: AdminOrganisationMemberRecord }) {
  const showSuspend = member.accessStatus === 'active'
  const showRestore = member.accessStatus === 'suspended' || member.accessStatus === 'inactive' || member.accessStatus === 'invited'

  return (
    <div className="flex flex-wrap gap-2">
      <RoleUpdateForm organisationId={organisationId} member={member} />
      {showSuspend ? <StatusActionForm organisationId={organisationId} member={member} nextStatus="suspended" label="Suspend" /> : null}
      {showRestore ? <StatusActionForm organisationId={organisationId} member={member} nextStatus="active" label="Restore" variant="secondary" /> : null}
      <StatusActionForm organisationId={organisationId} member={member} nextStatus="inactive" label="Remove" requiresConfirmation variant="ghost" />
    </div>
  )
}

function Filters({ organisationId, filters }: { organisationId: string; filters: AdminOrganisationMemberFilters }) {
  return (
    <form method="get" action={`/admin/organisations/${organisationId}`} className="rounded-[1.25rem] border border-white/[0.08] bg-bg/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <input type="hidden" name="tab" value="members" />
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_14rem_14rem_auto] xl:items-end">
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              name="membersSearch"
              defaultValue={filters.search}
              placeholder="Search name or email"
              className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 pl-10 pr-3.5 text-sm text-textPrimary outline-none ring-accent/40 placeholder:text-textSecondary focus:border-accent/50 focus:ring"
            />
          </div>
        </label>
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Status</span>
          <select name="memberStatus" defaultValue={filters.status} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="invited">Invited</option>
            <option value="suspended">Suspended</option>
            <option value="inactive">Removed</option>
          </select>
        </label>
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Role</span>
          <select name="memberRole" defaultValue={filters.role} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
            <option value="all">All roles</option>
            {ADMIN_ORGANISATION_MEMBERSHIP_ROLES.map((role) => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button type="submit" variant="secondary">Apply filters</Button>
          <Button href={`/admin/organisations/${organisationId}?tab=members`} variant="ghost">Clear</Button>
        </div>
      </div>
    </form>
  )
}

export function AdminOrganisationMembersManager({
  organisationId,
  organisationName,
  members,
  filters,
}: {
  organisationId: string
  organisationName: string
  members: AdminOrganisationMemberRecord[]
  filters: AdminOrganisationMemberFilters
}) {
  return (
    <SurfaceSection
      title="Members"
      eyebrow="Directory"
      description="Operational tenant membership surface with role changes, lifecycle controls, invited access visibility, and direct links to user detail." 
      actions={<Button href={`/admin/organisations/${organisationId}/members/new`} variant="secondary"><UserPlus className="mr-2 h-4 w-4" />Add member / invite</Button>}
    >
      <div className="space-y-4">
        <Filters organisationId={organisationId} filters={filters} />

        {members.length ? (
          <Table
            columns={["Name", "Role", "Status", "Joined / invited", "Last activity", "Actions"]}
            rows={members.map((member) => [
              <div key={`${member.identityId}-name`} className="space-y-1">
                <Link href={`/admin/users/${member.identityId}`} className="block truncate text-sm font-semibold text-textPrimary hover:text-accent">
                  {member.fullName}
                </Link>
                <p className="break-all text-xs text-textSecondary">{member.email}</p>
              </div>,
              <div key={`${member.identityId}-role`} className="space-y-2">
                <StatusBadge status={member.role} />
                <p className="text-xs text-textSecondary">Membership #{member.membershipId.slice(0, 8)}</p>
              </div>,
              <div key={`${member.identityId}-status`} className="space-y-2">
                <StatusBadge status={member.accessStatus} />
                {member.accessStatus === 'invited' ? <Badge label="Pending acceptance" tone="amber" /> : null}
                {member.accessStatus === 'inactive' ? <Badge label="Soft removed" tone="slate" /> : null}
              </div>,
              <div key={`${member.identityId}-joined`} className="space-y-1">
                <p className="text-sm font-medium text-textPrimary">{formatAdminTimestamp(member.joinedAt ?? member.invitedAt)}</p>
                <p className="text-xs text-textSecondary">{member.joinedAt ? 'Joined' : 'Invited'} {formatAdminRelativeTime(member.joinedAt ?? member.invitedAt)}</p>
              </div>,
              <div key={`${member.identityId}-last-activity`} className="space-y-1">
                <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(member.lastActivityAt)}</p>
                <p className="text-xs text-textSecondary">{formatAdminTimestamp(member.lastActivityAt)}</p>
              </div>,
              <MemberActions key={`${member.identityId}-actions`} organisationId={organisationId} member={member} />,
            ])}
          />
        ) : (
          <EmptyState
            title="No memberships match the current filters"
            detail={`No organisation memberships matched the active filters for ${organisationName}. Clear the filters or add a member to begin linking tenant access.`}
            action={<Button href={`/admin/organisations/${organisationId}/members/new`} variant="secondary">Add member / invite</Button>}
          />
        )}
      </div>
    </SurfaceSection>
  )
}

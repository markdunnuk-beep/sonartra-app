'use client'

import { Search } from 'lucide-react'
import Link from 'next/link'
import { type ReactNode, useMemo, useState } from 'react'
import {
  Badge,
  EmptyState,
  StatusBadge,
  SurfaceSection,
  Table,
} from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import {
  assessUserAccessPriority,
  DEFAULT_ACCESS_QUERY,
  filterUsersByQuery,
  getAccessPresetViews,
  getUserRoleTypes,
  isElevatedAccessRole,
  organisations,
  prioritiseUsers,
  type AccessQuery,
  type User,
  adminUsers,
} from '@/lib/admin/domain'
import {
  formatAdminRelativeTime,
  formatAdminTimestamp,
  getKindLabel,
  getUserAccessSignals,
  getUserActivityBand,
  getUserRoleSummary,
  getUserSummary,
} from '@/lib/admin/wireframe'

interface AdminUsersAccessRegistryClientProps {
  initialQuery?: AccessQuery
}

const STATUS_OPTIONS: Array<{ value: NonNullable<AccessQuery['status']>[number]; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'invited', label: 'Invited' },
]

const ACTIVITY_OPTIONS: Array<{ value: NonNullable<AccessQuery['activityBand']>[number]; label: string }> = [
  { value: 'active_now', label: 'Active now' },
  { value: 'recent', label: 'Recent' },
  { value: 'inactive', label: 'Inactive' },
]

const RISK_OPTIONS: Array<{ value: NonNullable<AccessQuery['riskFlags']>[number]; label: string }> = [
  { value: 'elevated_access', label: 'Elevated access' },
  { value: 'multi_org', label: 'Multi-org access' },
  { value: 'invite_pending', label: 'Invite pending' },
  { value: 'internal_review', label: 'Internal review' },
  { value: 'no_recent_activity', label: 'No recent activity' },
]

function AccessFlagGroup({ labels }: { labels: Array<{ label: string; tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' }> }) {
  if (!labels.length) {
    return <span className="text-xs text-textSecondary">No flags</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((signal) => (
        <Badge key={`${signal.label}-${signal.tone}`} label={signal.label} tone={signal.tone} />
      ))}
    </div>
  )
}

function getActivityBandLabel(activityBand: ReturnType<typeof getUserActivityBand>): string {
  switch (activityBand) {
    case 'active':
      return 'Active now'
    case 'recent':
      return 'Recent'
    case 'watch':
      return 'Recent'
    case 'inactive':
    case 'none':
      return 'Inactive'
  }
}

function getRoleTypeLabel(roleType: string): string {
  return roleType
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

function QuerySection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-white/[0.08] bg-panel/50 px-3.5 py-3.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-textSecondary">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={active
        ? 'inline-flex min-h-9 items-center rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-accent transition-colors'
        : 'inline-flex min-h-9 items-center rounded-xl border border-white/[0.08] bg-bg/60 px-3 py-2 text-[10px] uppercase tracking-[0.14em] text-textSecondary transition-colors hover:border-white/[0.14] hover:text-textPrimary'}
    >
      {label}
    </button>
  )
}

function QueryFilterBar({
  presetViews,
  query,
  applyPreset,
  setSearch,
  setScope,
  toggleArrayFilter,
  roleOptions,
}: {
  presetViews: ReturnType<typeof getAccessPresetViews>
  query: AccessQuery
  applyPreset: (query: AccessQuery) => void
  setSearch: (value: string) => void
  setScope: (value: NonNullable<AccessQuery['scope']>) => void
  toggleArrayFilter: <K extends 'roleTypes' | 'status' | 'activityBand' | 'riskFlags'>(field: K, value: NonNullable<AccessQuery[K]>[number]) => void
  roleOptions: Array<{ value: string; label: string }>
}) {
  const normaliseQuery = (value: AccessQuery) => JSON.stringify({
    ...value,
    roleTypes: value.roleTypes ? [...value.roleTypes].sort() : undefined,
    status: value.status ? [...value.status].sort() : undefined,
    activityBand: value.activityBand ? [...value.activityBand].sort() : undefined,
    riskFlags: value.riskFlags ? [...value.riskFlags].sort() : undefined,
  })
  const activePresetId = presetViews.find((preset) => normaliseQuery(query) === normaliseQuery(preset.query))?.id

  return (
    <div className="rounded-[1.25rem] border border-white/[0.08] bg-bg/55 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="grid gap-4">
        <div className="flex flex-wrap gap-2">
          {presetViews.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.query)}
              className={activePresetId === preset.id
                ? 'inline-flex min-h-9 items-center rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-left text-[10px] uppercase tracking-[0.14em] text-accent transition-colors'
                : 'inline-flex min-h-9 items-center rounded-xl border border-white/[0.08] bg-panel/45 px-3 py-2 text-left text-[10px] uppercase tracking-[0.14em] text-textSecondary transition-colors hover:border-white/[0.14] hover:text-textPrimary'}
            >
              <span>
                <span className="block">{preset.label}</span>
                <span className="mt-1 block text-[11px] normal-case tracking-normal text-textSecondary">{preset.description}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-start gap-3 xl:items-center xl:justify-between">
          <div className="relative min-w-0 flex-1 basis-full">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <Input
              value={query.search ?? ''}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, organisation or role…"
              className="pl-10"
            />
          </div>
          <Button href="/admin/audit" variant="ghost">Access audit</Button>
        </div>
        <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-5">
          <QuerySection label="Scope">
            <FilterChip label="All" active={(query.scope ?? 'all') === 'all'} onClick={() => setScope('all')} />
            <FilterChip label="Internal" active={query.scope === 'internal'} onClick={() => setScope('internal')} />
            <FilterChip label="Organisation" active={query.scope === 'organisation'} onClick={() => setScope('organisation')} />
            <FilterChip label="Multi-org" active={query.scope === 'multi_org'} onClick={() => setScope('multi_org')} />
          </QuerySection>

          <QuerySection label="Role type">
            {roleOptions.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={Boolean(query.roleTypes?.includes(option.value))}
                onClick={() => toggleArrayFilter('roleTypes', option.value)}
              />
            ))}
          </QuerySection>

          <QuerySection label="Status">
            {STATUS_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={Boolean(query.status?.includes(option.value))}
                onClick={() => toggleArrayFilter('status', option.value)}
              />
            ))}
          </QuerySection>

          <QuerySection label="Activity">
            {ACTIVITY_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={Boolean(query.activityBand?.includes(option.value))}
                onClick={() => toggleArrayFilter('activityBand', option.value)}
              />
            ))}
          </QuerySection>

          <QuerySection label="Risk signals">
            {RISK_OPTIONS.map((option) => (
              <FilterChip
                key={option.value}
                label={option.label}
                active={Boolean(query.riskFlags?.includes(option.value))}
                onClick={() => toggleArrayFilter('riskFlags', option.value)}
              />
            ))}
          </QuerySection>
        </div>
      </div>
    </div>
  )
}

function getPriorityBadgeTone(level: ReturnType<typeof assessUserAccessPriority>['level']): 'rose' | 'amber' | 'sky' | 'slate' {
  switch (level) {
    case 'critical':
      return 'rose'
    case 'high':
      return 'amber'
    case 'medium':
      return 'sky'
    case 'low':
      return 'slate'
  }
}

function getPriorityRowClassName(level: ReturnType<typeof assessUserAccessPriority>['level']): string | undefined {
  switch (level) {
    case 'critical':
      return 'bg-rose-400/[0.04] shadow-[inset_2px_0_0_rgba(251,113,133,0.18)]'
    case 'high':
      return 'bg-amber-400/[0.04] shadow-[inset_2px_0_0_rgba(251,191,36,0.18)]'
    default:
      return undefined
  }
}

function buildRows(users: User[]) {
  const rows = users.map((user) => {
    const summary = getUserSummary(user)
    const accessFlags = getUserAccessSignals(user)
    const roleSummary = getUserRoleSummary(user)
    const activityBand = getUserActivityBand(user)
    const priority = assessUserAccessPriority(user)
    const organisationLabels = summary.memberships
      .map((membership) => organisations.find((organisation) => organisation.id === membership.organisationId)?.name ?? membership.organisationId)
      .join(' · ')

    return {
      className: getPriorityRowClassName(priority.level),
      cells: [
      <div key={`${user.id}-name`}>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={user.kind} />
          <Link href={`/admin/users/${user.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-textPrimary hover:text-accent">
            {user.profile.fullName}
          </Link>
        </div>
        <p className="mt-1 text-sm text-textSecondary">{user.email}</p>
      </div>,
      <div key={`${user.id}-scope`} className="space-y-2">
        <Badge label={roleSummary.label} tone={roleSummary.tone} />
        <p className="text-xs text-textSecondary">{getKindLabel(user)}</p>
      </div>,
      <div key={`${user.id}-organisation`} className="space-y-2">
        <p className="text-sm font-medium text-textPrimary">{summary.primaryOrganisation?.name ?? 'Internal-only access'}</p>
        <p className="text-xs text-textSecondary">{summary.memberships.length} memberships{organisationLabels ? ` · ${organisationLabels}` : ''}</p>
      </div>,
      <div key={`${user.id}-status`} className="space-y-2">
        <StatusBadge status={user.status === 'deactivated' ? 'inactive' : user.status} />
        <Badge label={getActivityBandLabel(activityBand)} tone={activityBand === 'active' ? 'emerald' : activityBand === 'recent' || activityBand === 'watch' ? 'sky' : 'slate'} />
      </div>,
      <div key={`${user.id}-activity`}>
        <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(user.recentActivity.lastActiveAt)}</p>
        <p className="text-xs text-textSecondary">{formatAdminTimestamp(user.recentActivity.lastActiveAt)}</p>
      </div>,
      <div key={`${user.id}-priority`} className="space-y-2">
        <Badge label={priority.level} tone={getPriorityBadgeTone(priority.level)} />
        <p className="text-xs text-textSecondary">Score {priority.score}</p>
      </div>,
      <div key={`${user.id}-flags`}>
        <AccessFlagGroup labels={accessFlags} />
      </div>,
      ],
    }
  })

  return {
    rows: rows.map((row) => row.cells),
    rowClassNames: rows.map((row) => row.className),
  }
}

function UserTableSection({
  title,
  eyebrow,
  description,
  users,
}: {
  title: string
  eyebrow: string
  description: string
  users: User[]
}) {
  return (
    <SurfaceSection title={title} eyebrow={eyebrow} description={description}>
      {users.length ? (
        <Table columns={["User", "Role", "Organisation / memberships", "Status", "Last activity", "Priority", "Flags"]} {...buildRows(users)} />
      ) : (
        <EmptyState title="No users match this query" detail="Adjust the structured query filters to widen the access slice or clear one of the active constraints." />
      )}
    </SurfaceSection>
  )
}

export function AdminUsersAccessRegistryClient({ initialQuery = DEFAULT_ACCESS_QUERY }: AdminUsersAccessRegistryClientProps) {
  const [query, setQuery] = useState<AccessQuery>({ ...initialQuery })
  const presetViews = useMemo(() => getAccessPresetViews(), [])

  const roleOptions = useMemo(() => {
    const roleTypes = Array.from(new Set(adminUsers.flatMap((user) => getUserRoleTypes(user))))

    return roleTypes
      .sort((left, right) => {
        const elevatedWeight = Number(isElevatedAccessRole(right)) - Number(isElevatedAccessRole(left))
        if (elevatedWeight !== 0) {
          return elevatedWeight
        }

        return getRoleTypeLabel(left).localeCompare(getRoleTypeLabel(right))
      })
      .map((roleType) => ({ value: roleType, label: getRoleTypeLabel(roleType) }))
  }, [])

  const filteredUsers = useMemo(() => filterUsersByQuery(adminUsers, query), [query])
  const prioritisedUsers = useMemo(() => prioritiseUsers(filteredUsers), [filteredUsers])
  const internalUsers = useMemo(() => prioritisedUsers.filter((user) => user.kind === 'internal_admin'), [prioritisedUsers])
  const organisationUsers = useMemo(() => prioritisedUsers.filter((user) => user.kind === 'organisation_user'), [prioritisedUsers])

  function toggleArrayFilter<K extends 'roleTypes' | 'status' | 'activityBand' | 'riskFlags'>(field: K, value: NonNullable<AccessQuery[K]>[number]) {
    setQuery((currentQuery) => {
      const values = new Set((currentQuery[field] ?? []) as NonNullable<AccessQuery[K]>)

      if (values.has(value)) {
        values.delete(value)
      } else {
        values.add(value)
      }

      const nextValues = [...values]

      return {
        ...currentQuery,
        [field]: nextValues.length ? nextValues : undefined,
      }
    })
  }

  function setScope(value: NonNullable<AccessQuery['scope']>) {
    setQuery((currentQuery) => ({
      ...currentQuery,
      scope: value,
    }))
  }

  function setSearch(value: string) {
    setQuery((currentQuery) => ({
      ...currentQuery,
      search: value.trim() ? value : undefined,
    }))
  }

  function applyPreset(presetQuery: AccessQuery) {
    setQuery({ ...presetQuery })
  }

  return (
    <div className="space-y-4">
      <SurfaceSection title="Access registry" eyebrow="Control surface" description="Structured operator query layer for access scope, role posture, activity, and risk signals across the multi-tenant estate.">
        <QueryFilterBar
          presetViews={presetViews}
          query={query}
          applyPreset={applyPreset}
          setSearch={setSearch}
          setScope={setScope}
          toggleArrayFilter={toggleArrayFilter}
          roleOptions={roleOptions}
        />
      </SurfaceSection>

      <UserTableSection
        title="Internal Sonartra operators"
        eyebrow="Internal access"
        description="Privileged platform operators are isolated from tenant identities so elevated access can be reviewed quickly."
        users={internalUsers}
      />

      <UserTableSection
        title="Organisation user registry"
        eyebrow="Tenant access"
        description="Customer identities remain tenant-scoped, with clear organisation context, membership breadth, invite posture, and dormancy signals."
        users={organisationUsers}
      />
    </div>
  )
}

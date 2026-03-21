'use client'

import { Search } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
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
  DEFAULT_ORGANISATION_REGISTRY_QUERY,
  filterOrganisationsByQuery,
  type AdminOrganisationRegistryDomainData,
  type OrganisationRegistryActivityBand,
  type OrganisationRegistryEntry,
  type OrganisationRegistryLifecycle,
  type OrganisationRegistryMembershipPosture,
  type OrganisationRegistryQuery,
} from '@/lib/admin/domain/organisation-registry'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

interface AdminOrganisationsRegistryClientProps {
  organisationRegistryData: AdminOrganisationRegistryDomainData
  initialQuery?: OrganisationRegistryQuery
}

const LIFECYCLE_OPTIONS: Array<{ value: OrganisationRegistryLifecycle; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'active', label: 'Active' },
  { value: 'dormant', label: 'Dormant' },
  { value: 'flagged', label: 'Flagged' },
]

const ACTIVITY_OPTIONS: Array<{ value: OrganisationRegistryActivityBand; label: string }> = [
  { value: 'active_now', label: 'Active now' },
  { value: 'recent', label: 'Recent' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'none', label: 'No signal' },
]

const POSTURE_OPTIONS: Array<{ value: OrganisationRegistryMembershipPosture; label: string }> = [
  { value: 'owned', label: 'Owner covered' },
  { value: 'admin_covered', label: 'Admin covered' },
  { value: 'member_only', label: 'Member only' },
  { value: 'invited_only', label: 'Invite only' },
  { value: 'unassigned', label: 'Unassigned' },
]

function QuerySection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-white/[0.08] bg-panel/50 px-3.5 py-3.5">
      <p className="text-[10px] uppercase tracking-[0.16em] text-textSecondary">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

function getLifecycleTone(lifecycle: OrganisationRegistryLifecycle): 'sky' | 'emerald' | 'amber' | 'rose' {
  switch (lifecycle) {
    case 'new':
      return 'sky'
    case 'active':
      return 'emerald'
    case 'dormant':
      return 'amber'
    case 'flagged':
      return 'rose'
  }
}

function getLifecycleLabel(lifecycle: OrganisationRegistryLifecycle): string {
  switch (lifecycle) {
    case 'new':
      return 'New'
    case 'active':
      return 'Active'
    case 'dormant':
      return 'Dormant'
    case 'flagged':
      return 'Flagged'
  }
}

function getActivityLabel(activityBand: OrganisationRegistryActivityBand): string {
  switch (activityBand) {
    case 'active_now':
      return 'Active now'
    case 'recent':
      return 'Recent'
    case 'inactive':
      return 'Inactive'
    case 'none':
      return 'No signal'
  }
}

function getPostureLabel(posture: OrganisationRegistryMembershipPosture): string {
  switch (posture) {
    case 'owned':
      return 'Owner covered'
    case 'admin_covered':
      return 'Admin covered'
    case 'member_only':
      return 'Member only'
    case 'invited_only':
      return 'Invite only'
    case 'unassigned':
      return 'Unassigned'
  }
}

function OrganisationFlags({ entry }: { entry: OrganisationRegistryEntry }) {
  if (!entry.flaggedReasons.length) {
    return <span className="text-xs text-textSecondary">No flags</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {entry.flaggedReasons.map((reason) => (
        <Badge key={`${entry.organisation.id}-${reason}`} label={reason} tone="rose" />
      ))}
    </div>
  )
}

function buildRows(organisations: OrganisationRegistryEntry[]) {
  return {
    rows: organisations.map((entry) => {
      const { organisation } = entry

      return [
        <div key={`${organisation.id}-entity`}>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-textPrimary">{organisation.name}</p>
            <Badge label={organisation.slug} tone="slate" className="max-w-[11rem] truncate" />
          </div>
          <p className="mt-1 text-sm text-textSecondary">{organisation.region}</p>
        </div>,
        <div key={`${organisation.id}-lifecycle`} className="space-y-2">
          <Badge label={getLifecycleLabel(entry.lifecycle)} tone={getLifecycleTone(entry.lifecycle)} />
          <div>
            <StatusBadge status={organisation.status} />
          </div>
        </div>,
        <div key={`${organisation.id}-memberships`} className="space-y-1.5">
          <p className="text-sm font-medium text-textPrimary">{entry.membershipCount} total</p>
          <p className="text-xs text-textSecondary">{entry.activeMembershipCount} active · {entry.invitedMembershipCount} invited · {entry.inactiveMembershipCount} inactive</p>
        </div>,
        <div key={`${organisation.id}-posture`} className="space-y-2">
          <Badge label={getPostureLabel(entry.membershipPosture)} tone={entry.membershipPosture === 'owned' ? 'sky' : entry.membershipPosture === 'admin_covered' ? 'violet' : entry.membershipPosture === 'member_only' ? 'amber' : entry.membershipPosture === 'invited_only' ? 'amber' : 'slate'} />
          <p className="text-xs text-textSecondary">{entry.ownerCount} owners · {entry.adminCount} admins · {entry.multiOrgMemberCount} multi-org</p>
        </div>,
        <div key={`${organisation.id}-activity`}>
          <p className="text-sm font-medium text-textPrimary">{getActivityLabel(entry.activityBand)}</p>
          <p className="mt-1 text-xs text-textSecondary">{formatAdminRelativeTime(entry.lastOperationalActivityAt)}</p>
          <p className="text-xs text-textSecondary">{formatAdminTimestamp(entry.lastOperationalActivityAt)}</p>
        </div>,
        <div key={`${organisation.id}-created`}>
          <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(organisation.createdAt)}</p>
          <p className="text-xs text-textSecondary">{formatAdminTimestamp(organisation.createdAt)}</p>
        </div>,
        <div key={`${organisation.id}-signals`} className="space-y-2">
          <OrganisationFlags entry={entry} />
        </div>,
      ]
    }),
  }
}

function RegistryTableSection({ organisations }: { organisations: OrganisationRegistryEntry[] }) {
  return (
    <SurfaceSection
      title="Organisation registry"
      eyebrow="Control surface"
      description="Structured operator registry for tenant lifecycle, access coverage, activity recency, and operational exceptions across the estate."
    >
      {organisations.length ? (
        <Table columns={["Organisation", "Lifecycle", "Memberships", "Access posture", "Activity", "Created", "Signals"]} {...buildRows(organisations)} />
      ) : (
        <EmptyState
          title="No organisations match this query"
          detail="Adjust the structured registry filters or search terms to widen the operational slice. Try removing one or more filters."
        />
      )}
    </SurfaceSection>
  )
}

export function AdminOrganisationsRegistryClient({ organisationRegistryData, initialQuery = DEFAULT_ORGANISATION_REGISTRY_QUERY }: AdminOrganisationsRegistryClientProps) {
  const [query, setQuery] = useState<OrganisationRegistryQuery>({ ...initialQuery })

  const filteredOrganisations = useMemo(
    () => filterOrganisationsByQuery(organisationRegistryData.organisations, query),
    [organisationRegistryData, query],
  )

  function setSearch(value: string) {
    setQuery((currentQuery) => ({
      ...currentQuery,
      search: value.trim() ? value : undefined,
    }))
  }

  function toggleArrayFilter<K extends 'lifecycle' | 'activityBand' | 'membershipPosture'>(field: K, value: NonNullable<OrganisationRegistryQuery[K]>[number]) {
    setQuery((currentQuery) => {
      const values = new Set((currentQuery[field] ?? []) as NonNullable<OrganisationRegistryQuery[K]>)

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

  return (
    <div className="space-y-4">
      <SurfaceSection
        title="Registry filters"
        eyebrow="Structured query"
        description="Compact operator filter layer for tenant search, lifecycle posture, activity band, and membership coverage."
        actions={<Button href="/admin/audit" variant="ghost">Tenant audit</Button>}
      >
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-bg/55 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="grid gap-4">
            <div className="relative min-w-0 flex-1 basis-full">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
              <Input
                value={query.search ?? ''}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search organisation, slug, region, lifecycle or posture…"
                className="pl-10"
              />
            </div>
            <div className="grid gap-3 xl:grid-cols-3">
              <QuerySection label="Lifecycle">
                {LIFECYCLE_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={Boolean(query.lifecycle?.includes(option.value))}
                    onClick={() => toggleArrayFilter('lifecycle', option.value)}
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
              <QuerySection label="Membership posture">
                {POSTURE_OPTIONS.map((option) => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={Boolean(query.membershipPosture?.includes(option.value))}
                    onClick={() => toggleArrayFilter('membershipPosture', option.value)}
                  />
                ))}
              </QuerySection>
            </div>
          </div>
        </div>
      </SurfaceSection>

      <RegistryTableSection organisations={filteredOrganisations} />
    </div>
  )
}

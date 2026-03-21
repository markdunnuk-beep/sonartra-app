import React from 'react'
import { Search } from 'lucide-react'
import {
  Badge,
  EmptyState,
  MetricCard,
  SurfaceSection,
  Table,
} from '@/components/admin/surfaces/AdminWireframePrimitives'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import {
  buildAdminAuditHref,
  getAdminAuditEntityTypeLabel,
  getAdminAuditEventTone,
  type AdminAuditWorkspaceData,
} from '@/lib/admin/domain/audit'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

function Filters({ data }: { data: AdminAuditWorkspaceData }) {
  const { filters, availableActors, availableEventTypes, availableOrganisations } = data

  return (
    <form method="get" action="/admin/audit" className="rounded-[1.25rem] border border-white/[0.08] bg-bg/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] xl:items-end">
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Query</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              name="query"
              defaultValue={filters.query}
              placeholder="Search summary, actor, organisation, entity, or event type"
              className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 pl-10 pr-3.5 text-sm text-textPrimary outline-none ring-accent/40 placeholder:text-textSecondary focus:border-accent/50 focus:ring"
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Organisation</span>
          <select name="organisationId" defaultValue={filters.organisationId} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
            <option value="">All organisations</option>
            {availableOrganisations.map((organisation) => (
              <option key={organisation.id} value={organisation.id}>{organisation.label}</option>
            ))}
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Actor</span>
          <select name="actorId" defaultValue={filters.actorId} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
            <option value="">All actors</option>
            {availableActors.map((actor) => (
              <option key={actor.id} value={actor.id}>{actor.label}</option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Entity type</span>
              <select name="entityType" defaultValue={filters.entityType} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
                <option value="all">All entities</option>
                <option value="organisation">Organisation</option>
                <option value="membership">Membership</option>
                <option value="user">User</option>
                <option value="assessment">Assessment</option>
                <option value="assessment_version">Assessment version</option>
                <option value="admin_access">Admin access</option>
              </select>
            </label>
            <label className="block space-y-2">
              <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Event type</span>
              <select name="eventType" defaultValue={filters.eventType} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
                <option value="">All events</option>
                {availableEventTypes.map((eventType) => (
                  <option key={eventType} value={eventType}>{eventType.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Entity ID</span>
          <input
            name="entityId"
            defaultValue={filters.entityId}
            placeholder="UUID or stable entity id"
            className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 placeholder:text-textSecondary focus:border-accent/50 focus:ring"
          />
        </label>
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">From</span>
          <input name="dateFrom" type="date" defaultValue={filters.dateFrom} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring" />
        </label>
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">To</span>
          <input name="dateTo" type="date" defaultValue={filters.dateTo} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring" />
        </label>
        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button type="submit" variant="secondary">Apply filters</Button>
          <Button href="/admin/audit" variant="ghost">Clear</Button>
        </div>
      </div>
    </form>
  )
}

function FilterContext({ data }: { data: AdminAuditWorkspaceData }) {
  if (!data.appliedFilters.length) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-panel/35 px-4 py-3 text-sm text-textSecondary">
        <span>Showing the shared audit workspace across all supported organisations, actors, and entity families.</span>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-2xl border border-accent/20 bg-accent/5 px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-accent">Filtered context</p>
          <p className="mt-1 text-sm text-textPrimary">This audit view is scoped by URL-driven filters and can be shared internally without losing context.</p>
        </div>
        <Button href="/admin/audit" variant="ghost">Reset filters</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.appliedFilters.map((filter) => (
          <Badge key={`${filter.key}-${filter.value}`} label={`${filter.label}: ${filter.value}`} tone="sky" className="max-w-full whitespace-normal" />
        ))}
      </div>
    </div>
  )
}

function Pagination({ data }: { data: AdminAuditWorkspaceData }) {
  const { filters, pagination } = data

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-panel/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-textSecondary">
        {pagination.totalCount
          ? `Showing ${pagination.windowStart}-${pagination.windowEnd} of ${pagination.totalCount} events.`
          : 'No matching events are currently indexed.'}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button href={buildAdminAuditHref({ ...filters, page: Math.max(1, pagination.page - 1) })} variant="ghost" disabled={!pagination.hasPreviousPage}>Previous</Button>
        <span className="text-xs uppercase tracking-[0.14em] text-textSecondary">Page {pagination.page} / {pagination.totalPages}</span>
        <Button href={buildAdminAuditHref({ ...filters, page: pagination.page + 1 })} variant="ghost" disabled={!pagination.hasNextPage}>Next</Button>
      </div>
    </div>
  )
}

export function AdminAuditWorkspaceSurface({ data }: { data: AdminAuditWorkspaceData }) {
  const filteredEventsCount = String(data.pagination.totalCount).padStart(2, '0')
  const organisationScopedCount = String(data.events.filter((event) => event.organisationId).length).padStart(2, '0')
  const derivedCount = String(data.events.filter((event) => event.isDerived).length).padStart(2, '0')
  const filteredState = data.appliedFilters.length > 0

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Audit"
        title="Operational audit workspace"
        description="Server-rendered audit workspace for tenant history, operator actions, and truthful derived membership/organisation events with shareable filter state."
        actions={<Button href={buildAdminAuditHref(data.filters)} variant="secondary">Copy current view</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label={filteredState ? 'Matching events' : 'Indexed events'} value={filteredEventsCount} detail="Reverse-chronological operational events after applying the current URL filter state." />
        <MetricCard label="Event types" value={String(data.availableEventTypes.length).padStart(2, '0')} detail="Distinct real and derived event families currently represented by the admin audit presentation layer." />
        <MetricCard label="Organisation-scoped rows" value={organisationScopedCount} detail="Rows on the current page that carry organisation context for tenant drill-in and audit review." />
        <MetricCard label="Derived rows on page" value={derivedCount} detail="Truthful derived organisation or membership rows included so local activity and shared audit views do not drift." />
      </div>

      <SurfaceSection
        title="Audit event stream"
        eyebrow="Shared workspace"
        description="Filter state is read directly from the URL so operators can deep-link investigations, preserve pagination context, and move cleanly between organisation detail and global audit review."
      >
        <div className="space-y-4">
          <Filters data={data} />
          <FilterContext data={data} />

          {data.events.length ? (
            <>
              <Table
                columns={["Timestamp", "Event", "Actor", "Organisation", "Entity", "Summary", "Source"]}
                rows={data.events.map((event) => [
                  <div key={`${event.id}-timestamp`} className="space-y-1">
                    <p className="text-sm font-medium text-textPrimary">{formatAdminTimestamp(event.happenedAt)}</p>
                    <p className="text-xs text-textSecondary">{formatAdminRelativeTime(event.happenedAt)}</p>
                  </div>,
                  <div key={`${event.id}-event`} className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={event.eventLabel} tone={getAdminAuditEventTone(event.eventType, event.source)} className="max-w-full whitespace-normal" />
                      {event.isDerived ? <Badge label="Derived" tone="slate" /> : null}
                    </div>
                    <p className="break-all text-xs text-textSecondary">{event.eventType}</p>
                  </div>,
                  <div key={`${event.id}-actor`} className="space-y-1">
                    <p className="truncate text-sm font-medium text-textPrimary">{event.actorName ?? 'System / derived event'}</p>
                    <p className="break-all text-xs text-textSecondary">{event.actorId ?? 'No actor identity recorded'}</p>
                  </div>,
                  <div key={`${event.id}-organisation`} className="space-y-1">
                    <p className="truncate text-sm font-medium text-textPrimary">{event.organisationName ?? 'Global / not organisation-scoped'}</p>
                    <p className="break-all text-xs text-textSecondary">{event.organisationId ?? '—'}</p>
                  </div>,
                  <div key={`${event.id}-entity`} className="space-y-2">
                    <Badge label={getAdminAuditEntityTypeLabel(event.entityType)} tone="slate" />
                    <p className="truncate text-sm font-medium text-textPrimary">{event.entityName ?? 'Unknown linked entity'}</p>
                    <p className="break-all text-xs text-textSecondary">{event.entityId ?? event.entitySecondary ?? 'Identifier unavailable'}</p>
                  </div>,
                  <div key={`${event.id}-summary`} className="space-y-1">
                    <p className="text-sm leading-6 text-textPrimary">{event.summary}</p>
                    {event.entitySecondary && event.entitySecondary !== event.entityId ? <p className="break-all text-xs text-textSecondary">{event.entitySecondary}</p> : null}
                  </div>,
                  <div key={`${event.id}-source`} className="space-y-2">
                    <Badge label={event.source} tone="slate" />
                    {event.organisationId ? <Button href={buildAdminAuditHref({ ...data.filters, organisationId: event.organisationId, page: 1 })} variant="ghost" className="min-h-8 px-0 py-0 text-xs">Scope to organisation</Button> : null}
                  </div>,
                ])}
              />
              <Pagination data={data} />
            </>
          ) : (
            <EmptyState
              title="No audit events match the current filters"
              detail={filteredState
                ? 'The current combination of organisation, actor, entity, event, date, or query filters did not produce any truthful audit rows. Clear or widen the filter scope to continue the investigation.'
                : 'Audit events will appear here once the current workspace records real or derived operational history.'}
              action={<Button href="/admin/audit" variant="secondary">Reset filters</Button>}
            />
          )}
        </div>
      </SurfaceSection>
    </div>
  )
}

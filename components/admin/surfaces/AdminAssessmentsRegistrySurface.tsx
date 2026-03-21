import React from 'react'
import Link from 'next/link'
import { ChevronRight, Search } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Badge, EmptyState, MetricCard, StatusBadge, SurfaceSection } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import {
  buildAdminAssessmentRegistryHref,
  getAdminAssessmentCategoryLabel,
  type AdminAssessmentRegistryData,
} from '@/lib/admin/domain/assessment-management'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

function Filters({ data }: { data: AdminAssessmentRegistryData }) {
  const { filters } = data

  return (
    <form method="get" action="/admin/assessments" className="rounded-[1.25rem] border border-white/[0.08] bg-bg/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_minmax(0,0.7fr)_auto] xl:items-end">
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Query</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <input
              name="query"
              defaultValue={filters.query}
              placeholder="Search assessment name, key, slug, or summary"
              className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 pl-10 pr-3.5 text-sm text-textPrimary outline-none ring-accent/40 placeholder:text-textSecondary focus:border-accent/50 focus:ring"
            />
          </div>
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Lifecycle</span>
          <select name="lifecycle" defaultValue={filters.lifecycle} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
            <option value="all">All lifecycle states</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Category</span>
          <select name="category" defaultValue={filters.category} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
            <option value="all">All categories</option>
            <option value="behavioural_intelligence">Behavioural intelligence</option>
            <option value="team_dynamics">Team dynamics</option>
            <option value="organisational_performance">Organisational performance</option>
            <option value="leadership">Leadership</option>
            <option value="culture">Culture</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Sort</span>
          <select name="sort" defaultValue={filters.sort} className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring">
            <option value="updated_desc">Updated: newest first</option>
            <option value="updated_asc">Updated: oldest first</option>
            <option value="name_asc">Name: A–Z</option>
            <option value="name_desc">Name: Z–A</option>
          </select>
        </label>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          <Button type="submit" variant="secondary">Apply</Button>
          <Button href="/admin/assessments" variant="ghost">Clear</Button>
        </div>
      </div>
    </form>
  )
}

function Pagination({ data }: { data: AdminAssessmentRegistryData }) {
  const { filters, pagination } = data

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-panel/35 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-textSecondary">
        {pagination.totalCount
          ? `Showing ${pagination.windowStart}-${pagination.windowEnd} of ${pagination.totalCount} assessments.`
          : 'No assessment records are currently indexed.'}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button href={buildAdminAssessmentRegistryHref({ ...filters, page: Math.max(1, pagination.page - 1) })} variant="ghost" disabled={!pagination.hasPreviousPage}>Previous</Button>
        <span className="text-xs uppercase tracking-[0.14em] text-textSecondary">Page {pagination.page} / {pagination.totalPages}</span>
        <Button href={buildAdminAssessmentRegistryHref({ ...filters, page: pagination.page + 1 })} variant="ghost" disabled={!pagination.hasNextPage}>Next</Button>
      </div>
    </div>
  )
}

function RegistryRows({ data }: { data: AdminAssessmentRegistryData }) {
  if (!data.entries.length) {
    return (
      <EmptyState
        title={data.filters.query || data.filters.lifecycle !== 'all' || data.filters.category !== 'all'
          ? 'No assessments match the current filters'
          : 'No assessments are registered yet'}
        detail={data.filters.query || data.filters.lifecycle !== 'all' || data.filters.category !== 'all'
          ? 'Adjust the query, lifecycle, or category filters to widen the registry slice.'
          : 'Create the first stable assessment record so future import packages have a governed destination.'}
        action={<Button href="/admin/assessments/new" variant="secondary">Create assessment record</Button>}
      />
    )
  }

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-bg/50">
      <div className="hidden grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] gap-3 border-b border-white/[0.06] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-textSecondary lg:grid">
        <div>Assessment</div>
        <div>Category</div>
        <div>Lifecycle</div>
        <div>Published</div>
        <div>Updated</div>
        <div>Versions</div>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {data.entries.map((entry) => (
          <Link
            key={entry.id}
            href={`/admin/assessments/${entry.id}`}
            className="grid gap-3 px-5 py-4 transition-colors hover:bg-panel/45 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_auto] lg:items-center"
          >
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-textPrimary">{entry.name}</p>
                <Badge label={entry.key} tone="slate" className="max-w-full" />
              </div>
              <p className="text-sm leading-6 text-textSecondary">{entry.description ?? 'No internal summary yet.'}</p>
              <p className="break-all text-xs text-textSecondary">{entry.slug}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-textPrimary">{getAdminAssessmentCategoryLabel(entry.category)}</p>
              <p className="text-xs text-textSecondary">Container category for future imported packages.</p>
            </div>
            <div>
              <StatusBadge status={entry.lifecycleStatus} />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-textPrimary">{entry.currentPublishedVersionLabel ? `v${entry.currentPublishedVersionLabel}` : 'No published version'}</p>
              <p className="text-xs text-textSecondary">Single live version enforced per assessment.</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(entry.updatedAt)}</p>
              <p className="text-xs text-textSecondary">{formatAdminTimestamp(entry.updatedAt)}</p>
            </div>
            <div className="flex items-center justify-between gap-3 lg:justify-end">
              <Badge label={`${entry.versionCount} versions`} tone="slate" />
              <ChevronRight className="h-4 w-4 text-textSecondary" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export function AdminAssessmentsRegistrySurface({ data }: { data: AdminAssessmentRegistryData }) {
  const draftCount = String(data.entries.filter((entry) => entry.lifecycleStatus === 'draft').length).padStart(2, '0')
  const publishedCount = String(data.entries.filter((entry) => entry.currentPublishedVersionLabel).length).padStart(2, '0')
  const totalVersions = String(data.entries.reduce((sum, entry) => sum + entry.versionCount, 0)).padStart(2, '0')

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessments"
        title="Assessment registry"
        description="Database-backed system of record for deployable Sonartra assessments, their stable keys, and their version lifecycle before import tooling arrives."
        actions={<Button href="/admin/assessments/new" variant="secondary">Create assessment record</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Assessments" value={String(data.pagination.totalCount).padStart(2, '0')} detail="Stable parent assessment records currently indexed in the admin registry." />
        <MetricCard label="Draft containers" value={draftCount} detail="Assessment containers that do not currently point at a published version." />
        <MetricCard label="Published lines" value={publishedCount} detail="Assessment lines with an active published version pointer on the parent record." />
        <MetricCard label="Versions on page" value={totalVersions} detail="Version lineage visible in the current registry slice without opening detail workspaces." />
      </div>

      <SurfaceSection
        title="Assessment registry workspace"
        eyebrow="Operational registry"
        description="Server-rendered list view with URL-driven filters, bounded pagination, and direct drill-in to each assessment workspace."
      >
        <div className="space-y-4">
          <Filters data={data} />
          <RegistryRows data={data} />
          <Pagination data={data} />
        </div>
      </SurfaceSection>
    </div>
  )
}

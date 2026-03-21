import type { AdminAssessmentVersionPackageInfo } from '@/lib/admin/domain/assessment-package'

export type AdminAssessmentLifecycleStatus = 'draft' | 'published' | 'archived'
export type AdminAssessmentVersionSourceType = 'manual' | 'import' | 'system'
export type AdminAssessmentDetailTab = 'overview' | 'versions' | 'settings' | 'activity'

export const ADMIN_ASSESSMENT_DETAIL_TABS: AdminAssessmentDetailTab[] = ['overview', 'versions', 'settings', 'activity']
export const ADMIN_ASSESSMENT_CATEGORIES = [
  'behavioural_intelligence',
  'team_dynamics',
  'organisational_performance',
  'leadership',
  'culture',
  'other',
] as const

export type AdminAssessmentCategory = (typeof ADMIN_ASSESSMENT_CATEGORIES)[number]

export interface AdminAssessmentRegistryFilters {
  query: string
  lifecycle: 'all' | AdminAssessmentLifecycleStatus
  category: 'all' | AdminAssessmentCategory
  sort: 'updated_desc' | 'updated_asc' | 'name_asc' | 'name_desc'
  page: number
  pageSize: number
}

export interface AdminAssessmentRegistryPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  windowStart: number
  windowEnd: number
}


export interface AdminAssessmentRegistryData {
  filters: AdminAssessmentRegistryFilters
  entries: AdminAssessmentRegistryItem[]
  pagination: AdminAssessmentRegistryPagination
}

export interface AdminAssessmentRegistryItem {
  id: string
  name: string
  key: string
  slug: string
  category: string
  lifecycleStatus: AdminAssessmentLifecycleStatus
  currentPublishedVersionLabel: string | null
  versionCount: number
  updatedAt: string
  createdAt: string
  description: string | null
}

export interface AdminAssessmentVersionRecord {
  id: string
  assessmentId: string
  versionLabel: string
  lifecycleStatus: AdminAssessmentLifecycleStatus
  sourceType: AdminAssessmentVersionSourceType
  notes: string | null
  hasDefinitionPayload: boolean
  validationStatus: string | null
  packageInfo: AdminAssessmentVersionPackageInfo
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  archivedAt: string | null
  createdByName: string | null
  updatedByName: string | null
  publishedByName: string | null
}

export interface AdminAssessmentDetailData {
  assessment: {
    id: string
    name: string
    key: string
    slug: string
    category: string
    description: string | null
    lifecycleStatus: AdminAssessmentLifecycleStatus
    currentPublishedVersionId: string | null
    currentPublishedVersionLabel: string | null
    createdAt: string
    updatedAt: string
  }
  versions: AdminAssessmentVersionRecord[]
  activity: Array<{
    id: string
    eventType: string
    summary: string
    actorId: string | null
    actorName: string | null
    happenedAt: string
    source: 'audit' | 'membership' | 'organisation'
    entityType: 'assessment' | 'assessment_version'
    entityId: string | null
    entityName: string | null
    entitySecondary: string | null
  }>
  diagnostics: {
    versionCount: number
    draftCount: number
    archivedCount: number
    latestDraftVersionLabel: string | null
    latestPublishedVersionLabel: string | null
    latestVersionUpdatedAt: string | null
  }
}

export interface AdminAssessmentCreateState {
  status: 'idle' | 'error'
  message?: string
  fieldErrors?: {
    name?: string
    key?: string
    slug?: string
    category?: string
    description?: string
  }
}

export interface AdminAssessmentVersionMutationState {
  status: 'idle' | 'error'
  message?: string
  fieldErrors?: {
    versionLabel?: string
    notes?: string
    confirmation?: string
  }
}

export interface AdminAssessmentPackageImportState {
  status: 'idle' | 'error'
  message?: string
  fieldErrors?: {
    packageText?: string
    packageFile?: string
  }
  validationResult?: {
    errors: Array<{ path: string; message: string }>
    warnings: Array<{ path: string; message: string }>
  }
}

function normaliseSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? ''
  }

  return value?.trim() ?? ''
}

function parsePositiveInteger(value: string, fallback: number): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function isAdminAssessmentCategory(value: string): value is AdminAssessmentCategory {
  return (ADMIN_ASSESSMENT_CATEGORIES as readonly string[]).includes(value)
}

export function getAdminAssessmentRegistryFilters(
  searchParams?: Record<string, string | string[] | undefined>,
): AdminAssessmentRegistryFilters {
  const lifecycle = normaliseSingleValue(searchParams?.lifecycle)
  const category = normaliseSingleValue(searchParams?.category)
  const sort = normaliseSingleValue(searchParams?.sort)

  return {
    query: normaliseSingleValue(searchParams?.query),
    lifecycle: lifecycle === 'draft' || lifecycle === 'published' || lifecycle === 'archived' ? lifecycle : 'all',
    category: isAdminAssessmentCategory(category) ? category : 'all',
    sort: sort === 'updated_asc' || sort === 'name_asc' || sort === 'name_desc' ? sort : 'updated_desc',
    page: parsePositiveInteger(normaliseSingleValue(searchParams?.page), 1),
    pageSize: 20,
  }
}

export function getAdminAssessmentDetailTab(tab?: string | null): AdminAssessmentDetailTab {
  if (tab && ADMIN_ASSESSMENT_DETAIL_TABS.includes(tab as AdminAssessmentDetailTab)) {
    return tab as AdminAssessmentDetailTab
  }

  return 'overview'
}

export function getAdminAssessmentCategoryLabel(category: string): string {
  switch (category) {
    case 'behavioural_intelligence':
      return 'Behavioural intelligence'
    case 'team_dynamics':
      return 'Team dynamics'
    case 'organisational_performance':
      return 'Organisational performance'
    case 'leadership':
      return 'Leadership'
    case 'culture':
      return 'Culture'
    default:
      return category.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
  }
}

export function getAdminAssessmentLifecycleLabel(status: AdminAssessmentLifecycleStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'published':
      return 'Published'
    case 'archived':
      return 'Archived'
  }
}

export function getAdminAssessmentVersionSourceLabel(sourceType: AdminAssessmentVersionSourceType): string {
  switch (sourceType) {
    case 'import':
      return 'Import'
    case 'system':
      return 'System'
    default:
      return 'Manual'
  }
}

export function buildAdminAssessmentRegistryHref(filters: Partial<AdminAssessmentRegistryFilters> = {}, pathname = '/admin/assessments'): string {
  const params = new URLSearchParams()

  if (filters.query) {
    params.set('query', filters.query)
  }

  if (filters.lifecycle && filters.lifecycle !== 'all') {
    params.set('lifecycle', filters.lifecycle)
  }

  if (filters.category && filters.category !== 'all') {
    params.set('category', filters.category)
  }

  if (filters.sort && filters.sort !== 'updated_desc') {
    params.set('sort', filters.sort)
  }

  if (filters.page && filters.page > 1) {
    params.set('page', String(filters.page))
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}

export function buildAdminAssessmentMutationState(message?: string, fieldErrors?: AdminAssessmentCreateState['fieldErrors']): AdminAssessmentCreateState {
  return {
    status: 'error',
    message,
    fieldErrors,
  }
}

export function buildAdminAssessmentVersionMutationState(message?: string, fieldErrors?: AdminAssessmentVersionMutationState['fieldErrors']): AdminAssessmentVersionMutationState {
  return {
    status: 'error',
    message,
    fieldErrors,
  }
}

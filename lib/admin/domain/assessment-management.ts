import type { AdminAssessmentPackageDetectedVersion, AdminAssessmentVersionPackageInfo, SonartraAssessmentPackageV1, SonartraAssessmentPackageSummary } from '@/lib/admin/domain/assessment-package'

export type AdminAssessmentLifecycleStatus = 'draft' | 'published' | 'archived'
export type AdminAssessmentVersionSourceType = 'manual' | 'import' | 'system'
export type AdminAssessmentDetailTab = 'overview' | 'versions' | 'assignments' | 'settings' | 'activity'

export const ADMIN_ASSESSMENT_DETAIL_TABS: AdminAssessmentDetailTab[] = ['overview', 'versions', 'assignments', 'settings', 'activity']
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


export interface AdminAssessmentRegistryNotice {
  kind: 'setup_required' | 'degraded'
  title: string
  detail: string
}

export interface AdminAssessmentRegistrySummary {
  publishedCount: number
  draftCount: number
  archivedCount: number
}

export interface AdminAssessmentRegistryData {
  filters: AdminAssessmentRegistryFilters
  entries: AdminAssessmentRegistryItem[]
  summary: AdminAssessmentRegistrySummary
  pagination: AdminAssessmentRegistryPagination
  notice?: AdminAssessmentRegistryNotice | null
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

export type AdminAssessmentReleaseReadinessStatus = 'not_ready' | 'ready_with_warnings' | 'ready'
export type AdminAssessmentReleaseSignOffStatus = 'unsigned' | 'signed_off'
export type AdminAssessmentReleaseCheckStatus = 'pass' | 'warning' | 'fail'

export interface AdminAssessmentReleaseCheck {
  key: string
  label: string
  status: AdminAssessmentReleaseCheckStatus
  detail: string
}

export interface AdminAssessmentReleaseReadinessSummary {
  status: AdminAssessmentReleaseReadinessStatus
  summaryText: string
  checks: AdminAssessmentReleaseCheck[]
  blockingChecks: AdminAssessmentReleaseCheck[]
  warningChecks: AdminAssessmentReleaseCheck[]
}

export interface AdminAssessmentReleaseSignOff {
  status: AdminAssessmentReleaseSignOffStatus
  signedOffBy: string | null
  signedOffAt: string | null
  isStale: boolean
  staleReason: string | null
}

export interface AdminAssessmentReleaseGovernance {
  readinessStatus: AdminAssessmentReleaseReadinessStatus
  readinessSummary: AdminAssessmentReleaseReadinessSummary | null
  lastReadinessEvaluatedAt: string | null
  signOff: AdminAssessmentReleaseSignOff
  releaseNotes: string | null
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
  normalizedPackage: SonartraAssessmentPackageV1 | null
  storedDefinitionPayload?: unknown | null
  createdAt: string
  updatedAt: string
  publishedAt: string | null
  archivedAt: string | null
  createdByName: string | null
  updatedByName: string | null
  publishedByName: string | null
  latestSuiteSnapshot: AdminAssessmentLatestSuiteSnapshot | null
  releaseGovernance?: AdminAssessmentReleaseGovernance
  materialUpdatedAt?: string
  savedScenarios: AdminAssessmentSavedScenarioRecord[]
}

export interface AdminAssessmentSavedScenarioRecord {
  id: string
  versionId: string
  versionLabel: string
  name: string
  description: string | null
  status: 'active' | 'archived'
  payload: string
  sourceVersionId: string | null
  sourceVersionLabel: string | null
  sourceScenarioId: string | null
  provenanceSummary: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
  createdByName: string | null
  updatedByName: string | null
}

export interface AdminAssessmentLatestSuiteSnapshot {
  executedAt: string
  executedBy: string | null
  baselineVersionId: string | null
  baselineVersionLabel: string | null
  totalScenarios: number
  passedCount: number
  warningCount: number
  failedCount: number
  overallStatus: 'pass' | 'warning' | 'fail'
  summaryText: string
}

export interface AdminAssessmentScenarioImportState {
  status: 'idle' | 'success' | 'error'
  message?: string
  summary?: {
    sourceVersionLabel: string | null
    importedCount: number
    skippedCount: number
    importedNames: string[]
    skipped: Array<{ name: string; reason: string }>
  }
}

export interface AdminAssessmentScenarioSuiteRunState {
  status: 'idle' | 'success' | 'error'
  message?: string
  snapshot?: AdminAssessmentLatestSuiteSnapshot | null
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
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: {
    versionLabel?: string
    notes?: string
    releaseNotes?: string
    confirmation?: string
  }
}

export interface AdminAssessmentPackageImportState {
  status: 'idle' | 'error' | 'success'
  message?: string
  fieldErrors?: {
    packageText?: string
    packageFile?: string
  }
  validationResult?: {
    success?: boolean
    detectedVersion?: AdminAssessmentPackageDetectedVersion | null
    schemaVersion?: string | null
    packageName?: string | null
    versionLabel?: string | null
    summary?: SonartraAssessmentPackageSummary | null
    readiness?: {
      structurallyValid: boolean
      importable: boolean
      compilable: boolean
      evaluatable: boolean
      simulatable: boolean
      runtimeExecutable: boolean
      liveRuntimeEnabled: boolean
      publishable: boolean
    }
    errors: Array<{ path: string; message: string }>
    warnings: Array<{ path: string; message: string }>
  }
}

export interface AssessmentPackageIdentity {
  assessmentKey: string
  assessmentName: string
  slug: string
  category: string
  description: string | null
  defaultLocale: string | null
  supportedLocales: string[]
  assessmentType: string | null
  authorName: string | null
  authorSource: string | null
  versionLabel: string | null
  schemaVersion: string | null
  detectedVersion: AdminAssessmentPackageDetectedVersion | null
  derivedFields: Array<'slug' | 'category'>
}

export interface AssessmentIdentityMutabilityRule {
  field: 'assessmentKey' | 'assessmentName' | 'slug' | 'category'
  mutability: 'immutable' | 'mutable_with_conflict_rules' | 'mutable'
  summary: string
}

export const ADMIN_ASSESSMENT_IDENTITY_MUTABILITY_RULES: AssessmentIdentityMutabilityRule[] = [
  {
    field: 'assessmentKey',
    mutability: 'immutable',
    summary: 'Stable assessment identity anchor used for import matching and create-or-attach decisions.',
  },
  {
    field: 'assessmentName',
    mutability: 'mutable_with_conflict_rules',
    summary: 'Display name can evolve over time, but changes should be surfaced in import review before they are applied.',
  },
  {
    field: 'slug',
    mutability: 'mutable_with_conflict_rules',
    summary: 'Slug can evolve when it remains unique; collisions with a different assessment key must block import.',
  },
  {
    field: 'category',
    mutability: 'mutable',
    summary: 'Category is taxonomy metadata and can be updated by package import without changing stable identity.',
  },
]

export interface AssessmentImportConflict {
  code:
    | 'missing_identity_metadata'
    | 'immutable_assessment_key_mismatch'
    | 'slug_collision'
    | 'duplicate_version_label'
    | 'package_validation_failed'
    | 'identity_metadata_changed'
  severity: 'error' | 'warning'
  field?: 'assessmentKey' | 'assessmentName' | 'slug' | 'category' | 'versionLabel'
  message: string
}

export interface AssessmentImportTargetDecision {
  action: 'create_assessment' | 'attach_version'
  assessmentId: string | null
  versionId: string | null
  versionLabel: string | null
  matchedAssessment: {
    id: string
    name: string
    key: string
    slug: string
    category: string
  } | null
  willCreateAssessment: boolean
  willCreateVersion: boolean
}

export interface AdminAssessmentImportReviewContract {
  packageIdentity: AssessmentPackageIdentity | null
  decision: AssessmentImportTargetDecision | null
  conflicts: AssessmentImportConflict[]
  validationResult: AdminAssessmentPackageImportState['validationResult']
  governanceNotice: string
}

export interface AdminAssessmentPackageCreateOrAttachState {
  status: 'idle' | 'review' | 'error' | 'success'
  message?: string
  packageText?: string
  fieldErrors?: {
    packageText?: string
    packageFile?: string
  }
  review?: AdminAssessmentImportReviewContract
}

function normaliseAssessmentIssueCollection(value: unknown): Array<{ path: string; message: string }> {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((issue) => {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
      return []
    }

    const path = normaliseSingleValue((issue as { path?: string | string[] }).path)
    const message = normaliseSingleValue((issue as { message?: string | string[] }).message)
    if (!path || !message) {
      return []
    }

    return [{ path, message }]
  })
}

export function normalizeAdminAssessmentPackageImportState(
  state: Partial<AdminAssessmentPackageImportState> | null | undefined,
): AdminAssessmentPackageImportState {
  const normalizedStatus = state?.status === 'error' || state?.status === 'success' ? state.status : 'idle'
  const packageTextError = normaliseSingleValue(state?.fieldErrors?.packageText)
  const packageFileError = normaliseSingleValue(state?.fieldErrors?.packageFile)
  const validationErrors = normaliseAssessmentIssueCollection(state?.validationResult?.errors)
  const validationWarnings = normaliseAssessmentIssueCollection(state?.validationResult?.warnings)
  const summary = state?.validationResult?.summary ?? null
  const readiness = state?.validationResult?.readiness
  const detectedVersion = state?.validationResult?.detectedVersion === 'legacy_v1'
    || state?.validationResult?.detectedVersion === 'package_contract_v2'
    || state?.validationResult?.detectedVersion === 'runtime_contract_v2'
    || state?.validationResult?.detectedVersion === 'hybrid_mvp_v1'
    || state?.validationResult?.detectedVersion === 'unknown'
    ? state.validationResult.detectedVersion
    : null

  return {
    status: normalizedStatus,
    message: normaliseSingleValue(state?.message) || undefined,
    fieldErrors: packageTextError || packageFileError
      ? {
          ...(packageTextError ? { packageText: packageTextError } : {}),
          ...(packageFileError ? { packageFile: packageFileError } : {}),
        }
      : undefined,
    validationResult: validationErrors.length > 0 || validationWarnings.length > 0
      || detectedVersion
      || typeof state?.validationResult?.success === 'boolean'
      || typeof state?.validationResult?.schemaVersion === 'string'
      || typeof state?.validationResult?.packageName === 'string'
      || typeof state?.validationResult?.versionLabel === 'string'
      || Boolean(summary)
      || Boolean(readiness)
      ? {
          success: typeof state?.validationResult?.success === 'boolean' ? state.validationResult.success : undefined,
          detectedVersion,
          schemaVersion: typeof state?.validationResult?.schemaVersion === 'string' && state.validationResult.schemaVersion.trim()
            ? state.validationResult.schemaVersion.trim()
            : null,
          packageName: typeof state?.validationResult?.packageName === 'string' && state.validationResult.packageName.trim()
            ? state.validationResult.packageName.trim()
            : null,
          versionLabel: typeof state?.validationResult?.versionLabel === 'string' && state.validationResult.versionLabel.trim()
            ? state.validationResult.versionLabel.trim()
            : null,
          summary,
          readiness: readiness && typeof readiness === 'object'
            ? {
                structurallyValid: Boolean(readiness.structurallyValid),
                importable: Boolean(readiness.importable),
                compilable: Boolean(readiness.compilable),
                evaluatable: Boolean(readiness.evaluatable),
                simulatable: Boolean(readiness.simulatable),
                runtimeExecutable: Boolean(readiness.runtimeExecutable),
                liveRuntimeEnabled: Boolean(readiness.liveRuntimeEnabled),
                publishable: Boolean(readiness.publishable),
              }
            : undefined,
          errors: validationErrors,
          warnings: validationWarnings,
        }
      : undefined,
  }
}

export function normalizeAdminAssessmentPackageCreateOrAttachState(
  state: Partial<AdminAssessmentPackageCreateOrAttachState> | null | undefined,
): AdminAssessmentPackageCreateOrAttachState {
  const status = state?.status === 'review' || state?.status === 'error' || state?.status === 'success'
    ? state.status
    : 'idle'

  const review = state?.review

  return {
    status,
    message: normaliseSingleValue(state?.message) || undefined,
    packageText: typeof state?.packageText === 'string' ? state.packageText : '',
    fieldErrors: state?.fieldErrors
      ? {
          ...(state.fieldErrors.packageText ? { packageText: normaliseSingleValue(state.fieldErrors.packageText) } : {}),
          ...(state.fieldErrors.packageFile ? { packageFile: normaliseSingleValue(state.fieldErrors.packageFile) } : {}),
        }
      : undefined,
    review: review
      ? {
          packageIdentity: review.packageIdentity
            ? {
                ...review.packageIdentity,
                derivedFields: Array.isArray(review.packageIdentity.derivedFields)
                  ? review.packageIdentity.derivedFields.filter((field): field is 'slug' | 'category' => field === 'slug' || field === 'category')
                  : [],
                supportedLocales: Array.isArray(review.packageIdentity.supportedLocales)
                  ? review.packageIdentity.supportedLocales.filter((locale): locale is string => typeof locale === 'string' && locale.trim().length > 0)
                  : [],
              }
            : null,
          decision: review.decision ?? null,
          conflicts: Array.isArray(review.conflicts) ? review.conflicts.filter((conflict) => {
            return Boolean(conflict && typeof conflict.message === 'string' && (conflict.severity === 'error' || conflict.severity === 'warning'))
          }) : [],
          validationResult: normalizeAdminAssessmentPackageImportState({ validationResult: review.validationResult }).validationResult,
          governanceNotice: normaliseSingleValue(review.governanceNotice) || 'Package metadata drives identity. Admin controls publish and deployment governance only.',
        }
      : undefined,
  }
}

export function buildAdminAssessmentPackageImportRedirectTarget(
  assessmentId: string | null | undefined,
  versionLabel: string | null | undefined,
): string | null {
  const normalizedAssessmentId = normaliseSingleValue(assessmentId ?? undefined)
  const normalizedVersionLabel = normaliseSingleValue(versionLabel ?? undefined)

  if (!normalizedAssessmentId || !normalizedVersionLabel) {
    return null
  }

  return `/admin/assessments/${normalizedAssessmentId}/versions/${normalizedVersionLabel}/import?mutation=package-imported`
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

export function buildAdminAssessmentScenarioImportState(
  message?: string,
  summary?: AdminAssessmentScenarioImportState['summary'],
): AdminAssessmentScenarioImportState {
  return {
    status: 'error',
    message,
    summary,
  }
}

import { auth, currentUser } from '@clerk/nextjs/server'
import type { PoolClient } from 'pg'
import { resolveAdminAccess, type AdminAccessContext } from '@/lib/admin/access'
import {
  getAdminAssessmentRegistryFilters,
  type AdminAssessmentCreateState,
  type AdminAssessmentDetailData,
  type AdminAssessmentLifecycleStatus,
  type AdminAssessmentRegistryFilters,
  type AdminAssessmentRegistryItem,
  type AdminAssessmentVersionMutationState,
  type AdminAssessmentVersionRecord,
} from '@/lib/admin/domain/assessment-management'
import {
  SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1,
  type AdminAssessmentVersionPackageInfo,
  type AssessmentPackageStatus,
  type SonartraAssessmentPackageSummary,
  type SonartraAssessmentPackageValidationIssue,
  validateSonartraAssessmentPackage,
} from '@/lib/admin/domain/assessment-package'
import { queryDb, withTransaction, describeDatabaseError } from '@/lib/db'
import { getScopedAdminAuditActivity, mapScopedAuditEventsToAssessmentActivity } from '@/lib/admin/server/audit-workspace'

interface AssessmentRegistryRow {
  id: string | null
  key: string | null
  slug: string | null
  name: string | null
  category: string | null
  description: string | null
  lifecycle_status: string | null
  current_published_version_label: string | null
  version_count: number | string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

interface AssessmentSummaryRow {
  id: string | null
  key: string | null
  slug: string | null
  name: string | null
  category: string | null
  description: string | null
  lifecycle_status: string | null
  current_published_version_id: string | null
  current_published_version_label: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

interface AssessmentVersionRow {
  id: string | null
  assessment_definition_id: string | null
  version_label: string | null
  lifecycle_status: string | null
  source_type: string | null
  notes: string | null
  has_definition_payload: boolean | null
  validation_status: string | null
  package_status: string | null
  package_schema_version: string | null
  package_source_type: string | null
  package_imported_at: string | Date | null
  package_source_filename: string | null
  package_imported_by_name: string | null
  package_validation_report_json: unknown
  created_at: string | Date | null
  updated_at: string | Date | null
  published_at: string | Date | null
  archived_at: string | Date | null
  created_by_name: string | null
  updated_by_name: string | null
  published_by_name: string | null
}

interface ActorRow {
  id: string
  email: string
  full_name: string
}

export interface AdminAssessmentRegistryData {
  filters: AdminAssessmentRegistryFilters
  entries: AdminAssessmentRegistryItem[]
  pagination: {
    page: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasPreviousPage: boolean
    hasNextPage: boolean
    windowStart: number
    windowEnd: number
  }
}

export interface AdminCreateAssessmentInput {
  name: string
  key: string
  slug: string
  category: string
  description: string
}

export interface AdminCreateAssessmentResult {
  ok: boolean
  code: 'created' | 'validation_error' | 'permission_denied' | 'duplicate_key' | 'duplicate_slug' | 'unknown_error'
  message: string
  assessmentId?: string
  fieldErrors?: AdminAssessmentCreateState['fieldErrors']
}

export interface AdminCreateAssessmentDraftVersionInput {
  assessmentId: string
  versionLabel: string
  notes: string
}

export interface AdminAssessmentVersionMutationResult {
  ok: boolean
  code:
    | 'created'
    | 'published'
    | 'archived'
    | 'validation_error'
    | 'permission_denied'
    | 'not_found'
    | 'duplicate_version_label'
    | 'invalid_transition'
    | 'concurrent_update'
    | 'unknown_error'
  message: string
  assessmentId?: string
  versionId?: string
  fieldErrors?: AdminAssessmentVersionMutationState['fieldErrors']
}

export interface AdminAssessmentPackageImportInput {
  assessmentId: string
  versionId: string
  expectedUpdatedAt?: string
  packageText: string
  sourceFilename?: string | null
}

export interface AdminAssessmentPackageImportResult {
  ok: boolean
  code:
    | 'imported'
    | 'validation_error'
    | 'permission_denied'
    | 'not_found'
    | 'invalid_transition'
    | 'concurrent_update'
    | 'unknown_error'
  message: string
  assessmentId?: string
  versionId?: string
  validationResult?: {
    errors: SonartraAssessmentPackageValidationIssue[]
    warnings: SonartraAssessmentPackageValidationIssue[]
  }
  fieldErrors?: {
    packageText?: string
    packageFile?: string
  }
}

interface VersionTransitionInput {
  assessmentId: string
  versionId: string
  expectedUpdatedAt?: string
  confirmation?: 'confirm'
}

interface AssessmentMutationDependencies {
  resolveAdminAccess: () => Promise<AdminAccessContext>
  getActorIdentity: (client: PoolClient) => Promise<ActorRow | null>
  queryDb: typeof queryDb
  withTransaction: typeof withTransaction
  now: () => Date
  createId: () => string
}

const defaultDependencies: AssessmentMutationDependencies = {
  resolveAdminAccess: () => resolveAdminAccess(),
  getActorIdentity: ensureAdminAuditActor,
  queryDb,
  withTransaction,
  now: () => new Date(),
  createId: () => crypto.randomUUID(),
}

function normaliseWhitespace(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function normaliseNullableField(value: string | null | undefined): string | null {
  const trimmed = normaliseWhitespace(value)
  return trimmed ? trimmed : null
}

function normaliseIdentifier(value: string | null | undefined): string {
  return normaliseWhitespace(value).toLowerCase()
}

function normaliseSlug(value: string | null | undefined): string {
  return normaliseWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normaliseTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
  }

  return Number.isNaN(value.getTime()) ? null : value.toISOString()
}

function normaliseRequiredString(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normaliseCount(value: number | string | null | undefined): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

function parseJsonObject<T extends Record<string, unknown>>(value: unknown): T | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as T : null
    } catch {
      return null
    }
  }

  return typeof value === 'object' && !Array.isArray(value) ? value as T : null
}

function isPackageStatus(value: string | null | undefined): value is AssessmentPackageStatus {
  return value === 'missing' || value === 'valid' || value === 'valid_with_warnings' || value === 'invalid'
}

function normalisePackageSummary(value: unknown): SonartraAssessmentPackageSummary | null {
  const summary = parseJsonObject<Record<string, unknown>>(value)?.summary

  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) {
    return null
  }

  return {
    dimensionsCount: normaliseCount((summary as Record<string, unknown>).dimensionsCount as number | string | null | undefined),
    questionsCount: normaliseCount((summary as Record<string, unknown>).questionsCount as number | string | null | undefined),
    optionsCount: normaliseCount((summary as Record<string, unknown>).optionsCount as number | string | null | undefined),
    scoringRuleCount: normaliseCount((summary as Record<string, unknown>).scoringRuleCount as number | string | null | undefined),
    normalizationRuleCount: normaliseCount((summary as Record<string, unknown>).normalizationRuleCount as number | string | null | undefined),
    outputRuleCount: normaliseCount((summary as Record<string, unknown>).outputRuleCount as number | string | null | undefined),
    localeCount: normaliseCount((summary as Record<string, unknown>).localeCount as number | string | null | undefined),
  }
}

function normalisePackageIssues(value: unknown, key: 'errors' | 'warnings'): SonartraAssessmentPackageValidationIssue[] {
  const json = parseJsonObject<Record<string, unknown>>(value)
  const issues = json?.[key]

  if (!Array.isArray(issues)) {
    return []
  }

  return issues.flatMap((issue) => {
    if (!issue || typeof issue !== 'object' || Array.isArray(issue)) {
      return []
    }

    const path = normaliseRequiredString((issue as Record<string, unknown>).path as string | null | undefined)
    const message = normaliseRequiredString((issue as Record<string, unknown>).message as string | null | undefined)

    if (!path || !message) {
      return []
    }

    return [{ path, message }]
  })
}

function mapPackageInfo(row: AssessmentVersionRow): AdminAssessmentVersionPackageInfo {
  return {
    status: isPackageStatus(row.package_status) ? row.package_status : 'missing',
    schemaVersion: normaliseNullableField(row.package_schema_version),
    sourceType: row.package_source_type === 'manual_import' ? 'manual_import' : null,
    importedAt: normaliseTimestamp(row.package_imported_at),
    importedByName: normaliseNullableField(row.package_imported_by_name),
    sourceFilename: normaliseNullableField(row.package_source_filename),
    summary: normalisePackageSummary(row.package_validation_report_json),
    errors: normalisePackageIssues(row.package_validation_report_json, 'errors'),
    warnings: normalisePackageIssues(row.package_validation_report_json, 'warnings'),
  }
}

function isLifecycleStatus(value: string | null | undefined): value is AdminAssessmentLifecycleStatus {
  return value === 'draft' || value === 'published' || value === 'archived'
}

function toPattern(value: string): string | null {
  if (!value.trim()) {
    return null
  }

  return `%${value.trim().replace(/[%_]/g, '\\$&')}%`
}

async function ensureAdminAuditActor(client: PoolClient): Promise<ActorRow | null> {
  const [{ userId }, clerkUser] = await Promise.all([auth(), currentUser()])
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? null
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim()
    || clerkUser?.fullName?.trim()
    || email
    || 'Sonartra Admin'

  if (!email) {
    return null
  }

  const existing = await client.query<ActorRow>(
    `select id, email, full_name
     from admin_identities
     where auth_subject = $1 or email = $2
     order by case when auth_subject = $1 then 0 else 1 end
     limit 1`,
    [userId, email],
  )

  if (existing.rows[0]) {
    if (userId) {
      await client.query(
        `update admin_identities
         set auth_provider = coalesce(auth_provider, 'clerk'),
             auth_subject = coalesce(auth_subject, $2),
             full_name = case when full_name = '' then $3 else full_name end,
             status = case when status = 'invited' then 'active' else status end
         where id = $1`,
        [existing.rows[0].id, userId, fullName],
      )
    }

    return existing.rows[0]
  }

  if (!userId) {
    return null
  }

  const inserted = await client.query<ActorRow>(
    `insert into admin_identities (id, email, full_name, identity_type, auth_provider, auth_subject, status, last_activity_at, created_at)
     values ($1, $2, $3, 'internal', 'clerk', $4, 'active', $5, $5)
     returning id, email, full_name`,
    [crypto.randomUUID(), email, fullName, userId, new Date().toISOString()],
  )

  return inserted.rows[0] ?? null
}

async function requireAccess(deps: AssessmentMutationDependencies) {
  const access = await deps.resolveAdminAccess()

  if (!access.isAuthenticated || !access.isAllowed) {
    return {
      ok: false,
      code: 'permission_denied',
      message: 'You do not have permission to manage assessments.',
    } as const
  }

  return null
}

function validateAssessmentInput(input: AdminCreateAssessmentInput): AdminAssessmentCreateState['fieldErrors'] {
  const fieldErrors: NonNullable<AdminAssessmentCreateState['fieldErrors']> = {}
  const name = normaliseWhitespace(input.name)
  const key = normaliseIdentifier(input.key)
  const slug = normaliseSlug(input.slug || input.key)
  const description = normaliseWhitespace(input.description)

  if (name.length < 2) {
    fieldErrors.name = 'Assessment name must contain at least 2 characters.'
  } else if (name.length > 255) {
    fieldErrors.name = 'Assessment name must be 255 characters or fewer.'
  }

  if (!key) {
    fieldErrors.key = 'Library key is required.'
  } else if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(key)) {
    fieldErrors.key = 'Library key must use lowercase letters, numbers, hyphens, or underscores only.'
  } else if (key.length > 100) {
    fieldErrors.key = 'Library key must be 100 characters or fewer.'
  }

  if (!slug) {
    fieldErrors.slug = 'Slug is required.'
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fieldErrors.slug = 'Slug must use lowercase letters, numbers, and hyphens only.'
  } else if (slug.length > 120) {
    fieldErrors.slug = 'Slug must be 120 characters or fewer.'
  }

  if (!normaliseWhitespace(input.category)) {
    fieldErrors.category = 'Select an assessment category.'
  }

  if (description.length > 600) {
    fieldErrors.description = 'Description must be 600 characters or fewer.'
  }

  return Object.keys(fieldErrors).length ? fieldErrors : undefined
}

function validateDraftVersionInput(input: AdminCreateAssessmentDraftVersionInput): AdminAssessmentVersionMutationState['fieldErrors'] {
  const fieldErrors: NonNullable<AdminAssessmentVersionMutationState['fieldErrors']> = {}
  const versionLabel = normaliseWhitespace(input.versionLabel)
  const notes = normaliseWhitespace(input.notes)

  if (!versionLabel) {
    fieldErrors.versionLabel = 'Version label is required.'
  } else if (!/^[0-9]+(?:\.[0-9]+){0,2}(?:[-+][a-z0-9.-]+)?$/i.test(versionLabel)) {
    fieldErrors.versionLabel = 'Use semantic version style values such as 1.0.0 or 2.1.'
  } else if (versionLabel.length > 64) {
    fieldErrors.versionLabel = 'Version label must be 64 characters or fewer.'
  }

  if (notes.length > 1000) {
    fieldErrors.notes = 'Draft notes must be 1000 characters or fewer.'
  }

  return Object.keys(fieldErrors).length ? fieldErrors : undefined
}

function mapAssessmentRegistryRows(rows: AssessmentRegistryRow[]): AdminAssessmentRegistryItem[] {
  return (rows ?? []).flatMap((row) => {
    const id = normaliseRequiredString(row.id)
    const key = normaliseRequiredString(row.key)
    const slug = normaliseRequiredString(row.slug)
    const name = normaliseRequiredString(row.name)
    const category = normaliseRequiredString(row.category)
    const lifecycleStatus = isLifecycleStatus(row.lifecycle_status) ? row.lifecycle_status : null
    const createdAt = normaliseTimestamp(row.created_at)
    const updatedAt = normaliseTimestamp(row.updated_at)

    if (!id || !key || !slug || !name || !category || !lifecycleStatus || !createdAt || !updatedAt) {
      return []
    }

    return [{
      id,
      key,
      slug,
      name,
      category,
      lifecycleStatus,
      currentPublishedVersionLabel: normaliseNullableField(row.current_published_version_label),
      versionCount: normaliseCount(row.version_count),
      createdAt,
      updatedAt,
      description: normaliseNullableField(row.description),
    }]
  })
}

function mapAssessmentSummaryRow(row: AssessmentSummaryRow | undefined): AdminAssessmentDetailData['assessment'] | null {
  if (!row) {
    return null
  }

  const id = normaliseRequiredString(row.id)
  const key = normaliseRequiredString(row.key)
  const slug = normaliseRequiredString(row.slug)
  const name = normaliseRequiredString(row.name)
  const category = normaliseRequiredString(row.category)
  const lifecycleStatus = isLifecycleStatus(row.lifecycle_status) ? row.lifecycle_status : null
  const createdAt = normaliseTimestamp(row.created_at)
  const updatedAt = normaliseTimestamp(row.updated_at)

  if (!id || !key || !slug || !name || !category || !lifecycleStatus || !createdAt || !updatedAt) {
    return null
  }

  return {
    id,
    key,
    slug,
    name,
    category,
    description: normaliseNullableField(row.description),
    lifecycleStatus,
    currentPublishedVersionId: normaliseNullableField(row.current_published_version_id),
    currentPublishedVersionLabel: normaliseNullableField(row.current_published_version_label),
    createdAt,
    updatedAt,
  }
}

export function mapAssessmentVersionRows(rows: AssessmentVersionRow[]): AdminAssessmentVersionRecord[] {
  return (rows ?? []).flatMap((row) => {
    const id = normaliseRequiredString(row.id)
    const assessmentId = normaliseRequiredString(row.assessment_definition_id)
    const versionLabel = normaliseRequiredString(row.version_label)
    const lifecycleStatus = isLifecycleStatus(row.lifecycle_status) ? row.lifecycle_status : null
    const sourceType = row.source_type === 'import' || row.source_type === 'system' || row.source_type === 'manual'
      ? row.source_type
      : 'manual'
    const createdAt = normaliseTimestamp(row.created_at)
    const updatedAt = normaliseTimestamp(row.updated_at)

    if (!id || !assessmentId || !versionLabel || !lifecycleStatus || !createdAt || !updatedAt) {
      return []
    }

    return [{
      id,
      assessmentId,
      versionLabel,
      lifecycleStatus,
      sourceType,
      notes: normaliseNullableField(row.notes),
      hasDefinitionPayload: Boolean(row.has_definition_payload),
      validationStatus: normaliseNullableField(row.validation_status),
      packageInfo: mapPackageInfo(row),
      createdAt,
      updatedAt,
      publishedAt: normaliseTimestamp(row.published_at),
      archivedAt: normaliseTimestamp(row.archived_at),
      createdByName: normaliseNullableField(row.created_by_name),
      updatedByName: normaliseNullableField(row.updated_by_name),
      publishedByName: normaliseNullableField(row.published_by_name),
    }]
  })
}

function buildRegistryOrderClause(sort: AdminAssessmentRegistryFilters['sort']): string {
  switch (sort) {
    case 'updated_asc':
      return 'ad.updated_at asc, lower(ad.name) asc'
    case 'name_asc':
      return 'lower(ad.name) asc, ad.updated_at desc'
    case 'name_desc':
      return 'lower(ad.name) desc, ad.updated_at desc'
    default:
      return 'ad.updated_at desc, lower(ad.name) asc'
  }
}

export async function getAdminAssessmentRegistryData(
  searchParams?: Record<string, string | string[] | undefined>,
): Promise<AdminAssessmentRegistryData> {
  const filters = getAdminAssessmentRegistryFilters(searchParams)
  const params = [
    filters.lifecycle === 'all' ? null : filters.lifecycle,
    filters.category === 'all' ? null : filters.category,
    toPattern(filters.query),
    filters.pageSize,
    (filters.page - 1) * filters.pageSize,
  ]
  const orderClause = buildRegistryOrderClause(filters.sort)

  const baseQuery = `
    with version_stats as (
      select
        av.assessment_definition_id,
        count(*)::int as version_count,
        max(av.updated_at) as latest_version_updated_at,
        max(av.version_label) filter (where av.lifecycle_status = 'published') as current_published_version_label
      from assessment_versions av
      group by av.assessment_definition_id
    )
  `

  const whereClause = `
    from assessment_definitions ad
    left join version_stats vs on vs.assessment_definition_id = ad.id
    where ($1::text is null or ad.lifecycle_status = $1::text)
      and ($2::text is null or ad.category = $2::text)
      and (
        $3::text is null
        or ad.name ilike $3 escape '\\'
        or ad.key ilike $3 escape '\\'
        or ad.slug ilike $3 escape '\\'
        or coalesce(ad.description, '') ilike $3 escape '\\'
      )
  `

  const [rowsResult, countResult] = await Promise.all([
    queryDb<AssessmentRegistryRow>(
      `${baseQuery}
       select
         ad.id,
         ad.key,
         ad.slug,
         ad.name,
         ad.category,
         ad.description,
         ad.lifecycle_status,
         coalesce(current_version.version_label, vs.current_published_version_label) as current_published_version_label,
         coalesce(vs.version_count, 0) as version_count,
         ad.created_at,
         ad.updated_at
       ${whereClause}
       left join assessment_versions current_version on current_version.id = ad.current_published_version_id
       order by ${orderClause}
       limit $4
       offset $5`,
      params,
    ),
    queryDb<{ total_count: number | string | null }>(
      `${baseQuery}
       select count(*)::int as total_count
       ${whereClause}`,
      params.slice(0, 3),
    ),
  ])

  const entries = mapAssessmentRegistryRows(rowsResult.rows ?? [])
  const totalCount = normaliseCount(countResult.rows[0]?.total_count)
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize))
  const page = Math.min(filters.page, totalPages)

  return {
    filters: { ...filters, page },
    entries,
    pagination: {
      page,
      pageSize: filters.pageSize,
      totalCount,
      totalPages,
      hasPreviousPage: page > 1,
      hasNextPage: page < totalPages,
      windowStart: totalCount === 0 ? 0 : (page - 1) * filters.pageSize + 1,
      windowEnd: totalCount === 0 ? 0 : Math.min(totalCount, (page - 1) * filters.pageSize + entries.length),
    },
  }
}

export async function getAdminAssessmentDetailData(assessmentId: string): Promise<AdminAssessmentDetailData | null> {
  const [summaryResult, versionsResult, activity] = await Promise.all([
    queryDb<AssessmentSummaryRow>(
      `select
         ad.id,
         ad.key,
         ad.slug,
         ad.name,
         ad.category,
         ad.description,
         ad.lifecycle_status,
         ad.current_published_version_id,
         current_version.version_label as current_published_version_label,
         ad.created_at,
         ad.updated_at
       from assessment_definitions ad
       left join assessment_versions current_version on current_version.id = ad.current_published_version_id
       where ad.id = $1
       limit 1`,
      [assessmentId],
    ),
    queryDb<AssessmentVersionRow>(
      `select
         av.id,
         av.assessment_definition_id,
         av.version_label,
         av.lifecycle_status,
         av.source_type,
         av.notes,
         (av.definition_payload is not null) as has_definition_payload,
         av.validation_status,
         av.package_status,
         av.package_schema_version,
         av.package_source_type,
         av.package_imported_at,
         av.package_source_filename,
         package_imported_by.full_name as package_imported_by_name,
         av.package_validation_report_json,
         av.created_at,
         av.updated_at,
         av.published_at,
         av.archived_at,
         created_by.full_name as created_by_name,
         updated_by.full_name as updated_by_name,
         published_by.full_name as published_by_name
       from assessment_versions av
       left join admin_identities created_by on created_by.id = av.created_by_identity_id
       left join admin_identities updated_by on updated_by.id = av.updated_by_identity_id
       left join admin_identities published_by on published_by.id = av.published_by_identity_id
       left join admin_identities package_imported_by on package_imported_by.id = av.package_imported_by_identity_id
       where av.assessment_definition_id = $1
       order by
         case av.lifecycle_status when 'published' then 0 when 'draft' then 1 else 2 end,
         av.updated_at desc,
         av.version_label desc`,
      [assessmentId],
    ),
    getScopedAdminAuditActivity({ entityType: 'assessment', entityId: assessmentId, includeSecondaryEntityType: 'assessment_version', limit: 40 }),
  ])

  const assessment = mapAssessmentSummaryRow(summaryResult.rows[0])

  if (!assessment) {
    return null
  }

  const versions = mapAssessmentVersionRows(versionsResult.rows ?? [])
  const latestDraft = versions.find((version) => version.lifecycleStatus === 'draft') ?? null
  const latestPublished = versions.find((version) => version.lifecycleStatus === 'published') ?? null
  const latestVersionUpdatedAt = versions[0]?.updatedAt ?? null

  return {
    assessment,
    versions,
    activity: mapScopedAuditEventsToAssessmentActivity(activity),
    diagnostics: {
      versionCount: versions.length,
      draftCount: versions.filter((version) => version.lifecycleStatus === 'draft').length,
      archivedCount: versions.filter((version) => version.lifecycleStatus === 'archived').length,
      latestDraftVersionLabel: latestDraft?.versionLabel ?? null,
      latestPublishedVersionLabel: latestPublished?.versionLabel ?? null,
      latestVersionUpdatedAt,
    },
  }
}

async function writeAssessmentAuditEvent(
  client: PoolClient,
  input: {
    createId: () => string
    actor: ActorRow | null
    nowIso: string
    eventType: string
    summary: string
    assessmentId: string
    assessmentName: string
    versionId?: string | null
    versionLabel?: string | null
    metadata?: Record<string, unknown>
  },
) {
  if (!input.actor) {
    return
  }

  await client.query(
    `insert into access_audit_events (
       id,
       identity_id,
       organisation_id,
       event_type,
       event_summary,
       actor_name,
       actor_identity_id,
       happened_at,
       metadata,
       entity_type,
       entity_id,
       entity_label,
       entity_secondary
     )
     values ($1, null, null, $2, $3, $4, $5, $6::timestamptz, $7::jsonb, $8, $9, $10, $11)`,
    [
      input.createId(),
      input.eventType,
      input.summary,
      input.actor.full_name,
      input.actor.id,
      input.nowIso,
      JSON.stringify(input.metadata ?? {}),
      input.versionId ? 'assessment_version' : 'assessment',
      input.versionId ?? input.assessmentId,
      input.versionId ? `${input.assessmentName} v${input.versionLabel ?? 'unknown'}` : input.assessmentName,
      input.versionId ? input.assessmentId : input.versionLabel ?? null,
    ],
  )

  if (input.versionId) {
    await client.query(
      `insert into access_audit_events (
         id,
         identity_id,
         organisation_id,
         event_type,
         event_summary,
         actor_name,
         actor_identity_id,
         happened_at,
         metadata,
         entity_type,
         entity_id,
         entity_label,
         entity_secondary
       )
       values ($1, null, null, $2, $3, $4, $5, $6::timestamptz, $7::jsonb, 'assessment', $8, $9, $10)`,
      [
        input.createId(),
        input.eventType,
        input.summary,
        input.actor.full_name,
        input.actor.id,
        input.nowIso,
        JSON.stringify({ ...(input.metadata ?? {}), relatedVersionId: input.versionId, relatedVersionLabel: input.versionLabel }),
        input.assessmentId,
        input.assessmentName,
        input.versionLabel ?? null,
      ],
    )
  }
}

function buildPackageValidationReport(input: {
  summary: SonartraAssessmentPackageSummary
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
}) {
  return {
    summary: input.summary,
    errors: input.errors,
    warnings: input.warnings,
  }
}

export async function createAdminAssessment(
  input: AdminCreateAssessmentInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminCreateAssessmentResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const fieldErrors = validateAssessmentInput(input)
  if (fieldErrors) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Review the highlighted fields and try again.',
      fieldErrors,
    }
  }

  const nowIso = deps.now().toISOString()
  const name = normaliseWhitespace(input.name)
  const key = normaliseIdentifier(input.key)
  const slug = normaliseSlug(input.slug || input.key)
  const category = normaliseIdentifier(input.category)
  const description = normaliseNullableField(input.description)

  const [keyConflict, slugConflict] = await Promise.all([
    deps.queryDb<{ id: string }>('select id from assessment_definitions where key = $1 limit 1', [key]),
    deps.queryDb<{ id: string }>('select id from assessment_definitions where slug = $1 limit 1', [slug]),
  ])

  if (keyConflict.rows[0]) {
    return {
      ok: false,
      code: 'duplicate_key',
      message: 'This library key is already assigned to another assessment.',
      fieldErrors: { key: 'This library key is already assigned to another assessment.' },
    }
  }

  if (slugConflict.rows[0]) {
    return {
      ok: false,
      code: 'duplicate_slug',
      message: 'This slug is already assigned to another assessment.',
      fieldErrors: { slug: 'This slug is already assigned to another assessment.' },
    }
  }

  try {
    const created = await deps.withTransaction(async (client) => {
      const actor = await deps.getActorIdentity(client)
      const assessmentId = deps.createId()
      await client.query(
        `insert into assessment_definitions (
           id,
           key,
           slug,
           name,
           category,
           description,
           lifecycle_status,
           created_by_identity_id,
           updated_by_identity_id,
           created_at,
           updated_at
         )
         values ($1, $2, $3, $4, $5, $6, 'draft', $7, $7, $8::timestamptz, $8::timestamptz)`,
        [assessmentId, key, slug, name, category, description, actor?.id ?? null, nowIso],
      )

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_created',
        summary: `Assessment record ${name} created in draft state.`,
        assessmentId,
        assessmentName: name,
        metadata: { key, slug, category, lifecycleStatus: 'draft' },
      })

      return assessmentId
    })

    return {
      ok: true,
      code: 'created',
      message: 'Assessment created successfully.',
      assessmentId: created,
    }
  } catch (error) {
    console.error('[admin-assessment-management] Failed to create assessment.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

export async function createAdminAssessmentDraftVersion(
  input: AdminCreateAssessmentDraftVersionInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentVersionMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const fieldErrors = validateDraftVersionInput(input)
  if (fieldErrors) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Review the highlighted fields and try again.',
      fieldErrors,
    }
  }

  try {
    return await deps.withTransaction(async (client) => {
      const assessmentResult = await client.query<{ id: string; name: string }>(
        'select id, name from assessment_definitions where id = $1 limit 1',
        [input.assessmentId],
      )
      const assessment = assessmentResult.rows[0]

      if (!assessment) {
        return {
          ok: false,
          code: 'not_found',
          message: 'Assessment not found.',
        }
      }

      const duplicate = await client.query<{ id: string }>(
        `select id from assessment_versions where assessment_definition_id = $1 and version_label = $2 limit 1`,
        [input.assessmentId, normaliseWhitespace(input.versionLabel)],
      )

      if (duplicate.rows[0]) {
        return {
          ok: false,
          code: 'duplicate_version_label',
          message: 'This version label already exists for the assessment.',
          fieldErrors: { versionLabel: 'This version label already exists for the assessment.' },
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      const versionId = deps.createId()
      const versionLabel = normaliseWhitespace(input.versionLabel)
      const notes = normaliseNullableField(input.notes)
      const versionKey = `${normaliseIdentifier(assessment.name).replace(/[^a-z0-9]+/g, '-') || assessment.id}-v${versionLabel}`

      await client.query(
        `insert into assessment_versions (
           id,
           assessment_definition_id,
           key,
           name,
           description,
           total_questions,
           is_active,
           version_label,
           lifecycle_status,
           notes,
           source_type,
           created_by_identity_id,
           updated_by_identity_id,
           created_at,
           updated_at
         )
         values ($1, $2, $3, $4, null, 80, false, $5, 'draft', $6, 'manual', $7, $7, $8::timestamptz, $8::timestamptz)`,
        [versionId, input.assessmentId, versionKey, assessment.name, versionLabel, notes, actor?.id ?? null, nowIso],
      )

      await client.query(
        `update assessment_definitions
         set updated_at = $2::timestamptz,
             updated_by_identity_id = $3
         where id = $1`,
        [input.assessmentId, nowIso, actor?.id ?? null],
      )

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_version_created',
        summary: `Draft version ${versionLabel} created for ${assessment.name}.`,
        assessmentId: input.assessmentId,
        assessmentName: assessment.name,
        versionId,
        versionLabel,
        metadata: { lifecycleStatus: 'draft', sourceType: 'manual', notes },
      })

      return {
        ok: true,
        code: 'created',
        message: 'Draft version created successfully.',
        assessmentId: input.assessmentId,
        versionId,
      }
    })
  } catch (error) {
    console.error('[admin-assessment-management] Failed to create draft version.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

export async function importAdminAssessmentPackage(
  input: AdminAssessmentPackageImportInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentPackageImportResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const packageText = normaliseWhitespace(input.packageText)
  if (!packageText) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Paste a package payload or upload a JSON file before importing.',
      fieldErrors: {
        packageText: 'Package JSON is required.',
        packageFile: 'Package JSON is required.',
      },
    }
  }

  let parsedPayload: unknown
  try {
    parsedPayload = JSON.parse(packageText)
  } catch {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Package JSON could not be parsed.',
      fieldErrors: { packageText: 'Malformed JSON. Fix the payload and try again.' },
      validationResult: {
        errors: [{ path: '$', message: 'Malformed JSON.' }],
        warnings: [],
      },
    }
  }

  const validation = validateSonartraAssessmentPackage(parsedPayload)
  const validationReport = buildPackageValidationReport(validation)
  const validationStatus = validation.status === 'valid_with_warnings' ? 'valid_with_warnings' : validation.status

  try {
    return await deps.withTransaction(async (client) => {
      const versionResult = await client.query<{
        id: string
        assessment_definition_id: string
        version_label: string
        lifecycle_status: string
        updated_at: string | Date
        assessment_name: string
        package_status: string | null
      }>(
        `select
           av.id,
           av.assessment_definition_id,
           av.version_label,
           av.lifecycle_status,
           av.updated_at,
           av.package_status,
           ad.name as assessment_name
         from assessment_versions av
         inner join assessment_definitions ad on ad.id = av.assessment_definition_id
         where av.id = $1
           and av.assessment_definition_id = $2
         limit 1`,
        [input.versionId, input.assessmentId],
      )
      const version = versionResult.rows[0]

      if (!version) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }

      if (version.lifecycle_status !== 'draft') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: 'Packages can only be imported into draft versions.',
        }
      }

      if (input.expectedUpdatedAt && normaliseTimestamp(version.updated_at) !== input.expectedUpdatedAt) {
        return {
          ok: false,
          code: 'concurrent_update',
          message: 'This version changed before the package import could be applied. Reload and try again.',
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      const packageStatus = validation.status

      await client.query(
        `update assessment_versions
         set definition_payload = $3::jsonb,
             package_raw_payload = $4::jsonb,
             package_schema_version = $5,
             package_status = $6,
             package_source_type = 'manual_import',
             package_source_filename = $7,
             package_imported_at = $8::timestamptz,
             package_imported_by_identity_id = $9,
             package_validation_report_json = $10::jsonb,
             source_type = 'import',
             validation_status = $11,
             updated_at = $8::timestamptz,
             updated_by_identity_id = $9
         where id = $1
           and assessment_definition_id = $2`,
        [
          input.versionId,
          input.assessmentId,
          validation.normalizedPackage ? JSON.stringify(validation.normalizedPackage) : null,
          JSON.stringify(parsedPayload),
          validation.schemaVersion ?? SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1,
          packageStatus,
          normaliseNullableField(input.sourceFilename),
          nowIso,
          actor?.id ?? null,
          JSON.stringify(validationReport),
          validationStatus,
        ],
      )

      await client.query(
        `update assessment_definitions
         set updated_at = $2::timestamptz,
             updated_by_identity_id = $3
         where id = $1`,
        [input.assessmentId, nowIso, actor?.id ?? null],
      )

      if (!validation.ok) {
        await writeAssessmentAuditEvent(client, {
          createId: deps.createId,
          actor,
          nowIso,
          eventType: 'assessment_package_validation_failed',
          summary: `Assessment package import failed validation for ${version.assessment_name} v${version.version_label}.`,
          assessmentId: input.assessmentId,
          assessmentName: version.assessment_name,
          versionId: input.versionId,
          versionLabel: version.version_label,
          metadata: { packageStatus, errors: validation.errors.length, warnings: validation.warnings.length },
        })

        return {
          ok: false,
          code: 'validation_error',
          message: 'Package validation failed. Review the validation results and re-import.',
          assessmentId: input.assessmentId,
          versionId: input.versionId,
          validationResult: { errors: validation.errors, warnings: validation.warnings },
        }
      }

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: version.package_status && version.package_status !== 'missing' ? 'assessment_package_replaced' : 'assessment_package_imported',
        summary: `${version.package_status && version.package_status !== 'missing' ? 'Assessment package replaced' : 'Assessment package imported'} for ${version.assessment_name} v${version.version_label}.`,
        assessmentId: input.assessmentId,
        assessmentName: version.assessment_name,
        versionId: input.versionId,
        versionLabel: version.version_label,
        metadata: {
          packageStatus,
          schemaVersion: validation.schemaVersion,
          warnings: validation.warnings.length,
          sourceFilename: normaliseNullableField(input.sourceFilename),
        },
      })

      return {
        ok: true,
        code: 'imported',
        message: validation.warnings.length > 0
          ? 'Package imported with warnings. Publish remains allowed, but review the warnings first.'
          : 'Package imported successfully.',
        assessmentId: input.assessmentId,
        versionId: input.versionId,
        validationResult: { errors: validation.errors, warnings: validation.warnings },
      }
    })
  } catch (error) {
    console.error('[admin-assessment-management] Failed to import assessment package.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

export async function publishAdminAssessmentVersion(
  input: VersionTransitionInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentVersionMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  try {
    return await deps.withTransaction(async (client) => {
      const versionResult = await client.query<{
        id: string
        assessment_definition_id: string
        version_label: string
        lifecycle_status: string
        updated_at: string | Date
        assessment_name: string
        package_status: string | null
      }>(
        `select
           av.id,
           av.assessment_definition_id,
           av.version_label,
           av.lifecycle_status,
           av.updated_at,
           av.package_status,
           ad.name as assessment_name
         from assessment_versions av
         inner join assessment_definitions ad on ad.id = av.assessment_definition_id
         where av.id = $1
           and av.assessment_definition_id = $2
         limit 1`,
        [input.versionId, input.assessmentId],
      )
      const version = versionResult.rows[0]

      if (!version) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }

      if (version.lifecycle_status !== 'draft') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: 'Only draft versions can be published.',
        }
      }

      if (input.expectedUpdatedAt && normaliseTimestamp(version.updated_at) !== input.expectedUpdatedAt) {
        return {
          ok: false,
          code: 'concurrent_update',
          message: 'This version changed before it could be published. Reload the page and try again.',
        }
      }

      if (version.package_status !== 'valid' && version.package_status !== 'valid_with_warnings') {
        const actor = await deps.getActorIdentity(client)
        const nowIso = deps.now().toISOString()

        await writeAssessmentAuditEvent(client, {
          createId: deps.createId,
          actor,
          nowIso,
          eventType: 'assessment_publish_blocked_invalid_package',
          summary: `Publish blocked for ${version.assessment_name} v${version.version_label} because the attached package is missing or invalid.`,
          assessmentId: input.assessmentId,
          assessmentName: version.assessment_name,
          versionId: input.versionId,
          versionLabel: version.version_label,
          metadata: { packageStatus: version.package_status ?? 'missing' },
        })

        return {
          ok: false,
          code: 'invalid_transition',
          message: 'A draft version can only be published after a valid package is attached. Import a valid package first.',
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()

      await client.query(
        `update assessment_versions
         set lifecycle_status = 'archived',
             archived_at = case when lifecycle_status = 'published' then $2::timestamptz else archived_at end,
             updated_at = $2::timestamptz,
             updated_by_identity_id = $3
         where assessment_definition_id = $1
           and lifecycle_status = 'published'`,
        [input.assessmentId, nowIso, actor?.id ?? null],
      )

      const publishResult = await client.query(
        `update assessment_versions
         set lifecycle_status = 'published',
             is_active = true,
             published_at = $3::timestamptz,
             archived_at = null,
             updated_at = $3::timestamptz,
             updated_by_identity_id = $4,
             published_by_identity_id = $4
         where id = $1
           and assessment_definition_id = $2
         returning id`,
        [input.versionId, input.assessmentId, nowIso, actor?.id ?? null],
      )

      if (!publishResult.rows[0]) {
        return {
          ok: false,
          code: 'concurrent_update',
          message: 'The version could not be published because it changed mid-flight.',
        }
      }

      await client.query(
        `update assessment_definitions
         set lifecycle_status = 'published',
             current_published_version_id = $2,
             updated_at = $3::timestamptz,
             updated_by_identity_id = $4
         where id = $1`,
        [input.assessmentId, input.versionId, nowIso, actor?.id ?? null],
      )

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_version_published',
        summary: `Version ${version.version_label} published for ${version.assessment_name}.`,
        assessmentId: input.assessmentId,
        assessmentName: version.assessment_name,
        versionId: input.versionId,
        versionLabel: version.version_label,
        metadata: { lifecycleStatus: 'published' },
      })

      return {
        ok: true,
        code: 'published',
        message: 'Version published successfully.',
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }
    })
  } catch (error) {
    console.error('[admin-assessment-management] Failed to publish version.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

export async function archiveAdminAssessmentVersion(
  input: VersionTransitionInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentVersionMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  if (input.confirmation !== 'confirm') {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Confirm the archive action before continuing.',
      fieldErrors: { confirmation: 'Tick the confirmation checkbox before archiving a version.' },
    }
  }

  try {
    return await deps.withTransaction(async (client) => {
      const versionResult = await client.query<{
        id: string
        assessment_definition_id: string
        version_label: string
        lifecycle_status: string
        updated_at: string | Date
        assessment_name: string
      }>(
        `select
           av.id,
           av.assessment_definition_id,
           av.version_label,
           av.lifecycle_status,
           av.updated_at,
           ad.name as assessment_name
         from assessment_versions av
         inner join assessment_definitions ad on ad.id = av.assessment_definition_id
         where av.id = $1
           and av.assessment_definition_id = $2
         limit 1`,
        [input.versionId, input.assessmentId],
      )
      const version = versionResult.rows[0]

      if (!version) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }

      if (version.lifecycle_status === 'archived') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: 'This version is already archived.',
        }
      }

      if (input.expectedUpdatedAt && normaliseTimestamp(version.updated_at) !== input.expectedUpdatedAt) {
        return {
          ok: false,
          code: 'concurrent_update',
          message: 'This version changed before it could be archived. Reload the page and try again.',
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()

      await client.query(
        `update assessment_versions
         set lifecycle_status = 'archived',
             is_active = false,
             archived_at = $3::timestamptz,
             updated_at = $3::timestamptz,
             updated_by_identity_id = $4
         where id = $1
           and assessment_definition_id = $2`,
        [input.versionId, input.assessmentId, nowIso, actor?.id ?? null],
      )

      await client.query(
        `update assessment_definitions
         set lifecycle_status = case when current_published_version_id = $2 then 'draft' else lifecycle_status end,
             current_published_version_id = case when current_published_version_id = $2 then null else current_published_version_id end,
             updated_at = $3::timestamptz,
             updated_by_identity_id = $4
         where id = $1`,
        [input.assessmentId, input.versionId, nowIso, actor?.id ?? null],
      )

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_version_archived',
        summary: `Version ${version.version_label} archived for ${version.assessment_name}.`,
        assessmentId: input.assessmentId,
        assessmentName: version.assessment_name,
        versionId: input.versionId,
        versionLabel: version.version_label,
        metadata: { lifecycleStatus: 'archived' },
      })

      return {
        ok: true,
        code: 'archived',
        message: 'Version archived successfully.',
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }
    })
  } catch (error) {
    console.error('[admin-assessment-management] Failed to archive version.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

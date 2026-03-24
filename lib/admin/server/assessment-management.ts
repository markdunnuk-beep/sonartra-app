import { auth, currentUser } from '@clerk/nextjs/server'
import type { PoolClient } from 'pg'
import { resolveAdminAccess, type AdminAccessContext } from '@/lib/admin/access'
import {
  ADMIN_ASSESSMENT_IDENTITY_MUTABILITY_RULES,
  type AdminAssessmentImportReviewContract,
  type AdminAssessmentPackageCreateOrAttachState,
  getAdminAssessmentRegistryFilters,
  type AssessmentImportConflict,
  type AdminAssessmentCreateState,
  type AdminAssessmentDetailData,
  type AdminAssessmentLatestSuiteSnapshot,
  type AdminAssessmentLifecycleStatus,
  type AdminAssessmentReleaseGovernance,
  type AdminAssessmentReleaseReadinessStatus,
  type AdminAssessmentReleaseSignOffStatus,
  type AdminAssessmentRegistryData,
  type AdminAssessmentRegistryFilters,
  type AdminAssessmentRegistryItem,
  type AdminAssessmentRegistryNotice,
  type AdminAssessmentSavedScenarioRecord,
  type AdminAssessmentVersionMutationState,
  type AdminAssessmentVersionRecord,
} from '@/lib/admin/domain/assessment-management'
import {
  SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1,
  type AdminAssessmentPackageDetectedVersion,
  type AdminAssessmentVersionPackageInfo,
  type AssessmentPackageStatus,
  type SonartraAssessmentPackageSummary,
  type SonartraAssessmentPackageValidationIssue,
  parseStoredNormalizedAssessmentPackage,
} from '@/lib/admin/domain/assessment-package'
import {
  classifyPackageContract,
  extractAssessmentPackageIdentity,
  importAssessmentPackagePayload,
  type AdminAssessmentPackageValidationSummary,
} from '@/lib/admin/server/assessment-package-import'
import { deriveReadinessState } from '@/lib/admin/domain/assessment-readiness'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, parseStoredValidatedAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2'
import { getAdminAssessmentVersionReadiness } from '@/lib/admin/domain/assessment-package-review'
import { evaluatePackageV2LiveRuntimeSupport } from '@/lib/package-contract-v2-live-runtime'
import {
  executeAdminAssessmentSimulationForPackage,
  getAdminAssessmentSimulationWorkspaceStatus,
  parseAdminAssessmentSimulationPayloadForPackage,
  type AdminAssessmentSimulationActionState,
} from '@/lib/admin/domain/assessment-simulation'
import { queryDb, withTransaction, describeDatabaseError, logDatabaseError, logDatabaseSessionDiagnostics } from '@/lib/db'
import { getScopedAdminAuditActivity, mapScopedAuditEventsToAssessmentActivity } from '@/lib/admin/server/audit-workspace'
import {
  ASSESSMENT_VERSION_REGRESSION_SNAPSHOT_COLUMNS,
  ASSESSMENT_VERSION_RELEASE_NOTES_COLUMNS,
  ASSESSMENT_VERSION_RELEASE_READINESS_COLUMNS,
  ASSESSMENT_VERSION_RELEASE_SIGN_OFF_COLUMNS,
  getAdminAssessmentVersionSchemaCapabilities,
  hasAssessmentVersionPackageColumn,
  hasAssessmentVersionOptionalGovernanceAndRegressionColumn,
} from '@/lib/admin/server/assessment-version-schema-capabilities'
import {
  buildAssessmentVersionByIdQuery,
  buildAssessmentVersionDetailQuery,
  buildAssessmentVersionSelectQuery,
} from '@/lib/admin/server/assessment-version-detail-sql'
import {
  getAssessmentRuntimeExecutableIssues,
  materializeAssessmentRuntimeFromPackage,
} from '@/lib/admin/server/assessment-runtime-materialization'
import {
  getAdminAssessmentRuntimeSchemaCapabilities,
  getMissingAssessmentRuntimeColumns,
  getMissingAssessmentRuntimeTables,
} from '@/lib/admin/server/assessment-runtime-schema-capabilities'

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

interface AssessmentRegistrySummaryRow {
  published_count: number | string | null
  draft_count: number | string | null
  archived_count: number | string | null
}

interface AssessmentIdentityRow {
  id: string | null
  key: string | null
  slug: string | null
  name: string | null
  category: string | null
  description: string | null
}

interface AssessmentVersionRow {
  id: string | null
  assessment_definition_id: string | null
  version_label: string | null
  lifecycle_status: string | null
  source_type: string | null
  notes: string | null
  has_definition_payload: boolean | null
  definition_payload: unknown
  validation_status: string | null
  package_status: string | null
  package_schema_version: string | null
  package_source_type: string | null
  package_imported_at: string | Date | null
  package_source_filename: string | null
  package_imported_by_name: string | null
  package_validation_report_json: unknown
  publish_readiness_status: string | null
  readiness_check_summary_json: unknown
  last_readiness_evaluated_at: string | Date | null
  sign_off_status: string | null
  sign_off_at: string | Date | null
  sign_off_by_name: string | null
  sign_off_material_updated_at: string | Date | null
  release_notes: string | null
  material_updated_at: string | Date | null
  created_at: string | Date | null
  updated_at: string | Date | null
  published_at: string | Date | null
  archived_at: string | Date | null
  created_by_name: string | null
  updated_by_name: string | null
  published_by_name: string | null
  latest_regression_suite_snapshot_json: unknown
}

interface AssessmentSavedScenarioRow {
  id: string | null
  assessment_version_id: string | null
  version_label: string | null
  name: string | null
  description: string | null
  scenario_payload: unknown
  status: string | null
  source_version_id: string | null
  source_version_label: string | null
  source_scenario_id: string | null
  provenance_json: unknown
  created_at: string | Date | null
  updated_at: string | Date | null
  archived_at: string | Date | null
  created_by_name: string | null
  updated_by_name: string | null
}

interface ActorRow {
  id: string
  email: string
  full_name: string
}

interface AssessmentRegistryQueryDependencies {
  queryDb: typeof queryDb
}

interface AssessmentDetailQueryDependencies {
  queryDb: typeof queryDb
  getScopedAdminAuditActivity: typeof getScopedAdminAuditActivity
  getAssessmentVersionSchemaCapabilities: typeof getAdminAssessmentVersionSchemaCapabilities
}

const defaultAssessmentRegistryQueryDependencies: AssessmentRegistryQueryDependencies = {
  queryDb,
}

const defaultAssessmentDetailQueryDependencies: AssessmentDetailQueryDependencies = {
  queryDb,
  getScopedAdminAuditActivity,
  getAssessmentVersionSchemaCapabilities: getAdminAssessmentVersionSchemaCapabilities,
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
    | 'schema_incompatible'
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
    | 'conflict'
    | 'schema_incompatible'
    | 'validation_error'
    | 'permission_denied'
    | 'not_found'
    | 'invalid_transition'
    | 'concurrent_update'
    | 'unknown_error'
  message: string
  assessmentId?: string
  versionId?: string
  validationResult?: AdminAssessmentPackageValidationSummary
  fieldErrors?: {
    packageText?: string
    packageFile?: string
  }
}

export interface AdminAssessmentPackageCreateOrAttachInput {
  packageText: string
  sourceFilename?: string | null
  confirmation?: 'confirm'
}

export interface AdminAssessmentPackageCreateOrAttachResult {
  ok: boolean
  code:
    | 'review_required'
    | 'imported'
    | 'conflict'
    | 'schema_incompatible'
    | 'validation_error'
    | 'permission_denied'
    | 'unknown_error'
  message: string
  assessmentId?: string
  versionId?: string
  versionLabel?: string | null
  review?: AdminAssessmentImportReviewContract
  fieldErrors?: {
    packageText?: string
    packageFile?: string
  }
}

export interface AdminAssessmentVersionSimulationInput {
  assessmentId: string
  versionId: string
  responsePayload: string
}

export interface AdminAssessmentVersionSimulationResult {
  ok: boolean
  code: 'simulated' | 'validation_error' | 'blocked' | 'permission_denied' | 'not_found' | 'unknown_error'
  message: string
  state: AdminAssessmentSimulationActionState
}

export interface AdminAssessmentScenarioImportInput {
  assessmentId: string
  targetVersionId: string
  sourceVersionId?: string | null
}

export interface AdminAssessmentScenarioCloneInput {
  assessmentId: string
  targetVersionId: string
  sourceScenarioId: string
}

export interface AdminAssessmentScenarioImportResult {
  ok: boolean
  code: 'imported' | 'schema_incompatible' | 'validation_error' | 'permission_denied' | 'not_found' | 'invalid_transition' | 'unknown_error'
  message: string
  sourceVersionLabel: string | null
  importedCount: number
  skippedCount: number
  importedNames: string[]
  skipped: Array<{ name: string; reason: string }>
}

export interface AdminAssessmentScenarioSuiteRunInput {
  assessmentId: string
  versionId: string
  baselineVersionId?: string | null
}

export interface AdminAssessmentScenarioSuiteRunResult {
  ok: boolean
  code: 'completed' | 'schema_incompatible' | 'validation_error' | 'permission_denied' | 'not_found' | 'invalid_transition' | 'unknown_error'
  message: string
  snapshot?: AdminAssessmentLatestSuiteSnapshot | null
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
  getAssessmentVersionSchemaCapabilities: typeof getAdminAssessmentVersionSchemaCapabilities
  now: () => Date
  createId: () => string
}

const defaultDependencies: AssessmentMutationDependencies = {
  resolveAdminAccess: () => resolveAdminAccess(),
  getActorIdentity: ensureAdminAuditActor,
  queryDb,
  withTransaction,
  getAssessmentVersionSchemaCapabilities: getAdminAssessmentVersionSchemaCapabilities,
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

function isReleaseReadinessStatus(value: string | null | undefined): value is AdminAssessmentReleaseReadinessStatus {
  return value === 'not_ready' || value === 'ready_with_warnings' || value === 'ready'
}

function isReleaseSignOffStatus(value: string | null | undefined): value is AdminAssessmentReleaseSignOffStatus {
  return value === 'unsigned' || value === 'signed_off'
}

function mapStoredReleaseGovernance(
  row: Pick<AssessmentVersionRow, 'publish_readiness_status' | 'readiness_check_summary_json' | 'last_readiness_evaluated_at' | 'sign_off_status' | 'sign_off_at' | 'sign_off_by_name' | 'sign_off_material_updated_at' | 'release_notes' | 'material_updated_at'>,
): Pick<AdminAssessmentVersionRecord, 'releaseGovernance' | 'materialUpdatedAt'> {
  const materialUpdatedAt = normaliseTimestamp(row.material_updated_at) ?? normaliseTimestamp(row.sign_off_material_updated_at) ?? new Date(0).toISOString()
  const storedSignOffStatus = isReleaseSignOffStatus(row.sign_off_status) ? row.sign_off_status : 'unsigned'
  const signOffMaterialUpdatedAt = normaliseTimestamp(row.sign_off_material_updated_at)
  const isStale = storedSignOffStatus === 'signed_off' && Boolean(signOffMaterialUpdatedAt) && signOffMaterialUpdatedAt !== materialUpdatedAt
  const signOffStatus: AdminAssessmentReleaseSignOffStatus = storedSignOffStatus === 'signed_off' && !isStale ? 'signed_off' : 'unsigned'
  const readinessStatus = isReleaseReadinessStatus(row.publish_readiness_status) ? row.publish_readiness_status : 'not_ready'
  const summary = parseJsonObject<Record<string, unknown>>(row.readiness_check_summary_json)

  return {
    materialUpdatedAt,
    releaseGovernance: {
      readinessStatus,
      readinessSummary: summary && Array.isArray(summary.checks) ? summary as unknown as AdminAssessmentReleaseGovernance['readinessSummary'] : null,
      lastReadinessEvaluatedAt: normaliseTimestamp(row.last_readiness_evaluated_at),
      signOff: {
        status: signOffStatus,
        signedOffBy: signOffStatus === 'signed_off' ? normaliseNullableField(row.sign_off_by_name) : null,
        signedOffAt: signOffStatus === 'signed_off' ? normaliseTimestamp(row.sign_off_at) : null,
        isStale,
        staleReason: isStale ? 'A material package update occurred after the version was signed off.' : null,
      },
      releaseNotes: normaliseNullableField(row.release_notes),
    },
  }
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
    packageName: normaliseNullableField((summary as Record<string, unknown>).packageName as string | null | undefined),
    versionLabel: normaliseNullableField((summary as Record<string, unknown>).versionLabel as string | null | undefined),
    assessmentKey: normaliseNullableField((summary as Record<string, unknown>).assessmentKey as string | null | undefined),
    sectionCount: normaliseCount((summary as Record<string, unknown>).sectionCount as number | string | null | undefined),
    derivedDimensionCount: normaliseCount((summary as Record<string, unknown>).derivedDimensionCount as number | string | null | undefined),
    responseModelCount: normaliseCount((summary as Record<string, unknown>).responseModelCount as number | string | null | undefined),
    transformCount: normaliseCount((summary as Record<string, unknown>).transformCount as number | string | null | undefined),
    integrityRuleCount: normaliseCount((summary as Record<string, unknown>).integrityRuleCount as number | string | null | undefined),
  }
}

function normaliseDetectedPackageVersion(value: unknown): AdminAssessmentPackageDetectedVersion | null {
  return value === 'legacy_v1' || value === 'package_contract_v2' || value === 'runtime_contract_v2' || value === 'hybrid_mvp_v1' || value === 'unknown'
    ? value
    : null
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
  const validationReport = parseJsonObject<Record<string, unknown>>(row.package_validation_report_json)
  return {
    status: isPackageStatus(row.package_status) ? row.package_status : 'missing',
    detectedVersion: normaliseDetectedPackageVersion(validationReport?.detectedVersion),
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

function isScenarioStatus(value: string | null | undefined): value is AdminAssessmentSavedScenarioRecord['status'] {
  return value === 'active' || value === 'archived'
}

function normaliseJsonString(value: unknown): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return null
  }
}

function mapLatestSuiteSnapshot(value: unknown): AdminAssessmentLatestSuiteSnapshot | null {
  const snapshot = parseJsonObject<Record<string, unknown>>(value)
  const executedAt = normaliseTimestamp(snapshot?.executedAt as string | Date | null | undefined)
  const overallStatus = snapshot?.overallStatus === 'pass' || snapshot?.overallStatus === 'warning' || snapshot?.overallStatus === 'fail'
    ? snapshot.overallStatus
    : null
  const summaryText = normaliseNullableField(snapshot?.summaryText as string | null | undefined)

  if (!executedAt || !overallStatus || !summaryText) {
    return null
  }

  return {
    executedAt,
    executedBy: normaliseNullableField(snapshot?.executedBy as string | null | undefined),
    baselineVersionId: normaliseNullableField(snapshot?.baselineVersionId as string | null | undefined),
    baselineVersionLabel: normaliseNullableField(snapshot?.baselineVersionLabel as string | null | undefined),
    totalScenarios: normaliseCount(snapshot?.totalScenarios as number | string | null | undefined),
    passedCount: normaliseCount(snapshot?.passedCount as number | string | null | undefined),
    warningCount: normaliseCount(snapshot?.warningCount as number | string | null | undefined),
    failedCount: normaliseCount(snapshot?.failedCount as number | string | null | undefined),
    overallStatus,
    summaryText,
  }
}

function mapSavedScenarioRows(rows: AssessmentSavedScenarioRow[]): Map<string, AdminAssessmentSavedScenarioRecord[]> {
  const scenariosByVersion = new Map<string, AdminAssessmentSavedScenarioRecord[]>()

  for (const row of rows ?? []) {
    const id = normaliseRequiredString(row.id)
    const versionId = normaliseRequiredString(row.assessment_version_id)
    const versionLabel = normaliseRequiredString(row.version_label)
    const name = normaliseRequiredString(row.name)
    const status = isScenarioStatus(row.status) ? row.status : null
    const payload = normaliseJsonString(row.scenario_payload)
    const createdAt = normaliseTimestamp(row.created_at)
    const updatedAt = normaliseTimestamp(row.updated_at)

    if (!id || !versionId || !versionLabel || !name || !status || !payload || !createdAt || !updatedAt) {
      continue
    }

    const provenance = parseJsonObject<Record<string, unknown>>(row.provenance_json)
    const scenario: AdminAssessmentSavedScenarioRecord = {
      id,
      versionId,
      versionLabel,
      name,
      description: normaliseNullableField(row.description),
      status,
      payload,
      sourceVersionId: normaliseNullableField(row.source_version_id),
      sourceVersionLabel: normaliseNullableField(row.source_version_label) ?? normaliseNullableField(provenance?.sourceVersionLabel as string | null | undefined),
      sourceScenarioId: normaliseNullableField(row.source_scenario_id),
      provenanceSummary: normaliseNullableField(provenance?.summary as string | null | undefined),
      createdAt,
      updatedAt,
      archivedAt: normaliseTimestamp(row.archived_at),
      createdByName: normaliseNullableField(row.created_by_name),
      updatedByName: normaliseNullableField(row.updated_by_name),
    }

    const current = scenariosByVersion.get(versionId) ?? []
    current.push(scenario)
    scenariosByVersion.set(versionId, current)
  }

  for (const [versionId, scenarios] of scenariosByVersion.entries()) {
    scenariosByVersion.set(versionId, scenarios.sort((left, right) => left.name.localeCompare(right.name)))
  }

  return scenariosByVersion
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
    fieldErrors.key = 'Assessment key is required.'
  } else if (!/^[a-z0-9]+(?:[_-][a-z0-9]+)*$/.test(key)) {
    fieldErrors.key = 'Assessment key must use lowercase letters, numbers, hyphens, or underscores only.'
  } else if (key.length > 100) {
    fieldErrors.key = 'Assessment key must be 100 characters or fewer.'
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

function validateReleaseNotesInput(releaseNotes: string): AdminAssessmentVersionMutationState['fieldErrors'] {
  const notes = normaliseWhitespace(releaseNotes)
  if (notes.length > 4000) {
    return { releaseNotes: 'Release notes must be 4000 characters or fewer.' }
  }

  return undefined
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

function mapAssessmentIdentityRow(row: AssessmentIdentityRow | undefined) {
  const id = normaliseRequiredString(row?.id)
  const key = normaliseRequiredString(row?.key)
  const slug = normaliseRequiredString(row?.slug)
  const name = normaliseRequiredString(row?.name)
  const category = normaliseRequiredString(row?.category)

  if (!id || !key || !slug || !name || !category) {
    return null
  }

  return {
    id,
    key,
    slug,
    name,
    category,
    description: normaliseNullableField(row?.description),
  }
}

function mapAssessmentVersionRowToDomain(
  row: AssessmentVersionRow,
  savedScenarios: AdminAssessmentSavedScenarioRecord[] = [],
): AdminAssessmentVersionRecord | null {
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
    return null
  }

  const governance = mapStoredReleaseGovernance(row)

  return {
    id,
    assessmentId,
    versionLabel,
    lifecycleStatus,
    sourceType,
    notes: normaliseNullableField(row.notes),
    hasDefinitionPayload: Boolean(row.has_definition_payload),
    validationStatus: normaliseNullableField(row.validation_status),
    packageInfo: mapPackageInfo(row),
    normalizedPackage: parseStoredNormalizedAssessmentPackage(row.definition_payload),
    storedDefinitionPayload: row.definition_payload ?? null,
    createdAt,
    updatedAt,
    publishedAt: normaliseTimestamp(row.published_at),
    archivedAt: normaliseTimestamp(row.archived_at),
    createdByName: normaliseNullableField(row.created_by_name),
    updatedByName: normaliseNullableField(row.updated_by_name),
    publishedByName: normaliseNullableField(row.published_by_name),
    latestSuiteSnapshot: mapLatestSuiteSnapshot(row.latest_regression_suite_snapshot_json),
    releaseGovernance: governance.releaseGovernance,
    materialUpdatedAt: governance.materialUpdatedAt,
    savedScenarios,
  }
}

export function mapAssessmentVersionRows(
  rows: AssessmentVersionRow[],
  scenariosByVersion: Map<string, AdminAssessmentSavedScenarioRecord[]> = new Map(),
): AdminAssessmentVersionRecord[] {
  return (rows ?? []).flatMap((row) => {
    const version = mapAssessmentVersionRowToDomain(row, scenariosByVersion.get(normaliseRequiredString(row.id) ?? '') ?? [])
    return version ? [version] : []
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

function buildAdminAssessmentRegistryData(
  filters: AdminAssessmentRegistryFilters,
  entries: AdminAssessmentRegistryItem[],
  totalCount: number,
  summary: AdminAssessmentRegistryData['summary'] = { publishedCount: 0, draftCount: 0, archivedCount: 0 },
  notice: AdminAssessmentRegistryNotice | null = null,
): AdminAssessmentRegistryData {
  const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize))
  const page = Math.min(filters.page, totalPages)

  return {
    filters: { ...filters, page },
    entries,
    summary,
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
    notice,
  }
}

function unwrapErrorCause(error: unknown): unknown {
  let current = error

  while (current && typeof current === 'object' && 'cause' in current) {
    const cause = (current as { cause?: unknown }).cause
    if (!cause) {
      break
    }

    current = cause
  }

  return current
}

function extractDatabaseFailureDetails(error: unknown): {
  code: string | null
  constraint: string | null
  table: string | null
  column: string | null
  detail: string | null
  message: string
} {
  const raw = unwrapErrorCause(error)
  const code = raw && typeof raw === 'object' && 'code' in raw && typeof (raw as { code?: unknown }).code === 'string'
    ? (raw as { code: string }).code
    : null
  const constraint = raw && typeof raw === 'object' && 'constraint' in raw && typeof (raw as { constraint?: unknown }).constraint === 'string'
    ? (raw as { constraint: string }).constraint
    : null
  const table = raw && typeof raw === 'object' && 'table' in raw && typeof (raw as { table?: unknown }).table === 'string'
    ? (raw as { table: string }).table
    : null
  const column = raw && typeof raw === 'object' && 'column' in raw && typeof (raw as { column?: unknown }).column === 'string'
    ? (raw as { column: string }).column
    : null
  const detail = raw && typeof raw === 'object' && 'detail' in raw && typeof (raw as { detail?: unknown }).detail === 'string'
    ? (raw as { detail: string }).detail
    : null
  const message = raw instanceof Error
    ? raw.message
    : typeof raw === 'object' && raw && 'message' in raw && typeof (raw as { message?: unknown }).message === 'string'
      ? (raw as { message: string }).message
      : error instanceof Error
        ? error.message
        : 'Unknown database error.'

  return { code, constraint, table, column, detail, message }
}

class AssessmentPublishStageError extends Error {
  stage: string
  metadata: Record<string, unknown>

  constructor(stage: string, metadata: Record<string, unknown>, cause: unknown) {
    super(`Publish stage failed: ${stage}`)
    this.name = 'AssessmentPublishStageError'
    this.stage = stage
    this.metadata = metadata
    this.cause = cause
  }
}

function findPublishStageFailure(error: unknown): { publishStage: string | null; publishMetadata: Record<string, unknown>; materializationStage: string | null; materializationMetadata: Record<string, unknown> } {
  let current = error
  let publishStage: string | null = null
  let materializationStage: string | null = null
  let publishMetadata: Record<string, unknown> = {}
  let materializationMetadata: Record<string, unknown> = {}

  while (current && typeof current === 'object') {
    if (!publishStage) {
      if (current instanceof AssessmentPublishStageError) {
        publishStage = current.stage
        publishMetadata = current.metadata
      } else if ((current as { name?: unknown }).name === 'AssessmentPublishStageError') {
        const stageError = current as { stage?: unknown; metadata?: unknown }
        publishStage = typeof stageError.stage === 'string' ? stageError.stage : null
        publishMetadata = stageError.metadata && typeof stageError.metadata === 'object'
          ? stageError.metadata as Record<string, unknown>
          : {}
      }
    }

    if (current instanceof Error && current.name === 'AssessmentRuntimeMaterializationStageError' && !materializationStage) {
      const runtimeStageError = current as Error & { stage?: unknown; metadata?: unknown }
      materializationStage = typeof runtimeStageError.stage === 'string' ? runtimeStageError.stage : null
      materializationMetadata = runtimeStageError.metadata && typeof runtimeStageError.metadata === 'object'
        ? runtimeStageError.metadata as Record<string, unknown>
        : {}
    }

    if (!('cause' in current)) {
      break
    }

    const cause = (current as { cause?: unknown }).cause
    if (!cause) {
      break
    }

    current = cause
  }

  return { publishStage, publishMetadata, materializationStage, materializationMetadata }
}

async function runPublishStage<T>(
  stage: string,
  metadata: Record<string, unknown>,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work()
  } catch (error) {
    const details = extractDatabaseFailureDetails(error)
    console.error('[admin-assessment-management] Publish stage failed.', {
      stage,
      postgresCode: details.code,
      constraint: details.constraint,
      table: details.table,
      column: details.column,
      detail: details.detail,
      message: details.message,
      ...metadata,
    })
    throw new AssessmentPublishStageError(stage, metadata, error)
  }
}

interface PublishOptionalSideEffectResult {
  stage: string
  status: 'applied' | 'skipped'
  reason?: 'schema_incompatible' | 'persistence_failure'
}

async function runOptionalPublishSideEffect(
  stage: string,
  metadata: Record<string, unknown>,
  work: () => Promise<void>,
): Promise<PublishOptionalSideEffectResult> {
  try {
    await work()
    return { stage, status: 'applied' }
  } catch (error) {
    const details = extractDatabaseFailureDetails(error)
    const reason = details.code === '42P01' || details.code === '42703' ? 'schema_incompatible' : 'persistence_failure'
    console.warn('[admin-assessment-management] Optional publish side effect skipped.', {
      stage,
      reason,
      postgresCode: details.code,
      constraint: details.constraint,
      table: details.table,
      column: details.column,
      detail: details.detail,
      message: details.message,
      ...metadata,
    })
    return { stage, status: 'skipped', reason }
  }
}

function classifyAssessmentRegistryLoadFailure(error: unknown): AdminAssessmentRegistryNotice {
  const { code, message } = extractDatabaseFailureDetails(error)
  const normalizedMessage = message.toLowerCase()
  const missingRegistrySchema = code === '42P01' || code === '42703' || [
    'assessment_definitions',
    'assessment_versions',
    'current_published_version_id',
    'assessment_definition_id',
    'package_schema_version',
    'package_validation_report_json',
  ].some((token) => normalizedMessage.includes(token.toLowerCase()))

  if (missingRegistrySchema) {
    return {
      kind: 'setup_required',
      title: 'Assessment registry setup is incomplete',
      detail: 'The assessment admin schema is missing or behind the current code. Apply migrations 0007_assessment_admin_registry.sql and 0008_assessment_version_packages.sql, then reload this page.',
    }
  }

  return {
    kind: 'degraded',
    title: 'Assessment registry is temporarily unavailable',
    detail: 'The registry query failed before data could be rendered. Review the deployment logs and database health, then retry.',
  }
}

function isMissingRelationError(error: unknown, relationName: string): boolean {
  const { code, message } = extractDatabaseFailureDetails(error)
  return code === '42P01' && message.toLowerCase().includes(`relation "${relationName.toLowerCase()}" does not exist`)
}

function mapAssessmentVersionDetailRow(row: AssessmentVersionRow): AssessmentVersionRow {
  return {
    ...row,
    publish_readiness_status: row.publish_readiness_status ?? 'not_ready',
    readiness_check_summary_json: row.readiness_check_summary_json ?? null,
    last_readiness_evaluated_at: row.last_readiness_evaluated_at ?? null,
    sign_off_status: row.sign_off_status ?? null,
    sign_off_at: row.sign_off_at ?? null,
    sign_off_by_name: row.sign_off_by_name ?? null,
    sign_off_material_updated_at: row.sign_off_material_updated_at ?? null,
    release_notes: row.release_notes ?? null,
    material_updated_at: row.material_updated_at ?? row.updated_at ?? null,
    latest_regression_suite_snapshot_json: row.latest_regression_suite_snapshot_json ?? null,
  }
}
async function resolveAssessmentVersionSchemaCapabilities(
  query: typeof queryDb,
  getCapabilities: typeof getAdminAssessmentVersionSchemaCapabilities,
) {
  return getCapabilities({ queryDb: query })
}

type AssessmentVersionGovernanceWriteFeature =
  | 'package_metadata'
  | 'release_readiness'
  | 'release_sign_off'
  | 'release_notes'
  | 'regression_snapshot'

type AssessmentVersionGovernanceWriteMode = 'supported' | 'unsupported' | 'partial'

interface AssessmentVersionGovernanceWriteSupport {
  mode: AssessmentVersionGovernanceWriteMode
  columns: string[]
  missingColumns: string[]
}

interface AssessmentVersionGovernanceWritePolicy {
  packageMetadata: AssessmentVersionGovernanceWriteSupport
  releaseReadiness: AssessmentVersionGovernanceWriteSupport
  releaseSignOff: AssessmentVersionGovernanceWriteSupport
  releaseNotes: AssessmentVersionGovernanceWriteSupport
  regressionSnapshot: AssessmentVersionGovernanceWriteSupport
  assertSupported: (feature: AssessmentVersionGovernanceWriteFeature, action: string) => void
}

class AssessmentVersionSchemaCompatibilityError extends Error {
  constructor(action: string, feature: string, missingColumns: string[]) {
    const featureLabel = feature.replaceAll('_', ' ')
    super(
      missingColumns.length > 0
        ? `Assessment version schema is incompatible with ${action}: missing ${featureLabel} column${missingColumns.length === 1 ? '' : 's'} (${missingColumns.join(', ')}). Apply the latest assessment admin migrations and retry.`
        : `Assessment version schema is incompatible with ${action}. Apply the latest assessment admin migrations and retry.`,
    )
    this.name = 'AssessmentVersionSchemaCompatibilityError'
  }
}

class AssessmentRuntimeSchemaCompatibilityError extends Error {
  constructor(action: string, details: { missingTables: string[]; missingColumns: Array<{ tableName: string; columns: string[] }> }) {
    const issues: string[] = []

    if (details.missingTables.length > 0) {
      issues.push(`missing table${details.missingTables.length === 1 ? '' : 's'} (${details.missingTables.join(', ')})`)
    }

    if (details.missingColumns.length > 0) {
      issues.push(
        `missing column${details.missingColumns.length === 1 ? '' : 's'} (${details.missingColumns.map(({ tableName, columns }) => `${tableName}.${columns.join(', ')}`).join('; ')})`,
      )
    }

    super(
      issues.length > 0
        ? `Assessment runtime schema is incompatible with ${action}: ${issues.join(' and ')}. Apply the live runtime question-bank migrations and retry.`
        : `Assessment runtime schema is incompatible with ${action}. Apply the live runtime question-bank migrations and retry.`,
    )
    this.name = 'AssessmentRuntimeSchemaCompatibilityError'
  }
}

function resolveAssessmentVersionGovernanceWriteSupport(
  capabilities: Awaited<ReturnType<typeof getAdminAssessmentVersionSchemaCapabilities>>,
  columns: readonly string[],
): AssessmentVersionGovernanceWriteSupport {
  const missingColumns = columns.filter((columnName) => !hasAssessmentVersionOptionalGovernanceAndRegressionColumn(
    capabilities,
    columnName as Parameters<typeof hasAssessmentVersionOptionalGovernanceAndRegressionColumn>[1],
  ))

  if (missingColumns.length === 0) {
    return { mode: 'supported', columns: [...columns], missingColumns }
  }

  if (missingColumns.length === columns.length) {
    return { mode: 'unsupported', columns: [...columns], missingColumns }
  }

  return { mode: 'partial', columns: [...columns], missingColumns }
}

function resolveAssessmentVersionPackageWriteSupport(
  capabilities: Awaited<ReturnType<typeof getAdminAssessmentVersionSchemaCapabilities>>,
  columns: readonly string[],
): AssessmentVersionGovernanceWriteSupport {
  const missingColumns = columns.filter((columnName) => !hasAssessmentVersionPackageColumn(
    capabilities,
    columnName as Parameters<typeof hasAssessmentVersionPackageColumn>[1],
  ))

  if (missingColumns.length === 0) {
    return { mode: 'supported', columns: [...columns], missingColumns }
  }

  if (missingColumns.length === columns.length) {
    return { mode: 'unsupported', columns: [...columns], missingColumns }
  }

  return { mode: 'partial', columns: [...columns], missingColumns }
}

function createAssessmentVersionGovernanceWritePolicy(
  capabilities: Awaited<ReturnType<typeof getAdminAssessmentVersionSchemaCapabilities>>,
): AssessmentVersionGovernanceWritePolicy {
  const packageMetadata = resolveAssessmentVersionPackageWriteSupport(capabilities, [
    'package_raw_payload',
    'package_schema_version',
    'package_status',
    'package_source_type',
    'package_source_filename',
    'package_imported_at',
    'package_imported_by_identity_id',
    'package_validation_report_json',
  ])
  const releaseReadiness = resolveAssessmentVersionGovernanceWriteSupport(capabilities, ASSESSMENT_VERSION_RELEASE_READINESS_COLUMNS)
  const releaseSignOff = resolveAssessmentVersionGovernanceWriteSupport(capabilities, ASSESSMENT_VERSION_RELEASE_SIGN_OFF_COLUMNS)
  const releaseNotes = resolveAssessmentVersionGovernanceWriteSupport(capabilities, ASSESSMENT_VERSION_RELEASE_NOTES_COLUMNS)
  const regressionSnapshot = resolveAssessmentVersionGovernanceWriteSupport(capabilities, ASSESSMENT_VERSION_REGRESSION_SNAPSHOT_COLUMNS)

  const supportByFeature: Record<AssessmentVersionGovernanceWriteFeature, AssessmentVersionGovernanceWriteSupport> = {
    package_metadata: packageMetadata,
    release_readiness: releaseReadiness,
    release_sign_off: releaseSignOff,
    release_notes: releaseNotes,
    regression_snapshot: regressionSnapshot,
  }

  return {
    packageMetadata,
    releaseReadiness,
    releaseSignOff,
    releaseNotes,
    regressionSnapshot,
    assertSupported(feature, action) {
      const support = supportByFeature[feature]
      if (support.mode === 'supported') {
        return
      }

      throw new AssessmentVersionSchemaCompatibilityError(action, feature, support.missingColumns)
    },
  }
}

async function resolveAssessmentVersionGovernanceWritePolicy(
  query: typeof queryDb,
  getCapabilities: typeof getAdminAssessmentVersionSchemaCapabilities,
): Promise<AssessmentVersionGovernanceWritePolicy> {
  return createAssessmentVersionGovernanceWritePolicy(
    await resolveAssessmentVersionSchemaCapabilities(query, getCapabilities),
  )
}

function buildAssessmentVersionSchemaCompatibilityResult<T extends { ok: boolean; code: string; message: string }>(
  error: unknown,
): T | null {
  let current = error

  while (current) {
    if (current instanceof AssessmentVersionSchemaCompatibilityError) {
      return {
        ok: false,
        code: 'schema_incompatible',
        message: current.message,
      } as T
    }

    if (!(current && typeof current === 'object' && 'cause' in current)) {
      break
    }

    current = (current as { cause?: unknown }).cause
  }

  return null
}

function buildAssessmentRuntimeSchemaCompatibilityResult<T extends { ok: boolean; code: string; message: string }>(
  error: unknown,
): T | null {
  let current = error

  while (current) {
    if (current instanceof AssessmentRuntimeSchemaCompatibilityError) {
      return {
        ok: false,
        code: 'schema_incompatible',
        message: current.message,
      } as T
    }

    if (!(current && typeof current === 'object' && 'cause' in current)) {
      break
    }

    current = (current as { cause?: unknown }).cause
  }

  return null
}

async function assertAssessmentRuntimeSchemaCompatibility(
  query: typeof queryDb,
  action: string,
): Promise<void> {
  const capabilities = await getAdminAssessmentRuntimeSchemaCapabilities({ queryDb: query })
  const missingTables = getMissingAssessmentRuntimeTables(capabilities)
  const missingColumns = getMissingAssessmentRuntimeColumns(capabilities)

  if (missingTables.length > 0 || missingColumns.length > 0) {
    throw new AssessmentRuntimeSchemaCompatibilityError(action, { missingTables, missingColumns })
  }
}

function mapPublishDatabaseFailure(error: unknown): AdminAssessmentVersionMutationResult | null {
  const { code, message } = extractDatabaseFailureDetails(error)
  const normalizedMessage = message.toLowerCase()
  const { publishStage, materializationStage } = findPublishStageFailure(error)

  const touchesRuntimeMaterialization = [
    'assessment_question_sets',
    'assessment_questions',
    'assessment_question_options',
    'assessment_option_signal_mappings',
  ].some((token) => normalizedMessage.includes(token))
    || publishStage === 'runtime_materialization'

  const touchesGovernance = publishStage === 'release_readiness_persist'
    || ['publish_readiness_status', 'readiness_check_summary_json', 'sign_off_status', 'sign_off_material_updated_at'].some((token) => normalizedMessage.includes(token))

  const touchesLivePointer = publishStage === 'live_pointer_update'
    || ['assessment_definitions', 'current_published_version_id'].some((token) => normalizedMessage.includes(token))

  const touchesLifecycleTransition = publishStage === 'archive_existing_published_versions'
    || publishStage === 'publish_version_update'
    || ['lifecycle_status', 'published_at', 'archived_at', 'assessment_versions'].some((token) => normalizedMessage.includes(token))

  const touchesPublishStatementShape = code === '08P01'
    || normalizedMessage.includes('bind message supplies')
    || normalizedMessage.includes('prepared statement requires')
    || normalizedMessage.includes('there is no parameter $')

  if ((code === '42P01' || code === '42703') && touchesRuntimeMaterialization) {
    return {
      ok: false,
      code: 'schema_incompatible',
      message: 'Publish could not materialize the live runtime question bank because the runtime schema is missing or outdated. Apply the live runtime question-bank migrations and retry.',
    }
  }

  if (code === '23503' && touchesRuntimeMaterialization) {
    return {
      ok: false,
      code: 'invalid_transition',
      message: 'Publish could not complete because the live runtime question bank references a missing runtime record. Re-import the package or contact support if the problem persists.',
    }
  }

  if ((code === '23505' || code === '23514' || code === '23502') && touchesRuntimeMaterialization) {
    return {
      ok: false,
      code: 'invalid_transition',
      message: materializationStage
        ? `Publish could not complete because the imported package could not be materialized into the live runtime question bank safely. The failure occurred during ${materializationStage.replace(/_/g, ' ')}. Review the package for duplicate, missing, or unsupported runtime values and try again.`
        : 'Publish could not complete because the imported package could not be materialized into the live runtime question bank safely. Review the package for duplicate, missing, or unsupported runtime values and try again.',
    }
  }

  if ((code === '42P01' || code === '42703') && touchesGovernance) {
    return {
      ok: false,
      code: 'schema_incompatible',
      message: 'Publish could not refresh release-governance evidence because the assessment version governance schema is missing or outdated. Apply the assessment admin migrations and retry.',
    }
  }

  if ((code === '23503' || code === '23505' || code === '23514' || code === '23502') && touchesGovernance) {
    return {
      ok: false,
      code: 'invalid_transition',
      message: 'Publish could not record release-governance readiness evidence safely. Refresh readiness/sign-off data and retry publishing.',
    }
  }

  if ((code === '42P01' || code === '42703') && touchesLivePointer) {
    return {
      ok: false,
      code: 'schema_incompatible',
      message: 'Publish could not move the live assessment pointer because the assessment definitions schema is missing or outdated. Apply the assessment admin migrations and retry.',
    }
  }

  if ((code === '23503' || code === '23505' || code === '23514' || code === '23502') && touchesLivePointer) {
    return {
      ok: false,
      code: 'invalid_transition',
      message: 'Publish could not update the live assessment pointer safely. Reload the assessment detail, confirm the target version is still valid, and retry.',
    }
  }

  if ((code === '42P01' || code === '42703') && touchesLifecycleTransition) {
    return {
      ok: false,
      code: 'schema_incompatible',
      message: 'Publish could not update assessment version lifecycle records because the assessment_versions publish schema is missing or outdated. Apply the assessment admin migrations and retry.',
    }
  }

  if ((code === '23503' || code === '23505' || code === '23514' || code === '23502') && touchesLifecycleTransition) {
    return {
      ok: false,
      code: 'invalid_transition',
      message: 'Publish could not update the draft/published lifecycle state safely. Reload the version state and retry publishing.',
    }
  }

  if (touchesPublishStatementShape) {
    return {
      ok: false,
      code: 'unknown_error',
      message: 'Publish could not persist the version lifecycle transition. Review server logs for the failing publish stage and retry once the persistence issue is resolved.',
    }
  }

  if (publishStage === 'publish_version_update') {
    return {
      ok: false,
      code: 'unknown_error',
      message: 'Publish could not persist the version lifecycle transition. Review server logs for the failing publish stage and retry once the persistence issue is resolved.',
    }
  }

  return null
}

async function loadAssessmentVersionRowById(
  client: PoolClient,
  assessmentId: string,
  versionId: string,
  getCapabilities: typeof getAdminAssessmentVersionSchemaCapabilities,
): Promise<(AssessmentVersionRow & { assessment_name: string | null }) | null> {
  const capabilities = await resolveAssessmentVersionSchemaCapabilities(client.query.bind(client), getCapabilities)
  const result = await client.query<AssessmentVersionRow & { assessment_name: string | null }>(
    buildAssessmentVersionByIdQuery(capabilities, { includeAssessmentName: true }),
    [versionId, assessmentId],
  )

  const row = result.rows[0]
  return row ? { ...mapAssessmentVersionDetailRow(row), assessment_name: row.assessment_name ?? null } : null
}

async function loadAssessmentIdentityById(client: PoolClient, assessmentId: string) {
  const result = await client.query<AssessmentIdentityRow>(
    `select id, key, slug, name, category, description
     from assessment_definitions
     where id = $1
     limit 1`,
    [assessmentId],
  )

  return mapAssessmentIdentityRow(result.rows[0])
}

async function loadAssessmentIdentityByKey(client: PoolClient, assessmentKey: string) {
  const result = await client.query<AssessmentIdentityRow>(
    `select id, key, slug, name, category, description
     from assessment_definitions
     where key = $1
     limit 1`,
    [assessmentKey],
  )

  return mapAssessmentIdentityRow(result.rows[0])
}

async function loadAssessmentIdentityBySlug(client: PoolClient, slug: string) {
  const result = await client.query<AssessmentIdentityRow>(
    `select id, key, slug, name, category, description
     from assessment_definitions
     where slug = $1
     limit 1`,
    [slug],
  )

  return mapAssessmentIdentityRow(result.rows[0])
}

async function loadAssessmentVersionDetailRows(
  assessmentId: string,
  deps: Pick<AssessmentDetailQueryDependencies, 'queryDb' | 'getAssessmentVersionSchemaCapabilities'>,
): Promise<AssessmentVersionRow[]> {
  const capabilities = await deps.getAssessmentVersionSchemaCapabilities({ queryDb: deps.queryDb })
  const result = await deps.queryDb<AssessmentVersionRow>(buildAssessmentVersionDetailQuery(capabilities), [assessmentId])
  return (result.rows ?? []).map(mapAssessmentVersionDetailRow)
}

async function loadAssessmentSavedScenarioRows(
  assessmentId: string,
  query: typeof queryDb,
): Promise<AssessmentSavedScenarioRow[]> {
  try {
    const result = await query<AssessmentSavedScenarioRow>(
      `select
         scenarios.id,
         scenarios.assessment_version_id,
         av.version_label,
         scenarios.name,
         scenarios.description,
         scenarios.scenario_payload,
         scenarios.status,
         scenarios.source_version_id,
         source_version.version_label as source_version_label,
         scenarios.source_scenario_id,
         scenarios.provenance_json,
         scenarios.created_at,
         scenarios.updated_at,
         scenarios.archived_at,
         created_by.full_name as created_by_name,
         updated_by.full_name as updated_by_name
       from assessment_version_saved_scenarios scenarios
       inner join assessment_versions av on av.id = scenarios.assessment_version_id
       left join assessment_versions source_version on source_version.id = scenarios.source_version_id
       left join admin_identities created_by on created_by.id = scenarios.created_by_identity_id
       left join admin_identities updated_by on updated_by.id = scenarios.updated_by_identity_id
       where av.assessment_definition_id = $1
       order by av.version_label desc, lower(scenarios.name) asc`,
      [assessmentId],
    )

    return result.rows ?? []
  } catch (error) {
    if (isMissingRelationError(error, 'assessment_version_saved_scenarios')) {
      return []
    }

    throw error
  }
}

export async function getAdminAssessmentRegistryData(
  searchParams?: Record<string, string | string[] | undefined>,
  deps: AssessmentRegistryQueryDependencies = defaultAssessmentRegistryQueryDependencies,
): Promise<AdminAssessmentRegistryData> {
  const filters = getAdminAssessmentRegistryFilters(searchParams)
  const sharedParams = [
    filters.lifecycle === 'all' ? null : filters.lifecycle,
    filters.category === 'all' ? null : filters.category,
    toPattern(filters.query),
  ]
  const orderClause = buildRegistryOrderClause(filters.sort)
  const summaryParams = [
    filters.category === 'all' ? null : filters.category,
    toPattern(filters.query),
  ]

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

  const fromClause = `
    from assessment_definitions ad
    left join version_stats vs on vs.assessment_definition_id = ad.id
    left join assessment_versions current_version on current_version.id = ad.current_published_version_id
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

  const summaryFromClause = `
    from assessment_definitions ad
    where ($1::text is null or ad.category = $1::text)
      and (
        $2::text is null
        or ad.name ilike $2 escape '\\'
        or ad.key ilike $2 escape '\\'
        or ad.slug ilike $2 escape '\\'
        or coalesce(ad.description, '') ilike $2 escape '\\'
      )
  `

  try {
    const summaryResult = await deps.queryDb<AssessmentRegistrySummaryRow>(
      `select
         count(*) filter (where ad.lifecycle_status = 'published')::int as published_count,
         count(*) filter (where ad.lifecycle_status = 'draft')::int as draft_count,
         count(*) filter (where ad.lifecycle_status = 'archived')::int as archived_count
       ${summaryFromClause}`,
      summaryParams,
    )

    const summary = {
      publishedCount: normaliseCount(summaryResult.rows[0]?.published_count),
      draftCount: normaliseCount(summaryResult.rows[0]?.draft_count),
      archivedCount: normaliseCount(summaryResult.rows[0]?.archived_count),
    }

    const countResult = await deps.queryDb<{ total_count: number | string | null }>(
      `${baseQuery}
       select count(*)::int as total_count
       ${fromClause}`,
      sharedParams,
    )

    const totalCount = normaliseCount(countResult.rows[0]?.total_count)
    const totalPages = Math.max(1, Math.ceil(totalCount / filters.pageSize))
    const page = Math.min(filters.page, totalPages)
    const rowsResult = await deps.queryDb<AssessmentRegistryRow>(
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
       ${fromClause}
       order by ${orderClause}
       limit $4
       offset $5`,
      [...sharedParams, filters.pageSize, (page - 1) * filters.pageSize],
    )

    const entries = mapAssessmentRegistryRows(rowsResult.rows ?? [])

    return buildAdminAssessmentRegistryData({ ...filters, page }, entries, totalCount, summary)
  } catch (error) {
    const notice = classifyAssessmentRegistryLoadFailure(error)
    logDatabaseError(`[admin-assessment-management] Admin assessment registry load failed: ${notice.title}`, error)
    return buildAdminAssessmentRegistryData(filters, [], 0, undefined, notice)
  }
}

export async function getAdminAssessmentDetailData(
  assessmentId: string,
  deps: AssessmentDetailQueryDependencies = defaultAssessmentDetailQueryDependencies,
): Promise<AdminAssessmentDetailData | null> {
  const summaryResult = await deps.queryDb<AssessmentSummaryRow>(
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
  )
  const versionsResult = await loadAssessmentVersionDetailRows(assessmentId, deps)
  const savedScenariosResult = await loadAssessmentSavedScenarioRows(assessmentId, deps.queryDb)
  const activity = await deps.getScopedAdminAuditActivity({
    entityType: 'assessment',
    entityId: assessmentId,
    includeSecondaryEntityType: 'assessment_version',
    limit: 40,
  })

  const assessment = mapAssessmentSummaryRow(summaryResult.rows[0])

  if (!assessment) {
    return null
  }

  const versions = mapAssessmentVersionRows(versionsResult, mapSavedScenarioRows(savedScenariosResult))
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
  detectedVersion?: AdminAssessmentPackageDetectedVersion | null
  success?: boolean
  schemaVersion?: string | null
  packageName?: string | null
  versionLabel?: string | null
  readiness?: {
    structurallyValid: boolean
    importable: boolean
    compilable: boolean
    evaluatable: boolean
    simulatable?: boolean
    runtimeExecutable: boolean
    liveRuntimeEnabled?: boolean
    publishable: boolean
  }
  analysis?: unknown
  summary: SonartraAssessmentPackageSummary | null
  errors: SonartraAssessmentPackageValidationIssue[]
  warnings: SonartraAssessmentPackageValidationIssue[]
}) {
  return {
    detectedVersion: input.detectedVersion ?? null,
    success: typeof input.success === 'boolean' ? input.success : input.errors.length === 0,
    schemaVersion: input.schemaVersion ?? null,
    packageName: input.packageName ?? null,
    versionLabel: input.versionLabel ?? null,
    readiness: input.readiness ?? null,
    analysis: input.analysis ?? null,
    summary: input.summary,
    errors: input.errors,
    warnings: input.warnings,
  }
}

function buildScenarioPayloadSummary(name: string, sourceVersionLabel: string | null, sourceScenarioId: string | null) {
  return sourceVersionLabel || sourceScenarioId
    ? `Copied from ${sourceVersionLabel ? `v${sourceVersionLabel}` : 'a prior version'}${sourceScenarioId ? ` · source scenario ${sourceScenarioId}` : ''}.`
    : `${name} created locally for this version.`
}

function resolveScenarioCloneName(baseName: string, existingNames: Set<string>): string {
  const normalizedNames = new Set(Array.from(existingNames, (name) => name.trim().toLowerCase()))
  if (!normalizedNames.has(baseName.trim().toLowerCase())) {
    return baseName
  }

  let attempt = 2
  while (normalizedNames.has(`${baseName} (copy ${attempt})`.trim().toLowerCase())) {
    attempt += 1
  }

  return `${baseName} (copy ${attempt})`
}

function buildSuiteSnapshot(input: {
  executedAt: string
  executedBy: string | null
  baselineVersionId: string | null
  baselineVersionLabel: string | null
  totalScenarios: number
  passedCount: number
  warningCount: number
  failedCount: number
}): AdminAssessmentLatestSuiteSnapshot {
  const overallStatus = input.failedCount > 0 ? 'fail' : input.warningCount > 0 ? 'warning' : 'pass'
  const summaryText = input.totalScenarios === 0
    ? 'No active saved scenarios were available for a suite run.'
    : `${input.passedCount}/${input.totalScenarios} passed${input.warningCount > 0 ? ` · ${input.warningCount} warning(s)` : ''}${input.failedCount > 0 ? ` · ${input.failedCount} failed` : ''}.`

  return {
    ...input,
    overallStatus,
    summaryText,
  }
}

function serializeReleaseReadiness(version: Pick<AdminAssessmentVersionRecord, 'packageInfo' | 'normalizedPackage' | 'savedScenarios' | 'latestSuiteSnapshot' | 'lifecycleStatus'>): NonNullable<AdminAssessmentReleaseGovernance['readinessSummary']> {
  const readiness = getAdminAssessmentVersionReadiness(version)
  return {
    status: readiness.status,
    summaryText: readiness.summaryText,
    checks: readiness.checks,
    blockingChecks: readiness.checks.filter((check) => check.status === 'fail'),
    warningChecks: readiness.checks.filter((check) => check.status === 'warning'),
  }
}

async function persistVersionReleaseReadiness(
  client: PoolClient,
  input: {
    assessmentId: string
    versionId: string
    actor: ActorRow | null
    nowIso: string
    createId: () => string
    reason: 'manual_refresh' | 'package_import' | 'scenario_change' | 'suite_snapshot' | 'publish_attempt'
    emitAudit?: boolean
    getAssessmentVersionSchemaCapabilities: typeof getAdminAssessmentVersionSchemaCapabilities
    onUnsupported?: 'skip' | 'error'
  },
): Promise<{ version: AdminAssessmentVersionRecord | null; summary: NonNullable<AdminAssessmentReleaseGovernance['readinessSummary']> | null }> {
  const writePolicy = await resolveAssessmentVersionGovernanceWritePolicy(
    client.query.bind(client),
    input.getAssessmentVersionSchemaCapabilities,
  )
  if (writePolicy.releaseReadiness.mode !== 'supported') {
    if (writePolicy.releaseReadiness.mode === 'partial' || input.onUnsupported !== 'skip') {
      writePolicy.assertSupported('release_readiness', 'persisting release readiness')
    }

    return { version: null, summary: null }
  }

  const versions = await loadAssessmentVersionsWithSavedScenarios(client, input.assessmentId, input.getAssessmentVersionSchemaCapabilities)
  const version = versions.find((entry) => entry.id === input.versionId) ?? null

  if (!version) {
    return { version: null, summary: null }
  }

  const readinessSummary = serializeReleaseReadiness(version)
  await client.query(
    `update assessment_versions
     set publish_readiness_status = $3,
         readiness_check_summary_json = $4::jsonb,
         last_readiness_evaluated_at = $5::timestamptz
     where id = $1
       and assessment_definition_id = $2`,
    [input.versionId, input.assessmentId, readinessSummary.status, JSON.stringify(readinessSummary), input.nowIso],
  )

  if (input.emitAudit !== false) {
    await writeAssessmentAuditEvent(client, {
      createId: input.createId,
      actor: input.actor,
      nowIso: input.nowIso,
      eventType: 'assessment_release_readiness_evaluated',
      summary: `Release readiness evaluated for ${version.normalizedPackage?.meta.assessmentTitle ?? 'assessment'} v${version.versionLabel}: ${readinessSummary.summaryText}`,
      assessmentId: input.assessmentId,
      assessmentName: version.normalizedPackage?.meta.assessmentTitle ?? 'Assessment',
      versionId: version.id,
      versionLabel: version.versionLabel,
      metadata: {
        reason: input.reason,
        readinessStatus: readinessSummary.status,
        blockingChecks: readinessSummary.blockingChecks.map((check) => check.key),
        warningChecks: readinessSummary.warningChecks.map((check) => check.key),
      },
    })
  }

  const existingGovernance = version.releaseGovernance ?? {
    readinessStatus: 'not_ready' as const,
    readinessSummary: null,
    lastReadinessEvaluatedAt: null,
    signOff: { status: 'unsigned' as const, signedOffBy: null, signedOffAt: null, isStale: false, staleReason: null },
    releaseNotes: null,
  }

  return {
    version: {
      ...version,
      releaseGovernance: {
        ...existingGovernance,
        readinessStatus: readinessSummary.status,
        readinessSummary,
        lastReadinessEvaluatedAt: input.nowIso,
      },
    },
    summary: readinessSummary,
  }
}

async function invalidateVersionSignOffIfStale(
  client: PoolClient,
  input: {
    version: AdminAssessmentVersionRecord
    assessmentName: string
    assessmentId: string
    actor: ActorRow | null
    nowIso: string
    createId: () => string
    reason: 'material_update'
    writePolicy: AssessmentVersionGovernanceWritePolicy
  },
): Promise<void> {
  if (input.writePolicy.releaseSignOff.mode !== 'supported') {
    if (input.writePolicy.releaseSignOff.mode === 'partial') {
      input.writePolicy.assertSupported('release_sign_off', 'invalidating release sign-off')
    }
    return
  }

  if ((input.version.releaseGovernance?.signOff.status ?? 'unsigned') !== 'signed_off') {
    return
  }

  await client.query(
    `update assessment_versions
     set sign_off_status = 'unsigned',
         sign_off_by_identity_id = null,
         sign_off_at = null,
         sign_off_material_updated_at = null
     where id = $1
       and assessment_definition_id = $2`,
    [input.version.id, input.assessmentId],
  )

  await writeAssessmentAuditEvent(client, {
    createId: input.createId,
    actor: input.actor,
    nowIso: input.nowIso,
    eventType: 'assessment_release_sign_off_invalidated',
    summary: `Release sign-off invalidated for ${input.assessmentName} v${input.version.versionLabel} after a material package update.`,
    assessmentId: input.assessmentId,
    assessmentName: input.assessmentName,
    versionId: input.version.id,
    versionLabel: input.version.versionLabel,
    metadata: { reason: input.reason },
  })
}

async function loadAssessmentVersionsForScenarioWork(
  client: PoolClient,
  assessmentId: string,
  getCapabilities: typeof getAdminAssessmentVersionSchemaCapabilities,
): Promise<Array<AssessmentVersionRow & { assessment_name: string | null }>> {
  const capabilities = await resolveAssessmentVersionSchemaCapabilities(client.query.bind(client), getCapabilities)
  const result = await client.query<AssessmentVersionRow & { assessment_name: string | null }>(
    buildAssessmentVersionSelectQuery(capabilities, {
      includeAssessmentName: true,
      whereClause: 'av.assessment_definition_id = $1',
      orderByClause: `
         case av.lifecycle_status when 'published' then 0 when 'draft' then 1 else 2 end,
         av.updated_at desc,
         av.version_label desc`.trim(),
    }),
    [assessmentId],
  )

  return (result.rows ?? []).map((row) => ({
    ...mapAssessmentVersionDetailRow(row),
    assessment_name: row.assessment_name ?? null,
  }))
}

async function loadAssessmentSavedScenariosForAssessment(client: PoolClient, assessmentId: string): Promise<Map<string, AdminAssessmentSavedScenarioRecord[]>> {
  return mapSavedScenarioRows(await loadAssessmentSavedScenarioRows(assessmentId, client.query.bind(client)))
}

async function loadAssessmentVersionsWithSavedScenarios(
  client: PoolClient,
  assessmentId: string,
  getCapabilities: typeof getAdminAssessmentVersionSchemaCapabilities,
): Promise<AdminAssessmentVersionRecord[]> {
  const versionRows = await loadAssessmentVersionsForScenarioWork(client, assessmentId, getCapabilities)
  const scenariosByVersion = await loadAssessmentSavedScenariosForAssessment(client, assessmentId)
  return mapAssessmentVersionRows(versionRows, scenariosByVersion)
}

async function loadExistingScenarioNames(client: PoolClient, versionId: string): Promise<Set<string>> {
  const result = await client.query<{ name: string | null }>(
    `select name
     from assessment_version_saved_scenarios
     where assessment_version_id = $1`,
    [versionId],
  )

  return new Set((result.rows ?? []).map((row) => normaliseWhitespace(row.name ?? '')).filter(Boolean))
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

  const keyConflict = await deps.queryDb<{ id: string }>('select id from assessment_definitions where key = $1 limit 1', [key])
  const slugConflict = await deps.queryDb<{ id: string }>('select id from assessment_definitions where slug = $1 limit 1', [slug])

  if (keyConflict.rows[0]) {
    return {
      ok: false,
      code: 'duplicate_key',
      message: 'This assessment key is already assigned to another assessment.',
      fieldErrors: { key: 'This assessment key is already assigned to another assessment.' },
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
    logDatabaseError('[admin-assessment-management] Failed to create assessment.', error)
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
    logDatabaseError('[admin-assessment-management] Failed to create draft version.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

function buildAssessmentImportReviewContract(input: {
  validationSummary: AdminAssessmentPackageValidationSummary
  packageIdentity: AdminAssessmentImportReviewContract['packageIdentity']
  decision: AdminAssessmentImportReviewContract['decision']
  conflicts: AssessmentImportConflict[]
}): AdminAssessmentImportReviewContract {
  const validationConflicts: AssessmentImportConflict[] = input.validationSummary.success
    ? []
    : [{
        code: 'package_validation_failed',
        severity: 'error',
        message: 'The uploaded package did not pass structural validation, so import is blocked until the validation issues are resolved.',
      }]

  return {
    packageIdentity: input.packageIdentity,
    decision: input.decision,
    conflicts: [...input.conflicts, ...validationConflicts],
    validationResult: {
      success: input.validationSummary.success,
      detectedVersion: input.validationSummary.detectedVersion,
      schemaVersion: input.validationSummary.schemaVersion,
      packageName: input.validationSummary.packageName,
      versionLabel: input.validationSummary.versionLabel,
      summary: input.validationSummary.summary,
      readiness: input.validationSummary.readiness,
      errors: input.validationSummary.errors,
      warnings: input.validationSummary.warnings,
    },
    governanceNotice: 'Package metadata owns assessment identity and the assessment definition. Admin import only controls governance state such as publish readiness, release notes, and deployment status.',
  }
}

async function reviewAssessmentPackageCreateOrAttach(
  client: PoolClient,
  packageText: string,
): Promise<{
  parsedPayload: unknown
  importedPackage: ReturnType<typeof importAssessmentPackagePayload>
  review: AdminAssessmentImportReviewContract
}> {
  let parsedPayload: unknown

  try {
    parsedPayload = JSON.parse(packageText)
  } catch {
    return {
      parsedPayload: null,
      importedPackage: importAssessmentPackagePayload(null),
      review: buildAssessmentImportReviewContract({
        validationSummary: {
          success: false,
          detectedVersion: 'unknown',
          schemaVersion: null,
          packageName: null,
          versionLabel: null,
          summary: null,
          readiness: {
            structurallyValid: false,
            importable: false,
            compilable: false,
            evaluatable: false,
            simulatable: false,
            runtimeExecutable: false,
            liveRuntimeEnabled: false,
            publishable: false,
          },
          readinessState: deriveReadinessState({
            classifier: 'unknown_or_invalid',
            readiness: {
              structurallyValid: false,
              importable: false,
              compilable: false,
              evaluatable: false,
              simulatable: false,
              runtimeExecutable: false,
              liveRuntimeEnabled: false,
              publishable: false,
            },
            compiledPlanAvailable: false,
          }),
          errors: [{ path: '$', message: 'Malformed JSON.' }],
          warnings: [],
        },
        packageIdentity: null,
        decision: null,
        conflicts: [{
          code: 'missing_identity_metadata',
          severity: 'error',
          message: 'Package JSON could not be parsed, so assessment identity could not be reviewed.',
        }],
      }),
    }
  }

  const importedPackage = importAssessmentPackagePayload(parsedPayload)
  const identityResult = extractAssessmentPackageIdentity(parsedPayload, importedPackage)
  const identity = identityResult.identity
  const conflicts: AssessmentImportConflict[] = [...identityResult.conflicts]

  let matchedAssessment: Awaited<ReturnType<typeof loadAssessmentIdentityByKey>> | null = null
  let decision: AdminAssessmentImportReviewContract['decision'] = null

  if (identity) {
    matchedAssessment = await loadAssessmentIdentityByKey(client, identity.assessmentKey)

    const slugOwner = await loadAssessmentIdentityBySlug(client, identity.slug)
    if (slugOwner && slugOwner.key !== identity.assessmentKey) {
      conflicts.push({
        code: 'slug_collision',
        severity: 'error',
        field: 'slug',
        message: `Slug ${identity.slug} is already assigned to ${slugOwner.name} (${slugOwner.key}) and cannot be claimed by a different assessment key.`,
      })
    }

    if (matchedAssessment) {
      if (matchedAssessment.name !== identity.assessmentName) {
        conflicts.push({
          code: 'identity_metadata_changed',
          severity: 'warning',
          field: 'assessmentName',
          message: `Package name differs from the existing registry entry (${matchedAssessment.name} → ${identity.assessmentName}). The package can update this package-owned display name after confirmation.`,
        })
      }

      if (matchedAssessment.slug !== identity.slug) {
        conflicts.push({
          code: 'identity_metadata_changed',
          severity: 'warning',
          field: 'slug',
          message: `Package slug differs from the existing registry entry (${matchedAssessment.slug} → ${identity.slug}). The package can update this package-owned slug after confirmation if it stays unique.`,
        })
      }

      if (matchedAssessment.category !== identity.category) {
        conflicts.push({
          code: 'identity_metadata_changed',
          severity: 'warning',
          field: 'category',
          message: `Package category differs from the existing registry entry (${matchedAssessment.category} → ${identity.category}). The package can update this package-owned taxonomy field after confirmation.`,
        })
      }
    }

    decision = {
      action: matchedAssessment ? 'attach_version' : 'create_assessment',
      assessmentId: matchedAssessment?.id ?? null,
      versionId: null,
      versionLabel: identity.versionLabel ?? importedPackage.versionLabel ?? '1.0.0',
      matchedAssessment: matchedAssessment
        ? {
            id: matchedAssessment.id,
            name: matchedAssessment.name,
            key: matchedAssessment.key,
            slug: matchedAssessment.slug,
            category: matchedAssessment.category,
          }
        : null,
      willCreateAssessment: !matchedAssessment,
      willCreateVersion: true,
    }
  }

  if (matchedAssessment && decision?.versionLabel) {
    const duplicateVersion = await client.query<{ id: string }>(
      `select id
       from assessment_versions
       where assessment_definition_id = $1
         and version_label = $2
       limit 1`,
      [matchedAssessment.id, decision.versionLabel],
    )

    if (duplicateVersion.rows[0]) {
      conflicts.push({
        code: 'duplicate_version_label',
        severity: 'error',
        field: 'versionLabel',
        message: `Version ${decision.versionLabel} already exists for ${matchedAssessment.name}. Import a new version label or use the existing version workspace.`,
      })
    }
  }

  return {
    parsedPayload,
    importedPackage,
    review: buildAssessmentImportReviewContract({
      validationSummary: importedPackage.validationSummary,
      packageIdentity: identity,
      decision,
      conflicts,
    }),
  }
}

async function persistImportedPackageOnVersion(
  client: PoolClient,
  input: {
    assessmentId: string
    versionId: string
    sourceFilename?: string | null
    parsedPayload: unknown
    importedPackage: ReturnType<typeof importAssessmentPackagePayload>
    version: Awaited<ReturnType<typeof loadAssessmentVersionRowById>>
    actor: ActorRow | null
    nowIso: string
    deps: AssessmentMutationDependencies
  },
): Promise<AdminAssessmentPackageImportResult> {
  const capabilities = await resolveAssessmentVersionSchemaCapabilities(
    client.query.bind(client),
    input.deps.getAssessmentVersionSchemaCapabilities,
  )
  const writePolicy = await resolveAssessmentVersionGovernanceWritePolicy(
    client.query.bind(client),
    input.deps.getAssessmentVersionSchemaCapabilities,
  )
  if (writePolicy.packageMetadata.mode !== 'supported') {
    writePolicy.assertSupported('package_metadata', 'importing assessment packages')
  }

  const version = input.version
  const assessmentName = normaliseNullableField(version?.assessment_name) ?? 'Assessment'
  const existingVersion = version ? mapAssessmentVersionRows([version])[0] ?? null : null
  const packageStatus = input.importedPackage.packageStatus
  const includeMaterialUpdatedAt = writePolicy.releaseSignOff.mode === 'supported'

  if (writePolicy.releaseSignOff.mode === 'partial') {
    writePolicy.assertSupported('release_sign_off', 'tracking package material updates')
  }

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
         total_questions = coalesce($12, total_questions),
         ${includeMaterialUpdatedAt ? 'material_updated_at = $8::timestamptz,' : ''}
         updated_at = $8::timestamptz,
         updated_by_identity_id = $9
     where id = $1
       and assessment_definition_id = $2`,
    [
      input.versionId,
      input.assessmentId,
      input.importedPackage.definitionPayload ? JSON.stringify(input.importedPackage.definitionPayload) : null,
      JSON.stringify(input.parsedPayload),
      input.importedPackage.schemaVersion ?? SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V1,
      packageStatus,
      normaliseNullableField(input.sourceFilename),
      input.nowIso,
      input.actor?.id ?? null,
      JSON.stringify(buildPackageValidationReport({
        detectedVersion: input.importedPackage.detectedVersion,
        success: input.importedPackage.validationSummary.success,
        schemaVersion: input.importedPackage.schemaVersion,
        packageName: input.importedPackage.packageName,
        versionLabel: input.importedPackage.versionLabel,
        readiness: input.importedPackage.readiness,
        analysis: input.importedPackage.analysis,
        summary: input.importedPackage.summary,
        errors: input.importedPackage.errors,
        warnings: input.importedPackage.warnings,
      })),
      input.importedPackage.validationStatus === 'valid_with_warnings' ? 'valid_with_warnings' : input.importedPackage.validationStatus,
      input.importedPackage.summary?.questionsCount ?? null,
    ],
  )

  await client.query(
    `update assessment_definitions
     set updated_at = $2::timestamptz,
         updated_by_identity_id = $3
     where id = $1`,
    [input.assessmentId, input.nowIso, input.actor?.id ?? null],
  )

  if (existingVersion) {
    await invalidateVersionSignOffIfStale(client, {
      version: existingVersion,
      assessmentName,
      assessmentId: input.assessmentId,
      actor: input.actor,
      nowIso: input.nowIso,
      createId: input.deps.createId,
      reason: 'material_update',
      writePolicy,
    })
  }

  await persistVersionReleaseReadiness(client, {
    assessmentId: input.assessmentId,
    versionId: input.versionId,
    actor: input.actor,
    nowIso: input.nowIso,
    createId: input.deps.createId,
    reason: 'package_import',
    getAssessmentVersionSchemaCapabilities: input.deps.getAssessmentVersionSchemaCapabilities,
    onUnsupported: 'skip',
  })

  if (!input.importedPackage.validationSummary.success) {
    await writeAssessmentAuditEvent(client, {
      createId: input.deps.createId,
      actor: input.actor,
      nowIso: input.nowIso,
      eventType: 'assessment_package_validation_failed',
      summary: `Assessment package import failed validation for ${assessmentName} v${version?.version_label} with ${input.importedPackage.errors.length} blocking issue(s) and ${input.importedPackage.warnings.length} warning(s).`,
      assessmentId: input.assessmentId,
      assessmentName,
      versionId: input.versionId,
      versionLabel: version?.version_label,
      metadata: {
        packageStatus,
        detectedVersion: input.importedPackage.detectedVersion,
        schemaVersion: input.importedPackage.schemaVersion,
        errors: input.importedPackage.errors.length,
        warnings: input.importedPackage.warnings.length,
      },
    })

    return {
      ok: false,
      code: 'validation_error',
      message: 'Package validation failed. Review the validation results and re-import.',
      assessmentId: input.assessmentId,
      versionId: input.versionId,
      validationResult: input.importedPackage.validationSummary,
    }
  }

  await writeAssessmentAuditEvent(client, {
    createId: input.deps.createId,
    actor: input.actor,
    nowIso: input.nowIso,
    eventType: version?.package_status && version.package_status !== 'missing' ? 'assessment_package_replaced' : 'assessment_package_imported',
    summary: `${version?.package_status && version.package_status !== 'missing' ? 'Assessment package replaced' : 'Assessment package imported'} for ${assessmentName} v${version?.version_label} · ${input.importedPackage.summary?.questionsCount ?? 0} questions · ${input.importedPackage.summary?.dimensionsCount ?? 0} dimensions · ${input.importedPackage.warnings.length} warning(s).`,
    assessmentId: input.assessmentId,
    assessmentName,
    versionId: input.versionId,
    versionLabel: version?.version_label,
    metadata: {
      packageStatus,
      detectedVersion: input.importedPackage.detectedVersion,
      schemaVersion: input.importedPackage.schemaVersion,
      runtimeExecutable: input.importedPackage.readiness.runtimeExecutable,
      evaluatable: input.importedPackage.readiness.evaluatable,
      publishable: input.importedPackage.readiness.publishable,
      warnings: input.importedPackage.warnings.length,
      sourceFilename: normaliseNullableField(input.sourceFilename),
    },
  })

  return {
    ok: true,
    code: 'imported',
    message: input.importedPackage.detectedVersion === 'package_contract_v2'
      ? input.importedPackage.warnings.length > 0
        ? 'Package Contract v2 imported with warnings. The package is stored and previewable, but publish stays blocked until the v2 runtime path is supported.'
        : 'Package Contract v2 imported successfully. The package is stored and previewable, but publish stays blocked until the v2 runtime path is supported.'
      : input.importedPackage.detectedVersion === 'hybrid_mvp_v1'
        ? input.importedPackage.warnings.length > 0
          ? 'hybrid_mvp_v1 definition imported with warnings. The version is stored and publishable after warning review.'
          : 'hybrid_mvp_v1 definition imported successfully and is ready for publish review.'
      : input.importedPackage.warnings.length > 0
        ? 'Package imported with warnings. Publish remains allowed, but review the warnings first.'
        : 'Package imported successfully.',
    assessmentId: input.assessmentId,
    versionId: input.versionId,
    validationResult: input.importedPackage.validationSummary,
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
        success: false,
        detectedVersion: 'unknown',
        schemaVersion: null,
        packageName: null,
        versionLabel: null,
        summary: null,
        readiness: {
          structurallyValid: false,
          importable: false,
          compilable: false,
          evaluatable: false,
          simulatable: false,
          runtimeExecutable: false,
          liveRuntimeEnabled: false,
          publishable: false,
        },
        readinessState: deriveReadinessState({
          classifier: 'unknown_or_invalid',
          readiness: {
            structurallyValid: false,
            importable: false,
            compilable: false,
            evaluatable: false,
            simulatable: false,
            runtimeExecutable: false,
            liveRuntimeEnabled: false,
            publishable: false,
          },
          compiledPlanAvailable: false,
        }),
        errors: [{ path: '$', message: 'Malformed JSON.' }],
        warnings: [],
      },
    }
  }

  const importedPackage = importAssessmentPackagePayload(parsedPayload)
  const identityResult = extractAssessmentPackageIdentity(parsedPayload, importedPackage)

  try {
    return await deps.withTransaction(async (client) => {
      const assessmentIdentity = await loadAssessmentIdentityById(client, input.assessmentId)
      if (!assessmentIdentity) {
        return { ok: false, code: 'not_found', message: 'Assessment not found.' }
      }

      const version = await loadAssessmentVersionRowById(
        client,
        input.assessmentId,
        input.versionId,
        async () => resolveAssessmentVersionSchemaCapabilities(client.query.bind(client), deps.getAssessmentVersionSchemaCapabilities),
      )

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

      const packageIdentity = identityResult.identity
      if (!packageIdentity) {
        return {
          ok: false,
          code: 'validation_error',
          message: 'Package identity is incomplete. Review the validation results and re-import.',
          validationResult: importedPackage.validationSummary,
        }
      }

      if (assessmentIdentity.key !== packageIdentity.assessmentKey) {
        return {
          ok: false,
          code: 'conflict',
          message: `This draft belongs to ${assessmentIdentity.key}, but the uploaded package declares ${packageIdentity.assessmentKey}. Assessment keys are immutable identity anchors; use the package-first import flow instead.`,
          assessmentId: input.assessmentId,
          versionId: input.versionId,
          validationResult: importedPackage.validationSummary,
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      return persistImportedPackageOnVersion(client, {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
        sourceFilename: input.sourceFilename,
        parsedPayload,
        importedPackage,
        version,
        actor,
        nowIso,
        deps,
      })
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentPackageImportResult>(error)
    if (compatibilityFailure) {
      return compatibilityFailure
    }
    logDatabaseError('[admin-assessment-management] Failed to import assessment package.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

export async function createOrAttachAdminAssessmentPackage(
  input: AdminAssessmentPackageCreateOrAttachInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentPackageCreateOrAttachResult> {
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

  try {
    return await deps.withTransaction(async (client) => {
      const writePolicy = await resolveAssessmentVersionGovernanceWritePolicy(
        client.query.bind(client),
        deps.getAssessmentVersionSchemaCapabilities,
      )
      if (writePolicy.packageMetadata.mode !== 'supported') {
        writePolicy.assertSupported('package_metadata', 'importing assessment packages')
      }

      const reviewResult = await reviewAssessmentPackageCreateOrAttach(client, packageText)
      const blockingConflicts = reviewResult.review.conflicts.filter((conflict) => conflict.severity === 'error')

      if (blockingConflicts.length > 0) {
        return {
          ok: false,
          code: 'conflict',
          message: blockingConflicts[0]?.message ?? 'Import review found conflicts that must be resolved before the package can be imported.',
          review: reviewResult.review,
        }
      }

      if (input.confirmation !== 'confirm') {
        return {
          ok: false,
          code: 'review_required',
          message: reviewResult.review.decision?.action === 'create_assessment'
            ? 'Review the package identity and confirm to create a new assessment plus its first imported version.'
            : 'Review the package identity and confirm to attach a new version to the existing assessment.',
          review: reviewResult.review,
        }
      }

      const packageIdentity = reviewResult.review.packageIdentity
      const decision = reviewResult.review.decision
      if (!packageIdentity || !decision) {
        return {
          ok: false,
          code: 'validation_error',
          message: 'Package identity could not be resolved. Review the package metadata and try again.',
          review: reviewResult.review,
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      let assessment = decision.matchedAssessment
        ? await loadAssessmentIdentityById(client, decision.matchedAssessment.id)
        : null

      if (!assessment) {
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
          [
            assessmentId,
            packageIdentity.assessmentKey,
            packageIdentity.slug,
            packageIdentity.assessmentName,
            packageIdentity.category,
            packageIdentity.description,
            actor?.id ?? null,
            nowIso,
          ],
        )

        await writeAssessmentAuditEvent(client, {
          createId: deps.createId,
          actor,
          nowIso,
          eventType: 'assessment_created',
          summary: `Assessment record ${packageIdentity.assessmentName} created from an uploaded package.`,
          assessmentId,
          assessmentName: packageIdentity.assessmentName,
          metadata: {
            key: packageIdentity.assessmentKey,
            slug: packageIdentity.slug,
            category: packageIdentity.category,
            lifecycleStatus: 'draft',
            source: 'package_import',
          },
        })

        assessment = await loadAssessmentIdentityById(client, assessmentId)
      } else if (
        assessment.name !== packageIdentity.assessmentName
        || assessment.slug !== packageIdentity.slug
        || assessment.category !== packageIdentity.category
        || assessment.description !== packageIdentity.description
      ) {
        await client.query(
          `update assessment_definitions
           set name = $2,
               slug = $3,
               category = $4,
               description = $5,
               updated_at = $6::timestamptz,
               updated_by_identity_id = $7
           where id = $1`,
          [
            assessment.id,
            packageIdentity.assessmentName,
            packageIdentity.slug,
            packageIdentity.category,
            packageIdentity.description,
            nowIso,
            actor?.id ?? null,
          ],
        )

        await writeAssessmentAuditEvent(client, {
          createId: deps.createId,
          actor,
          nowIso,
          eventType: 'assessment_package_imported',
          summary: `Package import updated package-owned metadata for ${packageIdentity.assessmentName} while keeping assessment key ${packageIdentity.assessmentKey} stable.`,
          assessmentId: assessment.id,
          assessmentName: packageIdentity.assessmentName,
          metadata: {
            identityMutabilityRules: ADMIN_ASSESSMENT_IDENTITY_MUTABILITY_RULES,
            assessmentKey: packageIdentity.assessmentKey,
            previousName: assessment.name,
            previousSlug: assessment.slug,
            previousCategory: assessment.category,
          },
        })
      }

      if (!assessment) {
        return {
          ok: false,
          code: 'unknown_error',
          message: 'Assessment import could not resolve the registry target after creation.',
          review: reviewResult.review,
        }
      }

      const versionId = deps.createId()
      const versionLabel = decision.versionLabel ?? packageIdentity.versionLabel ?? reviewResult.importedPackage.versionLabel ?? '1.0.0'
      const versionKey = `${assessment.key.replace(/[^a-z0-9]+/g, '-') || assessment.id}-v${versionLabel}`

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
         values ($1, $2, $3, $4, null, 80, false, $5, 'draft', $6, 'import', $7, $7, $8::timestamptz, $8::timestamptz)`,
        [versionId, assessment.id, versionKey, packageIdentity.assessmentName, versionLabel, 'Created by package-first import.', actor?.id ?? null, nowIso],
      )

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_version_created',
        summary: `${decision.action === 'create_assessment' ? 'Initial' : 'New'} draft version ${versionLabel} created for ${packageIdentity.assessmentName} from an uploaded package.`,
        assessmentId: assessment.id,
        assessmentName: packageIdentity.assessmentName,
        versionId,
        versionLabel,
        metadata: {
          action: decision.action,
          source: 'package_import',
          assessmentKey: packageIdentity.assessmentKey,
        },
      })

      const version = await loadAssessmentVersionRowById(
        client,
        assessment.id,
        versionId,
        () => resolveAssessmentVersionSchemaCapabilities(client.query.bind(client), deps.getAssessmentVersionSchemaCapabilities),
      )

      if (!version) {
        return {
          ok: false,
          code: 'unknown_error',
          message: 'Assessment version could not be reloaded after creation.',
          review: reviewResult.review,
        }
      }

      const persisted = await persistImportedPackageOnVersion(client, {
        assessmentId: assessment.id,
        versionId,
        sourceFilename: input.sourceFilename,
        parsedPayload: reviewResult.parsedPayload,
        importedPackage: reviewResult.importedPackage,
        version,
        actor,
        nowIso,
        deps,
      })

      return {
        ok: persisted.ok,
        code: persisted.ok ? 'imported' : persisted.code === 'validation_error' ? 'validation_error' : 'conflict',
        message: persisted.ok
          ? decision.action === 'create_assessment'
            ? `Package import created ${packageIdentity.assessmentName} and attached version ${versionLabel}.`
            : `Package import attached version ${versionLabel} to ${packageIdentity.assessmentName}.`
          : persisted.message,
        assessmentId: assessment.id,
        versionId,
        versionLabel,
        review: reviewResult.review,
      }
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentPackageCreateOrAttachResult>(error)
    if (compatibilityFailure) {
      return compatibilityFailure
    }

    logDatabaseError('[admin-assessment-management] Failed to create or attach assessment package.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

export async function simulateAdminAssessmentVersion(
  input: AdminAssessmentVersionSimulationInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentVersionSimulationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return {
      ok: false,
      code: 'permission_denied',
      message: denied.message,
      state: {
        status: 'blocked',
        message: denied.message,
      },
    }
  }

  try {
    return await deps.withTransaction(async (client) => {
      const versionRow = await loadAssessmentVersionRowById(
        client,
        input.assessmentId,
        input.versionId,
        deps.getAssessmentVersionSchemaCapabilities,
      )
      const version = versionRow ? mapAssessmentVersionRows([versionRow])[0] ?? null : null
      const assessmentName = normaliseNullableField(versionRow?.assessment_name) ?? 'Assessment'

      if (!version) {
        return {
          ok: false,
          code: 'not_found',
          message: 'Version not found.',
          state: {
            status: 'blocked',
            message: 'The assessment version could not be found.',
          },
        }
      }

      const payloadValidation = parseAdminAssessmentSimulationPayloadForPackage(
        version.normalizedPackage,
        version.packageInfo.schemaVersion,
        input.responsePayload,
      )

      if (!payloadValidation.ok || !payloadValidation.normalizedRequest) {
        return {
          ok: false,
          code: 'validation_error',
          message: 'Simulation payload is invalid.',
          state: {
            status: 'error',
            message: 'Simulation payload is invalid. Resolve the input errors and try again.',
            fieldErrors: {
              responsePayload: payloadValidation.errors[0]?.message ?? 'Simulation payload is invalid.',
            },
          },
        }
      }

      const workspaceStatus = getAdminAssessmentSimulationWorkspaceStatus(version)
      if (!workspaceStatus.canRunSimulation || !version.normalizedPackage) {
        const actor = await deps.getActorIdentity(client)
        const nowIso = deps.now().toISOString()

        await writeAssessmentAuditEvent(client, {
          createId: deps.createId,
          actor,
          nowIso,
          eventType: 'assessment_simulation_blocked',
          summary: `Simulation blocked for ${assessmentName} v${version.versionLabel}: ${workspaceStatus.blockingReason ?? 'package is not eligible for simulation'}.`,
          assessmentId: input.assessmentId,
          assessmentName,
          versionId: input.versionId,
          versionLabel: version.versionLabel,
          metadata: {
            packageStatus: version.packageInfo.status,
            simulationEligibility: workspaceStatus.eligibility,
          },
        })

        return {
          ok: false,
          code: 'blocked',
          message: workspaceStatus.blockingReason ?? 'This version is not eligible for simulation.',
          state: {
            status: 'blocked',
            message: workspaceStatus.blockingReason ?? 'This version is not eligible for simulation.',
          },
        }
      }

      const normalizedSimulationRequest = payloadValidation.normalizedRequest
      if (!normalizedSimulationRequest) {
        return {
          ok: false,
          code: 'validation_error',
          message: 'Simulation payload is invalid.',
          state: {
            status: 'error',
            message: 'Simulation payload is invalid.',
            fieldErrors: {
              responsePayload: 'Simulation payload is invalid.',
            },
          },
        }
      }
      const simulation = executeAdminAssessmentSimulationForPackage(version.normalizedPackage, version.packageInfo.schemaVersion, normalizedSimulationRequest)
      if (!simulation.ok || !simulation.result) {
        return {
          ok: false,
          code: 'validation_error',
          message: 'Simulation could not be executed because the sample responses are invalid.',
          state: {
            status: 'error',
            message: 'Simulation could not be executed because the sample responses are invalid.',
            fieldErrors: {
              responsePayload: simulation.errors[0]?.message ?? 'Simulation input is invalid.',
            },
          },
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: simulation.warnings.length > 0 ? 'assessment_simulation_completed_with_warnings' : 'assessment_simulation_completed',
        summary: `Simulation executed for ${assessmentName} v${version.versionLabel} · ${simulation.result.responseSummary.answeredCount} answers · ${simulation.result.outputs.filter((output) => output.triggered).length} outputs fired${simulation.warnings.length > 0 ? ` · ${simulation.warnings.length} warning(s)` : ''}.`,
        assessmentId: input.assessmentId,
        assessmentName,
        versionId: input.versionId,
        versionLabel: version.versionLabel,
        metadata: {
          answeredCount: simulation.result.responseSummary.answeredCount,
          outputCount: simulation.result.outputs.filter((output) => output.triggered).length,
          warningCount: simulation.warnings.length,
          source: simulation.result.responseSummary.source,
          scenarioKey: simulation.result.responseSummary.scenarioKey,
        },
      })

      return {
        ok: true,
        code: 'simulated',
        message: 'Simulation completed successfully.',
        state: {
          status: 'success',
          message: simulation.warnings.length > 0
            ? 'Simulation completed with warnings. Review the evidence before publish.'
            : 'Simulation completed successfully.',
          result: simulation.result,
        },
      }
    })
  } catch (error) {
    logDatabaseError('[admin-assessment-management] Failed to simulate version.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
      state: {
        status: 'error',
        message: describeDatabaseError(error),
      },
    }
  }
}

export async function importAdminAssessmentSavedScenarios(
  input: AdminAssessmentScenarioImportInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentScenarioImportResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return { ok: false, code: 'permission_denied', message: denied.message, sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
  }

  try {
    return await deps.withTransaction(async (client) => {
      const versions = await loadAssessmentVersionsWithSavedScenarios(client, input.assessmentId, deps.getAssessmentVersionSchemaCapabilities)
      const targetVersion = versions.find((entry) => entry.id === input.targetVersionId)

      if (!targetVersion) {
        return { ok: false, code: 'not_found', message: 'Target version not found.', sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
      }

      if (targetVersion.lifecycleStatus !== 'draft' || !targetVersion.normalizedPackage || targetVersion.packageInfo.status === 'invalid' || targetVersion.packageInfo.status === 'missing') {
        return { ok: false, code: 'invalid_transition', message: 'Scenario import is only available for draft versions with a valid normalized package.', sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
      }

      const sourceVersion = input.sourceVersionId
        ? versions.find((entry) => entry.id === input.sourceVersionId)
        : versions.filter((entry) => entry.id !== targetVersion.id && entry.savedScenarios.some((scenario) => scenario.status === 'active')).sort((left, right) => {
            if (left.lifecycleStatus === 'published' && right.lifecycleStatus !== 'published') return -1
            if (left.lifecycleStatus !== 'published' && right.lifecycleStatus === 'published') return 1
            return right.updatedAt.localeCompare(left.updatedAt)
          })[0]

      if (!sourceVersion) {
        return { ok: false, code: 'not_found', message: 'No prior version with active saved scenarios could be found.', sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
      }

      const sourceScenarios = sourceVersion.savedScenarios.filter((scenario) => scenario.status === 'active')
      const existingNames = await loadExistingScenarioNames(client, targetVersion.id)
      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      const importedNames: string[] = []
      const skipped: Array<{ name: string; reason: string }> = []

      for (const sourceScenario of sourceScenarios) {
        const parsedPayload = parseAdminAssessmentSimulationPayloadForPackage(targetVersion.normalizedPackage, targetVersion.packageInfo.schemaVersion, sourceScenario.payload)
        if (!parsedPayload.ok || !parsedPayload.normalizedRequest) {
          skipped.push({ name: sourceScenario.name, reason: parsedPayload.errors[0]?.message ?? 'Stored scenario payload is malformed.' })
          continue
        }

        const validation = executeAdminAssessmentSimulationForPackage(targetVersion.normalizedPackage, targetVersion.packageInfo.schemaVersion, parsedPayload.normalizedRequest)
        if (!validation.ok) {
          skipped.push({ name: sourceScenario.name, reason: validation.errors[0]?.message ?? 'Scenario is incompatible with the target version package.' })
          continue
        }

        const nextName = resolveScenarioCloneName(sourceScenario.name, existingNames)
        existingNames.add(nextName)
        await client.query(
          `insert into assessment_version_saved_scenarios (
             id,
             assessment_version_id,
             name,
             description,
             scenario_payload,
             status,
             source_version_id,
             source_scenario_id,
             provenance_json,
             created_by_identity_id,
             updated_by_identity_id,
             created_at,
             updated_at
           )
           values ($1, $2, $3, $4, $5::jsonb, 'active', $6, $7, $8::jsonb, $9, $9, $10::timestamptz, $10::timestamptz)`,
          [
            deps.createId(),
            targetVersion.id,
            nextName,
            sourceScenario.description,
            sourceScenario.payload,
            sourceVersion.id,
            sourceScenario.id,
            JSON.stringify({
              sourceVersionLabel: sourceVersion.versionLabel,
              sourceScenarioId: sourceScenario.id,
              summary: buildScenarioPayloadSummary(nextName, sourceVersion.versionLabel, sourceScenario.id),
              importMode: 'bulk_copy_forward',
            }),
            actor?.id ?? null,
            nowIso,
          ],
        )
        importedNames.push(nextName)
      }

      await client.query(
        `update assessment_definitions
         set updated_at = $2::timestamptz,
             updated_by_identity_id = $3
         where id = $1`,
        [input.assessmentId, nowIso, actor?.id ?? null],
      )

      await persistVersionReleaseReadiness(client, {
        assessmentId: input.assessmentId,
        versionId: targetVersion.id,
        actor,
        nowIso,
        createId: deps.createId,
        reason: 'scenario_change',
        getAssessmentVersionSchemaCapabilities: deps.getAssessmentVersionSchemaCapabilities,
        onUnsupported: 'skip',
      })

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_saved_scenarios_imported',
        summary: `Saved scenarios copied forward into ${targetVersion.versionLabel} from v${sourceVersion.versionLabel} · ${importedNames.length} imported · ${skipped.length} skipped.`,
        assessmentId: input.assessmentId,
        assessmentName: versions.find((entry) => entry.id === targetVersion.id)?.normalizedPackage?.meta.assessmentTitle ?? 'Assessment',
        versionId: targetVersion.id,
        versionLabel: targetVersion.versionLabel,
        metadata: {
          sourceVersionId: sourceVersion.id,
          sourceVersionLabel: sourceVersion.versionLabel,
          importedCount: importedNames.length,
          skippedCount: skipped.length,
        },
      })

      return {
        ok: true,
        code: 'imported',
        message: importedNames.length > 0
          ? `Imported ${importedNames.length} scenario${importedNames.length === 1 ? '' : 's'} from v${sourceVersion.versionLabel}.`
          : `No scenarios were imported from v${sourceVersion.versionLabel}.`,
        sourceVersionLabel: sourceVersion.versionLabel,
        importedCount: importedNames.length,
        skippedCount: skipped.length,
        importedNames,
        skipped,
      }
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentScenarioImportResult>(error)
    if (compatibilityFailure) {
      return { ...compatibilityFailure, sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
    }
    logDatabaseError('[admin-assessment-management] Failed to import saved scenarios.', error)
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error), sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
  }
}

export async function cloneAdminAssessmentSavedScenario(
  input: AdminAssessmentScenarioCloneInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentScenarioImportResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return { ok: false, code: 'permission_denied', message: denied.message, sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
  }

  try {
    return await deps.withTransaction(async (client) => {
      const versions = await loadAssessmentVersionsWithSavedScenarios(client, input.assessmentId, deps.getAssessmentVersionSchemaCapabilities)
      const targetVersion = versions.find((entry) => entry.id === input.targetVersionId)

      if (!targetVersion) {
        return { ok: false, code: 'not_found', message: 'Target version not found.', sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
      }

      if (targetVersion.lifecycleStatus !== 'draft' || !targetVersion.normalizedPackage || targetVersion.packageInfo.status === 'invalid' || targetVersion.packageInfo.status === 'missing') {
        return { ok: false, code: 'invalid_transition', message: 'Scenario cloning is only available for draft versions with a valid normalized package.', sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
      }

      const sourceScenario = versions.flatMap((version) => version.savedScenarios.map((scenario) => ({ version, scenario }))).find((entry) => entry.scenario.id === input.sourceScenarioId)

      if (!sourceScenario) {
        return { ok: false, code: 'not_found', message: 'Source scenario not found.', sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
      }

      const parsedPayload = parseAdminAssessmentSimulationPayloadForPackage(targetVersion.normalizedPackage, targetVersion.packageInfo.schemaVersion, sourceScenario.scenario.payload)
      if (!parsedPayload.ok || !parsedPayload.normalizedRequest) {
        return {
          ok: false,
          code: 'validation_error',
          message: parsedPayload.errors[0]?.message ?? 'The saved scenario payload is malformed.',
          sourceVersionLabel: sourceScenario.version.versionLabel,
          importedCount: 0,
          skippedCount: 0,
          importedNames: [],
          skipped: [{ name: sourceScenario.scenario.name, reason: parsedPayload.errors[0]?.message ?? 'The saved scenario payload is malformed.' }],
        }
      }

      const validation = executeAdminAssessmentSimulationForPackage(targetVersion.normalizedPackage, targetVersion.packageInfo.schemaVersion, parsedPayload.normalizedRequest)
      if (!validation.ok) {
        return {
          ok: false,
          code: 'validation_error',
          message: validation.errors[0]?.message ?? 'The selected scenario is incompatible with the target version package.',
          sourceVersionLabel: sourceScenario.version.versionLabel,
          importedCount: 0,
          skippedCount: 0,
          importedNames: [],
          skipped: [{ name: sourceScenario.scenario.name, reason: validation.errors[0]?.message ?? 'The selected scenario is incompatible with the target version package.' }],
        }
      }

      const existingNames = await loadExistingScenarioNames(client, targetVersion.id)
      const nextName = resolveScenarioCloneName(sourceScenario.scenario.name, existingNames)
      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()

      await client.query(
        `insert into assessment_version_saved_scenarios (
           id,
           assessment_version_id,
           name,
           description,
           scenario_payload,
           status,
           source_version_id,
           source_scenario_id,
           provenance_json,
           created_by_identity_id,
           updated_by_identity_id,
           created_at,
           updated_at
         )
         values ($1, $2, $3, $4, $5::jsonb, 'active', $6, $7, $8::jsonb, $9, $9, $10::timestamptz, $10::timestamptz)`,
        [
          deps.createId(),
          targetVersion.id,
          nextName,
          sourceScenario.scenario.description,
          sourceScenario.scenario.payload,
          sourceScenario.version.id,
          sourceScenario.scenario.id,
          JSON.stringify({
            sourceVersionLabel: sourceScenario.version.versionLabel,
            sourceScenarioId: sourceScenario.scenario.id,
            summary: buildScenarioPayloadSummary(nextName, sourceScenario.version.versionLabel, sourceScenario.scenario.id),
            importMode: 'single_clone',
          }),
          actor?.id ?? null,
          nowIso,
        ],
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
        eventType: 'assessment_saved_scenario_cloned',
        summary: `Saved scenario ${sourceScenario.scenario.name} cloned into ${targetVersion.versionLabel} from v${sourceScenario.version.versionLabel}.`,
        assessmentId: input.assessmentId,
        assessmentName: targetVersion.normalizedPackage.meta.assessmentTitle,
        versionId: targetVersion.id,
        versionLabel: targetVersion.versionLabel,
        metadata: {
          sourceVersionId: sourceScenario.version.id,
          sourceVersionLabel: sourceScenario.version.versionLabel,
          sourceScenarioId: sourceScenario.scenario.id,
          clonedName: nextName,
        },
      })

      return {
        ok: true,
        code: 'imported',
        message: `Cloned ${sourceScenario.scenario.name} into v${targetVersion.versionLabel}.`,
        sourceVersionLabel: sourceScenario.version.versionLabel,
        importedCount: 1,
        skippedCount: 0,
        importedNames: [nextName],
        skipped: [],
      }
    })
  } catch (error) {
    logDatabaseError('[admin-assessment-management] Failed to clone saved scenario.', error)
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error), sourceVersionLabel: null, importedCount: 0, skippedCount: 0, importedNames: [], skipped: [] }
  }
}

export async function runAdminAssessmentScenarioSuite(
  input: AdminAssessmentScenarioSuiteRunInput,
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentScenarioSuiteRunResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return { ok: false, code: 'permission_denied', message: denied.message }
  }

  try {
    return await deps.withTransaction(async (client) => {
      const writePolicy = await resolveAssessmentVersionGovernanceWritePolicy(
        client.query.bind(client),
        deps.getAssessmentVersionSchemaCapabilities,
      )
      writePolicy.assertSupported('regression_snapshot', 'persisting the regression suite snapshot')

      const versions = await loadAssessmentVersionsWithSavedScenarios(client, input.assessmentId, deps.getAssessmentVersionSchemaCapabilities)
      const version = versions.find((entry) => entry.id === input.versionId)

      if (!version) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }

      if (!version.normalizedPackage || version.packageInfo.status === 'invalid' || version.packageInfo.status === 'missing') {
        return { ok: false, code: 'invalid_transition', message: 'A valid normalized package is required before running the regression suite.' }
      }

      const baseline = input.baselineVersionId
        ? versions.find((entry) => entry.id === input.baselineVersionId)
        : versions.find((entry) => entry.id !== version.id && entry.lifecycleStatus === 'published') ?? versions.find((entry) => entry.id !== version.id)

      const activeScenarios = version.savedScenarios.filter((scenario) => scenario.status === 'active')
      let passedCount = 0
      let warningCount = 0
      let failedCount = 0

      for (const scenario of activeScenarios) {
        const parsedPayload = parseAdminAssessmentSimulationPayloadForPackage(version.normalizedPackage, version.packageInfo.schemaVersion, scenario.payload)
        if (!parsedPayload.ok || !parsedPayload.normalizedRequest) {
          failedCount += 1
          continue
        }

        const simulation = executeAdminAssessmentSimulationForPackage(version.normalizedPackage, version.packageInfo.schemaVersion, parsedPayload.normalizedRequest)
        if (!simulation.ok) {
          failedCount += 1
        } else if (simulation.warnings.length > 0) {
          warningCount += 1
        } else {
          passedCount += 1
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      const snapshot = buildSuiteSnapshot({
        executedAt: nowIso,
        executedBy: actor?.full_name ?? null,
        baselineVersionId: baseline?.id ?? null,
        baselineVersionLabel: baseline?.versionLabel ?? null,
        totalScenarios: activeScenarios.length,
        passedCount,
        warningCount,
        failedCount,
      })

      await client.query(
        `update assessment_versions
         set latest_regression_suite_snapshot_json = $3::jsonb,
             updated_at = $4::timestamptz,
             updated_by_identity_id = $5
         where id = $1
           and assessment_definition_id = $2`,
        [input.versionId, input.assessmentId, JSON.stringify(snapshot), nowIso, actor?.id ?? null],
      )

      await client.query(
        `update assessment_definitions
         set updated_at = $2::timestamptz,
             updated_by_identity_id = $3
         where id = $1`,
        [input.assessmentId, nowIso, actor?.id ?? null],
      )

      await persistVersionReleaseReadiness(client, {
        assessmentId: input.assessmentId,
        versionId: version.id,
        actor,
        nowIso,
        createId: deps.createId,
        reason: 'suite_snapshot',
        getAssessmentVersionSchemaCapabilities: deps.getAssessmentVersionSchemaCapabilities,
        onUnsupported: 'skip',
      })

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_regression_suite_snapshot_updated',
        summary: `Regression suite snapshot updated for ${version.versionLabel} · ${snapshot.summaryText}`,
        assessmentId: input.assessmentId,
        assessmentName: version.normalizedPackage.meta.assessmentTitle,
        versionId: version.id,
        versionLabel: version.versionLabel,
        metadata: { ...snapshot },
      })

      return {
        ok: true,
        code: 'completed',
        message: activeScenarios.length > 0
          ? 'Regression suite completed and the latest snapshot was updated.'
          : 'No active saved scenarios were available, but the latest suite snapshot was updated to reflect that.',
        snapshot,
      }
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentScenarioSuiteRunResult>(error)
    if (compatibilityFailure) {
      return compatibilityFailure
    }
    logDatabaseError('[admin-assessment-management] Failed to run regression suite.', error)
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error) }
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
      const writePolicy = await runPublishStage('governance_write_policy', {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }, () => resolveAssessmentVersionGovernanceWritePolicy(
        client.query.bind(client),
        deps.getAssessmentVersionSchemaCapabilities,
      ))
      const publishGovernanceMissingColumns = Array.from(new Set([
        ...writePolicy.releaseReadiness.missingColumns,
        ...writePolicy.releaseSignOff.missingColumns,
      ]))
      if (publishGovernanceMissingColumns.length > 0) {
        throw new AssessmentVersionSchemaCompatibilityError(
          'publishing assessment versions',
          'release_governance',
          publishGovernanceMissingColumns,
        )
      }
      const versionRow = await runPublishStage('version_load', {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }, () => loadAssessmentVersionRowById(
        client,
        input.assessmentId,
        input.versionId,
        deps.getAssessmentVersionSchemaCapabilities,
      ))
      const assessmentName = normaliseNullableField(versionRow?.assessment_name) ?? 'Assessment'

      if (!versionRow) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }
      const classifiedPayload = classifyPackageContract(versionRow.definition_payload)
      const isHybridPayload = classifiedPayload.classifier === 'hybrid_mvp_contract_v1'

      if (!isHybridPayload) {
        await runPublishStage('runtime_schema_compatibility', {
          assessmentId: input.assessmentId,
          versionId: input.versionId,
        }, () => assertAssessmentRuntimeSchemaCompatibility(client.query.bind(client), 'publishing assessment versions'))
      }

      if (versionRow.lifecycle_status !== 'draft') {
        return {
          ok: false,
          code: 'invalid_transition',
          message: 'Only draft versions can be published.',
        }
      }

      if (input.expectedUpdatedAt && normaliseTimestamp(versionRow.updated_at) !== input.expectedUpdatedAt) {
        return {
          ok: false,
          code: 'concurrent_update',
          message: 'This version changed before it could be published. Reload the page and try again.',
        }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      const readinessState = await runPublishStage('release_readiness_persist', {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }, () => persistVersionReleaseReadiness(client, {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
        actor,
        nowIso,
        createId: deps.createId,
        reason: 'publish_attempt',
        emitAudit: false,
        getAssessmentVersionSchemaCapabilities: deps.getAssessmentVersionSchemaCapabilities,
        onUnsupported: 'error',
      }))
      const evaluatedVersion = readinessState.version
      if (!evaluatedVersion) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }
      const totalQuestions = evaluatedVersion.packageInfo.summary?.questionsCount ?? null
      const evaluatedSignOff = evaluatedVersion.releaseGovernance?.signOff ?? { status: 'unsigned' as const, signedOffBy: null, signedOffAt: null, isStale: false, staleReason: null }
      const publishReadiness = getAdminAssessmentVersionReadiness(evaluatedVersion)

      if (publishReadiness.status === 'not_ready') {
        const blockingSummary = publishReadiness.blockingIssues[0] ?? 'The attached package is missing or invalid.'

        await runOptionalPublishSideEffect('publish_blocked_audit', {
          assessmentId: input.assessmentId,
          versionId: input.versionId,
          reason: 'readiness_gating',
        }, () => writeAssessmentAuditEvent(client, {
          createId: deps.createId,
          actor,
          nowIso,
          eventType: 'assessment_publish_blocked_release_governance',
          summary: `Publish blocked for ${assessmentName} v${evaluatedVersion.versionLabel}: ${blockingSummary}`,
          assessmentId: input.assessmentId,
          assessmentName,
          versionId: input.versionId,
          versionLabel: evaluatedVersion.versionLabel,
          metadata: {
            readinessStatus: publishReadiness.status,
            blockingIssues: publishReadiness.blockingIssues,
            warnings: publishReadiness.warnings,
          },
        }))

        return {
          ok: false,
          code: 'invalid_transition',
          message: `Publish blocked: ${blockingSummary}`,
        }
      }

      if (publishReadiness.status === 'ready_with_warnings' && evaluatedSignOff.status !== 'signed_off') {
        await runOptionalPublishSideEffect('publish_blocked_audit', {
          assessmentId: input.assessmentId,
          versionId: input.versionId,
          reason: 'sign_off_required',
        }, () => writeAssessmentAuditEvent(client, {
          createId: deps.createId,
          actor,
          nowIso,
          eventType: 'assessment_publish_blocked_release_governance',
          summary: `Publish blocked for ${assessmentName} v${evaluatedVersion.versionLabel}: sign-off is required before publishing with warnings.`,
          assessmentId: input.assessmentId,
          assessmentName,
          versionId: input.versionId,
          versionLabel: evaluatedVersion.versionLabel,
          metadata: {
            readinessStatus: publishReadiness.status,
            warnings: publishReadiness.warnings,
            signOffStatus: evaluatedSignOff.status,
          },
        }))

        return {
          ok: false,
          code: 'invalid_transition',
          message: 'Publish is warning-gated: sign off this version before publishing while readiness warnings remain.',
        }
      }

      if (isHybridPayload) {
        // Hybrid MVP payloads execute directly from stored definition payloads without runtime question-bank materialization.
      } else if (evaluatedVersion.packageInfo.schemaVersion === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
        const runtimePackageV2 = parseStoredValidatedAssessmentPackageV2(evaluatedVersion.storedDefinitionPayload ?? null)
        const runtimeSupportV2 = evaluatePackageV2LiveRuntimeSupport(runtimePackageV2)

        if (!runtimePackageV2 || !runtimeSupportV2.supported) {
          const blockingSummary = runtimeSupportV2.issues[0]?.message
            ?? 'The Package Contract v2 payload is not supported by the live runtime execution path.'

          await runOptionalPublishSideEffect('publish_blocked_audit', {
            assessmentId: input.assessmentId,
            versionId: input.versionId,
            reason: 'v2_runtime_support',
          }, () => writeAssessmentAuditEvent(client, {
            createId: deps.createId,
            actor,
            nowIso,
            eventType: 'assessment_publish_blocked_release_governance',
            summary: `Publish blocked for ${assessmentName} v${evaluatedVersion.versionLabel}: ${blockingSummary}`,
            assessmentId: input.assessmentId,
            assessmentName,
            versionId: input.versionId,
            versionLabel: evaluatedVersion.versionLabel,
            metadata: {
              readinessStatus: publishReadiness.status,
              contractVersion: 'package_contract_v2',
              runtimeSupportIssues: runtimeSupportV2.issues,
            },
          }))

          return {
            ok: false,
            code: 'invalid_transition',
            message: `Publish blocked: ${blockingSummary}`,
          }
        }
      } else {
        const runtimePackage = evaluatedVersion.normalizedPackage
        if (!runtimePackage) {
          return {
            ok: false,
            code: 'invalid_transition',
            message: 'Publish blocked: the attached package could not be normalized for the live runtime.',
          }
        }

        const runtimeExecutableIssues = getAssessmentRuntimeExecutableIssues(runtimePackage)
        if (runtimeExecutableIssues.length > 0) {
          const blockingSummary = runtimeExecutableIssues[0]?.message ?? 'The package cannot run on the live runtime.'

          await runOptionalPublishSideEffect('publish_blocked_audit', {
            assessmentId: input.assessmentId,
            versionId: input.versionId,
            reason: 'runtime_executable_gating',
          }, () => writeAssessmentAuditEvent(client, {
            createId: deps.createId,
            actor,
            nowIso,
            eventType: 'assessment_publish_blocked_release_governance',
            summary: `Publish blocked for ${assessmentName} v${evaluatedVersion.versionLabel}: ${blockingSummary}`,
            assessmentId: input.assessmentId,
            assessmentName,
            versionId: input.versionId,
            versionLabel: evaluatedVersion.versionLabel,
            metadata: {
              readinessStatus: publishReadiness.status,
              runtimeExecutableIssues,
            },
          }))

          return {
            ok: false,
            code: 'invalid_transition',
            message: `Publish blocked: ${blockingSummary}`,
          }
        }

        const runtimeVersionResult = await runPublishStage('runtime_version_lookup', {
          assessmentId: input.assessmentId,
          versionId: input.versionId,
        }, () => client.query<{ key: string; name: string }>(
          `select key, name
           from assessment_versions
           where id = $1
             and assessment_definition_id = $2
           limit 1`,
          [input.versionId, input.assessmentId],
        ))
        const runtimeVersion = runtimeVersionResult.rows[0]
        if (!runtimeVersion) {
          return { ok: false, code: 'not_found', message: 'Version not found.' }
        }

        await runPublishStage('runtime_materialization', {
          assessmentId: input.assessmentId,
          versionId: input.versionId,
        }, () => materializeAssessmentRuntimeFromPackage(client, {
          assessmentVersionId: input.versionId,
          assessmentVersionKey: runtimeVersion.key,
          assessmentVersionName: runtimeVersion.name,
          normalizedPackage: runtimePackage,
        }))
      }

      await runPublishStage('archive_existing_published_versions', {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }, () => client.query(
        `update assessment_versions
         set lifecycle_status = 'archived',
             archived_at = case when lifecycle_status = 'published' then $2::timestamptz else archived_at end,
             updated_at = $2::timestamptz,
             updated_by_identity_id = $3
         where assessment_definition_id = $1
           and lifecycle_status = 'published'`,
        [input.assessmentId, nowIso, actor?.id ?? null],
      ))

      const publishResult = await runPublishStage('publish_version_update', {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }, () => client.query(
        `update assessment_versions
         set lifecycle_status = 'published',
             is_active = true,
             total_questions = $5,
             published_at = $3::timestamptz,
             archived_at = null,
             updated_at = $3::timestamptz,
             updated_by_identity_id = $4,
             published_by_identity_id = $4
         where id = $1
           and assessment_definition_id = $2
         returning id`,
        [input.versionId, input.assessmentId, nowIso, actor?.id ?? null, totalQuestions],
      ))

      if (!publishResult.rows[0]) {
        return {
          ok: false,
          code: 'concurrent_update',
          message: 'The version could not be published because it changed mid-flight.',
        }
      }

      await runPublishStage('live_pointer_update', {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }, () => client.query(
        `update assessment_definitions
         set lifecycle_status = 'published',
             current_published_version_id = $2,
             updated_at = $3::timestamptz,
             updated_by_identity_id = $4
         where id = $1`,
        [input.assessmentId, input.versionId, nowIso, actor?.id ?? null],
      ))

      await runOptionalPublishSideEffect('audit_publish_event', {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }, () => writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_version_published',
        summary: `Version ${evaluatedVersion.versionLabel} published for ${assessmentName}.`,
        assessmentId: input.assessmentId,
        assessmentName,
        versionId: input.versionId,
        versionLabel: evaluatedVersion.versionLabel,
        metadata: {
          lifecycleStatus: 'published',
          readinessStatus: publishReadiness.status,
          warningChecks: publishReadiness.checks.filter((check) => check.status === 'warning').map((check) => check.key),
          signOffStatus: evaluatedSignOff.status,
        },
      }))

      return {
        ok: true,
        code: 'published',
        message: 'Version published successfully.',
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentVersionMutationResult>(error)
    if (compatibilityFailure) {
      await logDatabaseSessionDiagnostics('[admin-assessment-management] Publish schema compatibility database session.', {
        metadata: {
          assessmentId: input.assessmentId,
          versionId: input.versionId,
          code: compatibilityFailure.code,
        },
        onceKey: `publish-schema-compatibility:${input.assessmentId}:${input.versionId}`,
      })
      return compatibilityFailure
    }
    const runtimeCompatibilityFailure = buildAssessmentRuntimeSchemaCompatibilityResult<AdminAssessmentVersionMutationResult>(error)
    if (runtimeCompatibilityFailure) {
      await logDatabaseSessionDiagnostics('[admin-assessment-management] Publish runtime schema database session.', {
        metadata: {
          assessmentId: input.assessmentId,
          versionId: input.versionId,
          code: runtimeCompatibilityFailure.code,
        },
        onceKey: `publish-runtime-schema-compatibility:${input.assessmentId}:${input.versionId}`,
      })
      return runtimeCompatibilityFailure
    }
    if (findPublishStageFailure(error).publishStage === 'publish_version_update') {
      return {
        ok: false,
        code: 'unknown_error',
        message: 'Publish could not persist the version lifecycle transition. Review server logs for the failing publish stage and retry once the persistence issue is resolved.',
      }
    }
    const mappedDatabaseFailure = mapPublishDatabaseFailure(error)
    if (mappedDatabaseFailure) {
      return mappedDatabaseFailure
    }
    logDatabaseError('[admin-assessment-management] Failed to publish version.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}


export async function refreshAdminAssessmentVersionReleaseReadiness(
  input: { assessmentId: string; versionId: string },
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentVersionMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  try {
    return await deps.withTransaction(async (client) => {
      const writePolicy = await resolveAssessmentVersionGovernanceWritePolicy(
        client.query.bind(client),
        deps.getAssessmentVersionSchemaCapabilities,
      )
      writePolicy.assertSupported('release_readiness', 'refreshing release readiness')

      const versionLookup = await client.query<{ id: string; version_label: string; assessment_name: string }>(
        `select av.id, av.version_label, ad.name as assessment_name
         from assessment_versions av
         inner join assessment_definitions ad on ad.id = av.assessment_definition_id
         where av.id = $1 and av.assessment_definition_id = $2
         limit 1`,
        [input.versionId, input.assessmentId],
      )
      const lookup = versionLookup.rows[0]
      if (!lookup) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      const refreshed = await persistVersionReleaseReadiness(client, {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
        actor,
        nowIso,
        createId: deps.createId,
        reason: 'manual_refresh',
        getAssessmentVersionSchemaCapabilities: deps.getAssessmentVersionSchemaCapabilities,
        onUnsupported: 'error',
      })

      return {
        ok: true,
        code: 'created',
        message: refreshed.summary ? `Readiness refreshed: ${refreshed.summary.summaryText}` : 'Release readiness refreshed.',
        assessmentId: input.assessmentId,
        versionId: input.versionId,
      }
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentVersionMutationResult>(error)
    if (compatibilityFailure) {
      return compatibilityFailure
    }
    logDatabaseError('[admin-assessment-management] Failed to refresh release readiness.', error)
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error) }
  }
}

export async function signOffAdminAssessmentVersion(
  input: { assessmentId: string; versionId: string },
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentVersionMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  try {
    return await deps.withTransaction(async (client) => {
      const writePolicy = await resolveAssessmentVersionGovernanceWritePolicy(
        client.query.bind(client),
        deps.getAssessmentVersionSchemaCapabilities,
      )
      writePolicy.assertSupported('release_readiness', 'recording release sign-off')
      writePolicy.assertSupported('release_sign_off', 'recording release sign-off')

      const versions = await loadAssessmentVersionsWithSavedScenarios(client, input.assessmentId, deps.getAssessmentVersionSchemaCapabilities)
      const version = versions.find((entry) => entry.id === input.versionId) ?? null
      if (!version) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }
      if (version.lifecycleStatus !== 'draft') {
        return { ok: false, code: 'invalid_transition', message: 'Only draft versions can be signed off.' }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      const refreshed = await persistVersionReleaseReadiness(client, {
        assessmentId: input.assessmentId,
        versionId: input.versionId,
        actor,
        nowIso,
        createId: deps.createId,
        reason: 'manual_refresh',
        emitAudit: false,
        getAssessmentVersionSchemaCapabilities: deps.getAssessmentVersionSchemaCapabilities,
        onUnsupported: 'error',
      })
      const evaluatedVersion = refreshed.version ?? version
      const readiness = getAdminAssessmentVersionReadiness(evaluatedVersion)

      if (readiness.status === 'not_ready') {
        return { ok: false, code: 'invalid_transition', message: 'Resolve the failing readiness checks before signing off this version.' }
      }

      await client.query(
        `update assessment_versions
         set sign_off_status = 'signed_off',
             sign_off_by_identity_id = $3,
             sign_off_at = $4::timestamptz,
             sign_off_material_updated_at = $5::timestamptz
         where id = $1
           and assessment_definition_id = $2`,
        [input.versionId, input.assessmentId, actor?.id ?? null, nowIso, evaluatedVersion.materialUpdatedAt],
      )

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_release_sign_off_recorded',
        summary: `Release sign-off recorded for ${version.normalizedPackage?.meta.assessmentTitle ?? 'assessment'} v${version.versionLabel}.`,
        assessmentId: input.assessmentId,
        assessmentName: version.normalizedPackage?.meta.assessmentTitle ?? 'Assessment',
        versionId: version.id,
        versionLabel: version.versionLabel,
        metadata: { readinessStatus: readiness.status, materialUpdatedAt: evaluatedVersion.materialUpdatedAt },
      })

      return { ok: true, code: 'created', message: 'Version signed off.', assessmentId: input.assessmentId, versionId: input.versionId }
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentVersionMutationResult>(error)
    if (compatibilityFailure) {
      return compatibilityFailure
    }
    logDatabaseError('[admin-assessment-management] Failed to sign off version.', error)
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error) }
  }
}

export async function removeAdminAssessmentVersionSignOff(
  input: { assessmentId: string; versionId: string },
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentVersionMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  try {
    return await deps.withTransaction(async (client) => {
      const writePolicy = await resolveAssessmentVersionGovernanceWritePolicy(
        client.query.bind(client),
        deps.getAssessmentVersionSchemaCapabilities,
      )
      writePolicy.assertSupported('release_sign_off', 'removing release sign-off')

      const versionLookup = await client.query<{ id: string; version_label: string; assessment_name: string }>(
        `select av.id, av.version_label, ad.name as assessment_name
         from assessment_versions av
         inner join assessment_definitions ad on ad.id = av.assessment_definition_id
         where av.id = $1 and av.assessment_definition_id = $2
         limit 1`,
        [input.versionId, input.assessmentId],
      )
      const version = versionLookup.rows[0]
      if (!version) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      await client.query(
        `update assessment_versions
         set sign_off_status = 'unsigned',
             sign_off_by_identity_id = null,
             sign_off_at = null,
             sign_off_material_updated_at = null
         where id = $1
           and assessment_definition_id = $2`,
        [input.versionId, input.assessmentId],
      )

      await writeAssessmentAuditEvent(client, {
        createId: deps.createId,
        actor,
        nowIso,
        eventType: 'assessment_release_sign_off_removed',
        summary: `Release sign-off removed for ${version.assessment_name} v${version.version_label}.`,
        assessmentId: input.assessmentId,
        assessmentName: version.assessment_name,
        versionId: input.versionId,
        versionLabel: version.version_label,
      })

      return { ok: true, code: 'created', message: 'Release sign-off removed.', assessmentId: input.assessmentId, versionId: input.versionId }
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentVersionMutationResult>(error)
    if (compatibilityFailure) {
      return compatibilityFailure
    }
    logDatabaseError('[admin-assessment-management] Failed to remove sign-off.', error)
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error) }
  }
}

export async function updateAdminAssessmentVersionReleaseNotes(
  input: { assessmentId: string; versionId: string; releaseNotes: string },
  dependencies: Partial<AssessmentMutationDependencies> = {},
): Promise<AdminAssessmentVersionMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const fieldErrors = validateReleaseNotesInput(input.releaseNotes)
  if (fieldErrors) {
    return { ok: false, code: 'validation_error', message: 'Release notes are invalid.', fieldErrors }
  }

  try {
    return await deps.withTransaction(async (client) => {
      const writePolicy = await resolveAssessmentVersionGovernanceWritePolicy(
        client.query.bind(client),
        deps.getAssessmentVersionSchemaCapabilities,
      )
      writePolicy.assertSupported('release_notes', 'saving release notes')

      const versionLookup = await client.query<{ id: string; version_label: string; assessment_name: string }>(
        `select av.id, av.version_label, ad.name as assessment_name
         from assessment_versions av
         inner join assessment_definitions ad on ad.id = av.assessment_definition_id
         where av.id = $1 and av.assessment_definition_id = $2
         limit 1`,
        [input.versionId, input.assessmentId],
      )
      const version = versionLookup.rows[0]
      if (!version) {
        return { ok: false, code: 'not_found', message: 'Version not found.' }
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      await client.query(
        `update assessment_versions
         set release_notes = $3,
             updated_by_identity_id = $4,
             updated_at = $5::timestamptz
         where id = $1
           and assessment_definition_id = $2`,
        [input.versionId, input.assessmentId, normaliseNullableField(input.releaseNotes), actor?.id ?? null, nowIso],
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
        eventType: 'assessment_release_notes_updated',
        summary: `Release notes updated for ${version.assessment_name} v${version.version_label}.`,
        assessmentId: input.assessmentId,
        assessmentName: version.assessment_name,
        versionId: input.versionId,
        versionLabel: version.version_label,
        metadata: { hasReleaseNotes: Boolean(normaliseNullableField(input.releaseNotes)) },
      })

      return { ok: true, code: 'created', message: 'Release notes saved.', assessmentId: input.assessmentId, versionId: input.versionId }
    })
  } catch (error) {
    const compatibilityFailure = buildAssessmentVersionSchemaCompatibilityResult<AdminAssessmentVersionMutationResult>(error)
    if (compatibilityFailure) {
      return compatibilityFailure
    }
    logDatabaseError('[admin-assessment-management] Failed to update release notes.', error)
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error) }
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
    logDatabaseError('[admin-assessment-management] Failed to archive version.', error)
    return {
      ok: false,
      code: 'unknown_error',
      message: describeDatabaseError(error),
    }
  }
}

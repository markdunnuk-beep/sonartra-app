import { auth, currentUser } from '@clerk/nextjs/server'
import type { PoolClient } from 'pg'
import { resolveAdminAccess } from '@/lib/admin/access'
import type { AdminAssessmentDetailData, AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import {
  compareAssessmentScenarioExecutions,
  executeAssessmentScenarioForVersion,
  selectAssessmentRegressionBaseline,
  summarizeAssessmentRegressionSuite,
  summarizeSavedAssessmentScenario,
  validateSavedAssessmentScenarioPayload,
  type AdminAssessmentRegressionSuiteSummary,
  type AdminAssessmentScenarioSummary,
  type AdminSavedAssessmentScenarioRecord,
  type AdminAssessmentScenarioType,
  type AdminAssessmentScenarioStatus,
  type AdminAssessmentScenarioRegressionResult,
} from '@/lib/admin/domain/assessment-regression'
import { getAdminAssessmentDetailData, mapAssessmentVersionRows } from '@/lib/admin/server/assessment-management'
import { getAdminAssessmentVersionSchemaCapabilities } from '@/lib/admin/server/assessment-version-schema-capabilities'
import { buildAssessmentVersionByIdQuery } from '@/lib/admin/server/assessment-version-detail-sql'
import { describeDatabaseError, queryDb, withTransaction } from '@/lib/db'

interface ActorRow {
  id: string
  email: string
  full_name: string
}

interface ScenarioRow {
  id: string | null
  assessment_definition_id: string | null
  assessment_version_id: string | null
  name: string | null
  description: string | null
  scenario_type: string | null
  status: string | null
  locale: string | null
  sample_response_payload: string | null
  created_by_identity_id: string | null
  updated_by_identity_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
}

interface VersionLookupRow {
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
  created_at: string | Date | null
  updated_at: string | Date | null
  published_at: string | Date | null
  archived_at: string | Date | null
  created_by_name: string | null
  updated_by_name: string | null
  published_by_name: string | null
  assessment_name: string | null
}

export interface AdminAssessmentScenarioMutationInput {
  assessmentId: string
  versionId: string
  scenarioId?: string | null
  name: string
  description?: string | null
  scenarioType?: string | null
  locale?: string | null
  sampleResponsePayload: string
}

export interface AdminAssessmentScenarioMutationResult {
  ok: boolean
  code: 'created' | 'updated' | 'validation_error' | 'permission_denied' | 'not_found' | 'blocked' | 'unknown_error'
  message: string
  fieldErrors?: {
    name?: string
    scenarioType?: string
    sampleResponsePayload?: string
  }
}

export interface AdminAssessmentScenarioArchiveResult {
  ok: boolean
  code: 'archived' | 'permission_denied' | 'not_found' | 'unknown_error'
  message: string
}

export interface AdminAssessmentScenarioRunResult {
  ok: boolean
  code: 'completed' | 'blocked' | 'permission_denied' | 'not_found' | 'unknown_error'
  message: string
  result: AdminAssessmentScenarioRegressionResult | null
}

export interface AdminAssessmentRegressionSuiteRunResult {
  ok: boolean
  code: 'completed' | 'blocked' | 'permission_denied' | 'not_found' | 'unknown_error'
  message: string
  suite: AdminAssessmentRegressionSuiteSummary | null
}

function normalizeTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) return null
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
  }
  return Number.isNaN(value.getTime()) ? null : value.toISOString()
}

function normalizeString(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function isScenarioType(value: string | null | undefined): value is AdminAssessmentScenarioType {
  return value === 'baseline' || value === 'edge_case' || value === 'regression' || value === 'stress' || value === 'custom'
}

function isScenarioStatus(value: string | null | undefined): value is AdminAssessmentScenarioStatus {
  return value === 'active' || value === 'archived'
}

function mapScenarioRows(rows: ScenarioRow[], version: Pick<AdminAssessmentVersionRecord, 'normalizedPackage' | 'packageInfo'>): AdminAssessmentScenarioSummary[] {
  return rows.flatMap((row) => {
    const id = normalizeString(row.id)
    const assessmentDefinitionId = normalizeString(row.assessment_definition_id)
    const assessmentVersionId = normalizeString(row.assessment_version_id)
    const name = normalizeString(row.name)
    const sampleResponsePayload = row.sample_response_payload ?? null
    const createdAt = normalizeTimestamp(row.created_at)
    const updatedAt = normalizeTimestamp(row.updated_at)

    if (!id || !assessmentDefinitionId || !assessmentVersionId || !name || !sampleResponsePayload || !createdAt || !updatedAt) {
      return []
    }

    const scenario: AdminSavedAssessmentScenarioRecord = {
      id,
      assessmentDefinitionId,
      assessmentVersionId,
      name,
      description: normalizeString(row.description),
      scenarioType: isScenarioType(row.scenario_type) ? row.scenario_type : 'custom',
      status: isScenarioStatus(row.status) ? row.status : 'active',
      locale: normalizeString(row.locale),
      sampleResponsePayload,
      createdByIdentityId: normalizeString(row.created_by_identity_id),
      updatedByIdentityId: normalizeString(row.updated_by_identity_id),
      createdAt,
      updatedAt,
    }

    return [summarizeSavedAssessmentScenario(scenario, version)]
  })
}

async function ensureAdminAuditActor(client: PoolClient): Promise<ActorRow | null> {
  const [{ userId }, clerkUser] = await Promise.all([auth(), currentUser()])
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? null
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim()
    || clerkUser?.fullName?.trim()
    || email
    || 'Sonartra Admin'

  if (!email) return null

  const existing = await client.query<ActorRow>(
    `select id, email, full_name from admin_identities where auth_subject = $1 or email = $2 order by case when auth_subject = $1 then 0 else 1 end limit 1`,
    [userId, email],
  )
  if (existing.rows[0]) return existing.rows[0]
  if (!userId) return null

  const inserted = await client.query<ActorRow>(
    `insert into admin_identities (id, email, full_name, identity_type, auth_provider, auth_subject, status, last_activity_at, created_at)
     values ($1, $2, $3, 'internal', 'clerk', $4, 'active', $5, $5)
     returning id, email, full_name`,
    [crypto.randomUUID(), email, fullName, userId, new Date().toISOString()],
  )
  return inserted.rows[0] ?? null
}

async function requireScenarioAccess() {
  const access = await resolveAdminAccess()
  if (!access.isAuthenticated || !access.isAllowed) {
    return { ok: false, code: 'permission_denied', message: 'You do not have permission to manage assessment scenarios.' } as const
  }
  return null
}

async function writeScenarioAuditEvent(
  client: PoolClient,
  input: {
    actor: ActorRow | null
    nowIso: string
    eventType: string
    summary: string
    assessmentId: string
    assessmentName: string
    versionId: string
    versionLabel: string
    metadata?: Record<string, unknown>
  },
) {
  if (!input.actor) return

  const createId = () => crypto.randomUUID()
  await client.query(
    `insert into access_audit_events (
       id, identity_id, organisation_id, event_type, event_summary, actor_name, actor_identity_id, happened_at, metadata, entity_type, entity_id, entity_label, entity_secondary
     ) values ($1, null, null, $2, $3, $4, $5, $6::timestamptz, $7::jsonb, 'assessment_version', $8, $9, $10)`,
    [createId(), input.eventType, input.summary, input.actor.full_name, input.actor.id, input.nowIso, JSON.stringify(input.metadata ?? {}), input.versionId, `${input.assessmentName} v${input.versionLabel}`, input.assessmentId],
  )
  await client.query(
    `insert into access_audit_events (
       id, identity_id, organisation_id, event_type, event_summary, actor_name, actor_identity_id, happened_at, metadata, entity_type, entity_id, entity_label, entity_secondary
     ) values ($1, null, null, $2, $3, $4, $5, $6::timestamptz, $7::jsonb, 'assessment', $8, $9, $10)`,
    [createId(), input.eventType, input.summary, input.actor.full_name, input.actor.id, input.nowIso, JSON.stringify(input.metadata ?? {}), input.assessmentId, input.assessmentName, input.versionLabel],
  )
}

async function getVersionByIds(query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>, assessmentId: string, versionId: string): Promise<{ version: AdminAssessmentVersionRecord | null; assessmentName: string | null }> {
  const capabilities = await getAdminAssessmentVersionSchemaCapabilities({ queryDb: query as typeof queryDb })
  const result = await query(
    buildAssessmentVersionByIdQuery(capabilities, { includeAssessmentName: true }),
    [versionId, assessmentId],
  )

  return {
    version: mapAssessmentVersionRows(result.rows as VersionLookupRow[] as never)[0] ?? null,
    assessmentName: normalizeString((result.rows[0] as VersionLookupRow | undefined)?.assessment_name),
  }
}

export async function listAdminAssessmentVersionScenarios(version: AdminAssessmentVersionRecord): Promise<AdminAssessmentScenarioSummary[]> {
  const result = await queryDb<ScenarioRow>(
    `select id, assessment_definition_id, assessment_version_id, name, description, scenario_type, status, locale, sample_response_payload, created_by_identity_id, updated_by_identity_id, created_at, updated_at
     from assessment_saved_scenarios
     where assessment_version_id = $1
     order by case when status = 'active' then 0 else 1 end, lower(name) asc, updated_at desc`,
    [version.id],
  )

  return mapScenarioRows(result.rows ?? [], version)
}

function validateScenarioInput(input: AdminAssessmentScenarioMutationInput): AdminAssessmentScenarioMutationResult['fieldErrors'] {
  const fieldErrors: NonNullable<AdminAssessmentScenarioMutationResult['fieldErrors']> = {}
  const name = input.name.trim()
  if (name.length < 2) fieldErrors.name = 'Scenario name must contain at least 2 characters.'
  if (name.length > 120) fieldErrors.name = 'Scenario name must be 120 characters or fewer.'
  if (input.scenarioType && !isScenarioType(input.scenarioType)) fieldErrors.scenarioType = 'Select a supported scenario type.'
  return Object.keys(fieldErrors).length ? fieldErrors : undefined
}

export async function createOrUpdateAdminAssessmentScenario(input: AdminAssessmentScenarioMutationInput): Promise<AdminAssessmentScenarioMutationResult> {
  const denied = await requireScenarioAccess()
  if (denied) return denied

  const fieldErrors = validateScenarioInput(input)
  if (fieldErrors) {
    return { ok: false, code: 'validation_error', message: 'Scenario details are invalid.', fieldErrors }
  }

  try {
    return await withTransaction(async (client) => {
      const { version, assessmentName } = await getVersionByIds(client.query.bind(client), input.assessmentId, input.versionId)
      if (!version || !assessmentName) {
        return { ok: false, code: 'not_found', message: 'Assessment version not found.' }
      }

      const validation = validateSavedAssessmentScenarioPayload(input.sampleResponsePayload, version)
      if (!validation.ok) {
        return {
          ok: false,
          code: 'validation_error',
          message: 'Scenario payload is invalid.',
          fieldErrors: { sampleResponsePayload: validation.issues[0]?.message ?? 'Scenario payload is invalid.' },
        }
      }

      const actor = await ensureAdminAuditActor(client)
      const nowIso = new Date().toISOString()
      const scenarioType = isScenarioType(input.scenarioType) ? input.scenarioType : 'custom'
      const locale = normalizeString(input.locale) ?? validation.normalizedRequest?.locale ?? version.normalizedPackage?.meta.defaultLocale ?? null

      if (input.scenarioId) {
        const updated = await client.query(
          `update assessment_saved_scenarios
           set name = $4,
               description = $5,
               scenario_type = $6,
               locale = $7,
               sample_response_payload = $8::jsonb,
               updated_by_identity_id = $9,
               updated_at = $10::timestamptz
           where id = $1 and assessment_definition_id = $2 and assessment_version_id = $3
           returning id`,
          [input.scenarioId, input.assessmentId, input.versionId, input.name.trim(), normalizeString(input.description), scenarioType, locale, input.sampleResponsePayload, actor?.id ?? null, nowIso],
        )
        if (!updated.rows[0]) {
          return { ok: false, code: 'not_found', message: 'Saved scenario not found.' }
        }

        await writeScenarioAuditEvent(client, {
          actor,
          nowIso,
          eventType: 'assessment_scenario_updated',
          summary: `Saved regression scenario "${input.name.trim()}" updated for ${assessmentName} v${version.versionLabel}.`,
          assessmentId: input.assessmentId,
          assessmentName,
          versionId: input.versionId,
          versionLabel: version.versionLabel,
          metadata: { scenarioId: input.scenarioId, scenarioType, locale },
        })

        return { ok: true, code: 'updated', message: 'Scenario updated successfully.' }
      }

      await client.query(
        `insert into assessment_saved_scenarios (
           id, assessment_definition_id, assessment_version_id, name, description, scenario_type, status, locale, sample_response_payload, created_by_identity_id, updated_by_identity_id, created_at, updated_at
         ) values ($1, $2, $3, $4, $5, $6, 'active', $7, $8::jsonb, $9, $9, $10::timestamptz, $10::timestamptz)`,
        [crypto.randomUUID(), input.assessmentId, input.versionId, input.name.trim(), normalizeString(input.description), scenarioType, locale, input.sampleResponsePayload, actor?.id ?? null, nowIso],
      )

      await writeScenarioAuditEvent(client, {
        actor,
        nowIso,
        eventType: 'assessment_scenario_created',
        summary: `Saved regression scenario "${input.name.trim()}" created for ${assessmentName} v${version.versionLabel}.`,
        assessmentId: input.assessmentId,
        assessmentName,
        versionId: input.versionId,
        versionLabel: version.versionLabel,
        metadata: { scenarioType, locale },
      })

      return { ok: true, code: 'created', message: 'Scenario saved successfully.' }
    })
  } catch (error) {
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error) }
  }
}

export async function archiveAdminAssessmentScenario(input: { assessmentId: string; versionId: string; scenarioId: string }): Promise<AdminAssessmentScenarioArchiveResult> {
  const denied = await requireScenarioAccess()
  if (denied) return denied

  try {
    return await withTransaction(async (client) => {
      const { version, assessmentName } = await getVersionByIds(client.query.bind(client), input.assessmentId, input.versionId)
      if (!version || !assessmentName) {
        return { ok: false, code: 'not_found', message: 'Assessment version not found.' }
      }

      const actor = await ensureAdminAuditActor(client)
      const nowIso = new Date().toISOString()
      const updated = await client.query<{ name: string }>(
        `update assessment_saved_scenarios
         set status = 'archived', updated_by_identity_id = $4, updated_at = $5::timestamptz
         where id = $1 and assessment_definition_id = $2 and assessment_version_id = $3
         returning name`,
        [input.scenarioId, input.assessmentId, input.versionId, actor?.id ?? null, nowIso],
      )
      if (!updated.rows[0]) {
        return { ok: false, code: 'not_found', message: 'Saved scenario not found.' }
      }

      await writeScenarioAuditEvent(client, {
        actor,
        nowIso,
        eventType: 'assessment_scenario_archived',
        summary: `Saved regression scenario "${updated.rows[0].name}" archived for ${assessmentName} v${version.versionLabel}.`,
        assessmentId: input.assessmentId,
        assessmentName,
        versionId: input.versionId,
        versionLabel: version.versionLabel,
        metadata: { scenarioId: input.scenarioId },
      })

      return { ok: true, code: 'archived', message: 'Scenario archived.' }
    })
  } catch (error) {
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error) }
  }
}

export async function getAdminAssessmentScenarioById(input: { assessmentId: string; versionId: string; scenarioId: string }): Promise<AdminAssessmentScenarioSummary | null> {
  const { version } = await getVersionByIds((sql, params) => queryDb(sql, params), input.assessmentId, input.versionId)
  if (!version) return null
  const result = await queryDb<ScenarioRow>(
    `select id, assessment_definition_id, assessment_version_id, name, description, scenario_type, status, locale, sample_response_payload, created_by_identity_id, updated_by_identity_id, created_at, updated_at
     from assessment_saved_scenarios
     where id = $1 and assessment_definition_id = $2 and assessment_version_id = $3
     limit 1`,
    [input.scenarioId, input.assessmentId, input.versionId],
  )
  return mapScenarioRows(result.rows ?? [], version)[0] ?? null
}

async function getRunContext(assessmentId: string, versionId: string, scenarioId: string): Promise<{ detailData: AdminAssessmentDetailData | null; version: AdminAssessmentVersionRecord | null; scenario: AdminAssessmentScenarioSummary | null }> {
  const detailData = await getAdminAssessmentDetailData(assessmentId)
  const version = detailData?.versions.find((entry) => entry.id === versionId) ?? null
  if (!detailData || !version) {
    return { detailData: null, version: null, scenario: null }
  }
  const scenario = await getAdminAssessmentScenarioById({ assessmentId, versionId, scenarioId })
  return { detailData, version, scenario }
}

export async function runAdminAssessmentScenario(input: { assessmentId: string; versionId: string; scenarioId: string }): Promise<AdminAssessmentScenarioRunResult> {
  const denied = await requireScenarioAccess()
  if (denied) return { ok: false, code: 'permission_denied', message: denied.message, result: null }

  try {
    const { detailData, version, scenario } = await getRunContext(input.assessmentId, input.versionId, input.scenarioId)
    if (!detailData || !version || !scenario) {
      return { ok: false, code: 'not_found', message: 'Saved scenario not found.', result: null }
    }

    const baselineSelection = selectAssessmentRegressionBaseline(version, detailData.versions, scenario.assessmentVersionId)
    const baselineVersion = baselineSelection.versionId
      ? detailData.versions.find((entry) => entry.id === baselineSelection.versionId) ?? null
      : null
    const current = executeAssessmentScenarioForVersion(scenario, version)
    const baseline = baselineVersion ? executeAssessmentScenarioForVersion(scenario, baselineVersion) : null
    const result = compareAssessmentScenarioExecutions(scenario, current, baseline, baselineSelection)

    await withTransaction(async (client) => {
      const actor = await ensureAdminAuditActor(client)
      const nowIso = new Date().toISOString()
      await writeScenarioAuditEvent(client, {
        actor,
        nowIso,
        eventType: result.comparison.status === 'blocked' ? 'assessment_regression_scenario_blocked' : 'assessment_regression_scenario_executed',
        summary: `Regression scenario "${scenario.name}" executed for ${detailData.assessment.name} v${version.versionLabel} · ${result.comparison.status.replace(/_/g, ' ')}.`,
        assessmentId: input.assessmentId,
        assessmentName: detailData.assessment.name,
        versionId: version.id,
        versionLabel: version.versionLabel,
        metadata: { scenarioId: scenario.id, comparisonStatus: result.comparison.status, baselineType: baselineSelection.type, baselineVersionId: baselineSelection.versionId },
      })
    })

    return { ok: true, code: result.comparison.status === 'blocked' ? 'blocked' : 'completed', message: result.comparison.summary, result }
  } catch (error) {
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error), result: null }
  }
}

export async function runAdminAssessmentRegressionSuite(input: { assessmentId: string; versionId: string }): Promise<AdminAssessmentRegressionSuiteRunResult> {
  const denied = await requireScenarioAccess()
  if (denied) return { ok: false, code: 'permission_denied', message: denied.message, suite: null }

  try {
    const detailData = await getAdminAssessmentDetailData(input.assessmentId)
    const version = detailData?.versions.find((entry) => entry.id === input.versionId) ?? null
    if (!detailData || !version) {
      return { ok: false, code: 'not_found', message: 'Assessment version not found.', suite: null }
    }

    const scenarios = (await listAdminAssessmentVersionScenarios(version)).filter((entry) => entry.status === 'active')
    const baseline = selectAssessmentRegressionBaseline(version, detailData.versions, version.id)
    const baselineVersion = baseline.versionId ? detailData.versions.find((entry) => entry.id === baseline.versionId) ?? null : null
    const results = scenarios.map((scenario) => compareAssessmentScenarioExecutions(
      scenario,
      executeAssessmentScenarioForVersion(scenario, version),
      baselineVersion ? executeAssessmentScenarioForVersion(scenario, baselineVersion) : null,
      baseline,
    ))
    const suite = summarizeAssessmentRegressionSuite(results, baseline)

    await withTransaction(async (client) => {
      const actor = await ensureAdminAuditActor(client)
      const nowIso = new Date().toISOString()
      await writeScenarioAuditEvent(client, {
        actor,
        nowIso,
        eventType: 'assessment_regression_suite_run',
        summary: `Regression suite executed for ${detailData.assessment.name} v${version.versionLabel} · ${suite.summary}`,
        assessmentId: input.assessmentId,
        assessmentName: detailData.assessment.name,
        versionId: version.id,
        versionLabel: version.versionLabel,
        metadata: { totalScenarios: suite.totals.totalScenarios, reviewRequired: suite.totals.reviewRequired, blocked: suite.totals.blocked, baselineType: baseline.type, baselineVersionId: baseline.versionId },
      })
    })

    return { ok: true, code: suite.status === 'blocked' ? 'blocked' : 'completed', message: suite.summary, suite }
  } catch (error) {
    return { ok: false, code: 'unknown_error', message: describeDatabaseError(error), suite: null }
  }
}

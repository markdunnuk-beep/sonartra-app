import type { PoolClient } from 'pg'

import { resolveAdminAccess, type AdminAccessContext } from '@/lib/admin/access'
import { queryDb, withTransaction } from '@/lib/db'

export type AssessmentAssignmentStatus = 'assigned' | 'in_progress' | 'completed_processing' | 'results_ready' | 'failed' | 'cancelled'

interface AssignmentLifecycleRow {
  id: string
}

interface AdminAssignmentDependencies {
  resolveAdminAccess: () => Promise<AdminAccessContext>
  queryDb: typeof queryDb
  withTransaction: typeof withTransaction
}

const defaultAdminDependencies: AdminAssignmentDependencies = {
  resolveAdminAccess: () => resolveAdminAccess(),
  queryDb,
  withTransaction,
}

export interface AdminAssessmentAssignmentRecord {
  id: string
  targetUserId: string
  targetUserEmail: string
  targetUserName: string
  assessmentVersionId: string
  assessmentVersionLabel: string
  status: AssessmentAssignmentStatus
  assessmentId: string | null
  latestResultId: string | null
  assignedAt: string
  startedAt: string | null
  completedAt: string | null
  resultsReadyAt: string | null
  failedAt: string | null
  assignedByName: string | null
  failureMessage: string | null
}

export async function markAssignmentInProgressForAssessment(assessmentId: string, client?: Pick<PoolClient, 'query'>) {
  const query = client?.query.bind(client) ?? queryDb
  await query(
    `UPDATE assessment_repository_assignments
     SET status = 'in_progress',
         started_at = COALESCE(started_at, NOW()),
         updated_at = NOW()
     WHERE assessment_id = $1
       AND status = 'assigned'`,
    [assessmentId],
  )
}

export async function markAssignmentCompletionProcessing(assessmentId: string, client?: Pick<PoolClient, 'query'>) {
  const query = client?.query.bind(client) ?? queryDb
  await query(
    `UPDATE assessment_repository_assignments
     SET status = CASE WHEN status IN ('assigned', 'in_progress') THEN 'completed_processing' ELSE status END,
         started_at = CASE WHEN status = 'assigned' THEN COALESCE(started_at, NOW()) ELSE started_at END,
         completed_at = COALESCE(completed_at, NOW()),
         updated_at = NOW()
     WHERE assessment_id = $1
       AND status IN ('assigned', 'in_progress', 'completed_processing')`,
    [assessmentId],
  )
}

export async function markAssignmentResultReady(args: { assessmentId: string; resultId: string | null }, client?: Pick<PoolClient, 'query'>) {
  const query = client?.query.bind(client) ?? queryDb
  await query(
    `UPDATE assessment_repository_assignments
     SET status = 'results_ready',
         latest_result_id = COALESCE($2, latest_result_id),
         completed_at = COALESCE(completed_at, NOW()),
         results_ready_at = COALESCE(results_ready_at, NOW()),
         updated_at = NOW()
     WHERE assessment_id = $1
       AND status IN ('assigned', 'in_progress', 'completed_processing', 'results_ready')`,
    [args.assessmentId, args.resultId],
  )
}

export async function markAssignmentFailed(args: { assessmentId: string; resultId: string | null }, client?: Pick<PoolClient, 'query'>) {
  const query = client?.query.bind(client) ?? queryDb
  await query(
    `UPDATE assessment_repository_assignments
     SET status = 'failed',
         latest_result_id = COALESCE($2, latest_result_id),
         completed_at = COALESCE(completed_at, NOW()),
         failed_at = COALESCE(failed_at, NOW()),
         updated_at = NOW()
     WHERE assessment_id = $1
       AND status IN ('assigned', 'in_progress', 'completed_processing', 'failed')`,
    [args.assessmentId, args.resultId],
  )
}

export async function linkLatestAssignmentToAssessment(args: {
  userId: string
  assessmentDefinitionId: string
  assessmentVersionId: string
  assessmentId: string
}, client?: Pick<PoolClient, 'query'>) {
  const query = client?.query.bind(client) ?? queryDb
  await query(
    `WITH candidate AS (
       SELECT id
       FROM assessment_repository_assignments
       WHERE target_user_id = $1
         AND assessment_definition_id = $2
         AND assessment_version_id = $3
         AND status IN ('assigned', 'in_progress', 'completed_processing')
       ORDER BY assigned_at DESC
       LIMIT 1
     )
     UPDATE assessment_repository_assignments ara
     SET assessment_id = COALESCE(assessment_id, $4),
         updated_at = NOW()
     FROM candidate
     WHERE ara.id = candidate.id`,
    [args.userId, args.assessmentDefinitionId, args.assessmentVersionId, args.assessmentId],
  )
}

export async function createAdminAssessmentAssignment(input: {
  assessmentId: string
  targetUserEmail: string
}, dependencies: Partial<AdminAssignmentDependencies> = {}) {
  const deps = { ...defaultAdminDependencies, ...dependencies }
  const access = await deps.resolveAdminAccess()

  if (!access.isAuthenticated || !access.isAllowed) {
    return { ok: false as const, code: 'permission_denied' as const, message: 'You do not have permission to assign assessments.' }
  }

  const normalizedEmail = input.targetUserEmail.trim().toLowerCase()
  if (!normalizedEmail) {
    return { ok: false as const, code: 'validation_error' as const, message: 'Target user email is required.' }
  }

  return deps.withTransaction(async (client) => {
    const versionResult = await client.query<{
      definition_id: string
      definition_name: string
      version_id: string | null
      version_label: string | null
      version_name: string | null
    }>(
      `SELECT ad.id AS definition_id,
              ad.name AS definition_name,
              ad.current_published_version_id AS version_id,
              av.version_label,
              av.name AS version_name
       FROM assessment_definitions ad
       LEFT JOIN assessment_versions av ON av.id = ad.current_published_version_id
       WHERE ad.id = $1
       LIMIT 1`,
      [input.assessmentId],
    )

    const selectedVersion = versionResult.rows[0]
    if (!selectedVersion) {
      return { ok: false as const, code: 'not_found' as const, message: 'Assessment not found.' }
    }

    if (!selectedVersion.version_id) {
      return { ok: false as const, code: 'invalid_transition' as const, message: 'Only assessments with a published version can be assigned.' }
    }

    const userResult = await client.query<{ id: string; email: string; first_name: string | null; last_name: string | null }>(
      `SELECT id, email, first_name, last_name
       FROM users
       WHERE lower(email) = $1
       LIMIT 1`,
      [normalizedEmail],
    )
    const user = userResult.rows[0]
    if (!user) {
      return { ok: false as const, code: 'not_found' as const, message: 'Target user was not found.' }
    }

    const existing = await client.query<AssignmentLifecycleRow>(
      `SELECT id
       FROM assessment_repository_assignments
       WHERE assessment_definition_id = $1
         AND target_user_id = $2
         AND status IN ('assigned', 'in_progress', 'completed_processing')
       LIMIT 1`,
      [selectedVersion.definition_id, user.id],
    )

    if (existing.rows[0]) {
      return { ok: false as const, code: 'conflict' as const, message: 'This user already has an active assignment for this assessment.' }
    }

    await client.query(
      `INSERT INTO assessment_repository_assignments (
        assessment_definition_id,
        assessment_version_id,
        target_user_id,
        assigned_by_identity_id,
        status,
        assigned_at
      ) VALUES ($1, $2, $3, $4, 'assigned', NOW())`,
      [selectedVersion.definition_id, selectedVersion.version_id, user.id, null],
    )

    return {
      ok: true as const,
      code: 'assigned' as const,
      message: `Assigned ${selectedVersion.definition_name} v${selectedVersion.version_label ?? 'published'} to ${user.email}.`,
    }
  })
}

export async function listAdminAssessmentAssignments(assessmentDefinitionId: string, dependencies: Partial<Pick<AdminAssignmentDependencies, 'queryDb'>> = {}): Promise<AdminAssessmentAssignmentRecord[]> {
  const query = dependencies.queryDb ?? queryDb
  const result = await query<{
    id: string
    target_user_id: string
    target_user_email: string
    target_user_name: string | null
    assessment_version_id: string
    assessment_version_label: string
    status: AssessmentAssignmentStatus
    assessment_id: string | null
    latest_result_id: string | null
    assigned_at: string
    started_at: string | null
    completed_at: string | null
    results_ready_at: string | null
    failed_at: string | null
    assigned_by_name: string | null
    failure_message: string | null
  }>(
    `SELECT ara.id,
            ara.target_user_id,
            u.email AS target_user_email,
            nullif(trim(concat_ws(' ', u.first_name, u.last_name)), '') AS target_user_name,
            ara.assessment_version_id,
            coalesce(av.version_label, av.key) AS assessment_version_label,
            ara.status,
            ara.assessment_id,
            ara.latest_result_id,
            ara.assigned_at,
            ara.started_at,
            ara.completed_at,
            ara.results_ready_at,
            ara.failed_at,
            assigned_by.full_name AS assigned_by_name,
            ara.failure_message
     FROM assessment_repository_assignments ara
     INNER JOIN users u ON u.id = ara.target_user_id
     INNER JOIN assessment_versions av ON av.id = ara.assessment_version_id
     LEFT JOIN admin_identities assigned_by ON assigned_by.id = ara.assigned_by_identity_id
     WHERE ara.assessment_definition_id = $1
     ORDER BY ara.assigned_at DESC, ara.created_at DESC`,
    [assessmentDefinitionId],
  )

  return result.rows.map((row) => ({
    id: row.id,
    targetUserId: row.target_user_id,
    targetUserEmail: row.target_user_email,
    targetUserName: row.target_user_name ?? row.target_user_email,
    assessmentVersionId: row.assessment_version_id,
    assessmentVersionLabel: row.assessment_version_label,
    status: row.status,
    assessmentId: row.assessment_id,
    latestResultId: row.latest_result_id,
    assignedAt: row.assigned_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    resultsReadyAt: row.results_ready_at,
    failedAt: row.failed_at,
    assignedByName: row.assigned_by_name,
    failureMessage: row.failure_message,
  }))
}

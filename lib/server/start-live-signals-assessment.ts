import { queryDb, withTransaction } from '@/lib/db'
import { linkLatestAssignmentToAssessment } from '@/lib/server/assessment-assignments'
import type { AuthenticatedAppUser } from '@/lib/server/auth'
import {
  resolveLiveSignalsPublishedVersionState,
  type LiveSignalsPublishedVersionDiagnosticCode,
} from '@/lib/server/live-signals-runtime'

type QueryDb = typeof queryDb

type WithTransaction = typeof withTransaction

interface StartAssessmentInput {
  appUser: AuthenticatedAppUser | null
  source?: string
}

interface AssignedVersionRow {
  assignment_id: string
  version_id: string
  version_key: string
  version_name: string
  total_questions: number
  assessment_definition_id: string
}

interface ExistingAssessmentRow {
  id: string
  version_id: string
  version_key: string
  version_name: string
  total_questions: number
}

interface StartAssessmentDependencies {
  queryDb: QueryDb
  withTransaction: WithTransaction
  resolveLiveSignalsPublishedVersionState: typeof resolveLiveSignalsPublishedVersionState
  linkLatestAssignmentToAssessment: typeof linkLatestAssignmentToAssessment
}

export interface StartLiveSignalsAssessmentSuccess {
  assessmentId: string
  resumed: boolean
  version: {
    id: string
    key: string
    name: string
    totalQuestions: number
  }
}

export type StartLiveSignalsAssessmentResult =
  | { kind: 'unauthenticated'; status: 401; body: { error: string } }
  | { kind: 'unavailable'; status: 404; body: { error: string; code?: LiveSignalsPublishedVersionDiagnosticCode } }
  | { kind: 'ok'; status: 200 | 201; body: StartLiveSignalsAssessmentSuccess }

const defaultDependencies: StartAssessmentDependencies = {
  queryDb,
  withTransaction,
  resolveLiveSignalsPublishedVersionState,
  linkLatestAssignmentToAssessment,
}

function buildVersionPayload(version: { id: string; key: string; name: string; totalQuestions: number }) {
  return {
    id: version.id,
    key: version.key,
    name: version.name,
    totalQuestions: version.totalQuestions,
  }
}

export async function startLiveSignalsAssessment(
  input: StartAssessmentInput,
  dependencies: Partial<StartAssessmentDependencies> = {},
): Promise<StartLiveSignalsAssessmentResult> {
  if (!input.appUser) {
    return { kind: 'unauthenticated', status: 401, body: { error: 'Authentication required.' } }
  }

  const deps = { ...defaultDependencies, ...dependencies }
  const appUser = input.appUser

  const publishedVersionState = await deps.resolveLiveSignalsPublishedVersionState({ queryDb: deps.queryDb })
  const currentPublishedVersion = publishedVersionState.version

  if (!currentPublishedVersion || !currentPublishedVersion.isActive) {
    return {
      kind: 'unavailable',
      status: 404,
      body: {
        error: publishedVersionState.diagnostic.message,
        code: publishedVersionState.diagnostic.code,
      },
    }
  }

  const assignedVersionResult = await deps.queryDb<AssignedVersionRow>(
    `SELECT ara.id AS assignment_id,
            av.id AS version_id,
            av.key AS version_key,
            av.name AS version_name,
            av.total_questions,
            av.assessment_definition_id
     FROM assessment_repository_assignments ara
     INNER JOIN assessment_versions av ON av.id = ara.assessment_version_id
     WHERE ara.target_user_id = $1
       AND ara.assessment_definition_id = $2
       AND ara.status IN ('assigned', 'in_progress', 'completed_processing')
     ORDER BY ara.assigned_at DESC
     LIMIT 1`,
    [appUser.dbUserId, currentPublishedVersion.assessmentDefinitionId],
  )

  const assignedVersion = assignedVersionResult.rows[0] ?? null
  const selectedVersion = assignedVersion
    ? {
        id: assignedVersion.version_id,
        key: assignedVersion.version_key,
        name: assignedVersion.version_name,
        totalQuestions: assignedVersion.total_questions,
        assessmentDefinitionId: assignedVersion.assessment_definition_id,
      }
    : {
        id: currentPublishedVersion.assessmentVersionId,
        key: currentPublishedVersion.assessmentVersionKey,
        name: currentPublishedVersion.assessmentVersionName,
        totalQuestions: currentPublishedVersion.totalQuestions,
        assessmentDefinitionId: currentPublishedVersion.assessmentDefinitionId,
      }

  const existingAssessment = await deps.queryDb<ExistingAssessmentRow>(
    `SELECT a.id,
            av.id AS version_id,
            av.key AS version_key,
            av.name AS version_name,
            av.total_questions
     FROM assessments a
     INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
     WHERE a.user_id = $1
       AND av.assessment_definition_id = $2
       AND a.status IN ('not_started', 'in_progress')
     ORDER BY CASE WHEN a.assessment_version_id = $3 THEN 0 ELSE 1 END,
              a.last_activity_at DESC NULLS LAST,
              a.created_at DESC
     LIMIT 1`,
    [appUser.dbUserId, selectedVersion.assessmentDefinitionId, selectedVersion.id],
  )

  const resumedAssessment = existingAssessment.rows[0]

  if (resumedAssessment) {
    await deps.linkLatestAssignmentToAssessment({
      userId: appUser.dbUserId,
      assessmentDefinitionId: selectedVersion.assessmentDefinitionId,
      assessmentVersionId: resumedAssessment.version_id,
      assessmentId: resumedAssessment.id,
    })

    return {
      kind: 'ok',
      status: 200,
      body: {
        assessmentId: resumedAssessment.id,
        resumed: true,
        version: {
          id: resumedAssessment.version_id,
          key: resumedAssessment.version_key,
          name: resumedAssessment.version_name,
          totalQuestions: resumedAssessment.total_questions,
        },
      },
    }
  }

  const createdAssessment = await deps.withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `INSERT INTO assessments (
        user_id,
        organisation_id,
        assessment_version_id,
        status,
        started_at,
        last_activity_at,
        progress_count,
        progress_percent,
        current_question_index,
        scoring_status,
        source
      ) VALUES ($1, NULL, $2, 'not_started', NOW(), NOW(), 0, 0, 0, 'not_scored', $3)
      RETURNING id`,
      [appUser.dbUserId, selectedVersion.id, input.source ?? (assignedVersion ? 'assignment' : 'direct')],
    )

    return result.rows[0]
  })

  await deps.linkLatestAssignmentToAssessment({
    userId: appUser.dbUserId,
    assessmentDefinitionId: selectedVersion.assessmentDefinitionId,
    assessmentVersionId: selectedVersion.id,
    assessmentId: createdAssessment.id,
  })

  return {
    kind: 'ok',
    status: 201,
    body: {
      assessmentId: createdAssessment.id,
      resumed: false,
      version: buildVersionPayload({
        id: selectedVersion.id,
        key: selectedVersion.key,
        name: selectedVersion.name,
        totalQuestions: selectedVersion.totalQuestions,
      }),
    },
  }
}

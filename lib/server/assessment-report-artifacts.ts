import { createHash } from 'node:crypto'

import { queryDb } from '@/lib/db'
import type { AssessmentResultRow } from '@/lib/assessment-types'
import { PACKAGE_CONTRACT_V2_REPORT_ARTIFACT_VERSION } from '@/lib/admin/domain/assessment-package-v2-performance'
import {
  assembleAssessmentReportDocumentV2,
  buildAvailableAssessmentReportArtifactRecord,
  buildFailedAssessmentReportArtifactRecord,
  createPendingAssessmentReportArtifactRecord,
  isPackageContractV2ReportResult,
  parseAssessmentReportArtifactRecord,
  renderAssessmentReportDocumentHtml,
  type AssessmentReportArtifactRecord,
  type AssessmentReportAvailabilityState,
} from '@/lib/reports/assessment-report-v2'

interface OwnedAssessmentResultRow extends AssessmentResultRow {
  owner_user_id: string
}

interface AssessmentReportArtifactDependencies {
  getOwnedResultById: (resultId: string, ownerUserId: string) => Promise<OwnedAssessmentResultRow | null>
  updateArtifactRecord: (resultId: string, artifactRecord: AssessmentReportArtifactRecord) => Promise<void>
}

export interface UserFacingAssessmentReportViewModel {
  state: AssessmentReportAvailabilityState
  format: 'html' | null
  generatedAt: string | null
  label: string
  message: string
  downloadHref: string | null
  viewHref: string | null
}

export type AssessmentReportArtifactServiceResult =
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'unavailable'; view: UserFacingAssessmentReportViewModel }
  | {
      kind: 'available'
      body: string
      fileName: string
      mediaType: 'text/html; charset=utf-8'
      view: UserFacingAssessmentReportViewModel
    }

const defaultDependencies: AssessmentReportArtifactDependencies = {
  async getOwnedResultById(resultId, ownerUserId) {
    const result = await queryDb<OwnedAssessmentResultRow>(
      `SELECT ar.id, ar.assessment_id, ar.assessment_version_id, ar.version_key, ar.scoring_model_key,
              ar.snapshot_version, ar.status, ar.result_payload, ar.response_quality_payload,
              ar.completed_at, ar.scored_at, ar.created_at, ar.updated_at, ar.report_artifact_json,
              a.user_id AS owner_user_id
       FROM assessment_results ar
       INNER JOIN assessments a ON a.id = ar.assessment_id
       WHERE ar.id = $1
         AND a.user_id = $2
       LIMIT 1`,
      [resultId, ownerUserId],
    )

    return result.rows[0] ?? null
  },
  async updateArtifactRecord(resultId, artifactRecord) {
    await queryDb(
      `UPDATE assessment_results
       SET report_artifact_json = $2::jsonb,
           updated_at = NOW()
       WHERE id = $1`,
      [resultId, JSON.stringify(artifactRecord)],
    )
  },
}

function buildViewModel(result: AssessmentResultRow, artifactRecord: AssessmentReportArtifactRecord | null): UserFacingAssessmentReportViewModel {
  const current = artifactRecord ?? createPendingAssessmentReportArtifactRecord()
  const baseHref = `/api/assessment-results/${result.id}/report`

  if (!isPackageContractV2ReportResult(result) || result.status !== 'complete') {
    return {
      state: 'unavailable',
      format: null,
      generatedAt: null,
      label: 'Report unavailable',
      message: 'A downloadable assessment report is not available for this result.',
      downloadHref: null,
      viewHref: null,
    }
  }

  if (current.state === 'available') {
    return {
      state: 'available',
      format: current.format,
      generatedAt: current.generatedAt,
      label: 'Report available',
      message: 'Your downloadable assessment report is ready.',
      downloadHref: `${baseHref}?download=1`,
      viewHref: baseHref,
    }
  }

  if (current.state === 'failed') {
    return {
      state: 'failed',
      format: null,
      generatedAt: null,
      label: 'Report unavailable',
      message: 'The report could not be prepared safely right now. Please try again later.',
      downloadHref: `${baseHref}?download=1`,
      viewHref: baseHref,
    }
  }

  return {
    state: 'pending',
    format: null,
    generatedAt: null,
    label: 'Report pending generation',
    message: 'Your downloadable assessment report will be generated when you open or download it.',
    downloadHref: `${baseHref}?download=1`,
    viewHref: baseHref,
  }
}


function isReusableAvailableArtifact(artifactRecord: AssessmentReportArtifactRecord | null, input: { sourceHash: string }) {
  if (!artifactRecord || artifactRecord.state !== 'available') {
    return false
  }

  if (artifactRecord.reportArtifactVersion !== PACKAGE_CONTRACT_V2_REPORT_ARTIFACT_VERSION) {
    return false
  }

  if (artifactRecord.sourceHash !== input.sourceHash) {
    return false
  }

  if (artifactRecord.format !== 'html' || !artifactRecord.content || !artifactRecord.fileName) {
    return false
  }

  if (!artifactRecord.contentHash || createHash('sha256').update(artifactRecord.content).digest('hex') !== artifactRecord.contentHash) {
    return false
  }

  return true
}

export function getUserFacingAssessmentReportViewModel(result: AssessmentResultRow | null | undefined): UserFacingAssessmentReportViewModel {
  if (!result) {
    return {
      state: 'unavailable',
      format: null,
      generatedAt: null,
      label: 'Report unavailable',
      message: 'A downloadable assessment report is not available for this result.',
      downloadHref: null,
      viewHref: null,
    }
  }

  return buildViewModel(result, parseAssessmentReportArtifactRecord(result.report_artifact_json))
}

export async function getAssessmentReportArtifactForUser(
  input: {
    resultId: string
    ownerUserId: string
  },
  dependencies: Partial<AssessmentReportArtifactDependencies> = {},
): Promise<AssessmentReportArtifactServiceResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const result = await deps.getOwnedResultById(input.resultId, input.ownerUserId)

  if (!result) {
    return { kind: 'not_found' }
  }

  if (!isPackageContractV2ReportResult(result) || result.status !== 'complete') {
    return {
      kind: 'unavailable',
      view: buildViewModel(result, parseAssessmentReportArtifactRecord(result.report_artifact_json)),
    }
  }

  const assembly = assembleAssessmentReportDocumentV2(result)
  if (!assembly.ok) {
    const failed = buildFailedAssessmentReportArtifactRecord(assembly.code)
    await deps.updateArtifactRecord(result.id, failed)
    return {
      kind: 'unavailable',
      view: buildViewModel(result, failed),
    }
  }

  try {
    const existing = parseAssessmentReportArtifactRecord(result.report_artifact_json)
    if (isReusableAvailableArtifact(existing, { sourceHash: assembly.sourceHash })) {
      const reusable = existing!
      console.info('[assessment-report-artifacts]', { resultId: result.id, event: 'reuse' })
      const artifactRecord: AssessmentReportArtifactRecord = {
        contractVersion: reusable.contractVersion,
        state: reusable.state,
        format: reusable.format,
        artifactKey: reusable.artifactKey,
        reportArtifactVersion: reusable.reportArtifactVersion,
        rendererVersion: reusable.rendererVersion,
        sourceHash: reusable.sourceHash,
        contentHash: reusable.contentHash,
        generatedAt: reusable.generatedAt,
        lastAttemptedAt: new Date().toISOString(),
        lastErrorCode: reusable.lastErrorCode,
        fileName: reusable.fileName,
        content: reusable.content,
      }
      await deps.updateArtifactRecord(result.id, artifactRecord)
      return {
        kind: 'available',
        body: artifactRecord.content!,
        fileName: artifactRecord.fileName!,
        mediaType: 'text/html; charset=utf-8',
        view: buildViewModel(result, artifactRecord),
      }
    }

    console.info('[assessment-report-artifacts]', {
      resultId: result.id,
      event: existing ? 'regenerate' : 'generate',
      reason: existing?.reportArtifactVersion !== PACKAGE_CONTRACT_V2_REPORT_ARTIFACT_VERSION
        ? 'report_version_mismatch'
        : existing?.sourceHash !== assembly.sourceHash
          ? 'source_hash_mismatch'
          : existing?.content
            ? 'renderer_or_format_mismatch'
            : 'missing_content',
    })

    const rendered = renderAssessmentReportDocumentHtml(assembly.document)
    const artifactRecord = buildAvailableAssessmentReportArtifactRecord({
      sourceHash: assembly.sourceHash,
      rendererVersion: rendered.rendererVersion,
      format: rendered.format,
      resultId: result.id,
      fileName: rendered.fileName,
      content: rendered.content,
    })

    await deps.updateArtifactRecord(result.id, artifactRecord)

    return {
      kind: 'available',
      body: rendered.content,
      fileName: rendered.fileName,
      mediaType: rendered.mediaType,
      view: buildViewModel(result, artifactRecord),
    }
  } catch (error) {
    console.error('[assessment-report-artifacts] render failed', {
      resultId: result.id,
      message: error instanceof Error ? error.message : 'Unexpected renderer failure',
    })

    const failed = buildFailedAssessmentReportArtifactRecord('render_failed')
    await deps.updateArtifactRecord(result.id, failed)

    return {
      kind: 'unavailable',
      view: buildViewModel(result, failed),
    }
  }
}

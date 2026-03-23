import type { AssessmentResultRow, AssessmentRow } from '@/lib/assessment-types'
import type { IntegrityOutputNoticeV2, WebSummaryOutputV2 } from '@/lib/admin/domain/assessment-package-v2-materialization'
import { getUserFacingAssessmentReportViewModel, type UserFacingAssessmentReportViewModel } from '@/lib/server/assessment-report-artifacts'

export type LiveAssessmentResultStatus =
  | 'not_started'
  | 'in_progress'
  | 'pending'
  | 'completed'
  | 'completed_unavailable'
  | 'runtime_unavailable'
  | 'failed'

export interface LiveAssessmentUserNotice {
  id: string
  severity: 'info' | 'warning' | 'error'
  title: string
  message: string
}

export interface LiveAssessmentSummaryCard {
  id: string
  key: string
  title: string
  label: string
  status: 'available' | 'warning' | 'limited'
  severity: 'info' | 'warning' | 'error' | null
  band: string | null
  score: number | null
  rawScore: number | null
  percentile: number | null
  descriptor: string | null
  explanation: string | null
}

export interface LiveAssessmentUserResultContract {
  contractVersion: 'live_assessment_user_result/v1'
  status: LiveAssessmentResultStatus
  assessmentId: string
  assessmentStatus: AssessmentRow['status']
  scoringStatus: AssessmentRow['scoring_status']
  assessmentMeta: {
    versionKey: string | null
    title: string
    packageSemver: string | null
  }
  resultMeta: {
    resultId: string | null
    completedAt: string | null
    scoredAt: string | null
    availableAt: string | null
  }
  report: UserFacingAssessmentReportViewModel
  summaryCards: LiveAssessmentSummaryCard[]
  notices: LiveAssessmentUserNotice[]
  statusMessage: string
  resultsAvailable: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function toSeverity(value: unknown): 'info' | 'warning' | 'error' | null {
  return value === 'info' || value === 'warning' || value === 'error' ? value : null
}

function isWebSummaryOutput(value: unknown): value is WebSummaryOutputV2 {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.key === 'string'
    && typeof value.title === 'string'
    && typeof value.label === 'string'
}

function isIntegrityNotice(value: unknown): value is IntegrityOutputNoticeV2 {
  return isRecord(value)
    && typeof value.id === 'string'
    && typeof value.title === 'string'
    && typeof value.message === 'string'
}

export function isPackageContractV2Result(result: AssessmentResultRow | null | undefined): boolean {
  return Boolean(isRecord(result?.result_payload) && result?.result_payload.contractVersion === 'package_contract_v2')
}

export function hasUserFacingV2Summary(result: AssessmentResultRow | null | undefined): boolean {
  if (!isPackageContractV2Result(result) || !isRecord(result?.result_payload)) {
    return false
  }

  const materialized = isRecord(result.result_payload.materializedOutputs) ? result.result_payload.materializedOutputs : null
  const outputs = Array.isArray(materialized?.webSummaryOutputs) ? materialized.webSummaryOutputs : []
  return outputs.some((entry) => isWebSummaryOutput(entry) && entry.visibleInProduct !== false)
}

function buildSummaryCards(result: AssessmentResultRow): LiveAssessmentSummaryCard[] {
  if (!isPackageContractV2Result(result) || !isRecord(result.result_payload)) {
    return []
  }

  const materialized = isRecord(result.result_payload.materializedOutputs) ? result.result_payload.materializedOutputs : null
  const outputs = Array.isArray(materialized?.webSummaryOutputs) ? materialized.webSummaryOutputs : []

  return outputs
    .filter((entry): entry is WebSummaryOutputV2 => isWebSummaryOutput(entry) && entry.visibleInProduct !== false)
    .map((entry) => ({
      id: entry.id,
      key: entry.key,
      title: entry.title,
      label: entry.label,
      status: entry.status,
      severity: toSeverity(entry.severity),
      band: entry.band,
      score: entry.value.score,
      rawScore: entry.value.rawScore,
      percentile: entry.value.percentile,
      descriptor: entry.value.descriptor,
      explanation: entry.explanation.text,
    }))
}

function buildNotices(result: AssessmentResultRow): LiveAssessmentUserNotice[] {
  if (!isPackageContractV2Result(result) || !isRecord(result.result_payload)) {
    return []
  }

  const materialized = isRecord(result.result_payload.materializedOutputs) ? result.result_payload.materializedOutputs : null
  const notices = Array.isArray(materialized?.integrityNotices) ? materialized.integrityNotices : []

  return notices
    .filter(isIntegrityNotice)
    .map((notice) => ({
      id: notice.id,
      severity: toSeverity(notice.severity) ?? 'warning',
      title: notice.title,
      message: notice.message,
    }))
}

function resolveAssessmentTitle(result: AssessmentResultRow, fallbackVersionKey: string | null): string {
  if (isPackageContractV2Result(result) && isRecord(result.result_payload)) {
    const metadata = isRecord(result.result_payload.packageMetadata) ? result.result_payload.packageMetadata : null
    if (typeof metadata?.assessmentName === 'string' && metadata.assessmentName.trim().length > 0) {
      return metadata.assessmentName
    }
  }

  return fallbackVersionKey ? `Assessment ${fallbackVersionKey}` : 'Assessment result'
}

function resolvePackageSemver(result: AssessmentResultRow): string | null {
  if (!isPackageContractV2Result(result) || !isRecord(result.result_payload)) {
    return null
  }

  const metadata = isRecord(result.result_payload.packageMetadata) ? result.result_payload.packageMetadata : null
  return typeof metadata?.packageSemver === 'string' ? metadata.packageSemver : null
}

export function buildLiveAssessmentUserResultContract(input: {
  assessment: AssessmentRow
  result: AssessmentResultRow | null
}): LiveAssessmentUserResultContract {
  const { assessment, result } = input

  if (assessment.status !== 'completed') {
    return {
      contractVersion: 'live_assessment_user_result/v1',
      status: assessment.status === 'in_progress' ? 'in_progress' : 'not_started',
      assessmentId: assessment.id,
      assessmentStatus: assessment.status,
      scoringStatus: assessment.scoring_status,
      assessmentMeta: {
        versionKey: null,
        title: 'Assessment result',
        packageSemver: null,
      },
      resultMeta: {
        resultId: null,
        completedAt: assessment.completed_at,
        scoredAt: null,
        availableAt: null,
      },
      report: getUserFacingAssessmentReportViewModel(null),
      summaryCards: [],
      notices: [],
      statusMessage: assessment.status === 'in_progress'
        ? 'Assessment is still in progress.'
        : 'Assessment has not started yet.',
      resultsAvailable: false,
    }
  }

  if (!result) {
    return {
      contractVersion: 'live_assessment_user_result/v1',
      status: assessment.scoring_status === 'pending' ? 'pending' : 'completed_unavailable',
      assessmentId: assessment.id,
      assessmentStatus: assessment.status,
      scoringStatus: assessment.scoring_status,
      assessmentMeta: {
        versionKey: null,
        title: 'Assessment result',
        packageSemver: null,
      },
      resultMeta: {
        resultId: null,
        completedAt: assessment.completed_at,
        scoredAt: null,
        availableAt: null,
      },
      report: getUserFacingAssessmentReportViewModel(null),
      summaryCards: [],
      notices: [],
      statusMessage: assessment.scoring_status === 'pending'
        ? 'Assessment was submitted and results are still finalizing.'
        : 'Assessment is complete, but results are not available yet.',
      resultsAvailable: false,
    }
  }

  const summaryCards = buildSummaryCards(result)
  const notices = buildNotices(result)
  const isV2 = isPackageContractV2Result(result)
  const title = resolveAssessmentTitle(result, result.version_key)
  const packageSemver = resolvePackageSemver(result)

  if (result.status === 'failed') {
    return {
      contractVersion: 'live_assessment_user_result/v1',
      status: 'failed',
      assessmentId: assessment.id,
      assessmentStatus: assessment.status,
      scoringStatus: assessment.scoring_status,
      assessmentMeta: {
        versionKey: result.version_key,
        title,
        packageSemver,
      },
      resultMeta: {
        resultId: result.id,
        completedAt: result.completed_at,
        scoredAt: result.scored_at,
        availableAt: result.updated_at,
      },
      report: getUserFacingAssessmentReportViewModel(result),
      summaryCards: [],
      notices: [],
      statusMessage: 'Assessment completed, but the result could not be prepared safely.',
      resultsAvailable: false,
    }
  }

  if (result.status === 'pending') {
    return {
      contractVersion: 'live_assessment_user_result/v1',
      status: 'pending',
      assessmentId: assessment.id,
      assessmentStatus: assessment.status,
      scoringStatus: assessment.scoring_status,
      assessmentMeta: {
        versionKey: result.version_key,
        title,
        packageSemver,
      },
      resultMeta: {
        resultId: result.id,
        completedAt: result.completed_at,
        scoredAt: result.scored_at,
        availableAt: result.updated_at,
      },
      report: getUserFacingAssessmentReportViewModel(result),
      summaryCards: [],
      notices: [],
      statusMessage: 'Assessment was submitted and results are still finalizing.',
      resultsAvailable: false,
    }
  }

  if (isV2 && summaryCards.length === 0) {
    return {
      contractVersion: 'live_assessment_user_result/v1',
      status: 'completed_unavailable',
      assessmentId: assessment.id,
      assessmentStatus: assessment.status,
      scoringStatus: assessment.scoring_status,
      assessmentMeta: {
        versionKey: result.version_key,
        title,
        packageSemver,
      },
      resultMeta: {
        resultId: result.id,
        completedAt: result.completed_at,
        scoredAt: result.scored_at,
        availableAt: result.updated_at,
      },
      report: getUserFacingAssessmentReportViewModel(result),
      summaryCards: [],
      notices,
      statusMessage: 'Assessment completed, but no user-facing summary is available for this result yet.',
      resultsAvailable: false,
    }
  }

  return {
    contractVersion: 'live_assessment_user_result/v1',
    status: 'completed',
    assessmentId: assessment.id,
    assessmentStatus: assessment.status,
    scoringStatus: assessment.scoring_status,
    assessmentMeta: {
      versionKey: result.version_key,
      title,
      packageSemver,
    },
    resultMeta: {
      resultId: result.id,
      completedAt: result.completed_at,
      scoredAt: result.scored_at,
      availableAt: result.updated_at,
    },
    report: getUserFacingAssessmentReportViewModel(result),
    summaryCards,
    notices,
    statusMessage: 'Assessment results are available.',
    resultsAvailable: true,
  }
}

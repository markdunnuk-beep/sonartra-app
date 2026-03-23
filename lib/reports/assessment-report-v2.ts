import { createHash } from 'node:crypto'

import type {
  IntegrityOutputNoticeV2,
  MaterializedAssessmentOutputsV2,
  ReportOutputBlockV2,
  ReportOutputSectionV2,
} from '@/lib/admin/domain/assessment-package-v2-materialization'
import type { AssessmentResultRow } from '@/lib/assessment-types'
import { PACKAGE_CONTRACT_V2_HTML_RENDERER_VERSION, PACKAGE_CONTRACT_V2_REPORT_ARTIFACT_VERSION } from '@/lib/admin/domain/assessment-package-v2-performance'

export type AssessmentReportAvailabilityState = 'available' | 'pending' | 'unavailable' | 'failed'
export type AssessmentReportArtifactFormat = 'html'
export type AssessmentReportBlockKindV2 =
  | 'summary_card'
  | 'score'
  | 'paragraph'
  | 'list'
  | 'notice'
  | 'metadata'

export interface AssessmentReportMetadataV2 {
  assessmentId: string
  resultId: string
  assessmentTitle: string
  versionKey: string | null
  packageSemver: string | null
  completedAt: string | null
  generatedFrom: 'completed_live_result'
}

export interface AssessmentReportBlockV2 {
  id: string
  kind: AssessmentReportBlockKindV2
  title: string | null
  body: string | null
  items: string[]
  accent: 'default' | 'info' | 'warning' | 'error'
  value?: string | null
  meta?: Array<{ label: string; value: string }>
}

export interface AssessmentReportSectionV2 {
  id: string
  title: string
  blocks: AssessmentReportBlockV2[]
}

export interface AssessmentReportDocumentV2 {
  contractVersion: 'assessment_report_document/v2'
  documentId: string
  metadata: AssessmentReportMetadataV2
  header: {
    title: string
    subtitle: string | null
    summary: string | null
  }
  sections: AssessmentReportSectionV2[]
  notices: AssessmentReportBlockV2[]
}

export interface AssessmentReportArtifactRecord {
  contractVersion: 'assessment_report_artifact/v1'
  state: AssessmentReportAvailabilityState
  format: AssessmentReportArtifactFormat | null
  artifactKey: string | null
  reportArtifactVersion: string | null
  rendererVersion: string | null
  sourceHash: string | null
  contentHash: string | null
  generatedAt: string | null
  lastAttemptedAt: string | null
  lastErrorCode: string | null
  fileName: string | null
  content: string | null
}

export interface AssessmentReportAssemblyResult {
  ok: true
  document: AssessmentReportDocumentV2
  sourceHash: string
}

export interface AssessmentReportRenderResult {
  format: AssessmentReportArtifactFormat
  mediaType: 'text/html; charset=utf-8'
  fileName: string
  content: string
  rendererVersion: string
}

interface V2ResultPayload {
  contractVersion: 'package_contract_v2'
  packageMetadata?: {
    assessmentName?: string
    packageSemver?: string
  }
  materializedOutputs?: MaterializedAssessmentOutputsV2
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatDate(value: string | null): string | null {
  if (!value) return null

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date)
}

function toAccentFromNotice(notice: IntegrityOutputNoticeV2 | { severity?: string | null }): AssessmentReportBlockV2['accent'] {
  if (notice.severity === 'error') return 'error'
  if (notice.severity === 'warning') return 'warning'
  if (notice.severity === 'info') return 'info'
  return 'default'
}

function toBlock(section: ReportOutputSectionV2, block: ReportOutputBlockV2): AssessmentReportBlockV2 {
  const metadataEntries = Object.entries(block.metadata ?? {})
    .filter(([, value]) => value !== null && value !== undefined && `${value}`.trim().length > 0)
    .map(([label, value]) => ({
      label: label.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (char) => char.toUpperCase()),
      value: String(value),
    }))

  if (block.kind === 'metric') {
    return {
      id: block.id,
      kind: section.kind === 'overview' ? 'metadata' : 'summary_card',
      title: block.title,
      body: block.text,
      items: block.items,
      accent: 'default',
      value: block.items[0] ?? null,
      meta: metadataEntries,
    }
  }

  if (block.kind === 'notice') {
    return {
      id: block.id,
      kind: 'notice',
      title: block.title,
      body: block.text,
      items: block.items,
      accent: toAccentFromNotice({ severity: typeof block.metadata.severity === 'string' ? block.metadata.severity : null }),
      meta: metadataEntries,
    }
  }

  if (block.kind === 'list' || block.kind === 'table') {
    return {
      id: block.id,
      kind: 'list',
      title: block.title,
      body: block.text,
      items: block.items,
      accent: 'default',
      meta: metadataEntries,
    }
  }

  return {
    id: block.id,
    kind: 'paragraph',
    title: block.title,
    body: block.text,
    items: block.items,
    accent: 'default',
    meta: metadataEntries,
  }
}

export function parseAssessmentReportArtifactRecord(value: unknown): AssessmentReportArtifactRecord | null {
  if (!isRecord(value) || value.contractVersion !== 'assessment_report_artifact/v1') {
    return null
  }

  const state = value.state
  if (state !== 'available' && state !== 'pending' && state !== 'unavailable' && state !== 'failed') {
    return null
  }

  const format = value.format === 'html' ? 'html' : null
  return {
    contractVersion: 'assessment_report_artifact/v1',
    state,
    format,
    artifactKey: typeof value.artifactKey === 'string' ? value.artifactKey : null,
    reportArtifactVersion: typeof value.reportArtifactVersion === 'string' ? value.reportArtifactVersion : null,
    rendererVersion: typeof value.rendererVersion === 'string' ? value.rendererVersion : null,
    sourceHash: typeof value.sourceHash === 'string' ? value.sourceHash : null,
    contentHash: typeof value.contentHash === 'string' ? value.contentHash : null,
    generatedAt: typeof value.generatedAt === 'string' ? value.generatedAt : null,
    lastAttemptedAt: typeof value.lastAttemptedAt === 'string' ? value.lastAttemptedAt : null,
    lastErrorCode: typeof value.lastErrorCode === 'string' ? value.lastErrorCode : null,
    fileName: typeof value.fileName === 'string' ? value.fileName : null,
    content: typeof value.content === 'string' ? value.content : null,
  }
}

export function createPendingAssessmentReportArtifactRecord(): AssessmentReportArtifactRecord {
  return {
    contractVersion: 'assessment_report_artifact/v1',
    state: 'pending',
    format: null,
    artifactKey: null,
    reportArtifactVersion: PACKAGE_CONTRACT_V2_REPORT_ARTIFACT_VERSION,
    rendererVersion: null,
    sourceHash: null,
    contentHash: null,
    generatedAt: null,
    lastAttemptedAt: null,
    lastErrorCode: null,
    fileName: null,
    content: null,
  }
}

export function isPackageContractV2ReportResult(result: AssessmentResultRow | null | undefined): result is AssessmentResultRow & { result_payload: V2ResultPayload } {
  return Boolean(isRecord(result?.result_payload) && result?.result_payload.contractVersion === 'package_contract_v2')
}

function getMaterializedOutputs(result: AssessmentResultRow): MaterializedAssessmentOutputsV2 | null {
  if (!isPackageContractV2ReportResult(result)) {
    return null
  }

  return isRecord(result.result_payload.materializedOutputs)
    ? result.result_payload.materializedOutputs as MaterializedAssessmentOutputsV2
    : null
}

export function assembleAssessmentReportDocumentV2(result: AssessmentResultRow): AssessmentReportAssemblyResult | { ok: false; code: string } {
  if (!isPackageContractV2ReportResult(result) || result.status !== 'complete') {
    return { ok: false, code: 'unsupported_result' }
  }

  const materialized = getMaterializedOutputs(result)
  if (!materialized?.reportDocument?.sections?.length) {
    return { ok: false, code: 'missing_report_document' }
  }

  const packageMetadata = isRecord(result.result_payload.packageMetadata) ? result.result_payload.packageMetadata : null
  const title = typeof packageMetadata?.assessmentName === 'string' && packageMetadata.assessmentName.trim().length > 0
    ? packageMetadata.assessmentName
    : materialized.reportDocument.title || 'Assessment report'

  const document: AssessmentReportDocumentV2 = {
    contractVersion: 'assessment_report_document/v2',
    documentId: `assessment-report:${result.id}`,
    metadata: {
      assessmentId: result.assessment_id,
      resultId: result.id,
      assessmentTitle: title,
      versionKey: result.version_key,
      packageSemver: typeof packageMetadata?.packageSemver === 'string' ? packageMetadata.packageSemver : null,
      completedAt: result.completed_at,
      generatedFrom: 'completed_live_result',
    },
    header: {
      title,
      subtitle: materialized.reportDocument.subtitle ?? null,
      summary: materialized.reportDocument.sections[0]?.blocks[0]?.text ?? null,
    },
    sections: materialized.reportDocument.sections
      .filter((section) => section.kind !== 'debug')
      .map((section) => ({
        id: section.id,
        title: section.title,
        blocks: section.blocks.map((block) => toBlock(section, block)),
      }))
      .filter((section) => section.blocks.length > 0),
    notices: materialized.integrityNotices.map((notice) => ({
      id: notice.id,
      kind: 'notice',
      title: notice.title,
      body: notice.message,
      items: notice.affectedIds,
      accent: toAccentFromNotice(notice),
      meta: notice.affectedIds.length
        ? [{ label: 'Affected items', value: notice.affectedIds.join(', ') }]
        : undefined,
    })),
  }

  const sourceHash = createHash('sha256').update(JSON.stringify(document)).digest('hex')

  return {
    ok: true,
    document,
    sourceHash,
  }
}

function renderBlock(block: AssessmentReportBlockV2): string {
  const items = block.items.length
    ? `<ul>${block.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
    : ''
  const meta = block.meta?.length
    ? `<dl class="meta-grid">${block.meta.map((entry) => `<div><dt>${escapeHtml(entry.label)}</dt><dd>${escapeHtml(entry.value)}</dd></div>`).join('')}</dl>`
    : ''
  const value = block.value ? `<p class="block-value">${escapeHtml(block.value)}</p>` : ''
  const title = block.title ? `<h3>${escapeHtml(block.title)}</h3>` : ''
  const body = block.body ? `<p>${escapeHtml(block.body)}</p>` : ''

  return `<article class="report-block report-block--${block.kind} report-block--${block.accent}">${title}${value}${body}${items}${meta}</article>`
}

export function renderAssessmentReportDocumentHtml(document: AssessmentReportDocumentV2): AssessmentReportRenderResult {
  const rendererVersion = PACKAGE_CONTRACT_V2_HTML_RENDERER_VERSION
  const completionLabel = formatDate(document.metadata.completedAt)
  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(document.header.title)} report</title>
    <style>
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Inter, Arial, sans-serif; background: #f4f7fb; color: #102235; }
      main { max-width: 960px; margin: 0 auto; padding: 40px 24px 64px; }
      .hero, .section, .notice-strip { background: #fff; border: 1px solid #d8e3ef; border-radius: 20px; box-shadow: 0 10px 30px rgba(16,34,53,.06); }
      .hero { padding: 32px; margin-bottom: 24px; }
      .eyebrow { text-transform: uppercase; letter-spacing: .14em; font-size: 12px; color: #60758a; margin: 0 0 12px; }
      h1 { margin: 0; font-size: 34px; line-height: 1.1; }
      .subtitle { margin: 10px 0 0; color: #486175; font-size: 16px; }
      .meta-row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; }
      .meta-pill { background: #eef5fb; color: #21415d; border-radius: 999px; padding: 8px 14px; font-size: 13px; }
      .notice-strip { padding: 20px 24px; margin: 0 0 24px; }
      .section { padding: 24px; margin-bottom: 20px; }
      h2 { margin: 0 0 16px; font-size: 22px; }
      .block-grid { display: grid; gap: 16px; }
      .report-block { border: 1px solid #d8e3ef; border-radius: 16px; padding: 18px; background: #fbfdff; }
      .report-block h3 { margin: 0 0 8px; font-size: 17px; }
      .report-block p { margin: 0 0 10px; line-height: 1.65; color: #31495f; }
      .block-value { font-size: 26px; font-weight: 700; color: #102235; }
      .report-block ul { margin: 0; padding-left: 18px; color: #31495f; display: grid; gap: 8px; }
      .report-block--warning { border-color: #f6d38e; background: #fffaf0; }
      .report-block--error { border-color: #f3b0b8; background: #fff4f5; }
      .report-block--info { border-color: #b2d5ff; background: #f4f9ff; }
      .meta-grid { display: grid; gap: 10px; margin-top: 12px; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
      .meta-grid dt { margin: 0 0 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #60758a; }
      .meta-grid dd { margin: 0; color: #102235; }
      @media print {
        body { background: #fff; }
        main { max-width: none; padding: 0; }
        .hero, .section, .notice-strip, .report-block { box-shadow: none; break-inside: avoid; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <p class="eyebrow">Assessment report</p>
        <h1>${escapeHtml(document.header.title)}</h1>
        ${document.header.subtitle ? `<p class="subtitle">${escapeHtml(document.header.subtitle)}</p>` : ''}
        ${document.header.summary ? `<p class="subtitle">${escapeHtml(document.header.summary)}</p>` : ''}
        <div class="meta-row">
          ${document.metadata.versionKey ? `<span class="meta-pill">Version ${escapeHtml(document.metadata.versionKey)}</span>` : ''}
          ${document.metadata.packageSemver ? `<span class="meta-pill">Package ${escapeHtml(document.metadata.packageSemver)}</span>` : ''}
          ${completionLabel ? `<span class="meta-pill">Completed ${escapeHtml(completionLabel)}</span>` : ''}
        </div>
      </section>
      ${document.notices.length ? `<section class="notice-strip"><div class="block-grid">${document.notices.map(renderBlock).join('')}</div></section>` : ''}
      ${document.sections.map((section) => `<section class="section"><h2>${escapeHtml(section.title)}</h2><div class="block-grid">${section.blocks.map(renderBlock).join('')}</div></section>`).join('')}
    </main>
  </body>
</html>`

  const baseName = document.header.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'assessment-report'

  return {
    format: 'html',
    mediaType: 'text/html; charset=utf-8',
    fileName: `${baseName}-report.html`,
    content: html,
    rendererVersion,
  }
}

export function buildAvailableAssessmentReportArtifactRecord(input: {
  sourceHash: string
  rendererVersion: string
  format: AssessmentReportArtifactFormat
  resultId: string
  fileName: string
  content: string
}) : AssessmentReportArtifactRecord {
  const generatedAt = new Date().toISOString()
  return {
    contractVersion: 'assessment_report_artifact/v1',
    state: 'available',
    format: input.format,
    artifactKey: `assessment-report/${input.resultId}/${input.format}/${input.sourceHash.slice(0, 16)}`,
    reportArtifactVersion: PACKAGE_CONTRACT_V2_REPORT_ARTIFACT_VERSION,
    rendererVersion: input.rendererVersion,
    sourceHash: input.sourceHash,
    contentHash: createHash('sha256').update(input.content).digest('hex'),
    generatedAt,
    lastAttemptedAt: generatedAt,
    lastErrorCode: null,
    fileName: input.fileName,
    content: input.content,
  }
}

export function buildFailedAssessmentReportArtifactRecord(code: string): AssessmentReportArtifactRecord {
  return {
    contractVersion: 'assessment_report_artifact/v1',
    state: 'failed',
    format: null,
    artifactKey: null,
    reportArtifactVersion: PACKAGE_CONTRACT_V2_REPORT_ARTIFACT_VERSION,
    rendererVersion: null,
    sourceHash: null,
    contentHash: null,
    generatedAt: null,
    lastAttemptedAt: new Date().toISOString(),
    lastErrorCode: code,
    fileName: null,
    content: null,
  }
}

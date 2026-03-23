import assert from 'node:assert/strict'
import test from 'node:test'

import type { AssessmentResultRow } from '../lib/assessment-types'
import {
  type AssessmentReportArtifactRecord,
  assembleAssessmentReportDocumentV2,
  renderAssessmentReportDocumentHtml,
} from '../lib/reports/assessment-report-v2'
import {
  getAssessmentReportArtifactForUser,
  getUserFacingAssessmentReportViewModel,
} from '../lib/server/assessment-report-artifacts'

function makeResult(overrides: Partial<AssessmentResultRow> = {}): AssessmentResultRow {
  return {
    id: 'result-v2',
    assessment_id: 'assessment-v2',
    assessment_version_id: 'version-v2',
    version_key: 'signals-v2',
    scoring_model_key: 'package-contract-v2-runtime',
    snapshot_version: 1,
    status: 'complete',
    result_payload: {
      contractVersion: 'package_contract_v2',
      packageMetadata: {
        assessmentName: 'Adaptive Balance',
        packageSemver: '2.1.0',
      },
      materializedOutputs: {
        webSummaryOutputs: [],
        integrityNotices: [
          {
            id: 'integrity:1',
            severity: 'warning',
            title: 'response consistency',
            message: 'A small number of answers were inconsistent.',
            source: 'integrity_rule',
            affectedIds: ['q-1'],
          },
        ],
        technicalDiagnostics: [{ code: 'hidden', message: 'do not leak' }],
        reportDocument: {
          id: 'report:1',
          title: 'Adaptive Balance',
          subtitle: 'Package 2.1.0',
          warnings: [],
          sections: [
            {
              id: 'overview',
              key: 'overview',
              title: 'Overview',
              kind: 'overview',
              blocks: [
                {
                  id: 'overview-1',
                  kind: 'metric',
                  title: 'Evaluation summary',
                  text: 'Evaluation completed successfully.',
                  items: ['Overall status: Ready'],
                  metadata: { questionCount: 10 },
                },
              ],
            },
            {
              id: 'dimension-summary',
              key: 'dimension-summary',
              title: 'Dimension summary',
              kind: 'dimension_summary',
              blocks: [
                {
                  id: 'metric-1',
                  kind: 'metric',
                  title: 'Adaptive Balance',
                  text: 'Consistent balance across adaptive dimensions.',
                  items: ['Normalized score: 74', 'Band: Balanced'],
                  metadata: { key: 'adaptive-balance' },
                },
              ],
            },
            {
              id: 'limitations',
              key: 'limitations',
              title: 'Limitations',
              kind: 'limitations',
              blocks: [
                {
                  id: 'limitations-1',
                  kind: 'list',
                  title: 'Assessment limitations',
                  text: 'Some inputs were partial.',
                  items: ['One answer was skipped.'],
                  metadata: {},
                },
              ],
            },
          ],
        },
      },
    },
    response_quality_payload: null,
    report_artifact_json: null,
    completed_at: '2026-03-20T09:15:00.000Z',
    scored_at: '2026-03-20T09:15:10.000Z',
    created_at: '2026-03-20T09:15:11.000Z',
    updated_at: '2026-03-20T09:15:11.000Z',
    ...overrides,
  }
}

test('completed v2 result assembles into an ordered canonical report document without internal diagnostics', () => {
  const assembly = assembleAssessmentReportDocumentV2(makeResult())

  assert.equal(assembly.ok, true)
  if (!assembly.ok) return

  assert.equal(assembly.document.contractVersion, 'assessment_report_document/v2')
  assert.deepEqual(
    assembly.document.sections.map((section) => section.title),
    ['Overview', 'Dimension summary', 'Limitations'],
  )
  assert.match(JSON.stringify(assembly.document), /Adaptive Balance/)
  assert.doesNotMatch(JSON.stringify(assembly.document), /technicalDiagnostics/)
  assert.doesNotMatch(JSON.stringify(assembly.document), /internal/)
})

test('report renderer generates a stable downloadable html artifact from the canonical document', () => {
  const assembly = assembleAssessmentReportDocumentV2(makeResult())
  assert.equal(assembly.ok, true)
  if (!assembly.ok) return

  const rendered = renderAssessmentReportDocumentHtml(assembly.document)

  assert.equal(rendered.format, 'html')
  assert.equal(rendered.mediaType, 'text/html; charset=utf-8')
  assert.match(rendered.fileName, /adaptive-balance-report\.html/)
  assert.match(rendered.content, /Assessment report/)
  assert.match(rendered.content, /Dimension summary/)
  assert.match(rendered.content, /One answer was skipped/)
})

test('repeated report generation requests are idempotent and reuse the same artifact identity', async () => {
  let persistedRecord: AssessmentReportArtifactRecord | null = null

  const deps = {
    async getOwnedResultById() {
      return makeResult({ report_artifact_json: persistedRecord as unknown as Record<string, unknown> | null }) as AssessmentResultRow & { owner_user_id: string }
    },
    async updateArtifactRecord(_resultId: string, artifactRecord: AssessmentReportArtifactRecord) {
      persistedRecord = artifactRecord
    },
  }

  const first = await getAssessmentReportArtifactForUser({ resultId: 'result-v2', ownerUserId: 'user-1' }, deps)
  assert.equal(first.kind, 'available')
  const firstView = getUserFacingAssessmentReportViewModel(makeResult({ report_artifact_json: persistedRecord as unknown as Record<string, unknown> | null }))
  assert.equal(firstView.state, 'available')

  assert.ok(persistedRecord)
  const firstRecord = persistedRecord as AssessmentReportArtifactRecord
  const firstArtifactKey = firstRecord.artifactKey
  const firstGeneratedAt = firstRecord.generatedAt

  const second = await getAssessmentReportArtifactForUser({ resultId: 'result-v2', ownerUserId: 'user-1' }, deps)
  assert.equal(second.kind, 'available')
  assert.ok(persistedRecord)
  const secondRecord = persistedRecord as AssessmentReportArtifactRecord
  assert.equal(secondRecord.artifactKey, firstArtifactKey)
  assert.equal(secondRecord.generatedAt, firstGeneratedAt)
})

test('missing or unsupported report artifacts fail safely for users', async () => {
  const unavailable = await getAssessmentReportArtifactForUser(
    { resultId: 'result-v2', ownerUserId: 'user-1' },
    {
      async getOwnedResultById() {
        return makeResult({
          result_payload: {
            contractVersion: 'package_contract_v2',
            packageMetadata: { assessmentName: 'Adaptive Balance', packageSemver: '2.1.0' },
            materializedOutputs: {
              webSummaryOutputs: [],
              integrityNotices: [],
              technicalDiagnostics: [],
              reportDocument: { id: 'report:1', title: 'Adaptive Balance', subtitle: null, sections: [], warnings: [] },
            },
          },
        }) as AssessmentResultRow & { owner_user_id: string }
      },
      async updateArtifactRecord() {},
    },
  )

  assert.equal(unavailable.kind, 'unavailable')
  if (unavailable.kind !== 'unavailable') return
  assert.equal(unavailable.view.state, 'failed')
  assert.match(unavailable.view.message, /could not be prepared safely/i)
})

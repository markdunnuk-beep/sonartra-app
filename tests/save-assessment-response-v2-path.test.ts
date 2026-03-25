import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'

import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { saveAssessmentResponse } from '../lib/server/save-assessment-response'

async function loadExamplePackage() {
  const payload = JSON.parse(await fs.readFile(new URL('./fixtures/package-contract-v2-example.json', import.meta.url), 'utf8'))
  const validation = validateSonartraAssessmentPackageV2(payload)
  assert.equal(validation.ok, true)
  return validation.normalizedPackage!
}

test('numeric save payloads are routed to package-contract-v2 persistence without legacy fallback', async () => {
  const pkg = await loadExamplePackage()

  const result = await saveAssessmentResponse(
    {
      appUserId: 'user-1',
      assessmentId: 'assessment-1',
      questionId: 1,
      responseValue: 2,
      responseTimeMs: 450,
    },
    {
      queryDb: async () => ({
        rows: [{
          user_id: 'user-1',
          package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
          definition_payload: pkg,
        }],
      }) as never,
      withTransaction: async (work) => work({
        query: async (sql: string) => {
          if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
            return {
              rows: [{
                assessment_id: 'assessment-1',
                assessment_version_id: 'version-1',
                assessment_version_key: 'signals-v2',
                assessment_version_name: 'Signals v2',
                package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
                package_status: 'valid',
                definition_payload: pkg,
                package_validation_report_json: null,
                assessment_status: 'in_progress',
                total_questions: pkg.questions.length,
                metadata_json: null,
                completed_at: null,
                scoring_status: 'not_scored',
              }],
            }
          }

          if (/UPDATE assessments\s+SET metadata_json/i.test(sql)) {
            return { rows: [] }
          }

          throw new Error(`Unexpected query: ${sql}`)
        },
      } as never),
    },
  )

  assert.equal(result.status, 200)
  if (result.status !== 200 || typeof result.body.questionId !== 'string') return
  assert.equal(result.body.questionId, pkg.questions[0]?.id)
})


test('numeric compatibility adapter rejects numeric payloads that cannot map to v2 question ids', async () => {
  const pkg = await loadExamplePackage()

  const result = await saveAssessmentResponse(
    {
      appUserId: 'user-1',
      assessmentId: 'assessment-1',
      questionId: Math.min(80, pkg.questions.length + 1),
      responseValue: 2,
    },
    {
      queryDb: async () => ({
        rows: [{
          user_id: 'user-1',
          package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
          definition_payload: pkg,
        }],
      }) as never,
      withTransaction: async () => {
        throw new Error('should not reach persistence when compatibility mapping fails')
      },
    },
  )

  assert.equal(result.status, 400)
  assert.match(result.body.error, /Invalid question reference/)
})

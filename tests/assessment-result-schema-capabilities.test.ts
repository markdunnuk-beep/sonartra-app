import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAssessmentResultReportArtifactSelectProjection,
  resetAssessmentResultSchemaCapabilitiesCacheForTests,
} from '../lib/server/assessment-result-schema-capabilities'

test('assessment result schema capability projects report_artifact_json when column exists', async () => {
  resetAssessmentResultSchemaCapabilitiesCacheForTests()

  const projection = await getAssessmentResultReportArtifactSelectProjection('ar.report_artifact_json', {
    queryDb: async () => ({ rows: [{ has_column: true }] }) as never,
  })

  assert.equal(projection, 'ar.report_artifact_json')
})

test('assessment result schema capability falls back to null projection when column is absent', async () => {
  resetAssessmentResultSchemaCapabilitiesCacheForTests()

  const projection = await getAssessmentResultReportArtifactSelectProjection('ar.report_artifact_json', {
    queryDb: async () => ({ rows: [{ has_column: false }] }) as never,
  })

  assert.equal(projection, 'NULL::jsonb AS report_artifact_json')
})

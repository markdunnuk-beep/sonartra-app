import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import test from 'node:test'

import { validateSonartraAssessmentPackageV2, SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2 } from '../lib/admin/domain/assessment-package-v2'
import { resolveLiveSignalsPublishedVersionState } from '../lib/server/live-signals-runtime'

async function loadExamplePackage() {
  const payload = JSON.parse(await fs.readFile(new URL('./fixtures/package-contract-v2-example.json', import.meta.url), 'utf8'))
  const validation = validateSonartraAssessmentPackageV2(payload)
  assert.equal(validation.ok, true)
  return validation.normalizedPackage!
}

test('published v2 version is unavailable until runtime-v2 materialization exists', async () => {
  const pkg = await loadExamplePackage()

  const state = await resolveLiveSignalsPublishedVersionState({
    queryDb: async () => ({
      rows: [{
        assessment_definition_id: 'definition-1',
        assessment_definition_key: 'sonartra_signals',
        assessment_definition_slug: 'sonartra-signals',
        current_published_version_id: 'version-1',
        assessment_version_id: 'version-1',
        assessment_version_key: 'v2',
        assessment_version_name: 'v2',
        total_questions: 4,
        is_active: true,
        active_question_set_id: null,
        active_question_count: 0,
        questions_with_runtime_metadata: 0,
        runtime_v2_version_id: null,
        package_schema_version: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
        package_status: 'valid',
        definition_payload: pkg,
      }],
    }),
  })

  assert.equal(state.version, null)
  assert.equal(state.diagnostic.code, 'package_not_compilable')
})

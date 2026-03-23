import assert from 'node:assert/strict'
import test from 'node:test'

import { getAdminAssessmentVersionSchemaCapabilities } from '../lib/admin/server/assessment-version-schema-capabilities'

test('assessment version capabilities inspect the schema resolved by search_path', async () => {
  const calls: Array<{ sql: string; params?: unknown[] }> = []

  const capabilities = await getAdminAssessmentVersionSchemaCapabilities({
    queryDb: async (sql, params) => {
      calls.push({ sql, params })

      if (/assessment_versions_schema/i.test(sql)) {
        return {
          rows: [{ assessment_versions_schema: 'public' }],
        } as never
      }

      if (/from information_schema\.columns/i.test(sql)) {
        return {
          rows: [
            { column_name: 'id' },
            { column_name: 'publish_readiness_status' },
            { column_name: 'sign_off_status' },
          ],
        } as never
      }

      throw new Error(`Unexpected SQL: ${sql}`)
    },
  })

  assert.equal(capabilities.hasAssessmentVersionsTable, true)
  assert.equal(capabilities.assessmentVersionColumns.has('publish_readiness_status'), true)
  assert.equal(capabilities.assessmentVersionColumns.has('sign_off_status'), true)
  assert.deepEqual(calls[1]?.params, ['public'])
  assert.match(calls[0]?.sql ?? '', /to_regclass\('assessment_versions'\)/i)
})

test('assessment version capabilities return an empty column set when search_path does not resolve the table', async () => {
  const capabilities = await getAdminAssessmentVersionSchemaCapabilities({
    queryDb: async (sql) => {
      if (/assessment_versions_schema/i.test(sql)) {
        return {
          rows: [{ assessment_versions_schema: null }],
        } as never
      }

      throw new Error(`Unexpected SQL: ${sql}`)
    },
  })

  assert.equal(capabilities.hasAssessmentVersionsTable, false)
  assert.deepEqual([...capabilities.assessmentVersionColumns], [])
})

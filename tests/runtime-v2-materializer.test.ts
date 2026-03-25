import assert from 'node:assert/strict'
import test from 'node:test'

import type { SonartraAssessmentPackageV2 } from '../lib/contracts/package-contract-v2'
import { materializeRuntimeContractV2ForAssessmentVersion } from '../lib/server/runtime-v2-materializer'

function buildMinimalPackage(): SonartraAssessmentPackageV2 {
  return {
    metadata: {
      definitionId: 'wplp80',
      version: '2.0.0',
      title: 'WPLP-80 Lite',
    },
    questionSets: [{ id: 'qs-core', title: 'Core', order: 1 }],
    questions: [{ id: 'q-1', questionSetId: 'qs-core', text: 'Question 1', order: 1 }],
    options: [
      { id: 'q-1-o-1', questionId: 'q-1', text: 'Option 1', order: 1 },
      { id: 'q-1-o-2', questionId: 'q-1', text: 'Option 2', order: 2 },
    ],
    signalMappings: [
      { optionId: 'q-1-o-1', signalKey: 'signal.alpha', weight: 1, domain: 'core' },
      { optionId: 'q-1-o-2', signalKey: 'signal.beta', weight: 1, domain: 'core' },
    ],
    scoring: { method: 'weighted_sum' },
    normalization: { method: 'percentage_distribution', enforceTotal: 100 },
    output: { generateRankings: true, generateDomainSummaries: true, generateOverview: true },
  }
}

test('materializer success compiles and writes deterministic runtime-v2 rows', async () => {
  const queries: string[] = []
  const result = await materializeRuntimeContractV2ForAssessmentVersion(
    {
      assessmentVersionId: 'version-1',
      assessmentDefinitionId: 'definition-1',
      packagePayload: buildMinimalPackage(),
    },
    {
      withTransactionFn: async (work) => work({
        query: async (sql: string) => {
          queries.push(sql)
          if (/returning id/i.test(sql)) {
            return { rows: [{ id: 'runtime-v2-1' }] }
          }
          return { rows: [] }
        },
      } as never),
    },
  )

  assert.equal(result.success, true)
  assert.equal(result.runtimeVersionId, 'runtime-v2-1')
  assert.deepEqual(result.fingerprint, {
    questionSetCount: 1,
    questionCount: 1,
    optionCount: 2,
    mappingCount: 2,
    signalCount: 2,
    domainCount: 1,
  })
  assert.ok(queries.some((sql) => /insert into assessment_runtime_versions_v2/i.test(sql)))
})

test('materializer failure on validation returns errors and skips writes', async () => {
  let wrote = false
  const result = await materializeRuntimeContractV2ForAssessmentVersion(
    {
      assessmentVersionId: 'version-1',
      assessmentDefinitionId: 'definition-1',
      packagePayload: { bad: true },
    },
    {
      withTransactionFn: async () => {
        wrote = true
        throw new Error('should not run')
      },
    },
  )

  assert.equal(result.success, false)
  assert.equal(wrote, false)
  assert.ok((result.errors ?? []).length > 0)
})

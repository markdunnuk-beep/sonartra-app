import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs/promises'

import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import {
  canonicalizeV2ResponseEnvelope,
  evaluatePackageV2LiveRuntimeSupport,
  normalizeV2LiveResponseValue,
} from '../lib/package-contract-v2-live-runtime'

async function loadExamplePackage() {
  const payload = JSON.parse(await fs.readFile(new URL('./fixtures/package-contract-v2-example.json', import.meta.url), 'utf8'))
  const validation = validateSonartraAssessmentPackageV2(payload)
  assert.equal(validation.ok, true)
  return validation.normalizedPackage!
}

test('live runtime support is not treated as available from compile success alone when delivery/save capabilities are missing', async () => {
  const pkg = await loadExamplePackage()
  const tamperedPackage = {
    ...pkg,
    questions: [
      {
        ...pkg.questions[0],
        responseModelId: 'missing-model',
      },
      ...pkg.questions.slice(1),
    ],
  }

  const support = evaluatePackageV2LiveRuntimeSupport(tamperedPackage as typeof pkg, {
    compile: () => ({
      ok: true,
      executablePackage: {} as never,
      diagnostics: [],
    }),
  })

  assert.equal(support.supported, false)
  assert.equal(support.issues.some((issue) => issue.capability === 'question_delivery' && issue.code === 'question_missing_response_model'), true)
})

test('canonical live response envelope normalizes persisted answers into evaluator-ready question order', async () => {
  const pkg = await loadExamplePackage()
  const canonical = canonicalizeV2ResponseEnvelope(pkg, {
    liveRuntimeV2: {
      responses: {
        q4: 'often',
        q1: 'always',
        q3: 'always',
        q2: 'rarely',
        unexpected: 'ignore-me',
      },
      updatedAtByQuestionId: {
        q4: '2026-03-23T12:00:03.000Z',
        q1: '2026-03-23T12:00:00.000Z',
        q3: '2026-03-23T12:00:02.000Z',
        q2: '2026-03-23T12:00:01.000Z',
        unexpected: '2026-03-23T12:00:09.000Z',
      },
    },
  })

  assert.deepEqual(Object.keys(canonical.responses), ['q1', 'q2', 'q3', 'q4'])
  assert.equal('unexpected' in canonical.responses, false)
  assert.equal('unexpected' in canonical.updatedAtByQuestionId, false)
})

test('multi-select live responses normalize into stable option order before persistence/evaluation', () => {
  const pkg = {
    questions: [
      {
        id: 'q1',
        responseModelId: 'model-1',
      },
    ],
    responseModels: {
      models: [
        {
          id: 'model-1',
          type: 'multi_select',
          optionSetId: null,
          options: [
            { id: 'opt-a', label: 'A', value: 'a', code: 'A' },
            { id: 'opt-b', label: 'B', value: 'b', code: 'B' },
            { id: 'opt-c', label: 'C', value: 'c', code: 'C' },
          ],
          multiSelect: { minSelections: 1, maxSelections: 3 },
        },
      ],
      optionSets: [],
    },
  }

  const normalized = normalizeV2LiveResponseValue({
    pkg: pkg as never,
    questionId: 'q1',
    response: ['opt-c', 'opt-a'],
  })

  assert.equal(normalized.ok, true)
  if (!normalized.ok) return
  assert.deepEqual(normalized.value, ['opt-a', 'opt-c'])
})

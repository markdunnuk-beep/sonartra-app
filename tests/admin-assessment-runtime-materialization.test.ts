import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getAssessmentRuntimeExecutableIssues,
  materializeAssessmentRuntimeFromPackage,
} from '../lib/admin/server/assessment-runtime-materialization'
import type { SonartraAssessmentPackageV1 } from '../lib/admin/domain/assessment-package'

function buildExecutablePackage(): SonartraAssessmentPackageV1 {
  return {
    meta: {
      schemaVersion: 'sonartra-assessment-package/v1',
      assessmentKey: 'signals',
      assessmentTitle: 'Signals',
      versionLabel: '2.0.0',
      defaultLocale: 'en',
    },
    dimensions: [
      { id: 'Core_Driver', labelKey: 'dimension.core_driver.label' },
      { id: 'Core_Analyst', labelKey: 'dimension.core_analyst.label' },
    ],
    questions: [
      {
        id: 'q1',
        promptKey: 'question.q1.prompt',
        dimensionId: 'Core_Driver',
        reverseScored: true,
        weight: 1.5,
        options: [
          { id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { Core_Driver: 1, Core_Analyst: 4 } },
          { id: 'q1.b', labelKey: 'question.q1.option.b', value: 2, scoreMap: { Core_Driver: 2, Core_Analyst: 3 } },
          { id: 'q1.c', labelKey: 'question.q1.option.c', value: 3, scoreMap: { Core_Driver: 3, Core_Analyst: 2 } },
          { id: 'q1.d', labelKey: 'question.q1.option.d', value: 4, scoreMap: { Core_Driver: 4, Core_Analyst: 1 } },
        ],
      },
    ],
    scoring: {
      dimensionRules: [
        { dimensionId: 'Core_Driver', aggregation: 'sum' },
        { dimensionId: 'Core_Analyst', aggregation: 'sum' },
      ],
    },
    normalization: {
      scales: [
        {
          id: 'core-scale',
          dimensionIds: ['Core_Driver', 'Core_Analyst'],
          range: { min: 0, max: 10 },
          bands: [
            { key: 'low', min: 0, max: 3, labelKey: 'band.low.label' },
            { key: 'high', min: 7, max: 10, labelKey: 'band.high.label' },
          ],
        },
      ],
    },
    outputs: {
      reportRules: [
        {
          key: 'summary',
          labelKey: 'output.summary.label',
          dimensionIds: ['Core_Driver', 'Core_Analyst'],
          normalizationScaleId: 'core-scale',
        },
      ],
    },
    language: {
      locales: [
        {
          locale: 'en',
          text: {
            'dimension.core_driver.label': 'Core Driver',
            'dimension.core_analyst.label': 'Core Analyst',
            'question.q1.prompt': 'I naturally set the pace for the team.',
            'question.q1.option.a': 'Rarely',
            'question.q1.option.b': 'Sometimes',
            'question.q1.option.c': 'Often',
            'question.q1.option.d': 'Almost always',
            'band.low.label': 'Low',
            'band.high.label': 'High',
            'output.summary.label': 'Summary',
          },
        },
      ],
    },
  }
}

function createMaterializationClient() {
  const state = {
    questionSet: null as null | { id: string; assessmentVersionId: string; key: string; name: string; description: string | null; isActive: boolean },
    questions: new Map<number, {
      id: string
      questionKey: string
      prompt: string
      sectionKey: string
      sectionName: string | null
      reverseScored: boolean
      weight: number
      scoringFamily: string | null
      metadataJson: string
      options: Map<string, {
        id: string
        optionText: string
        displayOrder: number
        numericValue: number
        mappings: Map<string, number>
      }>
    }>(),
  }
  let nextQuestionId = 1
  let nextOptionId = 1

  return {
    state,
    client: {
      query: async (sql: string, params: unknown[] = []) => {
        if (/insert into assessment_question_sets/i.test(sql)) {
          const [assessmentVersionId, key, name, description] = params as [string, string, string, string | null]
          state.questionSet = {
            id: state.questionSet?.id ?? 'question-set-1',
            assessmentVersionId,
            key,
            name,
            description,
            isActive: true,
          }
          return { rows: [{ id: state.questionSet.id }] }
        }

        if (/update assessment_question_sets/i.test(sql)) {
          if (state.questionSet) {
            state.questionSet.isActive = true
          }
          return { rows: [] }
        }

        if (/insert into assessment_questions/i.test(sql)) {
          const [questionSetId, questionNumber, questionKey, prompt, sectionKey, sectionName, reverseScored, weight, scoringFamily, metadataJson] =
            params as [string, number, string, string, string, string | null, boolean, number, string | null, string]
          assert.equal(questionSetId, state.questionSet?.id)
          const existing = state.questions.get(questionNumber)
          const id = existing?.id ?? `question-${nextQuestionId++}`
          state.questions.set(questionNumber, {
            id,
            questionKey,
            prompt,
            sectionKey,
            sectionName,
            reverseScored,
            weight,
            scoringFamily,
            metadataJson,
            options: existing?.options ?? new Map(),
          })
          return { rows: [{ id }] }
        }

        if (/delete from assessment_questions/i.test(sql)) {
          const [, questionNumbers] = params as [string, number[]]
          for (const key of [...state.questions.keys()]) {
            if (!questionNumbers.includes(key)) {
              state.questions.delete(key)
            }
          }
          return { rows: [] }
        }

        if (/insert into assessment_question_options/i.test(sql)) {
          const [questionId, optionKey, optionText, displayOrder, numericValue] = params as [string, string, string, number, number]
          const question = [...state.questions.values()].find((entry) => entry.id === questionId)
          assert.ok(question)
          const existing = question?.options.get(optionKey)
          const id = existing?.id ?? `option-${nextOptionId++}`
          question?.options.set(optionKey, {
            id,
            optionText,
            displayOrder,
            numericValue,
            mappings: existing?.mappings ?? new Map(),
          })
          return { rows: [{ id }] }
        }

        if (/delete from assessment_question_options/i.test(sql)) {
          const [questionId, optionKeys] = params as [string, string[]]
          const question = [...state.questions.values()].find((entry) => entry.id === questionId)
          assert.ok(question)
          for (const key of [...(question?.options.keys() ?? [])]) {
            if (!optionKeys.includes(key)) {
              question?.options.delete(key)
            }
          }
          return { rows: [] }
        }

        if (/insert into assessment_option_signal_mappings/i.test(sql)) {
          const [optionId, signalCode, signalWeight] = params as [string, string, number]
          const option = [...state.questions.values()].flatMap((question) => [...question.options.values()]).find((entry) => entry.id === optionId)
          assert.ok(option)
          option?.mappings.set(signalCode, signalWeight)
          return { rows: [] }
        }

        if (/delete from assessment_option_signal_mappings/i.test(sql)) {
          const [optionId, signalCodes] = params as [string, string[]]
          const option = [...state.questions.values()].flatMap((question) => [...question.options.values()]).find((entry) => entry.id === optionId)
          assert.ok(option)
          for (const key of [...(option?.mappings.keys() ?? [])]) {
            if (!signalCodes.includes(key)) {
              option?.mappings.delete(key)
            }
          }
          return { rows: [] }
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
    },
  }
}

test('materializeAssessmentRuntimeFromPackage creates live runtime rows from a valid package', async () => {
  const pkg = buildExecutablePackage()
  const { client, state } = createMaterializationClient()

  const result = await materializeAssessmentRuntimeFromPackage(client as never, {
    assessmentVersionId: 'version-1',
    assessmentVersionKey: 'signals-v2',
    assessmentVersionName: 'Signals',
    normalizedPackage: pkg,
  })

  assert.equal(result.totalQuestions, 1)
  assert.equal(state.questionSet?.key, 'signals-v2-main')
  assert.equal(state.questions.size, 1)
  const question = state.questions.get(1)
  assert.equal(question?.prompt, 'I naturally set the pace for the team.')
  assert.equal(question?.sectionName, 'Core Driver')
  assert.equal(question?.weight, 1.5)
  const firstOption = question?.options.get('q1.a')
  assert.equal(firstOption?.optionText, 'Rarely')
  assert.equal(firstOption?.mappings.get('Core_Driver'), 6)
  assert.equal(firstOption?.mappings.get('Core_Analyst'), 1.5)
})

test('materializeAssessmentRuntimeFromPackage is idempotent when rerun for the same version', async () => {
  const pkg = buildExecutablePackage()
  const { client, state } = createMaterializationClient()

  await materializeAssessmentRuntimeFromPackage(client as never, {
    assessmentVersionId: 'version-1',
    assessmentVersionKey: 'signals-v2',
    assessmentVersionName: 'Signals',
    normalizedPackage: pkg,
  })
  const firstSnapshot = JSON.stringify({
    questionSet: state.questionSet,
    questions: [...state.questions.entries()].map(([number, question]) => ({
      number,
      ...question,
      options: [...question.options.entries()].map(([key, option]) => ({
        key,
        ...option,
        mappings: [...option.mappings.entries()],
      })),
    })),
  })

  await materializeAssessmentRuntimeFromPackage(client as never, {
    assessmentVersionId: 'version-1',
    assessmentVersionKey: 'signals-v2',
    assessmentVersionName: 'Signals',
    normalizedPackage: pkg,
  })
  const secondSnapshot = JSON.stringify({
    questionSet: state.questionSet,
    questions: [...state.questions.entries()].map(([number, question]) => ({
      number,
      ...question,
      options: [...question.options.entries()].map(([key, option]) => ({
        key,
        ...option,
        mappings: [...option.mappings.entries()],
      })),
    })),
  })

  assert.equal(secondSnapshot, firstSnapshot)
})

test('getAssessmentRuntimeExecutableIssues reports non-executable live runtime packages', () => {
  const pkg = buildExecutablePackage()
  pkg.questions[0]!.options[0] = {
    id: 'q1.a',
    labelKey: 'question.q1.option.a',
    value: 5,
    scoreMap: { Unknown_Signal: 1 },
  }

  const result = getAssessmentRuntimeExecutableIssues(pkg)

  assert.deepEqual(result, [
    {
      path: 'questions[0].options[0].value',
      message: 'Live runtime option values must be integers between 1 and 4.',
    },
    {
      path: 'questions[0].options[0].scoreMap.Unknown_Signal',
      message: 'Live runtime scoring does not support signal code "Unknown_Signal".',
    },
  ])
})

test('materializeAssessmentRuntimeFromPackage logs structured stage diagnostics when option writes fail', async () => {
  const pkg = buildExecutablePackage()
  const originalConsoleError = console.error
  const consoleCalls: unknown[][] = []
  console.error = (...args: unknown[]) => {
    consoleCalls.push(args)
  }

  try {
    await assert.rejects(() => materializeAssessmentRuntimeFromPackage({
      query: async (sql: string) => {
        if (/insert into assessment_question_sets/i.test(sql)) {
          return { rows: [{ id: 'question-set-1' }] }
        }

        if (/update assessment_question_sets/i.test(sql)) {
          return { rows: [] }
        }

        if (/insert into assessment_questions/i.test(sql)) {
          return { rows: [{ id: 'question-1' }] }
        }

        if (/insert into assessment_question_options/i.test(sql)) {
          const error = new Error('null value in column "option_text" of relation "assessment_question_options" violates not-null constraint') as Error & {
            code?: string
            table?: string
            column?: string
            constraint?: string
            detail?: string
          }
          error.code = '23502'
          error.table = 'assessment_question_options'
          error.column = 'option_text'
          error.constraint = 'assessment_question_options_option_text_key'
          error.detail = 'Failing row contains null option_text.'
          throw error
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never, {
      assessmentVersionId: 'version-1',
      assessmentVersionKey: 'signals-v2',
      assessmentVersionName: 'Signals',
      normalizedPackage: pkg,
    }))

    const diagnostic = consoleCalls.find((call) => call[0] === '[admin-assessment-runtime-materialization] Stage failed.')
    assert.ok(diagnostic)
    assert.deepEqual(diagnostic?.[1], {
      stage: 'option_upsert',
      postgresCode: '23502',
      constraint: 'assessment_question_options_option_text_key',
      table: 'assessment_question_options',
      column: 'option_text',
      detail: 'Failing row contains null option_text.',
      message: 'null value in column "option_text" of relation "assessment_question_options" violates not-null constraint',
      assessmentVersionId: 'version-1',
      assessmentVersionKey: 'signals-v2',
      questionSetId: 'question-set-1',
      questionId: 'q1',
      runtimeQuestionId: 'question-1',
      optionId: 'q1.a',
      optionIndex: 0,
    })
  } finally {
    console.error = originalConsoleError
  }
})

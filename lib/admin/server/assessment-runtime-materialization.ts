import type { PoolClient } from 'pg'

import type {
  SonartraAssessmentPackageQuestion,
  SonartraAssessmentPackageQuestionOption,
  SonartraAssessmentPackageV1,
} from '@/lib/admin/domain/assessment-package'
import { SIGNAL_CODE_TO_LAYER } from '@/lib/scoring/constants'

type RuntimeMaterializationClient = Pick<PoolClient, 'query'>

export interface AssessmentRuntimeExecutableIssue {
  path: string
  message: string
}

export interface AssessmentRuntimeMaterializationInput {
  assessmentVersionId: string
  assessmentVersionKey: string
  assessmentVersionName: string
  normalizedPackage: SonartraAssessmentPackageV1
}

export interface AssessmentRuntimeMaterializationResult {
  questionSetId: string
  totalQuestions: number
}

class AssessmentRuntimeMaterializationStageError extends Error {
  stage: string
  metadata: Record<string, unknown>

  constructor(stage: string, metadata: Record<string, unknown>, cause: unknown) {
    super(`Runtime materialization stage failed: ${stage}`)
    this.name = 'AssessmentRuntimeMaterializationStageError'
    this.stage = stage
    this.metadata = metadata
    this.cause = cause
  }
}

function unwrapErrorCause(error: unknown): unknown {
  let current = error

  while (current && typeof current === 'object' && 'cause' in current) {
    const cause = (current as { cause?: unknown }).cause
    if (!cause) {
      break
    }

    current = cause
  }

  return current
}

function extractDatabaseFailureDetails(error: unknown) {
  const raw = unwrapErrorCause(error)
  const getStringProperty = (value: unknown, key: string) => (
    value && typeof value === 'object' && key in value && typeof (value as Record<string, unknown>)[key] === 'string'
      ? String((value as Record<string, unknown>)[key])
      : null
  )

  return {
    code: getStringProperty(raw, 'code'),
    constraint: getStringProperty(raw, 'constraint'),
    table: getStringProperty(raw, 'table'),
    column: getStringProperty(raw, 'column'),
    detail: getStringProperty(raw, 'detail'),
    message: raw instanceof Error
      ? raw.message
      : getStringProperty(raw, 'message') ?? (error instanceof Error ? error.message : 'Unknown database error.'),
  }
}

async function runMaterializationStage<T>(
  stage: string,
  metadata: Record<string, unknown>,
  work: () => Promise<T>,
): Promise<T> {
  try {
    return await work()
  } catch (error) {
    const details = extractDatabaseFailureDetails(error)
    console.error('[admin-assessment-runtime-materialization] Stage failed.', {
      stage,
      postgresCode: details.code,
      constraint: details.constraint,
      table: details.table,
      column: details.column,
      detail: details.detail,
      message: details.message,
      ...metadata,
    })
    throw new AssessmentRuntimeMaterializationStageError(stage, metadata, error)
  }
}

function resolveLocaleText(pkg: SonartraAssessmentPackageV1): Record<string, string> {
  return pkg.language.locales.find((entry) => entry.locale === pkg.meta.defaultLocale)?.text
    ?? pkg.language.locales[0]?.text
    ?? {}
}

function resolveText(text: Record<string, string>, key: string, fallback: string): string {
  return text[key]?.trim() || fallback
}

function roundSignalWeight(value: number): number {
  return Math.round(value * 10000) / 10000
}

function getEffectiveOption(
  question: SonartraAssessmentPackageQuestion,
  selectedOption: SonartraAssessmentPackageQuestionOption,
): SonartraAssessmentPackageQuestionOption {
  if (!question.reverseScored || question.options.length <= 1) {
    return selectedOption
  }

  const orderedOptions = [...question.options].sort((left, right) => left.value - right.value)
  const selectedIndex = orderedOptions.findIndex((option) => option.id === selectedOption.id)

  if (selectedIndex < 0) {
    return selectedOption
  }

  return orderedOptions[orderedOptions.length - 1 - selectedIndex] ?? selectedOption
}

export function getAssessmentRuntimeExecutableIssues(
  pkg: SonartraAssessmentPackageV1,
): AssessmentRuntimeExecutableIssue[] {
  const issues: AssessmentRuntimeExecutableIssue[] = []

  if (pkg.questions.length > 80) {
    issues.push({
      path: 'questions',
      message: 'Live runtime supports a maximum of 80 questions for a single published version.',
    })
  }

  pkg.questions.forEach((question, questionIndex) => {
    const seenOptionValues = new Set<number>()

    question.options.forEach((option, optionIndex) => {
      if (!Number.isInteger(option.value) || option.value < 1 || option.value > 4) {
        issues.push({
          path: `questions[${questionIndex}].options[${optionIndex}].value`,
          message: 'Live runtime option values must be integers between 1 and 4.',
        })
      }

      if (seenOptionValues.has(option.value)) {
        issues.push({
          path: `questions[${questionIndex}].options[${optionIndex}].value`,
          message: `Question "${question.id}" contains duplicate option value ${option.value}.`,
        })
      } else {
        seenOptionValues.add(option.value)
      }

      Object.keys(option.scoreMap).forEach((signalCode) => {
        if (!SIGNAL_CODE_TO_LAYER[signalCode]) {
          issues.push({
            path: `questions[${questionIndex}].options[${optionIndex}].scoreMap.${signalCode}`,
            message: `Live runtime scoring does not support signal code "${signalCode}".`,
          })
        }
      })
    })
  })

  return issues
}

export async function materializeAssessmentRuntimeFromPackage(
  client: RuntimeMaterializationClient,
  input: AssessmentRuntimeMaterializationInput,
): Promise<AssessmentRuntimeMaterializationResult> {
  const localeText = resolveLocaleText(input.normalizedPackage)
  const dimensionLabels = new Map(
    input.normalizedPackage.dimensions.map((dimension) => [
      dimension.id,
      resolveText(localeText, dimension.labelKey, dimension.id),
    ]),
  )
  const questionSetKey = `${input.assessmentVersionKey}-main`
  const versionLabelSuffix = input.normalizedPackage.meta.versionLabel ? ` v${input.normalizedPackage.meta.versionLabel}` : ''
  const questionSetDescription = `Materialized live runtime question set for ${input.assessmentVersionName}${versionLabelSuffix}.`
  const questionNumbers = input.normalizedPackage.questions.map((_, index) => index + 1)

  const questionSetResult = await runMaterializationStage('question_set_upsert', {
    assessmentVersionId: input.assessmentVersionId,
    assessmentVersionKey: input.assessmentVersionKey,
    questionSetKey,
  }, () => client.query<{ id: string }>(
    `insert into assessment_question_sets (
       assessment_version_id,
       key,
       name,
       description,
       is_active
     )
     values ($1, $2, $3, $4, true)
     on conflict (key)
     do update set
       assessment_version_id = excluded.assessment_version_id,
       name = excluded.name,
       description = excluded.description,
       is_active = true,
       updated_at = now()
     returning id`,
    [
      input.assessmentVersionId,
      questionSetKey,
      `${input.assessmentVersionName} Main Question Set`,
      questionSetDescription,
    ],
  ))
  const questionSetId = questionSetResult.rows[0]?.id

  if (!questionSetId) {
    throw new Error('Runtime question set could not be materialized.')
  }

  await runMaterializationStage('question_set_activation', {
    assessmentVersionId: input.assessmentVersionId,
    assessmentVersionKey: input.assessmentVersionKey,
    questionSetId,
  }, () => client.query(
    `update assessment_question_sets
     set is_active = case when id = $2 then true else false end,
         updated_at = now()
     where assessment_version_id = $1`,
    [input.assessmentVersionId, questionSetId],
  ))

  for (const [index, question] of input.normalizedPackage.questions.entries()) {
    const questionNumber = index + 1
    const questionResult = await runMaterializationStage('question_upsert', {
      assessmentVersionId: input.assessmentVersionId,
      assessmentVersionKey: input.assessmentVersionKey,
      questionSetId,
      questionId: question.id,
      questionNumber,
    }, () => client.query<{ id: string }>(
      `insert into assessment_questions (
         question_set_id,
         question_number,
         question_key,
         prompt,
         section_key,
         section_name,
         reverse_scored,
         question_weight_default,
         scoring_family,
         notes,
         is_active,
         metadata_json
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, null, true, $10::jsonb)
       on conflict (question_set_id, question_number)
       do update set
         question_key = excluded.question_key,
         prompt = excluded.prompt,
         section_key = excluded.section_key,
         section_name = excluded.section_name,
         reverse_scored = excluded.reverse_scored,
         question_weight_default = excluded.question_weight_default,
         scoring_family = excluded.scoring_family,
         notes = excluded.notes,
         is_active = true,
         metadata_json = excluded.metadata_json,
         updated_at = now()
       returning id`,
      [
        questionSetId,
        questionNumber,
        question.id,
        resolveText(localeText, question.promptKey, question.promptKey),
        question.dimensionId,
        dimensionLabels.get(question.dimensionId) ?? question.dimensionId,
        question.reverseScored,
        question.weight,
        question.dimensionId,
        JSON.stringify({
          packageQuestionId: question.id,
          promptKey: question.promptKey,
          dimensionId: question.dimensionId,
        }),
      ],
    ))
    const questionId = questionResult.rows[0]?.id

    if (!questionId) {
      throw new Error(`Runtime question ${question.id} could not be materialized.`)
    }

    const optionKeys: string[] = []

    for (const [optionIndex, option] of question.options.entries()) {
      const optionResult = await runMaterializationStage('option_upsert', {
        assessmentVersionId: input.assessmentVersionId,
        assessmentVersionKey: input.assessmentVersionKey,
        questionSetId,
        questionId: question.id,
        runtimeQuestionId: questionId,
        optionId: option.id,
        optionIndex,
      }, () => client.query<{ id: string }>(
        `insert into assessment_question_options (
           question_id,
           option_key,
           option_text,
           display_order,
           numeric_value
         )
         values ($1, $2, $3, $4, $5)
         on conflict (question_id, option_key)
         do update set
           option_text = excluded.option_text,
           display_order = excluded.display_order,
           numeric_value = excluded.numeric_value,
           updated_at = now()
         returning id`,
        [
          questionId,
          option.id,
          resolveText(localeText, option.labelKey, option.labelKey),
          optionIndex + 1,
          option.value,
        ],
      ))
      const optionId = optionResult.rows[0]?.id

      if (!optionId) {
        throw new Error(`Runtime option ${question.id}.${option.id} could not be materialized.`)
      }

      optionKeys.push(option.id)

      const effectiveOption = getEffectiveOption(question, option)
      const signalCodes = Object.keys(effectiveOption.scoreMap)

      for (const signalCode of signalCodes) {
        await runMaterializationStage('signal_mapping_upsert', {
          assessmentVersionId: input.assessmentVersionId,
          assessmentVersionKey: input.assessmentVersionKey,
          questionId: question.id,
          optionId: option.id,
          runtimeOptionId: optionId,
          signalCode,
        }, () => client.query(
          `insert into assessment_option_signal_mappings (
             question_option_id,
             signal_code,
             signal_weight
           )
           values ($1, $2, $3)
           on conflict (question_option_id, signal_code)
           do update set
             signal_weight = excluded.signal_weight`,
          [
            optionId,
            signalCode,
            roundSignalWeight((effectiveOption.scoreMap[signalCode] ?? 0) * question.weight),
          ],
        ))
      }

      await runMaterializationStage('signal_mapping_cleanup', {
        assessmentVersionId: input.assessmentVersionId,
        assessmentVersionKey: input.assessmentVersionKey,
        questionId: question.id,
        optionId: option.id,
        runtimeOptionId: optionId,
      }, () => client.query(
        `delete from assessment_option_signal_mappings
         where question_option_id = $1
           and not (signal_code = any($2::text[]))`,
        [optionId, signalCodes],
      ))
    }

    await runMaterializationStage('option_cleanup', {
      assessmentVersionId: input.assessmentVersionId,
      assessmentVersionKey: input.assessmentVersionKey,
      questionId: question.id,
      runtimeQuestionId: questionId,
    }, () => client.query(
      `delete from assessment_question_options
       where question_id = $1
         and not (option_key = any($2::text[]))`,
      [questionId, optionKeys],
    ))
  }

  await runMaterializationStage('question_cleanup', {
    assessmentVersionId: input.assessmentVersionId,
    assessmentVersionKey: input.assessmentVersionKey,
    questionSetId,
  }, () => client.query(
    `delete from assessment_questions
     where question_set_id = $1
       and not (question_number = any($2::int[]))`,
    [questionSetId, questionNumbers],
  ))

  return {
    questionSetId,
    totalQuestions: input.normalizedPackage.questions.length,
  }
}

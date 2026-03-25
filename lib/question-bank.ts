import { AssessmentRow, AssessmentVersionRow } from '@/lib/assessment-types';
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, parseStoredValidatedAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2';
import { HYBRID_MVP_CONTRACT_VERSION, type HybridMvpAssessmentDefinition } from '@/lib/assessment/hybrid-mvp-scoring';
import { buildV2QuestionDeliveryContract } from '@/lib/server/live-assessment-v2';
import { getMaterializedRuntimeVersionByAssessmentVersionId, getRuntimeV2OptionsForQuestions, getRuntimeV2Questions } from '@/lib/server/runtime-v2-repository';
import { queryDb } from '@/lib/db';
import {
  AssessmentQuestionSetRow,
  AssessmentQuestionsResponse,
  QuestionPayload,
  VersionQuestionsResponse,
} from '@/lib/question-bank-types';

interface QuestionBankDependencies {
  queryDb: typeof queryDb;
}

interface AssessmentRuntimeVersionRow extends AssessmentVersionRow {
  package_schema_version: string | null
  package_raw_payload: unknown
  definition_payload: unknown
}

interface QuestionWithOptionRow {
  question_number: number;
  question_key: string;
  prompt: string;
  section_key: string;
  section_name: string | null;
  reverse_scored: boolean;
  option_key: string;
  option_text: string;
  display_order: number;
  numeric_value: number | null;
}

interface AssessmentResponseLiteRow {
  question_id: number;
  response_value: number;
  response_time_ms: number | null;
  is_changed: boolean;
  updated_at: string;
}

interface VersionQuestionSetJoinRow {
  id: string;
  key: string;
  name: string;
  total_questions: number;
  is_active: boolean;
  question_set_id: string;
  assessment_version_id: string;
  question_set_key: string;
  question_set_name: string;
  description: string | null;
  question_set_is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RuntimeQuestionResponseRow {
  question_id: number
  response_value: number
  response_time_ms: number | null
  is_changed: boolean
  updated_at: string
}

interface HybridResponseEnvelope {
  responses?: Record<string, unknown>
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseHybridDefinition(payload: unknown): HybridMvpAssessmentDefinition | null {
  if (!isRecord(payload) || payload.contractVersion !== HYBRID_MVP_CONTRACT_VERSION) {
    return null
  }

  return payload as unknown as HybridMvpAssessmentDefinition
}

function toLegacyNumericOptionValue(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function mapV2ContractToLegacyQuestions(runtime: ReturnType<typeof buildV2QuestionDeliveryContract>): QuestionPayload[] {
  return runtime.questions.map((question, index) => ({
    question_number: index + 1,
    question_key: question.code || question.id,
    prompt: question.prompt,
    section_key: question.sections[0]?.id ?? 'default',
    section_name: question.sections[0]?.title ?? null,
    reverse_scored: false,
    options: question.responseModel.options.map((option, optionIndex) => ({
      option_key: option.code ?? option.id,
      option_text: option.label,
      display_order: optionIndex + 1,
      numeric_value: toLegacyNumericOptionValue(option.value, optionIndex + 1),
    })),
  }))
}

function mapRuntimeV2RowsToLegacyQuestions(input: {
  questions: Array<{ question_id: string; text: string; display_order: number }>
  options: Array<{ option_id: string; question_id: string; text: string; display_order: number }>
}): QuestionPayload[] {
  const optionsByQuestion = new Map<string, Array<{ option_id: string; text: string; display_order: number }>>()

  for (const option of input.options) {
    const list = optionsByQuestion.get(option.question_id) ?? []
    list.push({ option_id: option.option_id, text: option.text, display_order: option.display_order })
    optionsByQuestion.set(option.question_id, list)
  }

  return input.questions
    .slice()
    .sort((left, right) => left.display_order - right.display_order || left.question_id.localeCompare(right.question_id))
    .map((question, index) => ({
      question_number: index + 1,
      question_key: question.question_id,
      prompt: question.text,
      section_key: 'runtime_v2',
      section_name: 'Runtime V2',
      reverse_scored: false,
      options: (optionsByQuestion.get(question.question_id) ?? [])
        .slice()
        .sort((left, right) => left.display_order - right.display_order || left.option_id.localeCompare(right.option_id))
        .map((option) => ({
          option_key: option.option_id,
          option_text: option.text,
          display_order: option.display_order,
          numeric_value: option.display_order,
        })),
    }))
}

function mapV2ResponsesToLegacyRows(input: {
  runtime: ReturnType<typeof buildV2QuestionDeliveryContract>
  questions: QuestionPayload[]
}): RuntimeQuestionResponseRow[] {
  const byQuestionId = new Map(input.runtime.questions.map((question, index) => [question.id, { question, index }]))

  return input.runtime.responses.flatMap((response) => {
    const runtimeQuestion = byQuestionId.get(response.questionId)
    if (!runtimeQuestion) return []

    const questionNumber = runtimeQuestion.index + 1
    const mappedQuestion = input.questions[runtimeQuestion.index]
    if (!mappedQuestion) return []

    const matchedOption = mappedQuestion.options.find((option) =>
      option.numeric_value === response.value
      || option.option_key === response.value
      || option.option_text === response.value,
    )

    return [{
      question_id: questionNumber,
      response_value: matchedOption?.numeric_value ?? mappedQuestion.options[0]?.numeric_value ?? 1,
      response_time_ms: null,
      is_changed: false,
      updated_at: response.updatedAt ?? new Date(0).toISOString(),
    }]
  })
}

function mapHybridDefinitionToLegacyQuestions(definition: HybridMvpAssessmentDefinition): QuestionPayload[] {
  return definition.questions.map((question, questionIndex) => ({
    question_number: questionIndex + 1,
    question_key: question.id,
    prompt: question.prompt,
    section_key: 'hybrid_mvp',
    section_name: 'Hybrid Assessment',
    reverse_scored: false,
    options: question.options.map((option, optionIndex) => ({
      option_key: option.id,
      option_text: option.label,
      display_order: optionIndex + 1,
      numeric_value: optionIndex + 1,
    })),
  }))
}

function mapHybridResponsesToLegacyRows(input: {
  metadataJson: Record<string, unknown> | null
  definition: HybridMvpAssessmentDefinition
  questions: QuestionPayload[]
}): RuntimeQuestionResponseRow[] {
  const liveHybrid = isRecord(input.metadataJson?.liveHybridMvpV1) ? input.metadataJson.liveHybridMvpV1 as HybridResponseEnvelope : null
  const responses = isRecord(liveHybrid?.responses) ? liveHybrid.responses : {}
  const updatedByQuestion = isRecord(input.metadataJson?.liveHybridMvpV1) && isRecord((input.metadataJson.liveHybridMvpV1 as Record<string, unknown>).updatedAtByQuestionId)
    ? (input.metadataJson.liveHybridMvpV1 as Record<string, Record<string, string>>).updatedAtByQuestionId
    : {}

  return input.definition.questions.flatMap((question, index) => {
    const response = responses[question.id]
    if (typeof response !== 'string') return []

    const mappedQuestion = input.questions[index]
    if (!mappedQuestion) return []
    const matchedOption = mappedQuestion.options.find((option) => option.option_key === response)
    if (!matchedOption?.numeric_value) return []

    return [{
      question_id: index + 1,
      response_value: matchedOption.numeric_value,
      response_time_ms: null,
      is_changed: false,
      updated_at: updatedByQuestion[question.id] ?? new Date(0).toISOString(),
    }]
  })
}

function groupQuestions(rows: QuestionWithOptionRow[]): QuestionPayload[] {
  const byQuestion = new Map<number, QuestionPayload>();

  for (const row of rows) {
    const existing = byQuestion.get(row.question_number);

    if (!existing) {
      byQuestion.set(row.question_number, {
        question_number: row.question_number,
        question_key: row.question_key,
        prompt: row.prompt,
        section_key: row.section_key,
        section_name: row.section_name,
        reverse_scored: row.reverse_scored,
        options: [
          {
            option_key: row.option_key,
            option_text: row.option_text,
            display_order: row.display_order,
            numeric_value: row.numeric_value,
          },
        ],
      });
      continue;
    }

    existing.options.push({
      option_key: row.option_key,
      option_text: row.option_text,
      display_order: row.display_order,
      numeric_value: row.numeric_value,
    });
  }

  return [...byQuestion.values()].sort((a, b) => a.question_number - b.question_number);
}

export async function resolveVersionAndActiveQuestionSet(versionKey: string): Promise<{
  version: AssessmentVersionRow;
  questionSet: AssessmentQuestionSetRow;
} | null> {
  return resolveVersionAndActiveQuestionSetWithDependencies(versionKey, { queryDb });
}

export async function resolveVersionAndActiveQuestionSetWithDependencies(
  versionKey: string,
  dependencies: QuestionBankDependencies,
): Promise<{
  version: AssessmentVersionRow;
  questionSet: AssessmentQuestionSetRow;
} | null> {
  const result = await dependencies.queryDb<VersionQuestionSetJoinRow>(
    `SELECT
       av.id,
       av.key,
       av.name,
       av.total_questions,
       av.is_active,
       aqs.id AS question_set_id,
       aqs.assessment_version_id,
       aqs.key AS question_set_key,
       aqs.name AS question_set_name,
       aqs.description,
       aqs.is_active AS question_set_is_active,
       aqs.created_at,
       aqs.updated_at
     FROM assessment_versions av
     INNER JOIN assessment_question_sets aqs
       ON aqs.assessment_version_id = av.id
     WHERE av.key = $1 AND aqs.is_active = TRUE
     ORDER BY aqs.created_at DESC
     LIMIT 1`,
    [versionKey]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    version: {
      id: row.id,
      key: row.key,
      name: row.name,
      total_questions: row.total_questions,
      is_active: row.is_active,
    },
    questionSet: {
      id: row.question_set_id,
      assessment_version_id: row.assessment_version_id,
      key: row.question_set_key,
      name: row.question_set_name,
      description: row.description,
      is_active: row.question_set_is_active,
      created_at: row.created_at,
      updated_at: row.updated_at,
    },
  };
}

export async function getQuestionsWithOptions(
  questionSetId: string,
  dependencies: QuestionBankDependencies = { queryDb },
): Promise<QuestionPayload[]> {
  const result = await dependencies.queryDb<QuestionWithOptionRow>(
    `SELECT
       q.question_number,
       q.question_key,
       q.prompt,
       q.section_key,
       q.section_name,
       q.reverse_scored,
       o.option_key,
       o.option_text,
       o.display_order,
       o.numeric_value
     FROM assessment_questions q
     INNER JOIN assessment_question_options o ON o.question_id = q.id
     WHERE q.question_set_id = $1
       AND q.is_active = TRUE
     ORDER BY q.question_number ASC, o.display_order ASC`,
    [questionSetId]
  );

  return groupQuestions(result.rows);
}

export async function getQuestionsByVersionKey(versionKey: string): Promise<VersionQuestionsResponse | null> {
  return getQuestionsByVersionKeyWithDependencies(versionKey, { queryDb });
}

export async function getQuestionsByVersionKeyWithDependencies(
  versionKey: string,
  dependencies: QuestionBankDependencies,
): Promise<VersionQuestionsResponse | null> {
  const resolved = await resolveVersionAndActiveQuestionSetWithDependencies(versionKey, dependencies);
  if (!resolved) return null;

  const questions = await getQuestionsWithOptions(resolved.questionSet.id, dependencies);

  return {
    version: {
      id: resolved.version.id,
      key: resolved.version.key,
      name: resolved.version.name,
      totalQuestions: resolved.version.total_questions,
      isActive: resolved.version.is_active,
    },
    questionSet: {
      id: resolved.questionSet.id,
      key: resolved.questionSet.key,
      name: resolved.questionSet.name,
      description: resolved.questionSet.description,
    },
    questions,
  };
}

export async function getQuestionsByAssessmentId(assessmentId: string): Promise<AssessmentQuestionsResponse | null> {
  return getQuestionsByAssessmentIdWithDependencies(assessmentId, { queryDb });
}

export async function getQuestionsByAssessmentIdWithDependencies(
  assessmentId: string,
  dependencies: QuestionBankDependencies,
): Promise<AssessmentQuestionsResponse | null> {
  const assessmentResult = await dependencies.queryDb<AssessmentRow>(
    `SELECT *
     FROM assessments
     WHERE id = $1`,
    [assessmentId]
  );

  const assessment = assessmentResult.rows[0];
  if (!assessment) return null;

  const versionResult = await dependencies.queryDb<AssessmentRuntimeVersionRow>(
    `SELECT id, key, name, total_questions, is_active, package_schema_version, package_raw_payload, definition_payload
     FROM assessment_versions
     WHERE id = $1`,
    [assessment.assessment_version_id]
  );

  const version = versionResult.rows[0];
  if (!version) return null;

  if (version.package_schema_version === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
    const runtimeVersion = await getMaterializedRuntimeVersionByAssessmentVersionId(version.id)
    if (runtimeVersion) {
      const [runtimeQuestions, runtimeOptions] = await Promise.all([
        getRuntimeV2Questions(runtimeVersion.id),
        getRuntimeV2OptionsForQuestions(runtimeVersion.id),
      ])
      const questions = mapRuntimeV2RowsToLegacyQuestions({ questions: runtimeQuestions, options: runtimeOptions })

      const responsesResult = await dependencies.queryDb<AssessmentResponseLiteRow>(
        `SELECT question_id, response_value, response_time_ms, is_changed, updated_at
         FROM assessment_responses
         WHERE assessment_id = $1
         ORDER BY question_id ASC`,
        [assessmentId]
      )

      return {
        assessment: {
          id: assessment.id,
          status: assessment.status,
          progressCount: assessment.progress_count,
          progressPercent: Number(assessment.progress_percent),
          currentQuestionIndex: assessment.current_question_index,
        },
        version: {
          id: version.id,
          key: version.key,
          name: version.name,
          totalQuestions: version.total_questions,
          isActive: version.is_active,
        },
        questionSet: {
          id: `runtime-v2:${runtimeVersion.id}`,
          key: `runtime-v2:${version.key}`,
          name: `${version.name} Runtime Contract v2`,
          description: 'Materialized Runtime Contract v2 question delivery model.',
        },
        questions,
        responses: responsesResult.rows,
      }
    }

    const pkg = parseStoredValidatedAssessmentPackageV2(version.definition_payload)
    if (!pkg) return null

    const runtime = buildV2QuestionDeliveryContract({
      assessmentId: assessment.id,
      assessmentVersionId: version.id,
      assessmentVersionKey: version.key,
      assessmentVersionName: version.name,
      assessmentStatus: assessment.status,
      metadataJson: assessment.metadata_json,
      pkg,
    })

    const questions = mapV2ContractToLegacyQuestions(runtime)
    const responses = mapV2ResponsesToLegacyRows({ runtime, questions })

    return {
      assessment: {
        id: assessment.id,
        status: assessment.status,
        progressCount: assessment.progress_count,
        progressPercent: Number(assessment.progress_percent),
        currentQuestionIndex: assessment.current_question_index,
      },
      version: {
        id: version.id,
        key: version.key,
        name: version.name,
        totalQuestions: version.total_questions,
        isActive: version.is_active,
      },
      questionSet: {
        id: `package-contract-v2:${version.id}`,
        key: `package-contract-v2:${version.key}`,
        name: `${version.name} Live Runtime`,
        description: 'Runtime question contract generated directly from Package Contract v2.',
      },
      questions,
      responses,
      runtime,
    } as AssessmentQuestionsResponse & { runtime: ReturnType<typeof buildV2QuestionDeliveryContract> }
  }

  const hybridDefinition = parseHybridDefinition(version.definition_payload) ?? parseHybridDefinition(version.package_raw_payload)
  if (hybridDefinition) {
    const questions = mapHybridDefinitionToLegacyQuestions(hybridDefinition)
    const responses = mapHybridResponsesToLegacyRows({
      metadataJson: assessment.metadata_json,
      definition: hybridDefinition,
      questions,
    })

    return {
      assessment: {
        id: assessment.id,
        status: assessment.status,
        progressCount: assessment.progress_count,
        progressPercent: Number(assessment.progress_percent),
        currentQuestionIndex: assessment.current_question_index,
      },
      version: {
        id: version.id,
        key: version.key,
        name: version.name,
        totalQuestions: version.total_questions,
        isActive: version.is_active,
      },
      questionSet: {
        id: `hybrid-mvp-v1:${version.id}`,
        key: `hybrid-mvp-v1:${version.key}`,
        name: `${version.name} Hybrid Runtime`,
        description: 'Runtime question contract generated directly from hybrid_mvp_v1 definition payload.',
      },
      questions,
      responses,
    }
  }

  const resolved = await resolveVersionAndActiveQuestionSetWithDependencies(version.key, dependencies);
  if (!resolved) return null;

  const questions = await getQuestionsWithOptions(resolved.questionSet.id, dependencies);
  const responsesResult = await dependencies.queryDb<AssessmentResponseLiteRow>(
    `SELECT question_id, response_value, response_time_ms, is_changed, updated_at
     FROM assessment_responses
     WHERE assessment_id = $1
     ORDER BY question_id ASC`,
    [assessmentId]
  );

  return {
    assessment: {
      id: assessment.id,
      status: assessment.status,
      progressCount: assessment.progress_count,
      progressPercent: Number(assessment.progress_percent),
      currentQuestionIndex: assessment.current_question_index,
    },
    version: {
      id: version.id,
      key: version.key,
      name: version.name,
      totalQuestions: version.total_questions,
      isActive: version.is_active,
    },
    questionSet: {
      id: resolved.questionSet.id,
      key: resolved.questionSet.key,
      name: resolved.questionSet.name,
      description: resolved.questionSet.description,
    },
    questions,
    responses: responsesResult.rows,
  };
}

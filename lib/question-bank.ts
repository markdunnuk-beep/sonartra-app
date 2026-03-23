import { AssessmentRow, AssessmentVersionRow } from '@/lib/assessment-types';
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, parseStoredValidatedAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2';
import { buildV2QuestionDeliveryContract } from '@/lib/server/live-assessment-v2';
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
    `SELECT id, key, name, total_questions, is_active, package_schema_version, definition_payload
     FROM assessment_versions
     WHERE id = $1`,
    [assessment.assessment_version_id]
  );

  const version = versionResult.rows[0];
  if (!version) return null;

  if (version.package_schema_version === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
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
      questions: [],
      responses: [],
      runtime,
    } as AssessmentQuestionsResponse & { runtime: ReturnType<typeof buildV2QuestionDeliveryContract> }
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

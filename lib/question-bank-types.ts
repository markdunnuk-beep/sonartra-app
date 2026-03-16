export interface AssessmentQuestionSetRow {
  id: string;
  assessment_version_id: string;
  key: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestionRow {
  id: string;
  question_set_id: string;
  question_number: number;
  question_key: string;
  prompt: string;
  section_key: string;
  section_name: string | null;
  reverse_scored: boolean;
  question_weight_default: string;
  scoring_family: string | null;
  notes: string | null;
  is_active: boolean;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestionOptionRow {
  id: string;
  question_id: string;
  option_key: string;
  option_text: string;
  display_order: number;
  numeric_value: number | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentOptionSignalMappingRow {
  id: string;
  question_option_id: string;
  signal_code: string;
  signal_weight: string;
  created_at: string;
}

export interface QuestionOptionPayload {
  option_key: string;
  option_text: string;
  display_order: number;
  numeric_value: number | null;
}

export interface QuestionPayload {
  question_number: number;
  question_key: string;
  prompt: string;
  section_key: string;
  section_name: string | null;
  reverse_scored: boolean;
  options: QuestionOptionPayload[];
}

export interface VersionQuestionsResponse {
  version: {
    id: string;
    key: string;
    name: string;
    totalQuestions: number;
    isActive: boolean;
  };
  questionSet: {
    id: string;
    key: string;
    name: string;
    description: string | null;
  };
  questions: QuestionPayload[];
}

export interface AssessmentQuestionsResponse extends VersionQuestionsResponse {
  assessment: {
    id: string;
    status: string;
    progressCount: number;
    progressPercent: number;
    currentQuestionIndex: number;
  };
  responses: Array<{
    question_id: number;
    response_value: number;
    response_time_ms: number | null;
    is_changed: boolean;
    updated_at: string;
  }>;
}

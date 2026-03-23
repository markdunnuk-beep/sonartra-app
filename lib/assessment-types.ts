export interface StartAssessmentRequest {
  assessmentVersionKey?: string;
  source?: string;
}

export interface SaveResponseRequest {
  assessmentId: string;
  questionId: number | string;
  responseValue?: number;
  response?: unknown;
  responseTimeMs?: number;
}

export interface CompleteAssessmentRequest {
  assessmentId: string;
}


export type CompleteAssessmentResponse =
  | { ok: false; error: string }
  | {
      ok: true;
      assessmentId: string;
      assessmentStatus: 'completed';
      resultStatus: 'pending' | 'succeeded' | 'failed';
      resultId: string | null;
      warning?: {
        code: 'RESULT_GENERATION_FAILED';
        message: string;
      };
    };

export interface AssessmentVersionRow {
  id: string;
  key: string;
  name: string;
  total_questions: number;
  is_active: boolean;
}

export interface AssessmentRow {
  id: string;
  user_id: string;
  organisation_id: string | null;
  assessment_version_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string | null;
  progress_count: number;
  progress_percent: string;
  current_question_index: number;
  scoring_status: 'not_scored' | 'pending' | 'scored' | 'failed';
  source: string;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}


export interface AssessmentResultRow {
  id: string;
  assessment_id: string;
  assessment_version_id: string;
  version_key: string;
  scoring_model_key: string;
  snapshot_version: number;
  status: 'pending' | 'complete' | 'failed';
  result_payload: Record<string, unknown> | null;
  response_quality_payload: Record<string, unknown> | null;
  report_artifact_json?: Record<string, unknown> | null;
  completed_at: string | null;
  scored_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AssessmentResultSignalRow {
  id: string;
  assessment_result_id: string;
  layer_key: string;
  signal_key: string;
  raw_total: string;
  max_possible: string;
  normalised_score: string;
  relative_share: string;
  rank_in_layer: number | null;
  is_primary: boolean;
  is_secondary: boolean;
  percentile_placeholder: string | null;
  confidence_flag: string | null;
  created_at: string;
}

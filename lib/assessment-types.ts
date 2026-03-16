export interface StartAssessmentRequest {
  userId: string;
  organisationId?: string;
  assessmentVersionKey?: string;
  source?: string;
}

export interface SaveResponseRequest {
  assessmentId: string;
  questionId: number;
  responseValue: number;
  responseTimeMs?: number;
}

export interface CompleteAssessmentRequest {
  assessmentId: string;
}

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

import {
  ASSESSMENT_LAYER_KEYS,
  RESPONSE_QUALITY_FLAGS,
  RESPONSE_QUALITY_STATUSES,
  RESULT_FAILURE_STAGES,
  RESULT_STATUSES,
  WPLP80_SCORING_MODEL_KEY,
  WPLP80_SIGNAL_KEYS,
} from '@/lib/scoring/constants';

export type AssessmentLayerKey = (typeof ASSESSMENT_LAYER_KEYS)[number];
export type ScoringModelKey = typeof WPLP80_SCORING_MODEL_KEY | (string & {});
export type Wplp80SignalKey = (typeof WPLP80_SIGNAL_KEYS)[number];

export type ResponseQualityStatus = (typeof RESPONSE_QUALITY_STATUSES)[number];
export type ResponseQualityFlag = (typeof RESPONSE_QUALITY_FLAGS)[number];
export type ResultStatus = (typeof RESULT_STATUSES)[number];
export type ResultFailureStage = (typeof RESULT_FAILURE_STAGES)[number];

export interface AssessmentResponseInput {
  questionId: number;
  responseValue: number;
  responseTimeMs?: number | null;
}

export interface SignalMappingInput {
  questionId: number;
  responseValue: number;
  signalCode: Wplp80SignalKey;
  signalWeight: number;
  layerKey: AssessmentLayerKey;
}

export interface SignalAccumulator {
  layerKey: AssessmentLayerKey;
  signalKey: Wplp80SignalKey;
  rawTotal: number;
  maxPossible: number;
}

export interface SignalScoreResult extends SignalAccumulator {
  normalisedScore: number;
  relativeShare: number;
  rankInLayer: number;
  isPrimary: boolean;
  isSecondary: boolean;
}

export interface LayerSummary {
  layerKey: AssessmentLayerKey;
  signals: SignalScoreResult[];
  totalRawValue: number;
}

export interface ResponseTimingSummary {
  hasResponseTimings: boolean;
  timedResponseCount: number;
}

export interface ResponseQualityMetadata {
  completionDurationSeconds: number | null;
  responseQualityStatus: ResponseQualityStatus;
  responseQualityFlags: ResponseQualityFlag[];
  timingSummary: ResponseTimingSummary;
}

export interface AssessmentResultSnapshotPayload {
  assessmentId: string;
  assessmentVersionId: string;
  versionKey: string;
  scoringModelKey: ScoringModelKey;
  snapshotVersion: number;
  scoredAt: string;
  layers: LayerSummary[];
  responseQuality: ResponseQualityMetadata;
}

export interface ScoringEngineInput {
  assessmentId: string;
  assessmentVersionId: string;
  versionKey: string;
  scoringModelKey: ScoringModelKey;
  snapshotVersion: number;
  completedAt: string | null;
  startedAt: string | null;
  responses: AssessmentResponseInput[];
  mappings: SignalMappingInput[];
}

export interface ScoringEngineOutput {
  snapshot: AssessmentResultSnapshotPayload;
  signals: SignalScoreResult[];
  responseQuality: ResponseQualityMetadata;
}

export interface PersistAssessmentResultInput {
  assessmentId: string;
  assessmentVersionId: string;
  versionKey: string;
  scoringModelKey: ScoringModelKey;
  snapshotVersion: number;
  status: ResultStatus;
  resultPayload: AssessmentResultSnapshotPayload | null;
  responseQualityPayload: ResponseQualityMetadata | null;
  completedAt: string | null;
  scoredAt: string | null;
  signalRows: SignalScoreResult[];
}

export interface ResultFailureMetadata {
  stage: ResultFailureStage;
  category: 'runtime_error' | 'validation_error' | 'persistence_error';
  code: string;
  message: string;
  occurredAt: string;
  assessmentVersionKey: string;
}

export interface FailedAssessmentResultPayload {
  failure: ResultFailureMetadata;
}

export type PersistSuccessfulAssessmentResultInput = Omit<PersistAssessmentResultInput, 'status'>;

export interface PersistFailedAssessmentResultInput {
  assessmentId: string;
  assessmentVersionId: string;
  versionKey: string;
  scoringModelKey: ScoringModelKey;
  snapshotVersion: number;
  completedAt: string | null;
  scoredAt: string | null;
  failure: ResultFailureMetadata;
}

export interface PersistedAssessmentResultSignal {
  layerKey: string;
  signalKey: string;
  rawTotal: number;
  maxPossible: number;
  normalisedScore: number;
  relativeShare: number;
  rankInLayer: number | null;
  isPrimary: boolean;
  isSecondary: boolean;
}

export interface PersistedSuccessfulAssessmentResult {
  availability: 'available';
  status: 'complete';
  id: string;
  assessmentVersionId: string;
  versionKey: string;
  scoringModelKey: string;
  snapshotVersion: number;
  completedAt: string | null;
  scoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  snapshot: Record<string, unknown> | null;
  responseQuality: Record<string, unknown> | null;
  signals: PersistedAssessmentResultSignal[];
  contractVersion?: 'legacy_v1' | 'package_contract_v2';
  report?: {
    state: 'available' | 'pending' | 'unavailable' | 'failed';
    generatedAt: string | null;
    format: 'html' | null;
    downloadHref: string | null;
    viewHref: string | null;
    label: string;
    message: string;
  };
  liveRuntime?: {
    webSummaryOutputs: unknown[];
    integrityNotices: unknown[];
    packageMetadata: Record<string, unknown> | null;
  };
}

export interface PersistedFailedAssessmentResult {
  availability: 'available';
  status: 'failed';
  id: string;
  assessmentVersionId: string;
  versionKey: string;
  scoringModelKey: string;
  snapshotVersion: number;
  completedAt: string | null;
  scoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  failure: ResultFailureMetadata | null;
  signals: [];
  contractVersion?: 'legacy_v1' | 'package_contract_v2';
}

export interface UnavailableAssessmentResult {
  availability: 'unavailable';
  reason: 'assessment_incomplete' | 'result_missing';
  message: string;
}

export type AssessmentResultReadModel =
  | PersistedSuccessfulAssessmentResult
  | PersistedFailedAssessmentResult
  | UnavailableAssessmentResult;

export interface AssessmentResultReadResponse {
  ok: true;
  assessmentId: string;
  assessmentStatus: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  scoringStatus: 'not_scored' | 'pending' | 'scored' | 'failed';
  result: AssessmentResultReadModel;
}

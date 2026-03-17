import { AssessmentResultSnapshotPayload, LayerSummary, ResponseQualityMetadata, ScoringEngineInput } from '@/lib/scoring/types';

export function buildResultSnapshotPayload(params: {
  input: ScoringEngineInput;
  layers: LayerSummary[];
  responseQuality: ResponseQualityMetadata;
}): AssessmentResultSnapshotPayload {
  const { input, layers, responseQuality } = params;

  return {
    assessmentId: input.assessmentId,
    assessmentVersionId: input.assessmentVersionId,
    versionKey: input.versionKey,
    scoringModelKey: input.scoringModelKey,
    snapshotVersion: input.snapshotVersion,
    scoredAt: new Date().toISOString(),
    layers,
    responseQuality,
  };
}

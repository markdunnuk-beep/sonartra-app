import { ASSESSMENT_LAYER_KEYS } from '@/lib/scoring/constants';
import { aggregateSignalTotals, scoreLayerSignals } from '@/lib/scoring/calculators';
import { buildResultSnapshotPayload } from '@/lib/scoring/snapshot';
import { ResponseQualityMetadata, ScoringEngineInput, ScoringEngineOutput } from '@/lib/scoring/types';
import { validateMappings, validateScoringInput } from '@/lib/scoring/validators';

export function buildResponseQualityMetadata(input: Pick<ScoringEngineInput, 'startedAt' | 'completedAt' | 'responses'>): ResponseQualityMetadata {
  const startedAtMs = input.startedAt ? new Date(input.startedAt).getTime() : Number.NaN;
  const completedAtMs = input.completedAt ? new Date(input.completedAt).getTime() : Number.NaN;

  const completionDurationSeconds =
    Number.isFinite(startedAtMs) && Number.isFinite(completedAtMs) && completedAtMs >= startedAtMs
      ? Math.round((completedAtMs - startedAtMs) / 1000)
      : null;

  const timedResponseCount = input.responses.filter((response) => (response.responseTimeMs ?? 0) > 0).length;

  return {
    completionDurationSeconds,
    responseQualityStatus: 'normal',
    responseQualityFlags: [],
    timingSummary: {
      hasResponseTimings: timedResponseCount > 0,
      timedResponseCount,
    },
  };
}

export function scoreAssessment(input: ScoringEngineInput): ScoringEngineOutput {
  validateScoringInput(input);
  validateMappings(input.mappings);

  const responseQuality = buildResponseQualityMetadata(input);
  const accumulators = aggregateSignalTotals(input.mappings);
  const layers = ASSESSMENT_LAYER_KEYS.map((layerKey) => scoreLayerSignals(layerKey, accumulators));
  const snapshot = buildResultSnapshotPayload({ input, layers, responseQuality });

  return {
    snapshot,
    signals: layers.flatMap((layer) => layer.signals),
    responseQuality,
  };
}

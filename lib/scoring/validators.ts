import { SIGNAL_CODE_TO_LAYER } from '@/lib/scoring/constants';
import { ScoringEngineInput, SignalMappingInput } from '@/lib/scoring/types';

export class ScoringValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScoringValidationError';
  }
}

export function validateScoringInput(input: ScoringEngineInput): void {
  if (!input.assessmentId) {
    throw new ScoringValidationError('assessmentId is required.');
  }

  if (!input.assessmentVersionId || !input.versionKey) {
    throw new ScoringValidationError('assessment version metadata is required.');
  }

  if (input.responses.length === 0) {
    throw new ScoringValidationError('At least one response is required before scoring.');
  }

  if (input.mappings.length === 0) {
    throw new ScoringValidationError('At least one option-signal mapping is required before scoring.');
  }
}

export function validateMappings(mappings: SignalMappingInput[]): void {
  for (const mapping of mappings) {
    const expectedLayer = SIGNAL_CODE_TO_LAYER[mapping.signalCode];

    if (!expectedLayer) {
      throw new ScoringValidationError(`Unsupported signal code '${mapping.signalCode}'.`);
    }

    if (mapping.layerKey !== expectedLayer) {
      throw new ScoringValidationError(
        `Signal code '${mapping.signalCode}' must belong to layer '${expectedLayer}'.`
      );
    }
  }
}

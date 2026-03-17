import { calculateNormalisedScore, calculateRelativeShare } from '@/lib/scoring/normalisers';
import { AssessmentLayerKey, LayerSummary, SignalAccumulator, SignalMappingInput, SignalScoreResult } from '@/lib/scoring/types';

interface GroupKey {
  layerKey: AssessmentLayerKey;
  signalKey: string;
}

function getGroupKey(group: GroupKey): string {
  return `${group.layerKey}::${group.signalKey}`;
}

export function aggregateSignalTotals(mappings: SignalMappingInput[]): SignalAccumulator[] {
  const bySignal = new Map<string, SignalAccumulator>();

  for (const mapping of mappings) {
    const key = getGroupKey({ layerKey: mapping.layerKey, signalKey: mapping.signalCode });
    const current = bySignal.get(key) ?? {
      layerKey: mapping.layerKey,
      signalKey: mapping.signalCode,
      rawTotal: 0,
      maxPossible: 0,
    };

    current.rawTotal += mapping.signalWeight;
    current.maxPossible += 4;

    bySignal.set(key, current);
  }

  return [...bySignal.values()];
}

export function scoreLayerSignals(layerKey: AssessmentLayerKey, accumulators: SignalAccumulator[]): LayerSummary {
  const layerSignals = accumulators.filter((signal) => signal.layerKey === layerKey);
  const totalRawValue = layerSignals.reduce((sum, signal) => sum + signal.rawTotal, 0);

  const ranked = layerSignals
    .map((signal) => ({
      ...signal,
      normalisedScore: calculateNormalisedScore(signal.rawTotal, signal.maxPossible),
      relativeShare: calculateRelativeShare(signal.rawTotal, totalRawValue),
    }))
    .sort((a, b) => {
      if (b.rawTotal === a.rawTotal) {
        return a.signalKey.localeCompare(b.signalKey);
      }

      return b.rawTotal - a.rawTotal;
    })
    .map((signal, index): SignalScoreResult => ({
      ...signal,
      rankInLayer: index + 1,
      isPrimary: index === 0,
      isSecondary: index === 1,
    }));

  return {
    layerKey,
    signals: ranked,
    totalRawValue,
  };
}

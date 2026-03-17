export function safeRound(value: number, precision = 6): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

export function calculateNormalisedScore(rawTotal: number, maxPossible: number): number {
  if (maxPossible <= 0) {
    return 0;
  }

  return safeRound(rawTotal / maxPossible);
}

export function calculateRelativeShare(rawTotal: number, layerRawTotal: number): number {
  if (layerRawTotal <= 0) {
    return 0;
  }

  return safeRound(rawTotal / layerRawTotal);
}

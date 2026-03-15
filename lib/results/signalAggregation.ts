export type SignalLike = { score: number }

function normaliseScores(signals: Array<number | SignalLike>): number[] {
  return signals.map((signal) => (typeof signal === 'number' ? signal : signal.score))
}

export function calculateSignalAverage(signals: Array<number | SignalLike>): number {
  if (!signals.length) return 0
  const scores = normaliseScores(signals)
  const total = scores.reduce((sum, score) => sum + score, 0)
  return Number((total / scores.length).toFixed(1))
}

export function calculateSignalRange(signals: Array<number | SignalLike>): { min: number; max: number } {
  if (!signals.length) return { min: 0, max: 0 }
  const scores = normaliseScores(signals)
  return {
    min: Math.min(...scores),
    max: Math.max(...scores),
  }
}

export function calculateSignalVariance(signals: Array<number | SignalLike>): number {
  if (!signals.length) return 0
  const scores = normaliseScores(signals)
  const mean = calculateSignalAverage(scores)
  const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / scores.length
  return Number(variance.toFixed(2))
}

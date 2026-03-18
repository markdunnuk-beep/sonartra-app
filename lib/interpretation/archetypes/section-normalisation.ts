import {
  BEHAVIOUR_DIMENSION_ORDER,
  BEHAVIOUR_SIGNAL_MAP,
  CONFLICT_DIMENSION_ORDER,
  CONFLICT_SIGNAL_MAP,
  CULTURE_DIMENSION_ORDER,
  CULTURE_SIGNAL_MAP,
  LEADERSHIP_DIMENSION_ORDER,
  LEADERSHIP_SIGNAL_MAP,
  MOTIVATIONAL_DIMENSION_ORDER,
  MOTIVATOR_SIGNAL_MAP,
  STRESS_DIMENSION_ORDER,
  STRESS_SIGNAL_MAP,
} from '@/lib/interpretation/archetypes/archetype-constants'
import type { ArchetypeResolverInput } from '@/lib/interpretation/archetypes/archetype-types'
import type { IndividualResultSignalSummary } from '@/lib/server/individual-results'

function roundPercentage(value: number) {
  return Math.round(value * 10) / 10
}

function normaliseDistribution<TDimension extends string>(
  signals: IndividualResultSignalSummary[],
  layerKey: string,
  dimensions: readonly TDimension[],
  signalMap: Record<string, TDimension>,
): Record<TDimension, number> {
  const totals = Object.fromEntries(dimensions.map((dimension) => [dimension, 0])) as Record<TDimension, number>

  for (const signal of signals) {
    if (signal.layerKey !== layerKey) continue
    const mappedDimension = signalMap[signal.signalKey]
    if (!mappedDimension) continue
    totals[mappedDimension] += signal.relativeShare > 0 ? signal.relativeShare * 100 : signal.normalisedScore * 100
  }

  const total = dimensions.reduce((sum, dimension) => sum + totals[dimension], 0)
  if (total <= 0) {
    return totals
  }

  return dimensions.reduce((accumulator, dimension) => {
    accumulator[dimension] = roundPercentage((totals[dimension] / total) * 100)
    return accumulator
  }, { ...totals })
}

export function buildArchetypeResolverInput(signals: IndividualResultSignalSummary[]): ArchetypeResolverInput {
  return {
    behaviour: normaliseDistribution(signals, 'behaviour_style', BEHAVIOUR_DIMENSION_ORDER, BEHAVIOUR_SIGNAL_MAP),
    motivators: normaliseDistribution(signals, 'motivators', MOTIVATIONAL_DIMENSION_ORDER, MOTIVATOR_SIGNAL_MAP),
    leadership: normaliseDistribution(signals, 'leadership', LEADERSHIP_DIMENSION_ORDER, LEADERSHIP_SIGNAL_MAP),
    conflict: normaliseDistribution(signals, 'conflict', CONFLICT_DIMENSION_ORDER, CONFLICT_SIGNAL_MAP),
    culture: normaliseDistribution(signals, 'culture', CULTURE_DIMENSION_ORDER, CULTURE_SIGNAL_MAP),
    stress: normaliseDistribution(signals, 'risk', STRESS_DIMENSION_ORDER, STRESS_SIGNAL_MAP),
  }
}

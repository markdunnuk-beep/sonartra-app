import { BEHAVIOUR_DIMENSION_ORDER } from '@/lib/interpretation/archetypes/archetype-constants'
import type { BehaviourDimension, BehaviourRanking } from '@/lib/interpretation/archetypes/archetype-types'

const BEHAVIOUR_ORDER_INDEX = new Map<BehaviourDimension, number>(
  BEHAVIOUR_DIMENSION_ORDER.map((dimension, index) => [dimension, index]),
)

function roundGap(value: number) {
  return Math.round(value * 10) / 10
}

export function resolveBehaviourRanking(behaviour: Record<BehaviourDimension, number>): BehaviourRanking {
  const ranked = BEHAVIOUR_DIMENSION_ORDER.map((key) => ({ key, percentage: behaviour[key] ?? 0 })).sort((left, right) => {
    if (right.percentage !== left.percentage) {
      return right.percentage - left.percentage
    }

    return (BEHAVIOUR_ORDER_INDEX.get(left.key) ?? Number.MAX_SAFE_INTEGER) - (BEHAVIOUR_ORDER_INDEX.get(right.key) ?? Number.MAX_SAFE_INTEGER)
  })

  const [primary, secondary, tertiary, quaternary] = ranked

  return {
    ranked,
    primary,
    secondary,
    tertiary,
    quaternary,
    topToSecondGap: roundGap(primary.percentage - secondary.percentage),
    topToThirdGap: roundGap(primary.percentage - tertiary.percentage),
  }
}

export function isBalancedBehaviourProfile(ranking: BehaviourRanking) {
  return ranking.topToSecondGap < 4 && ranking.topToThirdGap < 8
}

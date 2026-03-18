import { ARCHETYPE_LABELS, BEHAVIOUR_SIGNAL_MAP } from '@/lib/interpretation/archetypes/archetype-constants'
import { buildArchetypeSummaryCopy } from '@/lib/interpretation/archetypes/build-archetype-summary'
import { resolveBehaviourRanking, isBalancedBehaviourProfile } from '@/lib/interpretation/archetypes/resolve-behaviour-ranking'
import type {
  ArchetypeKey,
  ArchetypeResolverInput,
  ArchetypeSummary,
  BehaviourDimension,
  BehaviourRanking,
} from '@/lib/interpretation/archetypes/archetype-types'
import { buildArchetypeResolverInput } from '@/lib/interpretation/archetypes/section-normalisation'
import type { IndividualResultSignalSummary } from '@/lib/server/individual-results'

const PRIMARY_PAIR_MAP: Partial<Record<`${BehaviourDimension}:${BehaviourDimension}`, ArchetypeKey>> = {
  'driver:analyst': 'strategic_operator',
  'driver:explorer': 'growth_catalyst',
  'driver:stabiliser': 'execution_anchor',
  'analyst:stabiliser': 'systems_architect',
  'analyst:explorer': 'insight_explorer',
  'explorer:driver': 'momentum_builder',
  'explorer:analyst': 'adaptive_pioneer',
  'stabiliser:analyst': 'trusted_integrator',
  'stabiliser:driver': 'execution_anchor',
  'stabiliser:explorer': 'culture_anchor',
}

function mapPairToArchetype(
  primary: BehaviourDimension,
  secondary: BehaviourDimension,
  input: ArchetypeResolverInput,
): ArchetypeKey {
  if (primary === 'stabiliser' && secondary === 'explorer') {
    const supportiveSignals = [
      resolveTopKey(input.leadership) === 'supportive' || resolveTopKey(input.leadership) === 'coaching',
      resolveTopKey(input.conflict) === 'collaborating' || resolveTopKey(input.conflict) === 'accommodating',
      resolveTopKey(input.culture) === 'collaboration',
      resolveTopKey(input.motivators) === 'affiliation',
    ].filter(Boolean).length

    if (supportiveSignals >= 1) {
      return 'culture_anchor'
    }
  }

  return PRIMARY_PAIR_MAP[`${primary}:${secondary}`] ?? 'balanced_operator'
}

function resolveTopKey<TDimension extends string>(distribution: Record<TDimension, number>) {
  return (Object.entries(distribution) as [TDimension, number][]).sort((left, right) => right[1] - left[1])[0]?.[0]
}

function resolveSecondaryInfluence(
  ranking: BehaviourRanking,
  input: ArchetypeResolverInput,
  primaryKey: ArchetypeKey,
): ArchetypeKey | undefined {
  if (ranking.topToSecondGap > 10 || ranking.secondary.percentage < 22) {
    return undefined
  }

  const candidatePairs: Array<[BehaviourDimension, BehaviourDimension]> = [
    [ranking.secondary.key, ranking.primary.key],
    [ranking.secondary.key, ranking.tertiary.key],
    [ranking.tertiary.key, ranking.secondary.key],
  ]

  for (const [first, second] of candidatePairs) {
    const candidate = mapPairToArchetype(first, second, input)
    if (candidate !== primaryKey && candidate !== 'balanced_operator') {
      return candidate
    }
  }

  return undefined
}

export function resolveArchetypeFromInput(input: ArchetypeResolverInput): ArchetypeSummary {
  const ranking = resolveBehaviourRanking(input.behaviour)

  if (isBalancedBehaviourProfile(ranking)) {
    const copy = buildArchetypeSummaryCopy('balanced_operator', 'balanced', ranking, input)
    return {
      primaryKey: 'balanced_operator',
      primaryLabel: ARCHETYPE_LABELS.balanced_operator,
      confidence: 'balanced',
      ...copy,
    }
  }

  const primaryKey = mapPairToArchetype(ranking.primary.key, ranking.secondary.key, input)
  const secondaryKey = resolveSecondaryInfluence(ranking, input, primaryKey)
  const confidence = ranking.topToSecondGap >= 10 ? 'high' : 'medium'
  const copy = buildArchetypeSummaryCopy(primaryKey, confidence, ranking, input, secondaryKey)

  return {
    primaryKey,
    primaryLabel: ARCHETYPE_LABELS[primaryKey],
    secondaryKey,
    secondaryLabel: secondaryKey ? ARCHETYPE_LABELS[secondaryKey] : undefined,
    confidence,
    ...copy,
  }
}

function hasResolvableBehaviourSignals(signals: IndividualResultSignalSummary[]) {
  return signals.some((signal) => {
    const mappedBehaviour = BEHAVIOUR_SIGNAL_MAP[signal.signalKey]
    const hasSignalWeight = signal.normalisedScore > 0 || signal.relativeShare > 0 || signal.signalTotal > 0

    return signal.layerKey === 'behaviour_style' && Boolean(mappedBehaviour) && hasSignalWeight
  })
}

export function resolveArchetypeSummary(signals: IndividualResultSignalSummary[]) {
  return resolveArchetypeFromInput(buildArchetypeResolverInput(signals))
}

export function resolveOptionalArchetypeSummary(signals: IndividualResultSignalSummary[]) {
  if (!hasResolvableBehaviourSignals(signals)) {
    return undefined
  }

  return resolveArchetypeSummary(signals)
}

export type ArchetypeKey =
  | 'strategic_operator'
  | 'growth_catalyst'
  | 'execution_anchor'
  | 'systems_architect'
  | 'insight_explorer'
  | 'momentum_builder'
  | 'trusted_integrator'
  | 'adaptive_pioneer'
  | 'culture_anchor'
  | 'balanced_operator'

export type ArchetypeConfidence = 'high' | 'medium' | 'balanced'

export type BehaviourDimension = 'driver' | 'analyst' | 'explorer' | 'stabiliser'
export type MotivationalDimension = 'achievement' | 'autonomy' | 'mastery' | 'affiliation'
export type LeadershipDimension = 'directive' | 'strategic' | 'coaching' | 'supportive'
export type ConflictDimension = 'competing' | 'collaborating' | 'compromising' | 'avoiding' | 'accommodating'
export type CultureDimension = 'performance' | 'innovation' | 'control' | 'collaboration'
export type StressDimension = 'intensify' | 'control' | 'withdraw' | 'adapt'

export type ArchetypeSummary = {
  primaryKey: ArchetypeKey
  primaryLabel: string
  secondaryKey?: ArchetypeKey
  secondaryLabel?: string
  confidence: ArchetypeConfidence
  behaviouralTilt: string
  summary: string
  strengths: string[]
  watchouts: string[]
  focusAreas: string[]
}

export type RankedDimension<TDimension extends string> = {
  key: TDimension
  percentage: number
}

export type BehaviourRanking = {
  ranked: RankedDimension<BehaviourDimension>[]
  primary: RankedDimension<BehaviourDimension>
  secondary: RankedDimension<BehaviourDimension>
  tertiary: RankedDimension<BehaviourDimension>
  quaternary: RankedDimension<BehaviourDimension>
  topToSecondGap: number
  topToThirdGap: number
}

export type ArchetypeResolverInput = {
  behaviour: Record<BehaviourDimension, number>
  motivators: Record<MotivationalDimension, number>
  leadership: Record<LeadershipDimension, number>
  conflict: Record<ConflictDimension, number>
  culture: Record<CultureDimension, number>
  stress: Record<StressDimension, number>
}

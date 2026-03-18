import type {
  ArchetypeKey,
  BehaviourDimension,
  ConflictDimension,
  CultureDimension,
  LeadershipDimension,
  MotivationalDimension,
  StressDimension,
} from '@/lib/interpretation/archetypes/archetype-types'

export const BEHAVIOUR_DIMENSION_ORDER: BehaviourDimension[] = ['driver', 'analyst', 'explorer', 'stabiliser']
export const MOTIVATIONAL_DIMENSION_ORDER: MotivationalDimension[] = ['achievement', 'autonomy', 'mastery', 'affiliation']
export const LEADERSHIP_DIMENSION_ORDER: LeadershipDimension[] = ['directive', 'strategic', 'coaching', 'supportive']
export const CONFLICT_DIMENSION_ORDER: ConflictDimension[] = ['competing', 'collaborating', 'compromising', 'avoiding', 'accommodating']
export const CULTURE_DIMENSION_ORDER: CultureDimension[] = ['performance', 'innovation', 'control', 'collaboration']
export const STRESS_DIMENSION_ORDER: StressDimension[] = ['intensify', 'control', 'withdraw', 'adapt']

export const ARCHETYPE_LABELS: Record<ArchetypeKey, string> = {
  strategic_operator: 'Strategic Operator',
  growth_catalyst: 'Growth Catalyst',
  execution_anchor: 'Execution Anchor',
  systems_architect: 'Systems Architect',
  insight_explorer: 'Insight Explorer',
  momentum_builder: 'Momentum Builder',
  trusted_integrator: 'Trusted Integrator',
  adaptive_pioneer: 'Adaptive Pioneer',
  culture_anchor: 'Culture Anchor',
  balanced_operator: 'Balanced Operator',
}

export const BEHAVIOUR_SIGNAL_MAP: Record<string, BehaviourDimension> = {
  Style_Driver: 'driver',
  Core_Driver: 'driver',
  Contribution_Drive: 'driver',
  Style_Analyst: 'analyst',
  Core_Analyst: 'analyst',
  Contribution_Analyse: 'analyst',
  Style_Influencer: 'explorer',
  Core_Influencer: 'explorer',
  Contribution_Connect: 'explorer',
  Style_Stabiliser: 'stabiliser',
  Core_Stabiliser: 'stabiliser',
  Contribution_Stabilise: 'stabiliser',
}

export const MOTIVATOR_SIGNAL_MAP: Record<string, MotivationalDimension> = {
  Mot_Achievement: 'achievement',
  Need_Authority: 'autonomy',
  Mot_Influence: 'autonomy',
  Need_Influence: 'autonomy',
  Mot_Mastery: 'mastery',
  Need_Competence: 'mastery',
  Mot_Stability: 'affiliation',
  Need_Belonging: 'affiliation',
}

export const LEADERSHIP_SIGNAL_MAP: Record<string, LeadershipDimension> = {
  Leader_Results: 'directive',
  Integrity_Driver: 'directive',
  Leader_Vision: 'strategic',
  Integrity_Influencer: 'strategic',
  Leader_People: 'coaching',
  Integrity_Stabiliser: 'coaching',
  Leader_Process: 'supportive',
  Integrity_Analyst: 'supportive',
}

export const CONFLICT_SIGNAL_MAP: Record<string, ConflictDimension> = {
  Conflict_Compete: 'competing',
  Conflict_Collaborate: 'collaborating',
  Conflict_Compromise: 'compromising',
  Conflict_Avoid: 'avoiding',
  Conflict_Accommodate: 'accommodating',
}

export const CULTURE_SIGNAL_MAP: Record<string, CultureDimension> = {
  Culture_Market: 'performance',
  Culture_Adhocracy: 'innovation',
  Culture_Hierarchy: 'control',
  Culture_Clan: 'collaboration',
}

export const STRESS_SIGNAL_MAP: Record<string, StressDimension> = {
  Stress_Criticality: 'intensify',
  Decision_Opportunity: 'intensify',
  Stress_Control: 'control',
  Decision_Evidence: 'control',
  Stress_Avoidance: 'withdraw',
  Stress_Scatter: 'withdraw',
  Decision_Stability: 'adapt',
  Decision_Social: 'adapt',
}

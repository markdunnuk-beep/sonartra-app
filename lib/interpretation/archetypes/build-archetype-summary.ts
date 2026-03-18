import { ARCHETYPE_LABELS } from '@/lib/interpretation/archetypes/archetype-constants'
import type {
  ArchetypeKey,
  ArchetypeResolverInput,
  ArchetypeSummary,
  BehaviourDimension,
  ConflictDimension,
  CultureDimension,
  LeadershipDimension,
  MotivationalDimension,
  StressDimension,
} from '@/lib/interpretation/archetypes/archetype-types'
import type { BehaviourRanking } from '@/lib/interpretation/archetypes/archetype-types'

const BEHAVIOUR_TILT_COPY: Record<BehaviourDimension, { lead: string; support: string; low: string }> = {
  driver: {
    lead: 'Execution-led',
    support: 'pace-supported',
    low: 'lower appetite for extended deliberation',
  },
  analyst: {
    lead: 'Analysis-led',
    support: 'logic-supported',
    low: 'lower preference for improvisation',
  },
  explorer: {
    lead: 'Exploration-led',
    support: 'idea-supported',
    low: 'lower preference for routine stability',
  },
  stabiliser: {
    lead: 'Stability-led',
    support: 'consistency-supported',
    low: 'lower appetite for rapid change',
  },
}

const BASE_ARCHETYPE_COPY: Record<
  ArchetypeKey,
  {
    summary: string
    strengths: string[]
    watchouts: string[]
    focusAreas: string[]
  }
> = {
  strategic_operator: {
    summary: 'Combines decisiveness with structured judgement, usually moving from analysis into execution without much drift.',
    strengths: ['Sets direction quickly once evidence is good enough', 'Translates ambiguity into structured action', 'Holds a high bar for quality and delivery'],
    watchouts: ['Can narrow consultation when pace is high', 'May become overly critical of weaker reasoning', 'Risks over-controlling execution when trust is still forming'],
    focusAreas: ['Make room for challenge before locking direction', 'Signal when speed matters more than precision', 'Delegate detail ownership once standards are clear'],
  },
  growth_catalyst: {
    summary: 'Pairs momentum with opportunity-seeking energy and typically pushes work forward through visible drive and commercial movement.',
    strengths: ['Creates energy around goals and change', 'Moves quickly from concept to action', 'Builds momentum in fast-moving environments'],
    watchouts: ['Can outrun detail and downstream execution checks', 'May over-index on visible progress', 'Risks fatigue in teams that need steadier pacing'],
    focusAreas: ['Add tighter review points before scaling action', 'Balance enthusiasm with evidence on key trade-offs', 'Use stabilising partners when execution load rises'],
  },
  execution_anchor: {
    summary: 'Leads with dependable execution, balancing delivery momentum with operational steadiness and follow-through.',
    strengths: ['Keeps delivery moving without losing control', 'Builds trust through consistency and reliability', 'Brings structure to operational commitments'],
    watchouts: ['Can stay too close to familiar methods', 'May delay bolder shifts until proof is strong', 'Risks carrying too much personally to protect delivery'],
    focusAreas: ['Create space for adaptation before pressure builds', 'Clarify where consistency matters versus where change is welcome', 'Avoid becoming the default backstop for every execution risk'],
  },
  systems_architect: {
    summary: 'Builds reliable systems around quality, structure, and consistency, often improving execution through methodical design.',
    strengths: ['Designs repeatable ways of working', 'Protects quality and control standards', 'Improves reliability through disciplined thinking'],
    watchouts: ['Can over-weight process when speed is needed', 'May hesitate when direction is still fluid', 'Risks sounding rigid in more adaptive contexts'],
    focusAreas: ['Define minimum viable structure instead of full control', 'Expose trade-offs early when pace is constrained', 'Stay close to user or commercial outcomes, not only process quality'],
  },
  insight_explorer: {
    summary: 'Blends conceptual curiosity with structured thinking, often spotting patterns and possibilities others miss.',
    strengths: ['Connects ideas with analytical depth', 'Frames possibilities with thoughtful logic', 'Contributes strong diagnostic and conceptual insight'],
    watchouts: ['Can stay in exploration longer than execution needs allow', 'May overload stakeholders with nuance', 'Risks fragmenting attention across too many ideas'],
    focusAreas: ['Commit to decision checkpoints, not open loops', 'Convert insight into clearer action paths', 'Use a simpler narrative when influencing less technical audiences'],
  },
  momentum_builder: {
    summary: 'Works through visible energy, initiative, and action, often helping teams break inertia and build early traction.',
    strengths: ['Generates movement quickly', 'Raises engagement around action', 'Acts decisively in ambiguous conditions'],
    watchouts: ['Can push before alignment is ready', 'May underplay detail and sequencing', 'Risks moving on before execution stabilises'],
    focusAreas: ['Pause for alignment on critical dependencies', 'Pair urgency with sharper follow-through', 'Check whether the team can sustain the pace being set'],
  },
  trusted_integrator: {
    summary: 'Combines steadiness with thoughtful judgement, usually creating reliability, clarity, and dependable coordination.',
    strengths: ['Builds trust through calm consistency', 'Improves decisions with measured analysis', 'Provides stable coordination across moving parts'],
    watchouts: ['Can absorb friction rather than surface it early', 'May prefer certainty over experimentation', 'Risks becoming overly cautious under sustained ambiguity'],
    focusAreas: ['Raise difficult issues sooner when execution is drifting', 'Separate real risk from familiar-comfort bias', 'Protect time for strategic thinking, not only support work'],
  },
  adaptive_pioneer: {
    summary: 'Combines curiosity with analytical range, often bringing inventive thinking that still respects logic and evidence.',
    strengths: ['Generates original options with credible logic', 'Adapts thinking as new information appears', 'Helps teams reframe problems constructively'],
    watchouts: ['Can keep refining possibilities instead of closing', 'May challenge existing models without enough translation', 'Risks inconsistency if priorities keep shifting'],
    focusAreas: ['Decide what needs exploration versus closure', 'Translate new thinking into operational next steps', 'Anchor experimentation in explicit success measures'],
  },
  culture_anchor: {
    summary: 'Creates cohesion and steadiness, often helping teams stay connected, reliable, and workable through change.',
    strengths: ['Builds trust and collaborative stability', 'Keeps people considerations visible in execution', 'Provides a calming, integrating presence'],
    watchouts: ['Can avoid sharper challenge to preserve cohesion', 'May understate urgency in difficult moments', 'Risks carrying relational load that others should share'],
    focusAreas: ['Name tension directly before it becomes drag', 'Balance care with clearer accountability', 'Protect standards while maintaining collaboration'],
  },
  balanced_operator: {
    summary: 'Shows no single extreme behavioural bias, usually shifting approach based on context rather than one default mode.',
    strengths: ['Adapts style across different demands', 'Can work effectively with varied colleagues', 'Brings situational range without strong rigidity'],
    watchouts: ['May be harder for others to read quickly', 'Can dilute edge when stronger direction is needed', 'Risks over-adjusting to context instead of holding a stance'],
    focusAreas: ['Decide which mode should be most visible in role-critical moments', 'Signal clear priorities so flexibility does not look inconsistent', 'Build repeatable habits for the contexts that matter most'],
  },
}

const SUMMARY_MODIFIERS = {
  motivator: {
    achievement: 'Strong achievement motivation adds a visible outcome bias.',
    autonomy: 'Autonomy signals are likely to strengthen independent judgement and ownership.',
    mastery: 'Mastery motivation reinforces depth, craft, and quality discipline.',
    affiliation: 'Affiliation motivation increases sensitivity to trust, cohesion, and working relationships.',
  } satisfies Record<MotivationalDimension, string>,
  leadership: {
    directive: 'Leadership signals lean decisive and accountability-forward.',
    strategic: 'Leadership signals add future-focused framing and directional thinking.',
    coaching: 'Leadership signals add a stronger development and people-growth lens.',
    supportive: 'Leadership signals reinforce steadier support, structure, and consistency.',
  } satisfies Record<LeadershipDimension, string>,
  conflict: {
    competing: 'In tension, this profile is more likely to press directly for resolution.',
    collaborating: 'In tension, this profile is more likely to work toward shared alignment.',
    compromising: 'In tension, this profile tends to look for practical middle ground.',
    avoiding: 'In tension, this profile may hold back until clarity improves.',
    accommodating: 'In tension, this profile may protect relationships before pressing the issue.',
  } satisfies Record<ConflictDimension, string>,
  culture: {
    performance: 'Best-fit environments usually reward clear accountability and visible outcomes.',
    innovation: 'Best-fit environments usually reward experimentation and adaptive change.',
    control: 'Best-fit environments usually value structure, standards, and disciplined execution.',
    collaboration: 'Best-fit environments usually value trust, cohesion, and cross-team partnership.',
  } satisfies Record<CultureDimension, string>,
  stress: {
    intensify: 'Under pressure, intensity and pace are likely to increase first.',
    control: 'Under pressure, tighter control and evidence checking are likely to increase first.',
    withdraw: 'Under pressure, this profile may conserve energy or narrow exposure first.',
    adapt: 'Under pressure, this profile often tries to stabilise the environment before reacting harder.',
  } satisfies Record<StressDimension, string>,
}

const CONTEXT_ITEMS = {
  strength: {
    achievement: 'Keeps objectives and measurable progress in view',
    autonomy: 'Operates with strong ownership once direction is clear',
    mastery: 'Raises the quality bar through expertise and discipline',
    affiliation: 'Strengthens trust and cohesion across working relationships',
    directive: 'Can make difficult calls without excessive drift',
    strategic: 'Adds future-oriented framing to immediate decisions',
    coaching: 'Builds capability while work is moving',
    supportive: 'Creates dependable support around delivery',
  },
  watchout: {
    competing: 'Can harden position too quickly when challenged',
    collaborating: 'May stretch decision cycles in search of full alignment',
    compromising: 'Can settle for workable over optimal outcomes',
    avoiding: 'May leave friction unaddressed for too long',
    accommodating: 'Can absorb too much to keep relationships smooth',
    intensify: 'May raise urgency faster than the system can absorb',
    control: 'Can tighten process and review burden under pressure',
    withdraw: 'May become less visible when pressure needs direct engagement',
    adapt: 'Can over-stabilise when a sharper intervention is required',
  },
  focus: {
    performance: 'Tie behavioural strengths to explicit outcome measures',
    innovation: 'Use experimentation with clear boundaries and review points',
    control: 'Keep structure proportionate to the real risk level',
    collaboration: 'Preserve challenge quality while maintaining alignment',
    directive: 'Clarify where decisive calls are expected versus where consultation matters',
    strategic: 'Translate future thinking into near-term execution choices',
    coaching: 'Pair support with direct feedback and accountability',
    supportive: 'Avoid becoming the only source of stability on the team',
  },
}

function appendDistinct(items: string[], candidate?: string) {
  if (!candidate) return items
  return items.includes(candidate) ? items : [...items, candidate]
}

function topDimension<TDimension extends string>(distribution: Record<TDimension, number>) {
  return (Object.entries(distribution) as [TDimension, number][])
    .sort((left, right) => right[1] - left[1])[0]?.[0]
}

export function buildBehaviouralTilt(ranking: BehaviourRanking) {
  if (ranking.topToSecondGap < 4 && ranking.topToThirdGap < 8) {
    return `Balanced across the core behavioural modes, with slight ${ranking.primary.key} bias`
  }

  const leadCopy = BEHAVIOUR_TILT_COPY[ranking.primary.key]
  const supportCopy = BEHAVIOUR_TILT_COPY[ranking.secondary.key]
  const lowCopy = BEHAVIOUR_TILT_COPY[ranking.quaternary.key]

  const segments = [leadCopy.lead, supportCopy.support]
  if (ranking.quaternary.percentage <= 18 || ranking.primary.percentage - ranking.quaternary.percentage >= 18) {
    segments.push(lowCopy.low)
  }

  return segments.join(', ')
}

export function buildArchetypeSummaryCopy(
  primaryKey: ArchetypeKey,
  confidence: ArchetypeSummary['confidence'],
  ranking: BehaviourRanking,
  resolverInput: ArchetypeResolverInput,
  secondaryKey?: ArchetypeKey,
): Omit<ArchetypeSummary, 'primaryKey' | 'primaryLabel' | 'secondaryKey' | 'secondaryLabel' | 'confidence'> {
  const base = BASE_ARCHETYPE_COPY[primaryKey]
  const topMotivator = topDimension(resolverInput.motivators)
  const topLeadership = topDimension(resolverInput.leadership)
  const topConflict = topDimension(resolverInput.conflict)
  const topCulture = topDimension(resolverInput.culture)
  const topStress = topDimension(resolverInput.stress)

  const summaryParts = [
    base.summary,
    SUMMARY_MODIFIERS.motivator[topMotivator],
    SUMMARY_MODIFIERS.leadership[topLeadership],
    SUMMARY_MODIFIERS.conflict[topConflict],
    SUMMARY_MODIFIERS.culture[topCulture],
    SUMMARY_MODIFIERS.stress[topStress],
  ]

  if (confidence === 'high') {
    summaryParts.unshift('The profile shows a clear directional bias.')
  } else if (confidence === 'balanced') {
    summaryParts.unshift('The profile remains relatively even across the core behavioural modes.')
  }

  if (secondaryKey) {
    summaryParts.push(`${ARCHETYPE_LABELS[secondaryKey]} remains a meaningful secondary influence.`)
  }

  const strengths = appendDistinct(
    appendDistinct(base.strengths, CONTEXT_ITEMS.strength[topMotivator]),
    CONTEXT_ITEMS.strength[topLeadership],
  ).slice(0, 3)

  const watchouts = appendDistinct(
    appendDistinct(base.watchouts, CONTEXT_ITEMS.watchout[topConflict]),
    CONTEXT_ITEMS.watchout[topStress],
  ).slice(0, 3)

  const focusAreas = appendDistinct(
    appendDistinct(base.focusAreas, CONTEXT_ITEMS.focus[topCulture]),
    CONTEXT_ITEMS.focus[topLeadership],
  ).slice(0, 3)

  return {
    behaviouralTilt: buildBehaviouralTilt(ranking),
    summary: summaryParts.join(' '),
    strengths,
    watchouts,
    focusAreas,
  }
}

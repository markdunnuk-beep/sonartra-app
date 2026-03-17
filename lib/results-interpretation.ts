import { IndividualResultLayerSummary, IndividualResultReadyData, IndividualResultSignalSummary } from '@/lib/server/individual-results'

export interface LayerInterpretationBlock {
  layerKey: string
  title: string
  summary: string
  implications: string[]
  watchouts: string[]
}

export interface IndividualResultInterpretation {
  onboarding: {
    title: string
    points: string[]
  }
  layerInterpretations: LayerInterpretationBlock[]
  managerNotes: {
    title: string
    points: string[]
  }
  performanceProfile: {
    title: string
    summary: string
    operatingTraits: string[]
  }
  bestFit: {
    title: string
    items: string[]
  }
  leveragePoints: {
    title: string
    items: string[]
  }
  pressureWatchouts: {
    title: string
    items: string[]
  }
  teamDynamics: {
    title: string
    items: string[]
  }
  managerPlaybook: {
    title: string
    doItems: string[]
    avoidItems: string[]
  }
  caveats: string[]
}

interface InterpretationContext {
  firstName?: string | null
  fullName?: string | null
}

const LAYER_META: Record<string, { title: string; operationalContext: string }> = {
  behaviour_style: {
    title: 'Behaviour Style',
    operationalContext: 'execution rhythm, structure, and delivery approach',
  },
  motivators: {
    title: 'Motivators',
    operationalContext: 'performance energy and sustained engagement drivers',
  },
  leadership: {
    title: 'Leadership',
    operationalContext: 'influence, delegation, and accountability style',
  },
  conflict: {
    title: 'Conflict',
    operationalContext: 'response pattern when priorities or viewpoints clash',
  },
  risk: {
    title: 'Risk and Pressure Response',
    operationalContext: 'decision posture under uncertainty and pressure',
  },
  culture: {
    title: 'Culture',
    operationalContext: 'environmental alignment and operating fit',
  },
}

const SIGNAL_PATTERN_COPY: Record<string, { tendency: string; tradeoff: string }> = {
  Analyst: {
    tendency: 'favours structured analysis, evidence checks, and deliberate pacing',
    tradeoff: 'can slow decision velocity when speed is the primary requirement',
  },
  Driver: {
    tendency: 'leans toward direct decisions, pace, and execution momentum',
    tradeoff: 'may compress consultation when alignment work is still needed',
  },
  Influencer: {
    tendency: 'uses communication and stakeholder momentum to move work forward',
    tradeoff: 'can underweight detailed controls when narrative pace is high',
  },
  Stabiliser: {
    tendency: 'prioritises consistency, reliability, and controlled change',
    tradeoff: 'can be slower to push disruptive shifts without stronger signals',
  },
  Results: {
    tendency: 'focuses on outcomes, delivery targets, and accountability',
    tradeoff: 'can apply pressure that reduces collaboration quality if unmanaged',
  },
  Process: {
    tendency: 'prefers defined workflows, standards, and repeatable execution',
    tradeoff: 'may constrain adaptation when context changes quickly',
  },
  People: {
    tendency: 'invests in team cohesion, support, and capability development',
    tradeoff: 'can defer hard performance calls when tension rises',
  },
  Vision: {
    tendency: 'orients toward future direction and change framing',
    tradeoff: 'can leave execution detail under-specified without strong operators',
  },
  Collaborate: {
    tendency: 'seeks shared resolution and multi-party alignment',
    tradeoff: 'can increase cycle time when rapid closure is needed',
  },
  Compete: {
    tendency: 'takes a firm position and pushes for decisive outcomes',
    tradeoff: 'can escalate friction when counterpart buy-in is low',
  },
  Compromise: {
    tendency: 'targets practical middle-ground solutions',
    tradeoff: 'can settle below optimal outcomes when trade space is wider',
  },
  Avoid: {
    tendency: 'de-escalates pressure and limits direct confrontation',
    tradeoff: 'can delay issue resolution when explicit decisions are required',
  },
  Accommodate: {
    tendency: 'maintains relationships by yielding where possible',
    tradeoff: 'can absorb misalignment costs to preserve short-term harmony',
  },
  Achievement: {
    tendency: 'is energised by stretch goals and visible progress',
    tradeoff: 'can deprioritise maintenance work that lacks clear advancement',
  },
  Mastery: {
    tendency: 'is motivated by depth, quality, and capability refinement',
    tradeoff: 'can spend more time on optimisation than delivery windows allow',
  },
  Stability: {
    tendency: 'is motivated by predictability, role clarity, and steady cadence',
    tradeoff: 'can be less responsive in volatile contexts without clearer guardrails',
  },
  Influence: {
    tendency: 'is motivated by scope of impact and directional input',
    tradeoff: 'can disengage when ownership boundaries are too narrow',
  },
  Authority: {
    tendency: 'responds to clear decision rights and formal ownership',
    tradeoff: 'can push back when accountability is high but authority is unclear',
  },
  Belonging: {
    tendency: 'responds to inclusion, team trust, and relational continuity',
    tradeoff: 'can deprioritise dissent when group cohesion is fragile',
  },
  Competence: {
    tendency: 'responds to autonomy grounded in demonstrated capability',
    tradeoff: 'can resist handoffs that lower quality thresholds',
  },
  Control: {
    tendency: 'maintains composure through planning and controllable variables',
    tradeoff: 'can tighten too much when ambiguity remains unavoidable',
  },
  Criticality: {
    tendency: 'scans for downside exposure and failure points early',
    tradeoff: 'can increase caution in situations that require bounded risk-taking',
  },
  Scatter: {
    tendency: 'shifts attention quickly across competing demands',
    tradeoff: 'can fragment follow-through without stronger prioritisation',
  },
  Avoidance: {
    tendency: 'reduces exposure to uncertain or high-friction choices',
    tradeoff: 'can defer important calls until risk becomes harder to manage',
  },
  Opportunity: {
    tendency: 'leans toward upside seeking and initiative under uncertainty',
    tradeoff: 'can underestimate execution risk without counterbalance',
  },
  Evidence: {
    tendency: 'grounds decisions in data quality and proof thresholds',
    tradeoff: 'can move slower when directional action is needed before full certainty',
  },
  Social: {
    tendency: 'weights interpersonal impact and stakeholder acceptance in decisions',
    tradeoff: 'can dilute hard calls when consensus is unlikely',
  },
  Market: {
    tendency: 'aligns with performance pressure, targets, and external competitiveness',
    tradeoff: 'can create delivery strain if operational capacity is underdeveloped',
  },
  Hierarchy: {
    tendency: 'aligns with structure, role clarity, and procedural discipline',
    tradeoff: 'can constrain experimentation where rapid adaptation is needed',
  },
  Clan: {
    tendency: 'aligns with collaborative culture and internal cohesion',
    tradeoff: 'can reduce challenge intensity during difficult trade-off decisions',
  },
  Adhocracy: {
    tendency: 'aligns with experimentation, initiative, and adaptive change',
    tradeoff: 'can reduce consistency when process stability is required',
  },
}

function titleCase(value: string) {
  return value.replaceAll('_', ' ').replaceAll('-', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function toSafeFirstName(value?: string | null) {
  if (!value) return null
  const cleaned = value.trim().replace(/\s+/g, ' ')
  if (!cleaned) return null
  const firstToken = cleaned.split(' ')[0]
  if (!/^[A-Za-z][A-Za-z'\-]{1,29}$/.test(firstToken)) return null
  return firstToken
}

export function getInterpretationSubjectLabel(context: InterpretationContext = {}) {
  return toSafeFirstName(context.firstName) ?? toSafeFirstName(context.fullName) ?? 'This individual'
}

function extractSignalPattern(signalKey: string) {
  const tokens = signalKey.split('_').filter(Boolean).reverse()
  return tokens.find((token) => SIGNAL_PATTERN_COPY[token]) ?? null
}

function getSignalNarrative(signal: IndividualResultSignalSummary | undefined) {
  if (!signal) return null
  const patternKey = extractSignalPattern(signal.signalKey)
  const pattern = patternKey ? SIGNAL_PATTERN_COPY[patternKey] : null

  if (!pattern) {
    return {
      signalLabel: titleCase(signal.signalKey),
      tendency: `signals a measurable operating preference in ${titleCase(signal.layerKey).toLowerCase()} contexts`,
      tradeoff: 'should be interpreted with surrounding role demands and peer dependencies',
    }
  }

  return {
    signalLabel: titleCase(signal.signalKey),
    tendency: pattern.tendency,
    tradeoff: pattern.tradeoff,
  }
}

function buildLayerInterpretation(layer: IndividualResultLayerSummary, signals: IndividualResultSignalSummary[]): LayerInterpretationBlock | null {
  const layerSignals = signals
    .filter((signal) => signal.layerKey === layer.layerKey)
    .sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))

  const primary = layerSignals.find((signal) => signal.isPrimary) ?? layerSignals[0]
  if (!primary) return null

  const secondary = layerSignals.find((signal) => signal.isSecondary) ?? layerSignals[1]
  const primaryNarrative = getSignalNarrative(primary)
  if (!primaryNarrative) return null

  const secondaryNarrative = getSignalNarrative(secondary)
  const layerMeta = LAYER_META[layer.layerKey]
  const layerTitle = layerMeta?.title ?? titleCase(layer.layerKey)
  const context = layerMeta?.operationalContext ?? 'day-to-day operating context'
  const dominance = primary.relativeShare >= 0.6 ? 'clear' : primary.relativeShare >= 0.45 ? 'moderate' : 'distributed'

  const summary =
    dominance === 'distributed'
      ? `${layerTitle} is distributed with no single dominant signal. ${primaryNarrative.signalLabel} leads, with secondary influence from ${secondaryNarrative?.signalLabel ?? 'adjacent signals'}.`
      : `${layerTitle} shows ${dominance} concentration in ${primaryNarrative.signalLabel}${secondaryNarrative ? `, supported by ${secondaryNarrative.signalLabel}` : ''}.`

  const implications = [
    `Within ${context}, this profile ${primaryNarrative.tendency}.`,
    secondaryNarrative
      ? `Secondary weighting in ${secondaryNarrative.signalLabel} suggests additional range when requirements shift.`
      : 'Secondary weighting is limited, so behaviour may appear more concentrated in one operating mode.',
  ]

  const watchouts = [
    `Trade-off: ${primaryNarrative.tradeoff}.`,
    secondaryNarrative ? `Counterbalance available through ${secondaryNarrative.signalLabel}, but requires deliberate context-setting.` : 'Use complementary team coverage where this layer requires broader range.',
  ]

  return {
    layerKey: layer.layerKey,
    title: layerTitle,
    summary,
    implications,
    watchouts,
  }
}

export function buildIndividualResultInterpretation(data: IndividualResultReadyData, context: InterpretationContext = {}): IndividualResultInterpretation {
  const layerInterpretations = data.layers
    .map((layer) => buildLayerInterpretation(layer, data.signals))
    .filter((layer): layer is LayerInterpretationBlock => Boolean(layer))

  const topSignal = [...data.signals].sort((a, b) => b.normalisedScore - a.normalisedScore)[0]
  const secondSignal = [...data.signals].sort((a, b) => b.normalisedScore - a.normalisedScore)[1]
  const topNarrative = getSignalNarrative(topSignal)
  const secondNarrative = getSignalNarrative(secondSignal)
  const subject = getInterpretationSubjectLabel(context)

  const topLayers = [...data.layers]
    .sort((a, b) => b.totalRawValue - a.totalRawValue)
    .slice(0, 2)
    .map((layer) => LAYER_META[layer.layerKey]?.title ?? titleCase(layer.layerKey))

  const styleLayer = data.layers.find((layer) => layer.layerKey === 'behaviour_style')
  const riskLayer = data.layers.find((layer) => layer.layerKey === 'risk')
  const behaviourPrimary = getSignalNarrative(data.signals.find((signal) => signal.layerKey === 'behaviour_style' && signal.isPrimary) ?? data.signals.find((signal) => signal.layerKey === 'behaviour_style'))
  const riskPrimary = getSignalNarrative(data.signals.find((signal) => signal.layerKey === 'risk' && signal.isPrimary) ?? data.signals.find((signal) => signal.layerKey === 'risk'))
  const influenceSignal = data.signals.find((signal) => /Influencer|Influence|Vision/.test(signal.signalKey))
  const controlSignal = data.signals.find((signal) => /Control|Process|Evidence|Hierarchy/.test(signal.signalKey))
  const paceSignal = data.signals.find((signal) => /Driver|Compete|Results|Opportunity/.test(signal.signalKey))

  const pressureRisk = riskLayer && riskLayer.totalRawValue > 0 && (riskLayer.primarySignalKey ?? '').toLowerCase().includes('avoid')

  return {
    onboarding: {
      title: 'How to read this profile',
      points: [
        'These results indicate behavioural tendencies and operating patterns observed in the scored assessment output.',
        'Use them as decision support, not as absolute judgments about capability or potential.',
        'Interpret each signal in role, team, and delivery context rather than in isolation.',
        'Higher concentration often improves consistency in some contexts while reducing range in others.',
      ],
    },
    layerInterpretations,
    performanceProfile: {
      title: 'Performance profile',
      summary: `${subject} tends to operate with ${topNarrative?.signalLabel ?? 'the leading'} patterns front-of-mind${secondNarrative ? `, supported by ${secondNarrative.signalLabel}` : ''}. This pattern is most visible in ${topLayers.join(' and ') || 'the scored layers'}.`,
      operatingTraits: [
        behaviourPrimary ? `Execution posture: ${behaviourPrimary.tendency}.` : 'Execution posture: shaped by the top ranked behaviour-style signal.',
        topNarrative ? `Decision tendency: ${topNarrative.tendency}.` : 'Decision tendency: inferred from ranked signal concentration.',
        controlSignal ? 'Work quality is likely to improve when expectations, standards, and review points are explicit.' : 'Work quality is likely to improve when priorities and delivery standards are explicit.',
      ],
    },
    bestFit: {
      title: 'Where this person is likely to be most effective',
      items: [
        'Roles where output quality, reliability, and judgement standards are visible and measurable.',
        paceSignal
          ? 'Assignments with clear priorities and enough authority to convert decisions into execution quickly.'
          : 'Assignments where priorities are clear and execution can be planned with controlled pacing.',
        influenceSignal
          ? 'Cross-functional work that benefits from stakeholder alignment and communication momentum.'
          : 'Workstreams where role boundaries and decision handoffs are clearly defined.',
      ],
    },
    leveragePoints: {
      title: 'Leverage points',
      items: [
        'Set explicit outcome priorities and define what “good enough” looks like before execution starts.',
        'Use clear decision rights and escalation thresholds to reduce avoidable cycle-time loss.',
        styleLayer && styleLayer.signalCount > 1
          ? `Use ${titleCase(styleLayer.secondarySignalKey ?? 'secondary style signals')} deliberately when requirements shift.`
          : 'Pair this profile with complementary teammates when role demands require broader behavioural range.',
      ],
    },
    pressureWatchouts: {
      title: 'Watchouts under pressure',
      items: [
        topNarrative ? `Under sustained pressure, this profile may over-index on ${topNarrative.signalLabel} behaviour and narrow optionality.` : 'Under sustained pressure, behaviour can become more concentrated and less adaptive.',
        pressureRisk ? 'Risk handling may tilt toward caution or decision deferral when uncertainty remains high.' : 'Risk handling can tilt toward speed or control at the expense of balance if guardrails are weak.',
        riskPrimary ? `Potential friction point: ${riskPrimary.tradeoff}.` : 'Potential friction point: monitor decision speed versus execution quality trade-offs.',
      ],
    },
    teamDynamics: {
      title: 'Team dynamics',
      items: [
        topNarrative ? `Likely contribution in group decisions: ${topNarrative.tendency}.` : 'Likely contribution in group decisions follows the leading ranked signal pattern.',
        secondNarrative
          ? `Secondary contribution pattern: ${secondNarrative.signalLabel} can broaden coverage when explicitly requested.`
          : 'Secondary contribution pattern is less pronounced, so complementary peers may be needed in volatile contexts.',
        'Most effective partnerships usually pair this profile with colleagues who balance pace, challenge, and execution detail.',
      ],
    },
    managerPlaybook: {
      title: 'Manager playbook',
      doItems: [
        'Define the operating objective, decision boundaries, and quality thresholds up front.',
        'Use regular but lightweight check-ins focused on trade-offs, blockers, and next execution decisions.',
        'Assign work where dominant signal strengths are useful, then add explicit counterbalance support for weaker ranges.',
      ],
      avoidItems: [
        'Do not rely on implied priorities when timelines or dependencies are tight.',
        'Avoid shifting direction repeatedly without clarifying the new success criteria.',
        'Do not evaluate this profile from a single behaviour in isolation; use signal pattern + context together.',
      ],
    },
    managerNotes: {
      title: 'Manager notes',
      points: [
        topNarrative
          ? `Most visible operating pattern: ${topNarrative.signalLabel}; this profile typically ${topNarrative.tendency}.`
          : 'Most visible operating pattern is available in the ranked signals list and should guide role fit conversations.',
        'Position work to match dominant patterns, then add explicit support where the role requires opposite behaviours.',
        'Under pressure or ambiguity, monitor execution quality, decision speed, and collaboration balance rather than any single score.',
      ],
    },
    caveats: [
      'Directional output only: no single signal should be used as a stand-alone decision criterion.',
      'This profile is one input among performance history, role scope, and team composition.',
    ],
  }
}

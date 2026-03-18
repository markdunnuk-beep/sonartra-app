// /lib/interpretation/sonartra-motivators-mapping.ts

//--------------------------------
// TYPES
//--------------------------------

export type LayerInsight = {
  primaryLabel: string
  statement: string
  strengths: string[]
  watchouts: string[]
}

export type LayerDictionary = Record<string, LayerInsight>

//--------------------------------
// MOTIVATORS DICTIONARY
//--------------------------------

export const motivatorsDictionary: LayerDictionary = {
  //--------------------------------
  // PRIMARY + SECONDARY COMBINATIONS
  //--------------------------------

  MOT_ACHIEVEMENT_MASTERY: {
    primaryLabel: "Achievement – Mastery",
    statement: "{firstName} is driven by progress, improvement, and doing things well.",
    strengths: [
      "Strong internal drive",
      "High personal standards",
      "Thrives on challenge"
    ],
    watchouts: [
      "Frustrated by low standards",
      "Can over-focus on output",
      "May disengage without progress"
    ]
  },

  MOT_ACHIEVEMENT_INFLUENCE: {
    primaryLabel: "Achievement – Influence",
    statement: "{firstName} is motivated by winning, visible progress, and making an impact.",
    strengths: [
      "Highly goal oriented",
      "Responds to recognition",
      "Pushes for measurable progress"
    ],
    watchouts: [
      "Can become overly competitive",
      "May seek visible wins",
      "Lower patience for slow progress"
    ]
  },

  MOT_ACHIEVEMENT_STABILITY: {
    primaryLabel: "Achievement – Stability",
    statement: "{firstName} is motivated by progress, but prefers controlled and dependable conditions.",
    strengths: [
      "Consistent performance focus",
      "Reliable under structure",
      "Balances ambition with discipline"
    ],
    watchouts: [
      "May resist disruption",
      "Can prefer certainty",
      "Less energised by volatility"
    ]
  },

  MOT_MASTERY_ACHIEVEMENT: {
    primaryLabel: "Mastery – Achievement",
    statement: "{firstName} is motivated by competence, improvement, and delivering work to a high standard.",
    strengths: [
      "Values quality deeply",
      "Committed to improvement",
      "Takes pride in expertise"
    ],
    watchouts: [
      "Can overwork details",
      "May delay for quality",
      "Frustrated by poor execution"
    ]
  },

  MOT_MASTERY_INFLUENCE: {
    primaryLabel: "Mastery – Influence",
    statement: "{firstName} is motivated by being capable, credible, and respected for strong performance.",
    strengths: [
      "Builds expertise deliberately",
      "Communicates with credibility",
      "Influences through competence"
    ],
    watchouts: [
      "May over-explain capability",
      "Can be sensitive to criticism",
      "Wants recognition for quality"
    ]
  },

  MOT_MASTERY_STABILITY: {
    primaryLabel: "Mastery – Stability",
    statement: "{firstName} is motivated by doing things properly in a steady and well-structured environment.",
    strengths: [
      "Reliable quality focus",
      "Strong process discipline",
      "Consistent improvement mindset"
    ],
    watchouts: [
      "Can resist rapid change",
      "May avoid experimentation",
      "Less energised by ambiguity"
    ]
  },

  MOT_INFLUENCE_ACHIEVEMENT: {
    primaryLabel: "Influence – Achievement",
    statement: "{firstName} is motivated by visibility, impact, and making a recognised contribution.",
    strengths: [
      "Energised by recognition",
      "Motivates others well",
      "Strong presence in groups"
    ],
    watchouts: [
      "Can chase visible wins",
      "May overvalue external feedback",
      "Lower motivation without visibility"
    ]
  },

  MOT_INFLUENCE_MASTERY: {
    primaryLabel: "Influence – Mastery",
    statement: "{firstName} is motivated by being respected, credible, and seen as highly capable.",
    strengths: [
      "Builds influence through expertise",
      "Values strong reputation",
      "Communicates capability clearly"
    ],
    watchouts: [
      "Can become image conscious",
      "May protect expert status",
      "Sensitive to perceived undervaluing"
    ]
  },

  MOT_INFLUENCE_STABILITY: {
    primaryLabel: "Influence – Stability",
    statement: "{firstName} is motivated by positive relationships, inclusion, and a stable team environment.",
    strengths: [
      "Builds strong connections",
      "Supports group cohesion",
      "Values collaborative progress"
    ],
    watchouts: [
      "Can avoid difficult tension",
      "May seek approval too much",
      "Lower motivation in cold cultures"
    ]
  },

  MOT_STABILITY_ACHIEVEMENT: {
    primaryLabel: "Stability – Achievement",
    statement: "{firstName} is motivated by secure progress, dependable routines, and clear expectations.",
    strengths: [
      "Consistent and dependable",
      "Performs well with structure",
      "Sustains effort steadily"
    ],
    watchouts: [
      "Can avoid unnecessary risk",
      "May prefer routine",
      "Slower to embrace change"
    ]
  },

  MOT_STABILITY_MASTERY: {
    primaryLabel: "Stability – Mastery",
    statement: "{firstName} is motivated by dependable environments where quality and consistency matter.",
    strengths: [
      "Produces steady quality",
      "Highly reliable contributor",
      "Strong discipline and care"
    ],
    watchouts: [
      "Can become overly cautious",
      "May resist new methods",
      "Lower comfort with uncertainty"
    ]
  },

  MOT_STABILITY_INFLUENCE: {
    primaryLabel: "Stability – Influence",
    statement: "{firstName} is motivated by secure relationships, trust, and feeling settled within the team.",
    strengths: [
      "Supports team stability",
      "Builds trust consistently",
      "Values dependable relationships"
    ],
    watchouts: [
      "Can avoid disruption",
      "May dislike conflict",
      "Lower drive in volatile settings"
    ]
  },

  //--------------------------------
  // PRIMARY ONLY FALLBACKS
  //--------------------------------

  MOT_ACHIEVEMENT: {
    primaryLabel: "Achievement",
    statement: "{firstName} is motivated by progress, challenge, and clear evidence of success.",
    strengths: [
      "Strong drive for results",
      "Responds to stretch goals",
      "Pushes for progress"
    ],
    watchouts: [
      "Can be impatient",
      "May over-focus on outcomes",
      "Frustrated by slow movement"
    ]
  },

  MOT_MASTERY: {
    primaryLabel: "Mastery",
    statement: "{firstName} is motivated by competence, growth, and doing work to a high standard.",
    strengths: [
      "Values quality deeply",
      "Committed to improvement",
      "Builds strong expertise"
    ],
    watchouts: [
      "Can over-polish work",
      "May delay decisions",
      "Frustrated by poor standards"
    ]
  },

  MOT_INFLUENCE: {
    primaryLabel: "Influence",
    statement: "{firstName} is motivated by impact, recognition, and being able to shape outcomes.",
    strengths: [
      "Energised by visibility",
      "Enjoys influencing others",
      "Builds momentum socially"
    ],
    watchouts: [
      "Can seek validation",
      "May overvalue recognition",
      "Lower motivation without feedback"
    ]
  },

  MOT_STABILITY: {
    primaryLabel: "Stability",
    statement: "{firstName} is motivated by security, consistency, and a dependable working environment.",
    strengths: [
      "Steady and dependable",
      "Performs well with structure",
      "Values continuity"
    ],
    watchouts: [
      "Can resist change",
      "May avoid uncertainty",
      "Lower appetite for disruption"
    ]
  },

  //--------------------------------
  // DEFAULT FALLBACK
  //--------------------------------

  MOT_DEFAULT: {
    primaryLabel: "Balanced Motivators",
    statement: "{firstName} is motivated by a mix of progress, quality, influence, and stability.",
    strengths: [
      "Flexible across contexts",
      "Balanced source of drive",
      "Adapts motivation well"
    ],
    watchouts: [
      "May lack clear driver",
      "Can shift priorities",
      "Less predictable motivation"
    ]
  }
}

//--------------------------------
// RESOLVER FUNCTION
//--------------------------------

export function resolveMotivators(
  primary: string,
  secondary?: string
): LayerInsight {
  if (secondary) {
    const comboKey = `MOT_${primary}_${secondary}`
    if (motivatorsDictionary[comboKey]) {
      return motivatorsDictionary[comboKey]
    }
  }

  const primaryKey = `MOT_${primary}`
  if (motivatorsDictionary[primaryKey]) {
    return motivatorsDictionary[primaryKey]
  }

  return motivatorsDictionary["MOT_DEFAULT"]
}

//--------------------------------
// PERSONALISATION HELPER
//--------------------------------

export function injectFirstName(
  insight: LayerInsight,
  firstName: string
): LayerInsight {
  return {
    ...insight,
    statement: insight.statement.replace("{firstName}", firstName)
  }
}

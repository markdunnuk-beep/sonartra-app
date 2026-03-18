// /lib/interpretation/sonartra-behaviour-style-mapping.ts

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
// BEHAVIOUR STYLE DICTIONARY
//--------------------------------

export const behaviourStyleDictionary: LayerDictionary = {

  //--------------------------------
  // PRIMARY + SECONDARY COMBINATIONS
  //--------------------------------

  STYLE_DRIVER_ANALYST: {
    primaryLabel: "Driver – Analyst",
    statement: "{firstName} is direct, structured, and focused on results. Prefers clarity and control.",
    strengths: [
      "Drives outcomes quickly",
      "Brings structure to complexity",
      "Maintains focus under pressure"
    ],
    watchouts: [
      "Can be overly blunt",
      "May push ahead without alignment",
      "Lower patience for slower approaches"
    ]
  },

  STYLE_DRIVER_INFLUENCER: {
    primaryLabel: "Driver – Influencer",
    statement: "{firstName} is fast-paced, persuasive, and outcome-focused. Combines drive with energy.",
    strengths: [
      "Drives action and momentum",
      "Influences others effectively",
      "Comfortable taking the lead"
    ],
    watchouts: [
      "May overlook detail",
      "Can dominate discussions",
      "Pushes pace too aggressively"
    ]
  },

  STYLE_DRIVER_STABILISER: {
    primaryLabel: "Driver – Stabiliser",
    statement: "{firstName} is results-focused but measured. Balances pace with consistency and control.",
    strengths: [
      "Delivers with consistency",
      "Balances speed with stability",
      "Reliable under pressure"
    ],
    watchouts: [
      "May resist rapid change",
      "Can be cautious in decisions",
      "Slower to adapt direction"
    ]
  },

  STYLE_ANALYST_DRIVER: {
    primaryLabel: "Analyst – Driver",
    statement: "{firstName} is structured, data-driven, and outcome-focused. Prefers accuracy with progress.",
    strengths: [
      "Strong analytical thinking",
      "Maintains high standards",
      "Balances logic with action"
    ],
    watchouts: [
      "May overanalyse decisions",
      "Can appear critical",
      "Slower in fast-moving environments"
    ]
  },

  STYLE_ANALYST_INFLUENCER: {
    primaryLabel: "Analyst – Influencer",
    statement: "{firstName} is thoughtful and communicative. Balances logic with interpersonal awareness.",
    strengths: [
      "Communicates ideas clearly",
      "Builds credibility with logic",
      "Balances people and detail"
    ],
    watchouts: [
      "May over-explain",
      "Can lose focus on outcomes",
      "Slower to make decisions"
    ]
  },

  STYLE_ANALYST_STABILISER: {
    primaryLabel: "Analyst – Stabiliser",
    statement: "{firstName} is methodical, consistent, and detail-focused. Prefers stability and accuracy.",
    strengths: [
      "Highly reliable output",
      "Strong attention to detail",
      "Maintains consistent standards"
    ],
    watchouts: [
      "Resistant to change",
      "May avoid risk",
      "Slower to act under pressure"
    ]
  },

  STYLE_INFLUENCER_DRIVER: {
    primaryLabel: "Influencer – Driver",
    statement: "{firstName} is energetic, persuasive, and action-oriented. Drives results through people.",
    strengths: [
      "Engages and motivates others",
      "Drives momentum quickly",
      "Comfortable leading openly"
    ],
    watchouts: [
      "May overlook structure",
      "Can be impulsive",
      "Focus can shift quickly"
    ]
  },

  STYLE_INFLUENCER_ANALYST: {
    primaryLabel: "Influencer – Analyst",
    statement: "{firstName} is engaging and thoughtful. Combines communication with structured thinking.",
    strengths: [
      "Explains complex ideas clearly",
      "Builds strong relationships",
      "Balances logic and people"
    ],
    watchouts: [
      "May overcomplicate communication",
      "Slower decision-making",
      "Can dilute focus"
    ]
  },

  STYLE_INFLUENCER_STABILISER: {
    primaryLabel: "Influencer – Stabiliser",
    statement: "{firstName} is approachable, supportive, and people-focused. Prefers harmony and collaboration.",
    strengths: [
      "Builds strong team relationships",
      "Creates positive environments",
      "Encourages collaboration"
    ],
    watchouts: [
      "Avoids difficult conversations",
      "Can prioritise harmony over results",
      "Struggles with conflict"
    ]
  },

  STYLE_STABILISER_DRIVER: {
    primaryLabel: "Stabiliser – Driver",
    statement: "{firstName} is steady and reliable, with a focus on delivering outcomes consistently.",
    strengths: [
      "Consistent performance",
      "Reliable under pressure",
      "Balances stability with results"
    ],
    watchouts: [
      "May resist change",
      "Can be slow to react",
      "Less comfortable with ambiguity"
    ]
  },

  STYLE_STABILISER_ANALYST: {
    primaryLabel: "Stabiliser – Analyst",
    statement: "{firstName} is dependable, structured, and detail-oriented. Prefers controlled environments.",
    strengths: [
      "Highly consistent output",
      "Strong process discipline",
      "Reliable and organised"
    ],
    watchouts: [
      "Resistant to new approaches",
      "Can over-focus on detail",
      "Slow to adapt"
    ]
  },

  STYLE_STABILISER_INFLUENCER: {
    primaryLabel: "Stabiliser – Influencer",
    statement: "{firstName} is supportive and engaging. Builds trust while maintaining steady performance.",
    strengths: [
      "Strong relationship builder",
      "Creates stable environments",
      "Encourages teamwork"
    ],
    watchouts: [
      "Avoids confrontation",
      "May lack urgency",
      "Can struggle with change"
    ]
  },

  //--------------------------------
  // PRIMARY ONLY FALLBACKS
  //--------------------------------

  STYLE_DRIVER: {
    primaryLabel: "Driver",
    statement: "{firstName} is direct, decisive, and focused on results. Prefers speed and control.",
    strengths: [
      "Drives outcomes quickly",
      "Takes ownership",
      "Acts decisively"
    ],
    watchouts: [
      "Can be overly forceful",
      "May overlook detail",
      "Lower patience for others"
    ]
  },

  STYLE_ANALYST: {
    primaryLabel: "Analyst",
    statement: "{firstName} is structured, logical, and detail-focused. Prefers accuracy and clarity.",
    strengths: [
      "Strong analytical thinking",
      "High attention to detail",
      "Maintains standards"
    ],
    watchouts: [
      "May overanalyse",
      "Slower decisions",
      "Can appear critical"
    ]
  },

  STYLE_INFLUENCER: {
    primaryLabel: "Influencer",
    statement: "{firstName} is engaging, expressive, and people-focused. Energises others naturally.",
    strengths: [
      "Builds relationships quickly",
      "Communicates effectively",
      "Creates energy"
    ],
    watchouts: [
      "Can lose focus",
      "May lack structure",
      "Avoids detail"
    ]
  },

  STYLE_STABILISER: {
    primaryLabel: "Stabiliser",
    statement: "{firstName} is consistent, reliable, and supportive. Prefers stability and predictability.",
    strengths: [
      "Highly dependable",
      "Supports team cohesion",
      "Maintains consistency"
    ],
    watchouts: [
      "Resistant to change",
      "Avoids conflict",
      "Lower urgency"
    ]
  },

  //--------------------------------
  // DEFAULT FALLBACK
  //--------------------------------

  STYLE_DEFAULT: {
    primaryLabel: "Balanced Style",
    statement: "{firstName} shows a balanced approach across multiple styles without a single dominant pattern.",
    strengths: [
      "Adaptable across situations",
      "Flexible working style",
      "Balanced perspective"
    ],
    watchouts: [
      "May lack clear edge",
      "Can shift approach frequently",
      "Less predictable under pressure"
    ]
  }
}

//--------------------------------
// RESOLVER FUNCTION
//--------------------------------

export function resolveBehaviourStyle(
  primary: string,
  secondary?: string
): LayerInsight {

  if (secondary) {
    const comboKey = `STYLE_${primary}_${secondary}`
    if (behaviourStyleDictionary[comboKey]) {
      return behaviourStyleDictionary[comboKey]
    }
  }

  const primaryKey = `STYLE_${primary}`
  if (behaviourStyleDictionary[primaryKey]) {
    return behaviourStyleDictionary[primaryKey]
  }

  return behaviourStyleDictionary["STYLE_DEFAULT"]
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

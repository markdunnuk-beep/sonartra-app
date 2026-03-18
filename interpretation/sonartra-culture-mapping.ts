// /lib/interpretation/sonartra-culture-mapping.ts

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
// CULTURE DICTIONARY
//--------------------------------

export const cultureDictionary: LayerDictionary = {
  //--------------------------------
  // PRIMARY + SECONDARY COMBINATIONS
  //--------------------------------

  CULTURE_PERFORMANCE_CONTROL: {
    primaryLabel: "Performance – Control",
    statement: "{firstName} works best in high-standard environments with clear ownership, structure, and accountability.",
    strengths: [
      "Thrives on clear standards",
      "Values accountability",
      "Comfortable in disciplined cultures"
    ],
    watchouts: [
      "Can be critical of ambiguity",
      "May resist informal environments",
      "Lower tolerance for inconsistency"
    ]
  },

  CULTURE_PERFORMANCE_COLLABORATION: {
    primaryLabel: "Performance – Collaboration",
    statement: "{firstName} values strong performance but prefers it to be delivered through aligned and cooperative teams.",
    strengths: [
      "Balances standards and teamwork",
      "Values collective performance",
      "Supports aligned execution"
    ],
    watchouts: [
      "Can be frustrated by weak contributors",
      "May expect strong buy-in",
      "Less suited to fragmented teams"
    ]
  },

  CULTURE_PERFORMANCE_INNOVATION: {
    primaryLabel: "Performance – Innovation",
    statement: "{firstName} values ambitious environments that combine strong performance with fresh thinking and progress.",
    strengths: [
      "Energised by progress",
      "Comfortable with challenge",
      "Values ambitious thinking"
    ],
    watchouts: [
      "Can push pace too hard",
      "May lose patience with bureaucracy",
      "Less tolerance for slow movement"
    ]
  },

  CULTURE_CONTROL_PERFORMANCE: {
    primaryLabel: "Control – Performance",
    statement: "{firstName} prefers clear structure, defined responsibilities, and disciplined execution in pursuit of results.",
    strengths: [
      "Values order and clarity",
      "Supports disciplined delivery",
      "Comfortable with defined roles"
    ],
    watchouts: [
      "Can be rigid with change",
      "May overvalue structure",
      "Less comfortable with fluid environments"
    ]
  },

  CULTURE_CONTROL_COLLABORATION: {
    primaryLabel: "Control – Collaboration",
    statement: "{firstName} values stable, well-organised environments where people work together within clear boundaries.",
    strengths: [
      "Supports orderly teamwork",
      "Values dependable structure",
      "Helps maintain consistency"
    ],
    watchouts: [
      "Can be cautious in change",
      "May prefer consensus over speed",
      "Less suited to fast-moving ambiguity"
    ]
  },

  CULTURE_CONTROL_INNOVATION: {
    primaryLabel: "Control – Innovation",
    statement: "{firstName} values structured environments that still allow measured improvement and controlled experimentation.",
    strengths: [
      "Balances structure and progress",
      "Supports measured change",
      "Comfortable improving systems"
    ],
    watchouts: [
      "Can slow rapid innovation",
      "May over-structure new ideas",
      "Less comfortable with disorder"
    ]
  },

  CULTURE_COLLABORATION_PERFORMANCE: {
    primaryLabel: "Collaboration – Performance",
    statement: "{firstName} values supportive teams that stay aligned while still maintaining strong standards and output.",
    strengths: [
      "Encourages aligned teams",
      "Values shared accountability",
      "Supports group performance"
    ],
    watchouts: [
      "Can be frustrated by poor teamwork",
      "May avoid hard challenge",
      "Less suited to highly political cultures"
    ]
  },

  CULTURE_COLLABORATION_CONTROL: {
    primaryLabel: "Collaboration – Control",
    statement: "{firstName} prefers cooperative environments with clear roles, stable routines, and mutual support.",
    strengths: [
      "Builds dependable team environments",
      "Values clarity and support",
      "Helps maintain cohesion"
    ],
    watchouts: [
      "Can resist disruption",
      "May prefer stability over speed",
      "Less comfortable in loose structures"
    ]
  },

  CULTURE_COLLABORATION_INNOVATION: {
    primaryLabel: "Collaboration – Innovation",
    statement: "{firstName} values open, supportive cultures that encourage fresh thinking and shared progress.",
    strengths: [
      "Encourages idea sharing",
      "Supports collaborative change",
      "Values positive team energy"
    ],
    watchouts: [
      "Can lose pace in consensus",
      "May avoid harder challenge",
      "Less suited to harsh environments"
    ]
  },

  CULTURE_INNOVATION_PERFORMANCE: {
    primaryLabel: "Innovation – Performance",
    statement: "{firstName} values ambitious, forward-moving environments where new ideas lead to tangible results.",
    strengths: [
      "Energised by progress",
      "Comfortable with experimentation",
      "Values growth and momentum"
    ],
    watchouts: [
      "Can lose patience with routine",
      "May underweight structure",
      "Less tolerance for slow execution"
    ]
  },

  CULTURE_INNOVATION_CONTROL: {
    primaryLabel: "Innovation – Control",
    statement: "{firstName} values new ideas, but prefers them to be applied within a clear and structured framework.",
    strengths: [
      "Brings order to change",
      "Supports controlled innovation",
      "Balances ideas with discipline"
    ],
    watchouts: [
      "Can restrict creativity",
      "May over-govern experimentation",
      "Less comfortable with fluid exploration"
    ]
  },

  CULTURE_INNOVATION_COLLABORATION: {
    primaryLabel: "Innovation – Collaboration",
    statement: "{firstName} values open environments where people can explore ideas together and move things forward.",
    strengths: [
      "Encourages team innovation",
      "Comfortable with change",
      "Supports creative collaboration"
    ],
    watchouts: [
      "Can underweight discipline",
      "May lose focus on execution",
      "Less suited to rigid cultures"
    ]
  },

  //--------------------------------
  // PRIMARY ONLY FALLBACKS
  //--------------------------------

  CULTURE_PERFORMANCE: {
    primaryLabel: "Performance",
    statement: "{firstName} values high standards, accountability, and environments that reward strong execution.",
    strengths: [
      "Thrives on high standards",
      "Values measurable results",
      "Comfortable with accountability"
    ],
    watchouts: [
      "Can be critical of weaker pace",
      "May push standards hard",
      "Less tolerant of ambiguity"
    ]
  },

  CULTURE_CONTROL: {
    primaryLabel: "Control",
    statement: "{firstName} prefers structure, clarity, and disciplined environments with defined expectations.",
    strengths: [
      "Values order and clarity",
      "Supports consistency",
      "Comfortable with structure"
    ],
    watchouts: [
      "Can resist change",
      "May become rigid",
      "Less comfortable with ambiguity"
    ]
  },

  CULTURE_COLLABORATION: {
    primaryLabel: "Collaboration",
    statement: "{firstName} values supportive environments, shared effort, and strong team cohesion.",
    strengths: [
      "Builds team connection",
      "Supports shared progress",
      "Values cooperative working"
    ],
    watchouts: [
      "Can avoid tension",
      "May overvalue harmony",
      "Less comfortable with sharp challenge"
    ]
  },

  CULTURE_INNOVATION: {
    primaryLabel: "Innovation",
    statement: "{firstName} values fresh thinking, progress, and environments that encourage change and new ideas.",
    strengths: [
      "Comfortable with new ideas",
      "Energised by progress",
      "Supports improvement"
    ],
    watchouts: [
      "Can lose patience with routine",
      "May underweight structure",
      "Less tolerance for bureaucracy"
    ]
  },

  //--------------------------------
  // DEFAULT
  //--------------------------------

  CULTURE_DEFAULT: {
    primaryLabel: "Balanced Culture Fit",
    statement: "{firstName} can operate across different environments without a single dominant culture preference.",
    strengths: [
      "Adaptable across cultures",
      "Flexible working approach",
      "Balanced environment fit"
    ],
    watchouts: [
      "May lack clear preference",
      "Can shift with context",
      "Less predictable culture fit"
    ]
  }
}

//--------------------------------
// RESOLVER
//--------------------------------

export function resolveCulture(
  primary: string,
  secondary?: string
): LayerInsight {
  if (secondary) {
    const comboKey = `CULTURE_${primary}_${secondary}`
    if (cultureDictionary[comboKey]) {
      return cultureDictionary[comboKey]
    }
  }

  const primaryKey = `CULTURE_${primary}`
  if (cultureDictionary[primaryKey]) {
    return cultureDictionary[primaryKey]
  }

  return cultureDictionary["CULTURE_DEFAULT"]
}

//--------------------------------
// PERSONALISATION
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

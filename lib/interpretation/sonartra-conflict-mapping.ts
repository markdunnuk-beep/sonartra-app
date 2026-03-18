// /lib/interpretation/sonartra-conflict-mapping.ts

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
// CONFLICT DICTIONARY
//--------------------------------

export const conflictDictionary: LayerDictionary = {
  //--------------------------------
  // PRIMARY + SECONDARY COMBINATIONS
  //--------------------------------

  CONFLICT_COMPETE_COLLABORATE: {
    primaryLabel: "Compete – Collaborate",
    statement: "{firstName} addresses issues directly and pushes for resolution, while still working to find a workable outcome.",
    strengths: [
      "Addresses issues quickly",
      "Keeps focus on resolution",
      "Balances directness with discussion"
    ],
    watchouts: [
      "Can come across forcefully",
      "May dominate debate",
      "Patience can drop under tension"
    ]
  },

  CONFLICT_COMPETE_COMPROMISE: {
    primaryLabel: "Compete – Compromise",
    statement: "{firstName} is comfortable taking a firm position, but will settle on a practical middle ground when needed.",
    strengths: [
      "Decisive in disagreement",
      "Pragmatic under pressure",
      "Moves conflict forward"
    ],
    watchouts: [
      "Can push too hard early",
      "May settle too quickly",
      "Less focus on root causes"
    ]
  },

  CONFLICT_COMPETE_AVOID: {
    primaryLabel: "Compete – Avoid",
    statement: "{firstName} can be direct when needed, but may disengage once conflict becomes unproductive or overly emotional.",
    strengths: [
      "Willing to confront issues",
      "Avoids wasted escalation",
      "Focuses on outcomes"
    ],
    watchouts: [
      "Can shut discussion down",
      "May leave tension unresolved",
      "Lower tolerance for emotional conflict"
    ]
  },

  CONFLICT_COMPETE_ACCOMMODATE: {
    primaryLabel: "Compete – Accommodate",
    statement: "{firstName} usually pushes for a clear outcome, but may give ground selectively to keep things moving.",
    strengths: [
      "Clear in disagreement",
      "Flexible when needed",
      "Keeps momentum"
    ],
    watchouts: [
      "Can appear inconsistent",
      "May overuse pressure",
      "Sometimes gives ground abruptly"
    ]
  },

  CONFLICT_COLLABORATE_COMPETE: {
    primaryLabel: "Collaborate – Compete",
    statement: "{firstName} prefers to work through disagreement openly, but will take a firmer stance when progress stalls.",
    strengths: [
      "Open to discussion",
      "Works toward strong solutions",
      "Can step up decisively"
    ],
    watchouts: [
      "Can become forceful late",
      "May over-invest in discussion",
      "Frustration rises if blocked"
    ]
  },

  CONFLICT_COLLABORATE_COMPROMISE: {
    primaryLabel: "Collaborate – Compromise",
    statement: "{firstName} works through issues constructively and looks for balanced outcomes that both sides can accept.",
    strengths: [
      "Encourages open dialogue",
      "Seeks fair outcomes",
      "Builds resolution constructively"
    ],
    watchouts: [
      "Can spend too long discussing",
      "May soften difficult points",
      "Decision speed may drop"
    ]
  },

  CONFLICT_COLLABORATE_AVOID: {
    primaryLabel: "Collaborate – Avoid",
    statement: "{firstName} prefers constructive discussion, but may step back when conflict becomes overly tense or unproductive.",
    strengths: [
      "Promotes calm discussion",
      "Looks for shared ground",
      "Avoids unnecessary escalation"
    ],
    watchouts: [
      "Can withdraw too early",
      "May leave issues unfinished",
      "Lower comfort with confrontation"
    ]
  },

  CONFLICT_COLLABORATE_ACCOMMODATE: {
    primaryLabel: "Collaborate – Accommodate",
    statement: "{firstName} tries to preserve relationships and work through disagreement in a supportive and constructive way.",
    strengths: [
      "Relationship aware",
      "Encourages cooperation",
      "Creates safe discussion"
    ],
    watchouts: [
      "Can soften key issues",
      "May prioritise harmony",
      "Less forceful when needed"
    ]
  },

  CONFLICT_COMPROMISE_COMPETE: {
    primaryLabel: "Compromise – Compete",
    statement: "{firstName} aims for practical resolution, but can become more assertive when speed or clarity is needed.",
    strengths: [
      "Pragmatic in conflict",
      "Keeps issues moving",
      "Can be decisive"
    ],
    watchouts: [
      "May rush agreement",
      "Can become sharper under pressure",
      "Less focus on deeper issues"
    ]
  },

  CONFLICT_COMPROMISE_COLLABORATE: {
    primaryLabel: "Compromise – Collaborate",
    statement: "{firstName} looks for workable solutions and is willing to discuss options to reach a fair outcome.",
    strengths: [
      "Practical and balanced",
      "Open to different views",
      "Helps conflicts settle"
    ],
    watchouts: [
      "Can settle for average solutions",
      "May avoid harder truths",
      "Less likely to challenge strongly"
    ]
  },

  CONFLICT_COMPROMISE_AVOID: {
    primaryLabel: "Compromise – Avoid",
    statement: "{firstName} prefers practical resolution, but may disengage when conflict becomes drawn out or uncomfortable.",
    strengths: [
      "Keeps conflict contained",
      "Seeks workable outcomes",
      "Avoids unnecessary drama"
    ],
    watchouts: [
      "Can sidestep core issues",
      "May accept weak resolution",
      "Lower persistence in tension"
    ]
  },

  CONFLICT_COMPROMISE_ACCOMMODATE: {
    primaryLabel: "Compromise – Accommodate",
    statement: "{firstName} is inclined to find a middle ground and maintain working relationships where possible.",
    strengths: [
      "Flexible in disagreement",
      "Easy to work with",
      "Supports smoother resolution"
    ],
    watchouts: [
      "Can give away too much",
      "May avoid firm positions",
      "Less likely to challenge poor decisions"
    ]
  },

  CONFLICT_AVOID_COMPETE: {
    primaryLabel: "Avoid – Compete",
    statement: "{firstName} may step back from tension initially, but can become direct when an issue can no longer be ignored.",
    strengths: [
      "Avoids needless escalation",
      "Can step in firmly",
      "Chooses battles selectively"
    ],
    watchouts: [
      "Can delay issues too long",
      "May react sharply later",
      "Tension may build quietly"
    ]
  },

  CONFLICT_AVOID_COLLABORATE: {
    primaryLabel: "Avoid – Collaborate",
    statement: "{firstName} prefers to keep conflict low, but will engage constructively when discussion feels productive and safe.",
    strengths: [
      "Calm under tension",
      "Encourages respectful discussion",
      "Avoids unnecessary friction"
    ],
    watchouts: [
      "Can avoid hard conversations",
      "May defer too much",
      "Issues can linger"
    ]
  },

  CONFLICT_AVOID_COMPROMISE: {
    primaryLabel: "Avoid – Compromise",
    statement: "{firstName} prefers to reduce tension and move toward a workable outcome without prolonging disagreement.",
    strengths: [
      "Keeps situations calm",
      "Looks for practical closure",
      "Avoids emotional escalation"
    ],
    watchouts: [
      "Can resolve too quickly",
      "May skip difficult truths",
      "Lower challenge when needed"
    ]
  },

  CONFLICT_AVOID_ACCOMMODATE: {
    primaryLabel: "Avoid – Accommodate",
    statement: "{firstName} tends to reduce tension by stepping back and preserving harmony where possible.",
    strengths: [
      "Keeps situations calm",
      "Protects relationships",
      "Avoids unnecessary conflict"
    ],
    watchouts: [
      "Can leave issues unspoken",
      "May suppress concerns",
      "Lower assertiveness in conflict"
    ]
  },

  CONFLICT_ACCOMMODATE_COMPETE: {
    primaryLabel: "Accommodate – Compete",
    statement: "{firstName} often works to preserve relationships, but can take a firmer line when a clear boundary is needed.",
    strengths: [
      "Flexible with others",
      "Can step up when needed",
      "Protects working relationships"
    ],
    watchouts: [
      "Can swing between styles",
      "May delay directness",
      "Boundaries may be unclear"
    ]
  },

  CONFLICT_ACCOMMODATE_COLLABORATE: {
    primaryLabel: "Accommodate – Collaborate",
    statement: "{firstName} works to keep relationships intact and prefers constructive, low-friction resolution.",
    strengths: [
      "Supportive in disagreement",
      "Relationship conscious",
      "Encourages cooperative solutions"
    ],
    watchouts: [
      "Can understate concerns",
      "May avoid hard truths",
      "Less likely to challenge strongly"
    ]
  },

  CONFLICT_ACCOMMODATE_COMPROMISE: {
    primaryLabel: "Accommodate – Compromise",
    statement: "{firstName} is flexible in conflict and usually looks for a practical outcome that keeps things workable.",
    strengths: [
      "Easy to work through issues",
      "Keeps situations moving",
      "Supports workable outcomes"
    ],
    watchouts: [
      "Can give ground too easily",
      "May protect harmony over quality",
      "Less forceful under tension"
    ]
  },

  CONFLICT_ACCOMMODATE_AVOID: {
    primaryLabel: "Accommodate – Avoid",
    statement: "{firstName} tends to preserve harmony by stepping back, adapting, and avoiding unnecessary friction.",
    strengths: [
      "Calm in tense situations",
      "Protects relationships",
      "Low-friction style"
    ],
    watchouts: [
      "Can leave concerns unsaid",
      "May over-accommodate others",
      "Issues can remain unresolved"
    ]
  },

  //--------------------------------
  // PRIMARY ONLY FALLBACKS
  //--------------------------------

  CONFLICT_COMPETE: {
    primaryLabel: "Compete",
    statement: "{firstName} is direct in disagreement and willing to push for a clear outcome.",
    strengths: [
      "Addresses conflict directly",
      "Clear under tension",
      "Decisive in disagreement"
    ],
    watchouts: [
      "Can appear forceful",
      "May escalate too quickly",
      "Lower patience for debate"
    ]
  },

  CONFLICT_COLLABORATE: {
    primaryLabel: "Collaborate",
    statement: "{firstName} prefers to work through disagreement openly and find a strong shared solution.",
    strengths: [
      "Encourages open dialogue",
      "Looks for strong solutions",
      "Values shared resolution"
    ],
    watchouts: [
      "Can spend too long discussing",
      "May delay closure",
      "Less comfortable forcing decisions"
    ]
  },

  CONFLICT_COMPROMISE: {
    primaryLabel: "Compromise",
    statement: "{firstName} focuses on practical resolution and finding a middle ground that keeps progress moving.",
    strengths: [
      "Pragmatic in disagreement",
      "Keeps issues moving",
      "Finds workable outcomes"
    ],
    watchouts: [
      "Can settle too quickly",
      "May miss root causes",
      "Less likely to challenge fully"
    ]
  },

  CONFLICT_AVOID: {
    primaryLabel: "Avoid",
    statement: "{firstName} prefers to reduce tension and may step back rather than prolong conflict unnecessarily.",
    strengths: [
      "Keeps situations calm",
      "Avoids needless escalation",
      "Chooses battles carefully"
    ],
    watchouts: [
      "Can delay hard conversations",
      "May leave issues unresolved",
      "Concerns can stay unspoken"
    ]
  },

  CONFLICT_ACCOMMODATE: {
    primaryLabel: "Accommodate",
    statement: "{firstName} tends to protect relationships in disagreement and is willing to adapt to keep things workable.",
    strengths: [
      "Relationship conscious",
      "Flexible with others",
      "Low-friction approach"
    ],
    watchouts: [
      "Can give ground too easily",
      "May understate own view",
      "Lower assertiveness under pressure"
    ]
  },

  //--------------------------------
  // DEFAULT
  //--------------------------------

  CONFLICT_DEFAULT: {
    primaryLabel: "Balanced Conflict Style",
    statement: "{firstName} shows a balanced conflict approach and adjusts style based on the situation.",
    strengths: [
      "Adaptable in disagreement",
      "Flexible response style",
      "Balanced under tension"
    ],
    watchouts: [
      "May seem inconsistent",
      "Style can shift quickly",
      "Less predictable in conflict"
    ]
  }
}

//--------------------------------
// RESOLVER
//--------------------------------

export function resolveConflict(
  primary: string,
  secondary?: string
): LayerInsight {
  if (secondary) {
    const comboKey = `CONFLICT_${primary}_${secondary}`
    if (conflictDictionary[comboKey]) {
      return conflictDictionary[comboKey]
    }
  }

  const primaryKey = `CONFLICT_${primary}`
  if (conflictDictionary[primaryKey]) {
    return conflictDictionary[primaryKey]
  }

  return conflictDictionary["CONFLICT_DEFAULT"]
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

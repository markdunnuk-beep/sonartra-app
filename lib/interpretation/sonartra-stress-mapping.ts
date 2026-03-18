// /lib/interpretation/sonartra-stress-mapping.ts

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
// STRESS DICTIONARY
//--------------------------------

export const stressDictionary: LayerDictionary = {
  //--------------------------------
  // PRIMARY + SECONDARY COMBINATIONS
  //--------------------------------

  STRESS_CONTROL_OVERDRIVE: {
    primaryLabel: "Control – Overdrive",
    statement: "{firstName} increases control and output under pressure, pushing harder to maintain performance.",
    strengths: [
      "Maintains output under pressure",
      "Takes ownership quickly",
      "Drives situations forward"
    ],
    watchouts: [
      "Can become overly controlling",
      "Risk of burnout",
      "Less open to input"
    ]
  },

  STRESS_CONTROL_WITHDRAW: {
    primaryLabel: "Control – Withdraw",
    statement: "{firstName} seeks to regain control under pressure but may step back when situations become unclear.",
    strengths: [
      "Regains structure quickly",
      "Avoids reactive decisions",
      "Maintains composure"
    ],
    watchouts: [
      "Can disengage",
      "May delay action",
      "Less visible under stress"
    ]
  },

  STRESS_CONTROL_SUPPORT: {
    primaryLabel: "Control – Support",
    statement: "{firstName} maintains structure under pressure while supporting others to keep things stable.",
    strengths: [
      "Provides stability",
      "Keeps structure intact",
      "Supports team consistency"
    ],
    watchouts: [
      "Can take on too much",
      "May over-manage",
      "Less flexible under stress"
    ]
  },

  STRESS_OVERDRIVE_CONTROL: {
    primaryLabel: "Overdrive – Control",
    statement: "{firstName} increases pace and intensity under pressure while trying to retain control of outcomes.",
    strengths: [
      "Drives momentum",
      "Acts quickly",
      "Maintains direction"
    ],
    watchouts: [
      "Can push too hard",
      "May overlook detail",
      "Reduced patience"
    ]
  },

  STRESS_OVERDRIVE_WITHDRAW: {
    primaryLabel: "Overdrive – Withdraw",
    statement: "{firstName} initially increases intensity under pressure but may step back if progress stalls.",
    strengths: [
      "Acts quickly at first",
      "Drives early momentum",
      "Responsive under pressure"
    ],
    watchouts: [
      "Can drop off suddenly",
      "May disengage",
      "Inconsistent response"
    ]
  },

  STRESS_OVERDRIVE_SUPPORT: {
    primaryLabel: "Overdrive – Support",
    statement: "{firstName} increases effort under pressure while trying to support others and keep things moving.",
    strengths: [
      "High energy response",
      "Supports team momentum",
      "Keeps activity high"
    ],
    watchouts: [
      "Can overextend",
      "May neglect own limits",
      "Reduced focus"
    ]
  },

  STRESS_WITHDRAW_CONTROL: {
    primaryLabel: "Withdraw – Control",
    statement: "{firstName} steps back under pressure to regain clarity, then re-engages with structure.",
    strengths: [
      "Avoids reactive decisions",
      "Regains clarity",
      "Returns with structure"
    ],
    watchouts: [
      "Can appear disengaged",
      "May delay action",
      "Less visible in pressure"
    ]
  },

  STRESS_WITHDRAW_OVERDRIVE: {
    primaryLabel: "Withdraw – Overdrive",
    statement: "{firstName} may step back initially under pressure but can re-engage with increased intensity.",
    strengths: [
      "Avoids immediate reaction",
      "Can re-engage strongly",
      "Flexible response"
    ],
    watchouts: [
      "Inconsistent behaviour",
      "Can shift abruptly",
      "Unpredictable under stress"
    ]
  },

  STRESS_WITHDRAW_SUPPORT: {
    primaryLabel: "Withdraw – Support",
    statement: "{firstName} steps back to reduce pressure and focuses on maintaining stability for others.",
    strengths: [
      "Keeps situations calm",
      "Supports stability",
      "Reduces escalation"
    ],
    watchouts: [
      "Can withdraw too much",
      "May avoid action",
      "Lower visibility"
    ]
  },

  STRESS_SUPPORT_CONTROL: {
    primaryLabel: "Support – Control",
    statement: "{firstName} focuses on supporting others under pressure while maintaining structure and order.",
    strengths: [
      "Provides reassurance",
      "Maintains organisation",
      "Supports team stability"
    ],
    watchouts: [
      "Can take on too much",
      "May over-manage",
      "Less focus on own limits"
    ]
  },

  STRESS_SUPPORT_OVERDRIVE: {
    primaryLabel: "Support – Overdrive",
    statement: "{firstName} supports others while increasing effort to keep things moving under pressure.",
    strengths: [
      "Keeps momentum",
      "Supports others actively",
      "High energy response"
    ],
    watchouts: [
      "Can overextend",
      "May neglect own needs",
      "Reduced efficiency"
    ]
  },

  STRESS_SUPPORT_WITHDRAW: {
    primaryLabel: "Support – Withdraw",
    statement: "{firstName} supports others under pressure but may step back personally to manage load.",
    strengths: [
      "Supports team stability",
      "Avoids escalation",
      "Maintains calm"
    ],
    watchouts: [
      "Can become less visible",
      "May disengage personally",
      "Lower direct control"
    ]
  },

  //--------------------------------
  // PRIMARY ONLY FALLBACKS
  //--------------------------------

  STRESS_CONTROL: {
    primaryLabel: "Control",
    statement: "{firstName} responds to pressure by increasing structure, control, and organisation.",
    strengths: [
      "Maintains order",
      "Takes ownership",
      "Creates clarity"
    ],
    watchouts: [
      "Can be rigid",
      "May over-control",
      "Less flexible"
    ]
  },

  STRESS_OVERDRIVE: {
    primaryLabel: "Overdrive",
    statement: "{firstName} responds to pressure by increasing pace, effort, and intensity.",
    strengths: [
      "Acts quickly",
      "Drives momentum",
      "High energy response"
    ],
    watchouts: [
      "Can burn out",
      "May rush decisions",
      "Reduced attention to detail"
    ]
  },

  STRESS_WITHDRAW: {
    primaryLabel: "Withdraw",
    statement: "{firstName} responds to pressure by stepping back to regain clarity and reduce noise.",
    strengths: [
      "Avoids reactive decisions",
      "Maintains composure",
      "Creates space to think"
    ],
    watchouts: [
      "Can disengage",
      "May delay action",
      "Lower visibility"
    ]
  },

  STRESS_SUPPORT: {
    primaryLabel: "Support",
    statement: "{firstName} responds to pressure by supporting others and maintaining team stability.",
    strengths: [
      "Supports others well",
      "Keeps calm",
      "Maintains team cohesion"
    ],
    watchouts: [
      "Can neglect own needs",
      "May overextend",
      "Less focus on personal output"
    ]
  },

  //--------------------------------
  // DEFAULT
  //--------------------------------

  STRESS_DEFAULT: {
    primaryLabel: "Balanced Stress Response",
    statement: "{firstName} shows a balanced response to pressure and adjusts depending on the situation.",
    strengths: [
      "Adaptable under pressure",
      "Flexible response",
      "Maintains balance"
    ],
    watchouts: [
      "Can appear inconsistent",
      "Response may vary",
      "Less predictable under stress"
    ]
  }
}

//--------------------------------
// RESOLVER
//--------------------------------

export function resolveStress(
  primary: string,
  secondary?: string
): LayerInsight {
  if (secondary) {
    const comboKey = `STRESS_${primary}_${secondary}`
    if (stressDictionary[comboKey]) {
      return stressDictionary[comboKey]
    }
  }

  const primaryKey = `STRESS_${primary}`
  if (stressDictionary[primaryKey]) {
    return stressDictionary[primaryKey]
  }

  return stressDictionary["STRESS_DEFAULT"]
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

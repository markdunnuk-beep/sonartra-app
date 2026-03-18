// /lib/interpretation/sonartra-leadership-mapping.ts

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
// LEADERSHIP DICTIONARY
//--------------------------------

export const leadershipDictionary: LayerDictionary = {

  //--------------------------------
  // PRIMARY + SECONDARY COMBINATIONS
  //--------------------------------

  LEAD_RESULTS_VISION: {
    primaryLabel: "Results – Vision",
    statement: "{firstName} leads with clear outcomes and direction, focusing on delivery and forward momentum.",
    strengths: [
      "Drives execution strongly",
      "Sets clear direction",
      "Maintains performance focus"
    ],
    watchouts: [
      "May overlook detail",
      "Can push too fast",
      "Less focus on people impact"
    ]
  },

  LEAD_RESULTS_PEOPLE: {
    primaryLabel: "Results – People",
    statement: "{firstName} focuses on delivery while keeping people aligned and engaged.",
    strengths: [
      "Balances outcomes and people",
      "Maintains team alignment",
      "Drives accountable performance"
    ],
    watchouts: [
      "May prioritise delivery",
      "Can stretch team capacity",
      "Less focus on process"
    ]
  },

  LEAD_RESULTS_PROCESS: {
    primaryLabel: "Results – Process",
    statement: "{firstName} leads through structured execution, ensuring delivery is controlled and consistent.",
    strengths: [
      "Builds scalable systems",
      "Maintains discipline",
      "Delivers consistently"
    ],
    watchouts: [
      "Can be rigid",
      "May over-control execution",
      "Less adaptable to change"
    ]
  },

  LEAD_VISION_RESULTS: {
    primaryLabel: "Vision – Results",
    statement: "{firstName} sets direction and drives progress toward clear outcomes.",
    strengths: [
      "Creates forward direction",
      "Drives momentum",
      "Aligns teams to goals"
    ],
    watchouts: [
      "May skip detail",
      "Can shift direction quickly",
      "Less focus on process"
    ]
  },

  LEAD_VISION_PEOPLE: {
    primaryLabel: "Vision – People",
    statement: "{firstName} leads by setting direction and bringing people with them.",
    strengths: [
      "Inspires others",
      "Builds strong alignment",
      "Communicates vision clearly"
    ],
    watchouts: [
      "May lack structure",
      "Can be overly optimistic",
      "Less focus on execution detail"
    ]
  },

  LEAD_VISION_PROCESS: {
    primaryLabel: "Vision – Process",
    statement: "{firstName} combines direction with structured execution to deliver outcomes.",
    strengths: [
      "Balances strategy and structure",
      "Aligns plans to execution",
      "Maintains clarity"
    ],
    watchouts: [
      "Can over-plan",
      "May slow decision speed",
      "Less flexible in change"
    ]
  },

  LEAD_PEOPLE_RESULTS: {
    primaryLabel: "People – Results",
    statement: "{firstName} focuses on team engagement while ensuring outcomes are delivered.",
    strengths: [
      "Builds strong teams",
      "Maintains accountability",
      "Balances people and performance"
    ],
    watchouts: [
      "May avoid tough decisions",
      "Can prioritise harmony",
      "Less focus on structure"
    ]
  },

  LEAD_PEOPLE_VISION: {
    primaryLabel: "People – Vision",
    statement: "{firstName} leads through connection, alignment, and shared direction.",
    strengths: [
      "Builds engagement",
      "Aligns teams effectively",
      "Encourages collaboration"
    ],
    watchouts: [
      "Can avoid conflict",
      "May lack execution focus",
      "Less structured approach"
    ]
  },

  LEAD_PEOPLE_PROCESS: {
    primaryLabel: "People – Process",
    statement: "{firstName} supports teams through clear structure and consistent guidance.",
    strengths: [
      "Provides stability",
      "Supports team development",
      "Creates clarity"
    ],
    watchouts: [
      "May be overly cautious",
      "Can resist change",
      "Lower pace of delivery"
    ]
  },

  LEAD_PROCESS_RESULTS: {
    primaryLabel: "Process – Results",
    statement: "{firstName} focuses on delivering outcomes through disciplined and structured execution.",
    strengths: [
      "Highly organised",
      "Maintains consistency",
      "Drives reliable delivery"
    ],
    watchouts: [
      "Can be inflexible",
      "May slow decisions",
      "Less adaptable"
    ]
  },

  LEAD_PROCESS_VISION: {
    primaryLabel: "Process – Vision",
    statement: "{firstName} translates direction into structured plans and clear execution paths.",
    strengths: [
      "Creates clarity from vision",
      "Builds strong plans",
      "Maintains structure"
    ],
    watchouts: [
      "Can over-structure",
      "May limit flexibility",
      "Slower to adapt"
    ]
  },

  LEAD_PROCESS_PEOPLE: {
    primaryLabel: "Process – People",
    statement: "{firstName} leads through structure while supporting team stability and consistency.",
    strengths: [
      "Creates stable environments",
      "Supports team clarity",
      "Maintains discipline"
    ],
    watchouts: [
      "May limit autonomy",
      "Can be overly controlling",
      "Less dynamic leadership"
    ]
  },

  //--------------------------------
  // PRIMARY ONLY FALLBACKS
  //--------------------------------

  LEAD_RESULTS: {
    primaryLabel: "Results",
    statement: "{firstName} leads with a strong focus on delivery, outcomes, and accountability.",
    strengths: [
      "Drives performance",
      "Maintains accountability",
      "Focuses on outcomes"
    ],
    watchouts: [
      "Can overlook people impact",
      "May push too hard",
      "Less focus on process"
    ]
  },

  LEAD_VISION: {
    primaryLabel: "Vision",
    statement: "{firstName} leads by setting direction and aligning others to future goals.",
    strengths: [
      "Creates direction",
      "Inspires others",
      "Builds alignment"
    ],
    watchouts: [
      "May lack detail",
      "Can shift direction",
      "Less execution focus"
    ]
  },

  LEAD_PEOPLE: {
    primaryLabel: "People",
    statement: "{firstName} leads by building relationships, engagement, and team cohesion.",
    strengths: [
      "Builds strong teams",
      "Supports individuals",
      "Encourages collaboration"
    ],
    watchouts: [
      "Avoids conflict",
      "May lack decisiveness",
      "Less focus on outcomes"
    ]
  },

  LEAD_PROCESS: {
    primaryLabel: "Process",
    statement: "{firstName} leads through structure, clarity, and consistent execution.",
    strengths: [
      "Highly organised",
      "Maintains discipline",
      "Creates clarity"
    ],
    watchouts: [
      "Can be rigid",
      "May slow pace",
      "Less flexible"
    ]
  },

  //--------------------------------
  // DEFAULT
  //--------------------------------

  LEAD_DEFAULT: {
    primaryLabel: "Balanced Leadership",
    statement: "{firstName} shows a balanced leadership approach across outcomes, people, and structure.",
    strengths: [
      "Adaptable leadership style",
      "Balances priorities",
      "Flexible approach"
    ],
    watchouts: [
      "May lack clear edge",
      "Can shift style",
      "Less predictable"
    ]
  }
}

//--------------------------------
// RESOLVER
//--------------------------------

export function resolveLeadership(
  primary: string,
  secondary?: string
): LayerInsight {

  if (secondary) {
    const comboKey = `LEAD_${primary}_${secondary}`
    if (leadershipDictionary[comboKey]) {
      return leadershipDictionary[comboKey]
    }
  }

  const primaryKey = `LEAD_${primary}`
  if (leadershipDictionary[primaryKey]) {
    return leadershipDictionary[primaryKey]
  }

  return leadershipDictionary["LEAD_DEFAULT"]
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

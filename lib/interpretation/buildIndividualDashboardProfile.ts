// /lib/interpretation/buildIndividualDashboardProfile.ts

import {
  resolveBehaviourStyle,
  injectFirstName as injectBehaviourFirstName,
  type LayerInsight as BehaviourLayerInsight,
} from "@/lib/interpretation/sonartra-behaviour-style-mapping"

import {
  resolveMotivators,
  injectFirstName as injectMotivatorsFirstName,
  type LayerInsight as MotivatorsLayerInsight,
} from "@/lib/interpretation/sonartra-motivators-mapping"

import {
  resolveLeadership,
  injectFirstName as injectLeadershipFirstName,
  type LayerInsight as LeadershipLayerInsight,
} from "@/lib/interpretation/sonartra-leadership-mapping"

import {
  resolveConflict,
  injectFirstName as injectConflictFirstName,
  type LayerInsight as ConflictLayerInsight,
} from "@/lib/interpretation/sonartra-conflict-mapping"

import {
  resolveCulture,
  injectFirstName as injectCultureFirstName,
  type LayerInsight as CultureLayerInsight,
} from "@/lib/interpretation/sonartra-culture-mapping"

import {
  resolveStress,
  injectFirstName as injectStressFirstName,
  type LayerInsight as StressLayerInsight,
} from "@/lib/interpretation/sonartra-stress-mapping"

//--------------------------------
// SHARED TYPES
//--------------------------------

export type LayerInsight =
  | BehaviourLayerInsight
  | MotivatorsLayerInsight
  | LeadershipLayerInsight
  | ConflictLayerInsight
  | CultureLayerInsight
  | StressLayerInsight

export type DashboardLayerKey =
  | "behaviour"
  | "motivators"
  | "leadership"
  | "conflict"
  | "culture"
  | "stress"

export type RankedSignalInput = {
  primary: string
  secondary?: string
}

export type IndividualDashboardSignalsInput = {
  behaviour: RankedSignalInput
  motivators: RankedSignalInput
  leadership: RankedSignalInput
  conflict: RankedSignalInput
  culture: RankedSignalInput
  stress: RankedSignalInput
}

export type IndividualDashboardProfile = {
  header: {
    firstName: string
    title: string
    profileLabel: string
    summary: string
  }
  layers: {
    behaviour: LayerInsight
    motivators: LayerInsight
    leadership: LayerInsight
    conflict: LayerInsight
    culture: LayerInsight
    stress: LayerInsight
  }
}

//--------------------------------
// HELPERS
//--------------------------------

function cleanFirstName(firstName?: string | null): string {
  const trimmed = firstName?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : "You"
}

function buildProfileLabel(
  behaviour: LayerInsight,
  leadership: LayerInsight
): string {
  const behaviourLabel = behaviour.primaryLabel
  const leadershipLabel = leadership.primaryLabel

  if (behaviourLabel && leadershipLabel) {
    return `${behaviourLabel} with ${leadershipLabel} leadership`
  }

  return behaviourLabel || leadershipLabel || "Balanced profile"
}

function buildHeaderSummary(
  behaviour: LayerInsight,
  motivators: LayerInsight
): string {
  const behaviourStatement = behaviour.statement.replace(/^[A-Z][a-z]+\s+is\s+/i, "")
  const motivatorsStatement = motivators.statement.replace(/^[A-Z][a-z]+\s+is\s+/i, "")

  const combined = `${behaviourStatement} Motivated by ${motivatorsStatement.charAt(0).toLowerCase()}${motivatorsStatement.slice(1)}`

  return truncateSentence(combined, 110)
}

function truncateSentence(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text

  const truncated = text.slice(0, maxLength).trim()
  const lastSpace = truncated.lastIndexOf(" ")

  if (lastSpace <= 0) {
    return `${truncated}…`
  }

  return `${truncated.slice(0, lastSpace)}…`
}

function enforceLayerLimits(insight: LayerInsight): LayerInsight {
  return {
    ...insight,
    statement: truncateSentence(insight.statement, 160),
    strengths: insight.strengths.slice(0, 3).map((item) => truncateSentence(item, 48)),
    watchouts: insight.watchouts.slice(0, 3).map((item) => truncateSentence(item, 48)),
  }
}

//--------------------------------
// MAIN BUILDER
//--------------------------------

export function buildIndividualDashboardProfile(
  firstName: string,
  signals: IndividualDashboardSignalsInput
): IndividualDashboardProfile {
  const safeFirstName = cleanFirstName(firstName)

  const behaviour = enforceLayerLimits(
    injectBehaviourFirstName(
      resolveBehaviourStyle(signals.behaviour.primary, signals.behaviour.secondary),
      safeFirstName
    )
  )

  const motivators = enforceLayerLimits(
    injectMotivatorsFirstName(
      resolveMotivators(signals.motivators.primary, signals.motivators.secondary),
      safeFirstName
    )
  )

  const leadership = enforceLayerLimits(
    injectLeadershipFirstName(
      resolveLeadership(signals.leadership.primary, signals.leadership.secondary),
      safeFirstName
    )
  )

  const conflict = enforceLayerLimits(
    injectConflictFirstName(
      resolveConflict(signals.conflict.primary, signals.conflict.secondary),
      safeFirstName
    )
  )

  const culture = enforceLayerLimits(
    injectCultureFirstName(
      resolveCulture(signals.culture.primary, signals.culture.secondary),
      safeFirstName
    )
  )

  const stress = enforceLayerLimits(
    injectStressFirstName(
      resolveStress(signals.stress.primary, signals.stress.secondary),
      safeFirstName
    )
  )

  const profileLabel = buildProfileLabel(behaviour, leadership)
  const summary = buildHeaderSummary(behaviour, motivators)

  return {
    header: {
      firstName: safeFirstName,
      title: `${safeFirstName}, here’s how you typically operate`,
      profileLabel,
      summary,
    },
    layers: {
      behaviour,
      motivators,
      leadership,
      conflict,
      culture,
      stress,
    },
  }
}

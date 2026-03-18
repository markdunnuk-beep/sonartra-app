import { buildIndividualDashboardProfile, type DashboardLayerKey, type IndividualDashboardProfile, type IndividualDashboardSignalsInput } from '@/lib/interpretation/buildIndividualDashboardProfile'
import type { IndividualResultLayerSummary, IndividualResultReadyData, IndividualResultSignalSummary } from '@/lib/server/individual-results'

const SIGNAL_TRANSLATIONS: Record<DashboardLayerKey, Record<string, string>> = {
  behaviour: {
    Style_Driver: 'DRIVER',
    Core_Driver: 'DRIVER',
    Contribution_Drive: 'DRIVER',
    Style_Analyst: 'ANALYST',
    Core_Analyst: 'ANALYST',
    Contribution_Analyse: 'ANALYST',
    Style_Influencer: 'INFLUENCER',
    Core_Influencer: 'INFLUENCER',
    Contribution_Connect: 'INFLUENCER',
    Style_Stabiliser: 'STABILISER',
    Core_Stabiliser: 'STABILISER',
    Contribution_Stabilise: 'STABILISER',
  },
  motivators: {
    Mot_Achievement: 'ACHIEVEMENT',
    Need_Authority: 'ACHIEVEMENT',
    Mot_Mastery: 'MASTERY',
    Need_Competence: 'MASTERY',
    Mot_Influence: 'INFLUENCE',
    Need_Influence: 'INFLUENCE',
    Mot_Stability: 'STABILITY',
    Need_Belonging: 'STABILITY',
  },
  leadership: {
    Leader_Results: 'RESULTS',
    Integrity_Driver: 'RESULTS',
    Leader_Vision: 'VISION',
    Integrity_Influencer: 'VISION',
    Leader_People: 'PEOPLE',
    Integrity_Stabiliser: 'PEOPLE',
    Leader_Process: 'PROCESS',
    Integrity_Analyst: 'PROCESS',
  },
  conflict: {
    Conflict_Compete: 'COMPETE',
    Conflict_Collaborate: 'COLLABORATE',
    Conflict_Compromise: 'COMPROMISE',
    Conflict_Avoid: 'AVOID',
    Conflict_Accommodate: 'ACCOMMODATE',
  },
  culture: {
    Culture_Market: 'PERFORMANCE',
    Culture_Hierarchy: 'CONTROL',
    Culture_Clan: 'COLLABORATION',
    Culture_Adhocracy: 'INNOVATION',
  },
  stress: {
    Stress_Control: 'CONTROL',
    Decision_Evidence: 'CONTROL',
    Stress_Criticality: 'OVERDRIVE',
    Decision_Opportunity: 'OVERDRIVE',
    Stress_Avoidance: 'WITHDRAW',
    Stress_Scatter: 'WITHDRAW',
    Decision_Stability: 'SUPPORT',
    Decision_Social: 'SUPPORT',
  },
}

const RESULT_LAYER_TO_DASHBOARD_LAYER: Record<string, DashboardLayerKey> = {
  behaviour_style: 'behaviour',
  motivators: 'motivators',
  leadership: 'leadership',
  conflict: 'conflict',
  culture: 'culture',
  risk: 'stress',
}

const FALLBACK_SIGNALS: IndividualDashboardSignalsInput = {
  behaviour: { primary: 'DRIVER', secondary: 'ANALYST' },
  motivators: { primary: 'ACHIEVEMENT', secondary: 'MASTERY' },
  leadership: { primary: 'RESULTS', secondary: 'VISION' },
  conflict: { primary: 'COLLABORATE', secondary: 'COMPROMISE' },
  culture: { primary: 'PERFORMANCE', secondary: 'COLLABORATION' },
  stress: { primary: 'CONTROL', secondary: 'SUPPORT' },
}

function getRankedSignalKeys(layer: IndividualResultLayerSummary, signals: IndividualResultSignalSummary[]): string[] {
  const preferredKeys = [layer.primarySignalKey, layer.secondarySignalKey, ...layer.rankedSignalKeys].filter(
    (value): value is string => Boolean(value),
  )

  if (preferredKeys.length > 0) {
    return [...new Set(preferredKeys)]
  }

  return signals
    .filter((signal) => signal.layerKey === layer.layerKey)
    .sort((left, right) => {
      const rankDelta = (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER)
      if (rankDelta !== 0) return rankDelta
      return right.normalisedScore - left.normalisedScore
    })
    .map((signal) => signal.signalKey)
}

function translateLayerSignals(layerKey: DashboardLayerKey, rankedSignalKeys: string[]) {
  const translated = rankedSignalKeys
    .map((signalKey) => SIGNAL_TRANSLATIONS[layerKey][signalKey])
    .filter((value): value is string => Boolean(value))

  return [...new Set(translated)]
}

function buildDashboardSignals(data: IndividualResultReadyData): IndividualDashboardSignalsInput {
  const translatedByLayer = new Map<DashboardLayerKey, string[]>()

  for (const layer of data.layers) {
    const dashboardLayerKey = RESULT_LAYER_TO_DASHBOARD_LAYER[layer.layerKey]
    if (!dashboardLayerKey) continue

    translatedByLayer.set(dashboardLayerKey, translateLayerSignals(dashboardLayerKey, getRankedSignalKeys(layer, data.signals)))
  }

  return {
    behaviour: {
      primary: translatedByLayer.get('behaviour')?.[0] ?? FALLBACK_SIGNALS.behaviour.primary,
      secondary: translatedByLayer.get('behaviour')?.[1] ?? FALLBACK_SIGNALS.behaviour.secondary,
    },
    motivators: {
      primary: translatedByLayer.get('motivators')?.[0] ?? FALLBACK_SIGNALS.motivators.primary,
      secondary: translatedByLayer.get('motivators')?.[1] ?? FALLBACK_SIGNALS.motivators.secondary,
    },
    leadership: {
      primary: translatedByLayer.get('leadership')?.[0] ?? FALLBACK_SIGNALS.leadership.primary,
      secondary: translatedByLayer.get('leadership')?.[1] ?? FALLBACK_SIGNALS.leadership.secondary,
    },
    conflict: {
      primary: translatedByLayer.get('conflict')?.[0] ?? FALLBACK_SIGNALS.conflict.primary,
      secondary: translatedByLayer.get('conflict')?.[1] ?? FALLBACK_SIGNALS.conflict.secondary,
    },
    culture: {
      primary: translatedByLayer.get('culture')?.[0] ?? FALLBACK_SIGNALS.culture.primary,
      secondary: translatedByLayer.get('culture')?.[1] ?? FALLBACK_SIGNALS.culture.secondary,
    },
    stress: {
      primary: translatedByLayer.get('stress')?.[0] ?? FALLBACK_SIGNALS.stress.primary,
      secondary: translatedByLayer.get('stress')?.[1] ?? FALLBACK_SIGNALS.stress.secondary,
    },
  }
}

export function buildLiveIndividualDashboardProfile(data: IndividualResultReadyData, firstName?: string | null): IndividualDashboardProfile {
  return buildIndividualDashboardProfile(firstName ?? '', buildDashboardSignals(data))
}

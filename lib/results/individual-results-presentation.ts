import type { ArchetypeSummary } from '@/lib/interpretation/archetypes'
import { buildLiveIndividualDashboardProfile } from '@/lib/interpretation/buildLiveIndividualDashboardProfile'
import type { LayerInsight } from '@/lib/interpretation/buildIndividualDashboardProfile'
import {
  deriveIndividualResultsIntelligence,
  type IndividualResultsIntelligenceModel,
} from '@/lib/results/individual-results-intelligence'
import { buildIndividualResultInterpretation } from '@/lib/results-interpretation'
import type { IndividualResultReadyData } from '@/lib/server/individual-results'

export type IndividualAssessmentCardModel = {
  id: string
  title: string
  versionLabel: string
  completedLabel: string
  statusLabel: string
  defaultExpanded: boolean
  summary?: string
  howToUse: {
    summary: string
    sections: string[]
  }
  archetype: {
    summary?: ArchetypeSummary
    personalSummary: string
    strengths: string[]
    watchouts: string[]
    focusAreas: string[]
  }
  domains: IndividualResultDomainSectionModel[]
  performanceImplications: {
    performsBest: string[]
    risks: string[]
    focus: string[]
  }
}

export type IndividualResultDomainBarModel = {
  label: string
  value: number
}

export type IndividualResultDomainSectionModel = {
  key: string
  title: string
  primaryProfile: string
  description: string
  strengths: string[]
  watchouts: string[]
  bars: IndividualResultDomainBarModel[]
}

export type IndividualResultsPresentationModel = {
  title: string
  subtitle: string
  intelligence: IndividualResultsIntelligenceModel
  assessments: IndividualAssessmentCardModel[]
}

type DomainKey = 'behaviour' | 'motivators' | 'leadership' | 'conflict' | 'culture' | 'stress'

type DomainConfig = {
  key: DomainKey
  title: string
  resultLayerKey: string
  categories: Array<{
    key: string
    label: string
    signalKeys: string[]
  }>
}

const DOMAIN_CONFIG: DomainConfig[] = [
  {
    key: 'behaviour',
    title: 'Behaviour Style',
    resultLayerKey: 'behaviour_style',
    categories: [
      { key: 'driver', label: 'Driver', signalKeys: ['Core_Driver', 'Style_Driver', 'Contribution_Drive'] },
      { key: 'analyst', label: 'Analyst', signalKeys: ['Core_Analyst', 'Style_Analyst', 'Contribution_Analyse'] },
      { key: 'influencer', label: 'Influencer', signalKeys: ['Core_Influencer', 'Style_Influencer', 'Contribution_Connect'] },
      { key: 'stabiliser', label: 'Stabiliser', signalKeys: ['Core_Stabiliser', 'Style_Stabiliser', 'Contribution_Stabilise'] },
    ],
  },
  {
    key: 'motivators',
    title: 'Motivators',
    resultLayerKey: 'motivators',
    categories: [
      { key: 'achievement', label: 'Achievement', signalKeys: ['Mot_Achievement', 'Need_Authority'] },
      { key: 'mastery', label: 'Mastery', signalKeys: ['Mot_Mastery', 'Need_Competence'] },
      { key: 'influence', label: 'Influence', signalKeys: ['Mot_Influence', 'Need_Influence'] },
      { key: 'stability', label: 'Stability', signalKeys: ['Mot_Stability', 'Need_Belonging'] },
    ],
  },
  {
    key: 'leadership',
    title: 'Leadership',
    resultLayerKey: 'leadership',
    categories: [
      { key: 'results', label: 'Results', signalKeys: ['Leader_Results', 'Integrity_Driver'] },
      { key: 'vision', label: 'Vision', signalKeys: ['Leader_Vision', 'Integrity_Influencer'] },
      { key: 'people', label: 'People', signalKeys: ['Leader_People', 'Integrity_Stabiliser'] },
      { key: 'process', label: 'Process', signalKeys: ['Leader_Process', 'Integrity_Analyst'] },
    ],
  },
  {
    key: 'conflict',
    title: 'Conflict',
    resultLayerKey: 'conflict',
    categories: [
      { key: 'compete', label: 'Compete', signalKeys: ['Conflict_Compete'] },
      { key: 'collaborate', label: 'Collaborate', signalKeys: ['Conflict_Collaborate'] },
      { key: 'compromise', label: 'Compromise', signalKeys: ['Conflict_Compromise'] },
      { key: 'avoid', label: 'Avoid', signalKeys: ['Conflict_Avoid'] },
      { key: 'accommodate', label: 'Accommodate', signalKeys: ['Conflict_Accommodate'] },
    ],
  },
  {
    key: 'culture',
    title: 'Culture',
    resultLayerKey: 'culture',
    categories: [
      { key: 'performance', label: 'Performance', signalKeys: ['Culture_Market'] },
      { key: 'control', label: 'Control', signalKeys: ['Culture_Hierarchy'] },
      { key: 'collaboration', label: 'Collaboration', signalKeys: ['Culture_Clan'] },
      { key: 'innovation', label: 'Innovation', signalKeys: ['Culture_Adhocracy'] },
    ],
  },
  {
    key: 'stress',
    title: 'Stress',
    resultLayerKey: 'risk',
    categories: [
      { key: 'control', label: 'Control', signalKeys: ['Stress_Control', 'Decision_Evidence'] },
      { key: 'overdrive', label: 'Overdrive', signalKeys: ['Stress_Criticality', 'Decision_Opportunity'] },
      { key: 'withdraw', label: 'Withdraw', signalKeys: ['Stress_Avoidance', 'Stress_Scatter'] },
      { key: 'support', label: 'Support', signalKeys: ['Decision_Stability', 'Decision_Social'] },
    ],
  },
]

const DEFAULT_SECTION_LABELS = DOMAIN_CONFIG.map((section) => section.title)

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable'

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function truncate(text: string, maxLength: number) {
  if (text.length <= maxLength) return text

  const shortened = text.slice(0, maxLength).trim()
  const breakIndex = shortened.lastIndexOf(' ')

  if (breakIndex <= 0) {
    return `${shortened}…`
  }

  return `${shortened.slice(0, breakIndex)}…`
}

function stripLeadingName(statement: string, firstName?: string | null) {
  if (!statement) return statement

  const safeFirstName = firstName?.trim()
  if (safeFirstName) {
    const expression = new RegExp(`^${safeFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+is\\s+`, 'i')
    if (expression.test(statement)) {
      const cleaned = statement.replace(expression, '')
      return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
    }
  }

  return statement.replace(/^You\s+are\s+/i, '').replace(/^You\s+/i, '')
}

function getSignalWeight(relativeShare: number, normalisedScore: number) {
  return relativeShare > 0 ? relativeShare : normalisedScore
}

function sortDomainBarsDescending(distribution: IndividualResultDomainBarModel[]): IndividualResultDomainBarModel[] {
  return distribution
    .map((item, index) => ({ ...item, __index: index }))
    .sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value
      return a.__index - b.__index
    })
    .map(({ __index, ...rest }) => rest)
}

function normaliseDomainBars(values: Array<{ label: string; weight: number }>): IndividualResultDomainBarModel[] {
  const totalWeight = values.reduce((sum, item) => sum + item.weight, 0)
  if (totalWeight <= 0) {
    return values.map((item) => ({ label: item.label, value: 0 }))
  }

  const rawPercentages = values.map((item, index) => {
    const rawValue = (item.weight / totalWeight) * 100
    const flooredValue = Math.floor(rawValue)
    return {
      index,
      label: item.label,
      flooredValue,
      remainder: rawValue - flooredValue,
    }
  })

  let remainingPoints = 100 - rawPercentages.reduce((sum, item) => sum + item.flooredValue, 0)
  const byRemainder = [...rawPercentages].sort((left, right) => {
    const remainderDelta = right.remainder - left.remainder
    if (remainderDelta !== 0) return remainderDelta
    return left.index - right.index
  })

  while (remainingPoints > 0) {
    const target = byRemainder[(100 - remainingPoints) % byRemainder.length]
    rawPercentages[target.index]!.flooredValue += 1
    remainingPoints -= 1
  }

  return sortDomainBarsDescending(
    rawPercentages.map((item) => ({
      label: item.label,
      value: item.flooredValue,
    })),
  )
}

function buildCanonicalDomainBars(config: DomainConfig, data: IndividualResultReadyData) {
  const domainSignals = data.signals.filter((signal) => signal.layerKey === config.resultLayerKey)
  if (domainSignals.length === 0) return []

  const categoryWeights = config.categories.map((category) => {
    const signalKeys = new Set(category.signalKeys)
    const weight = domainSignals.reduce((sum, signal) => {
      if (!signalKeys.has(signal.signalKey)) return sum
      return sum + getSignalWeight(signal.relativeShare, signal.normalisedScore)
    }, 0)

    return {
      label: category.label,
      weight,
    }
  })

  return normaliseDomainBars(categoryWeights)
}

function buildDomainSection(
  config: DomainConfig,
  insight: LayerInsight | undefined,
  data: IndividualResultReadyData,
  firstName?: string | null,
): IndividualResultDomainSectionModel {
  const bars = buildCanonicalDomainBars(config, data)

  if (!insight) {
    return {
      key: config.key,
      title: config.title,
      primaryProfile: 'Profile currently unavailable',
      description: 'This domain is not yet available in the current result snapshot.',
      strengths: ['No domain strengths are available yet.'],
      watchouts: ['No domain watchouts are available yet.'],
      bars,
    }
  }

  return {
    key: config.key,
    title: config.title,
    primaryProfile: `Primary profile: ${insight.primaryLabel}`,
    description: truncate(stripLeadingName(insight.statement, firstName), 150),
    strengths: insight.strengths.slice(0, 3),
    watchouts: insight.watchouts.slice(0, 3),
    bars,
  }
}

function buildAssessmentSummary(archetypeSummary: ArchetypeSummary | undefined, domainSections: IndividualResultDomainSectionModel[]) {
  if (archetypeSummary) {
    return archetypeSummary.secondaryLabel
      ? `${archetypeSummary.primaryLabel} with ${archetypeSummary.secondaryLabel} as the supporting pattern.`
      : `${archetypeSummary.primaryLabel} is the clearest behavioural readout in the latest result.`
  }

  return domainSections[0]
    ? `${domainSections[0].title} currently leads the readout, with the remaining domains available below.`
    : undefined
}

export function buildIndividualResultsPresentationModel(data: IndividualResultReadyData, firstName?: string | null): IndividualResultsPresentationModel {
  const dashboardProfile = buildLiveIndividualDashboardProfile(data, firstName)
  const interpretation = buildIndividualResultInterpretation(data, { firstName })
  const availableLayerKeys = new Set(data.layers.map((layer) => layer.layerKey))

  const domainSections = DOMAIN_CONFIG.map((config) => {
    const insight = availableLayerKeys.has(config.resultLayerKey) ? dashboardProfile.layers[config.key] : undefined
    return buildDomainSection(config, insight, data, firstName)
  })

  const archetypeSummary = interpretation.archetypeSummary
  const assessmentSummary = buildAssessmentSummary(archetypeSummary, domainSections)
  const completedLabel = formatDate(data.assessment.completedAt)

  const intelligence = deriveIndividualResultsIntelligence(data, {
    assessmentTitle: 'Sonartra Signals',
    assessmentSummary:
      assessmentSummary ??
      truncate(archetypeSummary?.summary ?? interpretation.performanceProfile.summary, 180),
    completedLabel,
    archetypeLabel: archetypeSummary?.primaryLabel,
    domainsAvailable: domainSections.filter((section) => section.bars.length > 0).length,
  })

  return {
    title: 'Sonartra Signals — Individual Results',
    subtitle:
      'The approved scan-first production view for reading how this person operates, what drives performance, and where practical risk appears.',
    intelligence,
    assessments: [
      {
        id: data.snapshot.resultId,
        title: 'Sonartra Signals',
        versionLabel: data.assessment.versionKey ? `Version ${data.assessment.versionKey}` : 'Version unavailable',
        completedLabel,
        statusLabel: 'Current assessment',
        defaultExpanded: false,
        summary: assessmentSummary,
        howToUse: {
          summary:
            'Use the archetype overview for the fastest read, then scan each domain for the strongest behavioural pattern, visible score distribution, and the few watchouts most likely to matter in practice.',
          sections: DEFAULT_SECTION_LABELS,
        },
        archetype: {
          summary: archetypeSummary,
          personalSummary: truncate(archetypeSummary?.summary ?? interpretation.performanceProfile.summary, 210),
          strengths: archetypeSummary?.strengths.slice(0, 3) ?? interpretation.bestFit.items.slice(0, 3),
          watchouts: archetypeSummary?.watchouts.slice(0, 3) ?? interpretation.pressureWatchouts.items.slice(0, 3),
          focusAreas: archetypeSummary?.focusAreas.slice(0, 3) ?? interpretation.leveragePoints.items.slice(0, 3),
        },
        domains: domainSections,
        performanceImplications: {
          performsBest: interpretation.bestFit.items.slice(0, 3),
          risks: interpretation.pressureWatchouts.items.slice(0, 3),
          focus: interpretation.leveragePoints.items.slice(0, 3),
        },
      },
    ],
  }
}

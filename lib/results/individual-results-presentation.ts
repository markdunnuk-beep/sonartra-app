import type { ArchetypeSummary } from '@/lib/interpretation/archetypes'
import { buildLiveIndividualDashboardProfile } from '@/lib/interpretation/buildLiveIndividualDashboardProfile'
import type { LayerInsight } from '@/lib/interpretation/buildIndividualDashboardProfile'
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
  assessments: IndividualAssessmentCardModel[]
}

type DomainKey = 'behaviour' | 'motivators' | 'leadership' | 'conflict' | 'culture' | 'stress'

type DomainConfig = {
  key: DomainKey
  title: string
  resultLayerKey: string
}

const DOMAIN_CONFIG: DomainConfig[] = [
  { key: 'behaviour', title: 'Behaviour Style', resultLayerKey: 'behaviour_style' },
  { key: 'motivators', title: 'Motivators', resultLayerKey: 'motivators' },
  { key: 'leadership', title: 'Leadership', resultLayerKey: 'leadership' },
  { key: 'conflict', title: 'Conflict', resultLayerKey: 'conflict' },
  { key: 'culture', title: 'Culture', resultLayerKey: 'culture' },
  { key: 'stress', title: 'Stress', resultLayerKey: 'risk' },
]

const SIGNAL_LABELS: Record<string, string> = {
  Core_Driver: 'Driver',
  Style_Driver: 'Driver',
  Contribution_Drive: 'Driver',
  Core_Analyst: 'Analyst',
  Style_Analyst: 'Analyst',
  Contribution_Analyse: 'Analyst',
  Core_Influencer: 'Influencer',
  Style_Influencer: 'Influencer',
  Contribution_Connect: 'Influencer',
  Core_Stabiliser: 'Stabiliser',
  Style_Stabiliser: 'Stabiliser',
  Contribution_Stabilise: 'Stabiliser',
  Mot_Achievement: 'Achievement',
  Need_Authority: 'Authority',
  Mot_Mastery: 'Mastery',
  Need_Competence: 'Competence',
  Mot_Influence: 'Influence',
  Need_Influence: 'Influence',
  Mot_Stability: 'Stability',
  Need_Belonging: 'Belonging',
  Leader_Results: 'Results',
  Integrity_Driver: 'Results',
  Leader_Vision: 'Vision',
  Integrity_Influencer: 'Vision',
  Leader_People: 'People',
  Integrity_Stabiliser: 'People',
  Leader_Process: 'Process',
  Integrity_Analyst: 'Process',
  Conflict_Compete: 'Compete',
  Conflict_Collaborate: 'Collaborate',
  Conflict_Compromise: 'Compromise',
  Conflict_Avoid: 'Avoid',
  Conflict_Accommodate: 'Accommodate',
  Culture_Market: 'Performance',
  Culture_Hierarchy: 'Control',
  Culture_Clan: 'Collaboration',
  Culture_Adhocracy: 'Innovation',
  Stress_Control: 'Control',
  Stress_Criticality: 'Criticality',
  Stress_Scatter: 'Scatter',
  Stress_Avoidance: 'Avoidance',
  Decision_Opportunity: 'Opportunity',
  Decision_Evidence: 'Evidence',
  Decision_Social: 'Social',
  Decision_Stability: 'Stability',
}

const DEFAULT_SECTION_LABELS = DOMAIN_CONFIG.map((section) => section.title)

function formatDate(value: string | null) {
  if (!value) return 'Date unavailable'

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
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

function getBarValue(relativeShare: number, normalisedScore: number) {
  const candidate = relativeShare > 0 ? relativeShare * 100 : normalisedScore * 100
  return Math.max(0, Math.min(100, Math.round(candidate)))
}

function buildDomainSection(
  config: DomainConfig,
  insight: LayerInsight | undefined,
  data: IndividualResultReadyData,
  firstName?: string | null,
): IndividualResultDomainSectionModel {
  const bars = data.signals
    .filter((signal) => signal.layerKey === config.resultLayerKey)
    .sort((left, right) => {
      const rankDelta = (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER)
      if (rankDelta !== 0) return rankDelta
      return right.normalisedScore - left.normalisedScore
    })
    .map((signal) => ({
      label: SIGNAL_LABELS[signal.signalKey] ?? titleCase(signal.signalKey),
      value: getBarValue(signal.relativeShare, signal.normalisedScore),
    }))

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

  return {
    title: 'Sonartra Signals — Individual Results',
    subtitle:
      'The approved scan-first production view for reading how this person operates, what drives performance, and where practical risk appears.',
    assessments: [
      {
        id: data.snapshot.resultId,
        title: 'Sonartra Signals',
        versionLabel: data.assessment.versionKey ? `Version ${data.assessment.versionKey}` : 'Version unavailable',
        completedLabel: formatDate(data.assessment.completedAt),
        statusLabel: 'Current assessment',
        defaultExpanded: true,
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

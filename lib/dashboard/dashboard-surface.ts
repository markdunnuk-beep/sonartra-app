import { type LifecyclePresentation } from '@/lib/lifecycle-presentation'
import { type IndividualIntelligenceResultContract } from '@/lib/server/individual-intelligence-result'

interface DashboardSignalMeta {
  label: string
  summary: string
}

export interface DashboardActionItem {
  title: string
  description: string
  href?: string
  disabled?: boolean
  status: 'available' | 'in_progress' | 'locked' | 'coming_soon'
}

export interface DashboardKeySignalTile {
  category: string
  signal: string
  summary: string
}

export interface DashboardCoverageItem {
  title: string
  stateLabel: string
  detail: string
  tone: 'active' | 'coming_soon' | 'locked'
}

const LAYER_LABELS: Record<string, string> = {
  behaviour_style: 'Behaviour Style',
  motivators: 'Motivator',
  leadership: 'Leadership',
  conflict: 'Conflict',
  culture: 'Culture',
}

const SIGNAL_META: Record<string, DashboardSignalMeta> = {
  Core_Driver: { label: 'Driver', summary: 'Pushes for pace, decisions, and measurable outcomes.' },
  Style_Driver: { label: 'Driver', summary: 'Pushes for pace, decisions, and measurable outcomes.' },
  Contribution_Drive: { label: 'Driver', summary: 'Pushes for pace, decisions, and measurable outcomes.' },
  Core_Analyst: { label: 'Analyst', summary: 'Prefers structured, evidence-led decisions.' },
  Style_Analyst: { label: 'Analyst', summary: 'Prefers structured, evidence-led decisions.' },
  Contribution_Analyse: { label: 'Analyst', summary: 'Prefers structured, evidence-led decisions.' },
  Core_Influencer: { label: 'Influencer', summary: 'Uses communication and momentum to move work forward.' },
  Style_Influencer: { label: 'Influencer', summary: 'Uses communication and momentum to move work forward.' },
  Contribution_Connect: { label: 'Influencer', summary: 'Uses communication and momentum to move work forward.' },
  Core_Stabiliser: { label: 'Stabiliser', summary: 'Optimises for consistency, reliability, and steady execution.' },
  Style_Stabiliser: { label: 'Stabiliser', summary: 'Optimises for consistency, reliability, and steady execution.' },
  Contribution_Stabilise: { label: 'Stabiliser', summary: 'Optimises for consistency, reliability, and steady execution.' },
  Mot_Achievement: { label: 'Achievement', summary: 'Energised by stretch targets, progress, and visible wins.' },
  Need_Authority: { label: 'Achievement', summary: 'Energised by stretch targets, progress, and visible wins.' },
  Mot_Mastery: { label: 'Mastery', summary: 'Motivated by depth, quality, and capability growth.' },
  Need_Competence: { label: 'Mastery', summary: 'Motivated by depth, quality, and capability growth.' },
  Mot_Influence: { label: 'Influence', summary: 'Motivated by scope and impact.' },
  Need_Influence: { label: 'Influence', summary: 'Motivated by scope and impact.' },
  Mot_Stability: { label: 'Stability', summary: 'Prefers predictability, role clarity, and steady cadence.' },
  Need_Belonging: { label: 'Stability', summary: 'Prefers predictability, role clarity, and steady cadence.' },
  Leader_Results: { label: 'Results', summary: 'Leads through pace, accountability, and delivery focus.' },
  Integrity_Driver: { label: 'Results', summary: 'Leads through pace, accountability, and delivery focus.' },
  Leader_Vision: { label: 'Vision', summary: 'Focuses on direction and future outcomes.' },
  Integrity_Influencer: { label: 'Vision', summary: 'Focuses on direction and future outcomes.' },
  Leader_People: { label: 'People', summary: 'Builds cohesion, support, and capability across the team.' },
  Integrity_Stabiliser: { label: 'People', summary: 'Builds cohesion, support, and capability across the team.' },
  Leader_Process: { label: 'Process', summary: 'Uses standards, structure, and repeatable execution.' },
  Integrity_Analyst: { label: 'Process', summary: 'Uses standards, structure, and repeatable execution.' },
  Conflict_Compete: { label: 'Compete', summary: 'Takes a firm position and pushes toward closure.' },
  Conflict_Collaborate: { label: 'Collaborate', summary: 'Seeks shared resolution and cross-party alignment.' },
  Conflict_Compromise: { label: 'Compromise', summary: 'Prefers pragmatic middle-ground decisions.' },
  Conflict_Avoid: { label: 'Avoid', summary: 'Avoids direct confrontation and reduces friction.' },
  Conflict_Accommodate: { label: 'Accommodate', summary: 'Protects relationships by yielding where needed.' },
  Culture_Market: { label: 'Performance', summary: 'Aligns with targets, competitiveness, and external pressure.' },
  Culture_Hierarchy: { label: 'Control', summary: 'Prefers structure, clarity, and disciplined execution.' },
  Culture_Clan: { label: 'Collaboration', summary: 'Values cohesion, trust, and internal alignment.' },
  Culture_Adhocracy: { label: 'Innovation', summary: 'Aligns with experimentation, initiative, and change.' },
}

function titleCase(value: string) {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function resolveSignalMeta(signalKey: string): DashboardSignalMeta {
  return SIGNAL_META[signalKey] ?? { label: titleCase(signalKey), summary: 'Primary signal in the latest available result snapshot.' }
}

export function buildDashboardKeySignalTiles(result: IndividualIntelligenceResultContract): DashboardKeySignalTile[] {
  const preferredLayers = ['behaviour_style', 'motivators', 'leadership', 'conflict']

  return preferredLayers.flatMap((layerKey) => {
    const layer = result.layerSummaries.find((candidate) => candidate.layerKey === layerKey)
    if (!layer?.topSignalKey) return []

    const meta = resolveSignalMeta(layer.topSignalKey)
    return [
      {
        category: LAYER_LABELS[layerKey] ?? titleCase(layerKey),
        signal: meta.label,
        summary: meta.summary,
      },
    ]
  })
}

export function buildDashboardNextActions(
  status: 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error',
  presentation: LifecyclePresentation,
  hasCompletedResult: boolean,
): DashboardActionItem[] {
  const actions: DashboardActionItem[] = []

  if (presentation.dashboardActionLabel && presentation.dashboardActionHref) {
    actions.push({
      title: presentation.dashboardActionLabel,
      description: hasCompletedResult
        ? 'Review your latest signal profile.'
        : presentation.dashboardDetailBody,
      href: presentation.dashboardActionHref,
      status: hasCompletedResult ? 'available' : status === 'in_progress' ? 'in_progress' : 'available',
    })
  }

  if (hasCompletedResult) {
    actions.push(
      {
        title: 'Review Leadership',
        description: 'Understand your leadership orientation.',
        href: '/results/individual',
        status: 'available',
      },
      {
        title: 'Review Behaviour',
        description: 'Revisit your behavioural style.',
        href: '/results/individual',
        status: 'available',
      },
    )
  } else if (status === 'completed_processing') {
    actions.push({
      title: 'Results processing',
      description: 'The completed assessment is being processed into a result snapshot.',
      disabled: true,
      status: 'in_progress',
    })
  } else if (status === 'error') {
    actions.push({
      title: 'Result check required',
      description: 'Retry from the dashboard once result access is restored.',
      disabled: true,
      status: 'locked',
    })
  } else {
    actions.push({
      title: 'Results unlock after completion',
      description: 'Complete the assessment to enable the individual intelligence workspace.',
      disabled: true,
      status: 'locked',
    })
  }

  actions.push(
    {
      title: 'Share Profile',
      description: 'Export and sharing not yet available.',
      disabled: true,
      status: 'coming_soon',
    },
    {
      title: 'Team intelligence',
      description: 'Team-level analysis is not yet enabled in this workspace.',
      disabled: true,
      status: 'locked',
    },
  )

  return actions.slice(0, 4)
}

export function buildDashboardCoverage(hasCompletedResult: boolean, status: 'not_started' | 'in_progress' | 'completed_processing' | 'ready' | 'error'): DashboardCoverageItem[] {
  return [
    {
      title: 'Individual Intelligence',
      stateLabel: hasCompletedResult ? 'Active' : status === 'completed_processing' ? 'Coming soon' : 'Locked',
      detail: hasCompletedResult
        ? 'Individual intelligence is active.'
        : status === 'completed_processing'
          ? 'Individual intelligence not yet enabled.'
          : status === 'error'
            ? 'Individual intelligence not yet available.'
            : 'Individual intelligence not yet enabled.',
      tone: hasCompletedResult ? 'active' : status === 'completed_processing' ? 'coming_soon' : 'locked',
    },
    {
      title: 'Team Intelligence',
      stateLabel: 'Coming soon',
      detail: 'Team intelligence not yet enabled.',
      tone: 'coming_soon',
    },
    {
      title: 'Organisation Intelligence',
      stateLabel: 'Locked',
      detail: 'Organisation intelligence not yet available.',
      tone: 'locked',
    },
  ]
}

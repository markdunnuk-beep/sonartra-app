import type {
  AssessmentRecommendationKind,
  AssessmentRepositoryAction,
  AssessmentRepositoryItem,
} from '@/lib/assessment/assessment-repository-types'
import { getAssessmentRepositoryInventory, sortAssessments } from '@/lib/assessment/assessment-repository-selectors'
import type { IndividualResultReadyData } from '@/lib/server/individual-results'

const BASELINE_RESULTS_ROUTE = '/results/individual'
const BASELINE_ASSESSMENT_ID = 'signals'

type FollowOnRule = {
  assessmentId: string
  layerKey: string
  focusLabel: string
  titlePrefix: string
  rationale: string
}

const FOLLOW_ON_RULES: FollowOnRule[] = [
  {
    assessmentId: 'leadership-effectiveness',
    layerKey: 'leadership',
    focusLabel: 'Leadership execution',
    titlePrefix: 'Deepen leadership execution',
    rationale: 'Leadership signal weight is strongest in the current result, so the next highest-value step is a focused read on execution, delegation, and follow-through.',
  },
  {
    assessmentId: 'burnout-risk',
    layerKey: 'risk',
    focusLabel: 'Pressure and recovery risk',
    titlePrefix: 'Check pressure exposure',
    rationale: 'Stress and decision-pressure signals are prominent enough to justify a tighter follow-on read before they become an operating drag.',
  },
  {
    assessmentId: 'conflict-style',
    layerKey: 'conflict',
    focusLabel: 'Conflict response',
    titlePrefix: 'Clarify conflict response',
    rationale: 'Conflict patterns are sufficiently visible in the current result to warrant a more specific diagnostic on escalation, negotiation, and resolution behaviour.',
  },
]

export type IndividualResultsIntelligenceActionModel = {
  kind: AssessmentRecommendationKind | 'none'
  label: string
  title: string
  rationale: string
  cta?: AssessmentRepositoryAction
  metadata: string[]
}

export type IndividualResultsIntelligenceModel = {
  eyebrow: string
  summaryHeadline: string
  summaryOverview: string
  priorityLabel: string
  priorityDetail: string
  unlocksLabel?: string
  unlocksDetail?: string
  metadata: string[]
  action: IndividualResultsIntelligenceActionModel
}

export type IndividualResultsIntelligenceSeed = {
  assessmentTitle: string
  assessmentSummary?: string
  completedLabel: string
  archetypeLabel?: string
  domainsAvailable: number
}

function isLaunchable(item: AssessmentRepositoryItem): boolean {
  return item.status === 'not_started' && Boolean(item.assessmentHref)
}

function isResumable(item: AssessmentRepositoryItem): boolean {
  return item.status === 'in_progress' && Boolean(item.assessmentHref)
}

function buildActionMetadata(item: AssessmentRepositoryItem): string[] {
  const metadata = [item.category === 'team' ? 'Team diagnostic' : 'Individual diagnostic']

  if (item.status === 'in_progress' && typeof item.progressPercent === 'number') {
    metadata.push(`${item.progressPercent}% complete`)
  } else {
    metadata.push(`${item.estimatedMinutes} min`)
  }

  metadata.push(item.title)
  return metadata
}

function findCurrentResultItem(items: AssessmentRepositoryItem[]): AssessmentRepositoryItem | undefined {
  return (
    items.find((item) => item.resultsHref === BASELINE_RESULTS_ROUTE && item.resultsAvailable) ??
    items.find((item) => item.id === BASELINE_ASSESSMENT_ID)
  )
}

function getLayerScore(data: IndividualResultReadyData, layerKey: string): number {
  return data.layers.find((layer) => layer.layerKey === layerKey)?.totalRawValue ?? 0
}

function getTopFollowOnCandidate(items: AssessmentRepositoryItem[], data: IndividualResultReadyData): {
  item: AssessmentRepositoryItem
  rule: FollowOnRule
} | null {
  const candidates = FOLLOW_ON_RULES
    .map((rule, index) => {
      const item = items.find((entry) => entry.id === rule.assessmentId)
      if (!item || !isLaunchable(item)) return null

      return {
        index,
        item,
        rule,
        score: getLayerScore(data, rule.layerKey),
      }
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score
      return left.index - right.index
    })

  const topCandidate = candidates[0]
  if (!topCandidate) return null

  return { item: topCandidate.item, rule: topCandidate.rule }
}

function buildNextAction(
  data: IndividualResultReadyData,
  items: AssessmentRepositoryItem[],
  currentItem: AssessmentRepositoryItem | undefined,
): IndividualResultsIntelligenceActionModel {
  const orderedItems = sortAssessments(items.filter((item) => item.status !== 'coming_soon'))
  const resumableItem = orderedItems.find((item) => item.id !== currentItem?.id && isResumable(item))

  if (resumableItem) {
    return {
      kind: 'resume_in_progress',
      label: 'Next action',
      title: `Resume ${resumableItem.title}`,
      rationale: 'Another diagnostic is already in progress. Resume the active run first so the current result can feed a complete follow-on read instead of fragmenting the sequence.',
      cta: { label: 'Resume Assessment', href: resumableItem.assessmentHref, action: 'resume' },
      metadata: buildActionMetadata(resumableItem),
    }
  }

  if (currentItem?.id === BASELINE_ASSESSMENT_ID) {
    const followOnCandidate = getTopFollowOnCandidate(orderedItems, data)
    if (followOnCandidate) {
      return {
        kind: 'launch_individual_follow_up',
        label: 'Next action',
        title: `${followOnCandidate.rule.titlePrefix} with ${followOnCandidate.item.title}`,
        rationale: followOnCandidate.rule.rationale,
        cta: { label: 'Start Assessment', href: followOnCandidate.item.assessmentHref, action: 'launch' },
        metadata: [...buildActionMetadata(followOnCandidate.item), followOnCandidate.rule.focusLabel],
      }
    }

    const teamCandidate = orderedItems.find((item) => item.category === 'team' && isLaunchable(item))
    if (teamCandidate) {
      return {
        kind: 'launch_team_follow_up',
        label: 'Next action',
        title: `Extend this baseline into ${teamCandidate.title}`,
        rationale: 'The individual baseline is complete, so the strongest live follow-on is to expand from personal signal context into a shared team operating read.',
        cta: { label: 'Launch Assessment', href: teamCandidate.assessmentHref, action: 'launch' },
        metadata: buildActionMetadata(teamCandidate),
      }
    }
  }

  const genericLaunch = orderedItems.find((item) => item.id !== currentItem?.id && isLaunchable(item))
  if (genericLaunch) {
    return {
      kind: genericLaunch.category === 'team' ? 'launch_team_follow_up' : 'launch_individual_follow_up',
      label: 'Next action',
      title: `Start ${genericLaunch.title}`,
      rationale: 'A live follow-on diagnostic is available if you want to extend this result into the next layer of analysis.',
      cta: { label: genericLaunch.category === 'team' ? 'Launch Assessment' : 'Start Assessment', href: genericLaunch.assessmentHref, action: 'launch' },
      metadata: buildActionMetadata(genericLaunch),
    }
  }

  return {
    kind: 'none',
    label: 'Next action',
    title: 'No further live follow-on is available right now',
    rationale: 'Use the detailed result sections below as the current reference point. Additional diagnostics can be sequenced once another launchable instrument becomes available.',
    metadata: [],
  }
}

export function deriveIndividualResultsIntelligence(
  data: IndividualResultReadyData,
  seed: IndividualResultsIntelligenceSeed,
  inventory: AssessmentRepositoryItem[] = getAssessmentRepositoryInventory(),
): IndividualResultsIntelligenceModel {
  const currentItem = findCurrentResultItem(inventory)
  const action = buildNextAction(data, inventory, currentItem)
  const safeSummary =
    seed.assessmentSummary?.trim() ??
    'A completed result is now available as the current operating reference point for this individual.'
  const currentTitle = currentItem?.title ?? seed.assessmentTitle
  const isBaselineResult = currentItem?.id === BASELINE_ASSESSMENT_ID || seed.assessmentTitle === 'Sonartra Signals'

  const summaryHeadline = isBaselineResult ? 'Baseline profile completed and ready to use' : `${currentTitle} completed and ready for review`

  const priorityDetail =
    action.kind === 'resume_in_progress'
      ? 'An active follow-on assessment already exists, so preserving continuity outranks opening a new path from this result.'
      : action.kind === 'launch_team_follow_up'
        ? 'The current result is strong enough to act as an individual reference point for broader team-level analysis.'
        : action.kind === 'launch_individual_follow_up'
          ? 'The current result exposes a clear area where a narrower diagnostic can add depth without reopening the full baseline.'
          : 'The result itself is the primary working asset for now.'

  const unlocksDetail =
    isBaselineResult
      ? 'This baseline can now be used to sequence deeper individual diagnostics or frame later team-level analysis from an established reference profile.'
      : seed.domainsAvailable > 0
        ? 'This completed result adds another interpreted reference point that can be used in later comparison, retake, or team review flows.'
        : undefined

  const metadata = [`Completed ${seed.completedLabel}`, `${seed.domainsAvailable} interpreted domains`]
  if (seed.archetypeLabel) {
    metadata.push(`Primary archetype: ${seed.archetypeLabel}`)
  }

  return {
    eyebrow: 'Results intelligence',
    summaryHeadline,
    summaryOverview: safeSummary,
    priorityLabel: 'What matters now',
    priorityDetail,
    unlocksLabel: unlocksDetail ? 'What this unlocks' : undefined,
    unlocksDetail,
    metadata,
    action,
  }
}

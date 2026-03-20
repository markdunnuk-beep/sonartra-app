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
    rationale: 'Leadership signal is strongest, so the clearest next step is a focused read on execution, delegation, and follow-through.',
  },
  {
    assessmentId: 'burnout-risk',
    layerKey: 'risk',
    focusLabel: 'Pressure and recovery risk',
    titlePrefix: 'Check pressure exposure',
    rationale: 'Pressure and decision-friction signals are elevated, so a tighter read is warranted before they become an operating drag.',
  },
  {
    assessmentId: 'conflict-style',
    layerKey: 'conflict',
    focusLabel: 'Conflict response',
    titlePrefix: 'Clarify conflict response',
    rationale: 'Conflict patterns are clear enough to justify a narrower diagnostic on escalation, negotiation, and resolution behaviour.',
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
      rationale: 'Another diagnostic is already live. Resume it first to keep the sequence intact.',
      cta: { label: 'Resume diagnostic', href: resumableItem.assessmentHref, action: 'resume' },
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
        cta: { label: 'Start diagnostic', href: followOnCandidate.item.assessmentHref, action: 'launch' },
        metadata: [...buildActionMetadata(followOnCandidate.item), followOnCandidate.rule.focusLabel],
      }
    }

    const teamCandidate = orderedItems.find((item) => item.category === 'team' && isLaunchable(item))
    if (teamCandidate) {
      return {
        kind: 'launch_team_follow_up',
        label: 'Next action',
        title: `Extend this baseline into ${teamCandidate.title}`,
        rationale: 'The baseline is established, so the strongest live next step is a team operating read.',
        cta: { label: 'Open team diagnostic', href: teamCandidate.assessmentHref, action: 'launch' },
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
      rationale: 'A live follow-on diagnostic is available if you want to extend this result into the next layer.',
      cta: { label: genericLaunch.category === 'team' ? 'Open team diagnostic' : 'Start diagnostic', href: genericLaunch.assessmentHref, action: 'launch' },
      metadata: buildActionMetadata(genericLaunch),
    }
  }

  return {
    kind: 'none',
    label: 'Next action',
    title: 'No further live follow-on is available right now',
    rationale: 'Use the detailed sections below as the working reference. Add another diagnostic when a live option is available.',
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
    'A completed result is now available as the current operating reference for this individual.'
  const currentTitle = currentItem?.title ?? seed.assessmentTitle
  const isBaselineResult = currentItem?.id === BASELINE_ASSESSMENT_ID || seed.assessmentTitle === 'Sonartra Signals'

  const summaryHeadline = isBaselineResult ? 'Baseline ready' : `${currentTitle} ready for review`

  const priorityDetail =
    action.kind === 'resume_in_progress'
      ? 'An active follow-on already exists, so continuity matters more than opening a new path.'
      : action.kind === 'launch_team_follow_up'
        ? 'This result is strong enough to anchor a broader team read.'
        : action.kind === 'launch_individual_follow_up'
          ? 'This result points to a clear area where a narrower diagnostic can add depth.'
          : 'The result itself is the main working reference for now.'

  const unlocksDetail =
    isBaselineResult
      ? 'This baseline can now guide deeper individual diagnostics or frame later team analysis.'
      : seed.domainsAvailable > 0
        ? 'This completed result adds another reference point for later comparison, retakes, or team review.'
        : undefined

  const metadata = [`Completed ${seed.completedLabel}`, `${seed.domainsAvailable} interpreted domains`]
  if (seed.archetypeLabel) {
    metadata.push(`Primary archetype: ${seed.archetypeLabel}`)
  }

  return {
    eyebrow: 'Results overview',
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

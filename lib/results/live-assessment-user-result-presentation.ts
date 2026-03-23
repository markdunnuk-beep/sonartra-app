import type { LiveAssessmentUserResultContract } from '@/lib/server/live-assessment-user-result'

export interface UserFacingAssessmentResultViewModel {
  title: string
  versionLabel: string | null
  completedLabel: string | null
  statusLabel: string
  summary: string
  cards: Array<{
    id: string
    title: string
    label: string
    value: string
    band: string | null
    descriptor: string | null
    explanation: string | null
    tone: 'default' | 'warning' | 'limited'
  }>
  notices: Array<{
    id: string
    title: string
    message: string
    tone: 'info' | 'warning' | 'error'
  }>
}

function formatDate(value: string | null): string | null {
  if (!value) return null

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatValue(card: LiveAssessmentUserResultContract['summaryCards'][number]): string {
  if (typeof card.score === 'number') {
    return Number.isInteger(card.score) ? String(card.score) : card.score.toFixed(2)
  }

  if (typeof card.percentile === 'number') {
    return `${Math.round(card.percentile)}th percentile`
  }

  if (card.descriptor) return card.descriptor
  if (card.band) return card.band
  return 'Available'
}

export function buildUserFacingAssessmentResultViewModel(
  result: LiveAssessmentUserResultContract,
): UserFacingAssessmentResultViewModel {
  return {
    title: result.assessmentMeta.title,
    versionLabel: result.assessmentMeta.versionKey ? `Version ${result.assessmentMeta.versionKey}` : null,
    completedLabel: formatDate(result.resultMeta.completedAt),
    statusLabel: result.status === 'completed' ? 'Results ready' : 'Results unavailable',
    summary: result.statusMessage,
    cards: result.summaryCards.map((card) => ({
      id: card.id,
      title: card.title,
      label: card.label,
      value: formatValue(card),
      band: card.band,
      descriptor: card.descriptor,
      explanation: card.explanation,
      tone: card.status === 'limited' ? 'limited' : card.status === 'warning' ? 'warning' : 'default',
    })),
    notices: result.notices.map((notice) => ({
      id: notice.id,
      title: notice.title,
      message: notice.message,
      tone: notice.severity,
    })),
  }
}

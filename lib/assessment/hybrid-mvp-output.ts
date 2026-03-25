import type {
  HybridMvpAssessmentDefinition,
  HybridMvpDomainVector,
  HybridMvpRankedSignal,
  HybridMvpReportBlock,
  HybridMvpReportSection,
  HybridMvpReportSummary,
} from '@/lib/assessment/hybrid-mvp-scoring'

export type HybridNarrativeBucket = 'high' | 'balanced' | 'low'

export interface HybridMvpOutputSelectionTrace {
  outputId: string
  sectionKey: string
  sourceType: 'signal' | 'domain' | 'overview' | 'fallback'
  sourceId: string
  bucket?: HybridNarrativeBucket
  rank?: number
  normalizedScore?: number
  reason: string
  templateRef: string
}

export interface HybridMvpOutputReport {
  summary: HybridMvpReportSummary
  sections: HybridMvpReportSection[]
  trace: HybridMvpOutputSelectionTrace[]
}

interface HybridMvpOutputInput {
  definition: HybridMvpAssessmentDefinition
  scored: {
    assessmentId: string
    assessmentKey: string
    rankedSignals: HybridMvpRankedSignal[]
    aggregationVectors: {
      global: HybridMvpDomainVector
      byDomain: HybridMvpDomainVector[]
    }
  }
}

const TOP_SIGNAL_LIMIT = 2
const BOTTOM_SIGNAL_LIMIT = 2

function resolveBucket(normalizedScore: number): HybridNarrativeBucket {
  if (normalizedScore >= 0.67) return 'high'
  if (normalizedScore <= 0.33) return 'low'
  return 'balanced'
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}

function renderTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, tokenKey: string) => {
    const token = tokens[tokenKey]
    return typeof token === 'string' ? token : ''
  })
}

function resolveTemplateString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function defaultSignalNarrative(input: {
  signalLabel: string
  bucket: HybridNarrativeBucket
  normalizedScore: number
}): string {
  const scorePercent = formatPercent(input.normalizedScore)

  if (input.bucket === 'high') {
    return `${input.signalLabel} is currently a leading strength (${scorePercent} share in its domain).`
  }
  if (input.bucket === 'low') {
    return `${input.signalLabel} is currently less expressed (${scorePercent} share in its domain) and may need focused reinforcement.`
  }

  return `${input.signalLabel} is balanced (${scorePercent} share in its domain), showing situational flexibility.`
}

function resolveSignalNarrative(input: {
  definition: HybridMvpAssessmentDefinition
  signalId: string
  signalLabel: string
  bucket: HybridNarrativeBucket
  normalizedScore: number
  rank: number
}): { text: string; templateRef: string } {
  const templateSet = input.definition.outputTemplates?.signalNarratives?.[input.signalId]
  const selectedTemplate = resolveTemplateString(templateSet?.[input.bucket] ?? templateSet?.default)

  const tokens = {
    signalLabel: input.signalLabel,
    bucket: input.bucket,
    normalizedPercent: formatPercent(input.normalizedScore),
    rank: String(input.rank),
  }

  if (selectedTemplate !== null) {
    return {
      text: renderTemplate(selectedTemplate, tokens),
      templateRef: `signal:${input.signalId}:${templateSet?.[input.bucket] ? input.bucket : 'default'}`,
    }
  }

  return {
    text: defaultSignalNarrative({ signalLabel: input.signalLabel, bucket: input.bucket, normalizedScore: input.normalizedScore }),
    templateRef: `default:signal:${input.bucket}`,
  }
}

function resolveOverviewNarrative(input: {
  definition: HybridMvpAssessmentDefinition
  topSignal: HybridMvpRankedSignal | null
  topSignalLabel: string | null
  topBucket: HybridNarrativeBucket | null
}): { text: string; templateRef: string } {
  const templateSet = input.definition.outputTemplates?.overview

  if (templateSet && input.topBucket) {
    const key = input.topBucket === 'high' ? 'highPerformer' : input.topBucket === 'low' ? 'developingProfile' : 'balancedProfile'
    const selectedTemplate = resolveTemplateString(templateSet[key] ?? templateSet.default)
    if (selectedTemplate !== null) {
      return {
        text: renderTemplate(selectedTemplate, {
          assessmentLabel: input.definition.assessmentKey,
          topSignalLabel: input.topSignalLabel ?? 'your profile',
          topSignalScorePercent: input.topSignal ? formatPercent(input.topSignal.normalizedScore) : '0%',
        }),
        templateRef: `overview:${key}`,
      }
    }
  }

  if (!input.topSignal || !input.topSignalLabel || !input.topBucket) {
    return {
      text: 'Your response pattern has been scored successfully. Additional interpretation will appear as more signal detail becomes available.',
      templateRef: 'default:overview:insufficient',
    }
  }

  return {
    text: `Your strongest signal is ${input.topSignalLabel}, currently in the ${input.topBucket} expression range at ${formatPercent(input.topSignal.normalizedScore)}.`,
    templateRef: 'default:overview:top-signal',
  }
}

export function buildHybridMvpTemplatedReport(input: HybridMvpOutputInput): HybridMvpOutputReport {
  const signalById = input.definition.signals.reduce<Record<string, { label: string; domainId: string | null }>>((acc, signal) => {
    acc[signal.id] = { label: signal.label, domainId: signal.domainId ?? null }
    return acc
  }, {})

  const domainById = input.definition.domains.reduce<Record<string, { label: string }>>((acc, domain) => {
    acc[domain.id] = { label: domain.label }
    return acc
  }, {})

  const topSignals = input.scored.rankedSignals.slice(0, TOP_SIGNAL_LIMIT)
  const bottomSignals = [...input.scored.rankedSignals].reverse().slice(0, BOTTOM_SIGNAL_LIMIT)
  const topSignal = topSignals[0] ?? null
  const topSignalMeta = topSignal ? signalById[topSignal.signalId] : null
  const topBucket = topSignal ? resolveBucket(topSignal.normalizedScore) : null

  const summaryNarrative = resolveOverviewNarrative({
    definition: input.definition,
    topSignal,
    topSignalLabel: topSignalMeta?.label ?? null,
    topBucket,
  })

  const trace: HybridMvpOutputSelectionTrace[] = []

  const overviewBlocks: HybridMvpReportBlock[] = [
    {
      id: 'overview:summary',
      kind: 'narrative',
      title: 'Profile overview',
      body: summaryNarrative.text,
      meta: {
        sourceType: 'overview',
        sourceId: input.definition.assessmentId,
        templateRef: summaryNarrative.templateRef,
      },
    },
  ]

  trace.push({
    outputId: 'overview:summary',
    sectionKey: 'overview',
    sourceType: 'overview',
    sourceId: input.definition.assessmentId,
    reason: 'fixed overview section for every report',
    templateRef: summaryNarrative.templateRef,
    rank: topSignal?.rank,
    normalizedScore: topSignal?.normalizedScore,
    bucket: topBucket ?? undefined,
  })

  const strengthBlocks: HybridMvpReportBlock[] = topSignals.map((signal) => {
    const meta = signalById[signal.signalId]
    const bucket = resolveBucket(signal.normalizedScore)
    const narrative = resolveSignalNarrative({
      definition: input.definition,
      signalId: signal.signalId,
      signalLabel: meta?.label ?? signal.signalKey,
      bucket,
      normalizedScore: signal.normalizedScore,
      rank: signal.rank,
    })
    const id = `strength:${signal.signalId}:${bucket}`

    trace.push({
      outputId: id,
      sectionKey: 'strengths',
      sourceType: 'signal',
      sourceId: signal.signalId,
      reason: `selected from top ${TOP_SIGNAL_LIMIT} ranked signals`,
      templateRef: narrative.templateRef,
      bucket,
      rank: signal.rank,
      normalizedScore: signal.normalizedScore,
    })

    return {
      id,
      kind: 'signal',
      title: meta?.label ?? signal.signalKey,
      body: narrative.text,
      value: formatPercent(signal.normalizedScore),
      meta: {
        sourceType: 'signal',
        sourceId: signal.signalId,
        bucket,
        rank: signal.rank,
        templateRef: narrative.templateRef,
      },
    }
  })

  const watchoutBlocks: HybridMvpReportBlock[] = bottomSignals.map((signal) => {
    const meta = signalById[signal.signalId]
    const bucket = resolveBucket(signal.normalizedScore)
    const narrative = resolveSignalNarrative({
      definition: input.definition,
      signalId: signal.signalId,
      signalLabel: meta?.label ?? signal.signalKey,
      bucket,
      normalizedScore: signal.normalizedScore,
      rank: signal.rank,
    })
    const id = `watchout:${signal.signalId}:${bucket}`

    trace.push({
      outputId: id,
      sectionKey: 'watchouts',
      sourceType: 'signal',
      sourceId: signal.signalId,
      reason: `selected from bottom ${BOTTOM_SIGNAL_LIMIT} ranked signals`,
      templateRef: narrative.templateRef,
      bucket,
      rank: signal.rank,
      normalizedScore: signal.normalizedScore,
    })

    return {
      id,
      kind: 'watchout',
      title: meta?.label ?? signal.signalKey,
      body: narrative.text,
      value: formatPercent(signal.normalizedScore),
      meta: {
        sourceType: 'signal',
        sourceId: signal.signalId,
        bucket,
        rank: signal.rank,
        templateRef: narrative.templateRef,
      },
    }
  })

  const developmentFocusBlocks: HybridMvpReportBlock[] = watchoutBlocks.slice(0, 1).map((block) => ({
    id: block.id.replace('watchout:', 'development-focus:'),
    kind: 'narrative',
    title: 'Development focus',
    body: `Prioritize deliberate practice in ${block.title}. Use your stronger signals to support this area during high-stakes work.`,
    meta: block.meta,
  }))

  const domainSummaryBlocks: HybridMvpReportBlock[] = input.scored.aggregationVectors.byDomain.map((domainVector) => {
    const domainKey = domainVector.domainId ?? 'global'
    const topDomainSignal = domainVector.vector[0]
    const topDomainSignalMeta = topDomainSignal ? signalById[topDomainSignal.signalId] : null
    const domainLabel = domainVector.domainId ? (domainById[domainVector.domainId]?.label ?? domainVector.domainId) : 'Cross-domain'
    const template = domainVector.domainId
      ? resolveTemplateString(input.definition.outputTemplates?.domainNarratives?.[domainVector.domainId]?.summary)
      : null

    const body = template !== null
      ? renderTemplate(template, {
          domainLabel,
          topSignalLabel: topDomainSignalMeta?.label ?? 'No dominant signal',
          topSignalPercent: topDomainSignal ? formatPercent(topDomainSignal.normalizedScore) : '0%',
        })
      : `${domainLabel} is led by ${topDomainSignalMeta?.label ?? 'no dominant signal'} at ${topDomainSignal ? formatPercent(topDomainSignal.normalizedScore) : '0%'} normalized share.`

    const id = `domain-summary:${domainKey}`
    trace.push({
      outputId: id,
      sectionKey: 'domain_summaries',
      sourceType: 'domain',
      sourceId: domainVector.domainId ?? 'global',
      reason: 'one summary block per aggregation domain in deterministic order',
      templateRef: template !== null ? `domain:${domainVector.domainId}:summary` : 'default:domain:summary',
    })

    return {
      id,
      kind: 'domain',
      title: domainLabel,
      body,
      meta: {
        sourceType: 'domain',
        sourceId: domainVector.domainId ?? 'global',
        templateRef: template !== null ? `domain:${domainVector.domainId}:summary` : 'default:domain:summary',
      },
    }
  })

  const sections: HybridMvpReportSection[] = [
    { id: 'overview', title: 'Overview', blocks: overviewBlocks },
    { id: 'strengths', title: 'Strengths', blocks: strengthBlocks },
    { id: 'watchouts', title: 'Watchouts', blocks: watchoutBlocks },
    { id: 'development_focus', title: 'Development focus', blocks: developmentFocusBlocks },
    { id: 'domain_summaries', title: 'Domain summaries', blocks: domainSummaryBlocks },
  ]

  const summary: HybridMvpReportSummary = {
    id: 'summary:primary',
    headline: topSignalMeta ? `${topSignalMeta.label} currently leads your profile` : 'Scored hybrid profile available',
    text: summaryNarrative.text,
    meta: {
      topSignalId: topSignal?.signalId ?? null,
      topSignalRank: topSignal?.rank ?? null,
      topSignalBucket: topBucket,
      templateRef: summaryNarrative.templateRef,
    },
  }

  return { summary, sections, trace }
}

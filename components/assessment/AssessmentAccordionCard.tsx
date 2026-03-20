import React from 'react'

import { ChevronDown } from 'lucide-react'

import { AssessmentStatusBadge } from './AssessmentStatusBadge'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  getCollapsedAction,
  getCollapsedMetadata,
  getExpandedActions,
} from '@/lib/assessment/assessment-repository-selectors'
import type { AssessmentRepositoryItem } from '@/lib/assessment/assessment-repository-types'

function stopEvent(event: React.MouseEvent<HTMLElement>) {
  event.stopPropagation()
}

function DetailRows({ title, rows }: { title: string; rows: Array<{ label: string; value: string }> }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/85">{title}</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={`${title}-${row.label}`} className="border-t border-white/[0.07] px-3.5 py-2.5 first:border-t-0 sm:first:border-t">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textSecondary/80">{row.label}</dt>
            <dd className="mt-1.5 text-sm leading-6 text-textPrimary/92">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

export function AssessmentAccordionCard({
  item,
  expanded,
  onToggle,
  onRetake,
}: {
  item: AssessmentRepositoryItem
  expanded: boolean
  onToggle: (itemId: string) => void
  onRetake: (item: AssessmentRepositoryItem) => void
}) {
  const collapsedAction = getCollapsedAction(item)
  const expandedActions = getExpandedActions(item)
  const collapsedMetadata = getCollapsedMetadata(item)

  const handleKeyboardToggle = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    onToggle(item.id)
  }

  return (
    <Card
      interactive
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      data-card-id={item.id}
      onClick={() => onToggle(item.id)}
      onKeyDown={handleKeyboardToggle}
      className="border-border/70 bg-panel/[0.88] px-5 py-5 text-left sm:px-6 sm:py-6"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1 space-y-4 pr-0 lg:pr-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <h3 className="text-xl font-semibold tracking-tight text-textPrimary">{item.title}</h3>
              <AssessmentStatusBadge status={item.status} />
              {item.hasAdvancedOutputs ? (
                <span className="inline-flex items-center rounded-full border border-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-textSecondary/60">
                  Advanced outputs
                </span>
              ) : null}
            </div>
            <p
              className="max-w-3xl overflow-hidden text-sm leading-7 text-textSecondary [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
              data-description-state="collapsed"
            >
              {item.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-textSecondary/74">
            {collapsedMetadata.map((entry, index) => (
              <React.Fragment key={`${item.id}-${entry}`}>
                {index > 0 ? <span aria-hidden="true" className="text-textSecondary/32">•</span> : null}
                <span className={index >= collapsedMetadata.length - 1 ? 'text-textSecondary/88' : undefined}>{entry}</span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:min-w-[14rem] lg:flex-none lg:justify-end lg:self-center">
          <div onClick={stopEvent} className="flex min-h-11 min-w-[8.5rem] items-center lg:justify-end lg:text-right">
            {collapsedAction ? (
              collapsedAction.action === 'retake' ? (
                <Button onClick={() => onRetake(item)} className="w-full justify-center px-4 lg:w-auto">
                  {collapsedAction.label}
                </Button>
              ) : (
                <Button href={collapsedAction.href} className="w-full justify-center px-4 lg:w-auto">
                  {collapsedAction.label}
                </Button>
              )
            ) : (
              <div className="flex min-h-10 items-center px-1 text-sm font-medium text-textSecondary/68">Unavailable</div>
            )}
          </div>

          <button
            type="button"
            aria-label={expanded ? `Collapse ${item.title}` : `Expand ${item.title}`}
            aria-expanded={expanded}
            data-chevron-id={item.id}
            onClick={(event) => {
              event.stopPropagation()
              onToggle(item.id)
            }}
            className="interaction-control inline-flex h-11 w-11 shrink-0 items-center justify-center self-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-textSecondary hover:border-white/[0.14] hover:bg-white/[0.06] hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/65 focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <ChevronDown className={expanded ? 'rotate-180 transition-transform duration-200' : 'transition-transform duration-200'} size={18} />
          </button>
        </div>
      </div>

      <div className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-200 ease-out ${expanded ? 'mt-6 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'}`}>
        <div className="min-h-0 overflow-hidden">
          {expanded ? (
            <div className="space-y-5 border-t border-white/[0.08] pt-6">
              <section className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/85">Overview</p>
                <p className="max-w-4xl text-sm leading-7 text-textSecondary">{item.longDescription}</p>
              </section>

              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/85">Measures</p>
                <div className="flex flex-wrap gap-2.5">
                  {item.measures.map((measure) => (
                    <span key={measure} className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-textPrimary/90">
                      {measure}
                    </span>
                  ))}
                </div>
              </section>

              <section className="border-t border-white/[0.06] pt-4">
                <DetailRows title="Operational Details" rows={item.operationalDetails} />
              </section>

              <section className="space-y-4 border-t border-white/[0.06] pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/85">Access &amp; Outputs</p>
                <div className="grid gap-4 lg:grid-cols-2">
                  <DetailRows title="Access" rows={item.accessRows} />
                  <DetailRows title="Outputs" rows={item.outputRows} />
                </div>
              </section>

              {item.statusNote ? (
                <section className="space-y-2 border-t border-white/[0.06] pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/85">Status Note</p>
                  <div className="border-t border-white/[0.06] px-3.5 py-2.5 text-sm leading-7 text-textSecondary">
                    {item.statusNote}
                  </div>
                </section>
              ) : null}

              <section className="space-y-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/85">Actions</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap" onClick={stopEvent}>
                  {expandedActions.length > 0 ? (
                    expandedActions.map((action) =>
                      action.action === 'retake' ? (
                        <Button key={`${item.id}-${action.label}`} variant="secondary" onClick={() => onRetake(item)} className="justify-center px-5">
                          {action.label}
                        </Button>
                      ) : (
                        <Button
                          key={`${item.id}-${action.label}`}
                          href={action.href}
                          variant={action.action === 'view_results' ? 'secondary' : 'primary'}
                          className="justify-center px-5"
                        >
                          {action.label}
                        </Button>
                      ),
                    )
                  ) : (
                    <div className="min-h-10 px-1 text-sm font-medium text-textSecondary/70">Unavailable</div>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

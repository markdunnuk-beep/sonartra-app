import React from 'react'

import { AssessmentAccordionCard } from './AssessmentAccordionCard'

import type { AssessmentRepositoryItem, AssessmentRepositorySectionModel } from '@/lib/assessment/assessment-repository-types'

export function AssessmentSection({
  section,
  expandedId,
  onToggle,
  onRetake,
}: {
  section: AssessmentRepositorySectionModel
  expandedId: string | null
  onToggle: (sectionKey: AssessmentRepositorySectionModel['category'], itemId: string) => void
  onRetake: (item: AssessmentRepositoryItem) => void
}) {
  return (
    <section className="space-y-5" aria-labelledby={`${section.category}-assessment-heading`}>
      <div className="space-y-2">
        <h2 id={`${section.category}-assessment-heading`} className="text-2xl font-semibold tracking-tight text-textPrimary">
          {section.title}
        </h2>
        <p className="max-w-3xl text-sm leading-7 text-textSecondary">{section.description}</p>
        {section.note ? <p className="text-sm text-textSecondary/80">{section.note}</p> : null}
      </div>

      <div className="space-y-4">
        {section.items.map((item) => (
          <AssessmentAccordionCard
            key={item.id}
            item={item}
            expanded={expandedId === item.id}
            onToggle={(itemId) => onToggle(section.category, itemId)}
            onRetake={onRetake}
          />
        ))}
      </div>
    </section>
  )
}

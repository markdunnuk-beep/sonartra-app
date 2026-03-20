'use client'

import React, { useMemo, useState } from 'react'

import { AssessmentFilterRow } from './AssessmentFilterRow'
import { AssessmentSection } from './AssessmentSection'
import { AssessmentSummaryStrip } from './AssessmentSummaryStrip'
import { RetakeAssessmentModal } from './RetakeAssessmentModal'

import {
  buildAssessmentSections,
  buildAssessmentSummaryMetrics,
  getAssessmentRepositoryInventory,
} from '@/lib/assessment/assessment-repository-selectors'
import type {
  AssessmentRepositoryFilter,
  AssessmentRepositoryItem,
  AssessmentRepositorySectionModel,
} from '@/lib/assessment/assessment-repository-types'

export function AssessmentRepositoryPage({ inventory = getAssessmentRepositoryInventory() }: { inventory?: AssessmentRepositoryItem[] }) {
  const [activeFilter, setActiveFilter] = useState<AssessmentRepositoryFilter>('all')
  const [expandedBySection, setExpandedBySection] = useState<Record<AssessmentRepositorySectionModel['category'], string | null>>({
    individual: null,
    team: null,
  })
  const [retakeTarget, setRetakeTarget] = useState<AssessmentRepositoryItem | null>(null)

  const metrics = useMemo(() => buildAssessmentSummaryMetrics(inventory), [inventory])
  const sections = useMemo(() => buildAssessmentSections(inventory, activeFilter), [inventory, activeFilter])

  const handleToggle = (sectionKey: AssessmentRepositorySectionModel['category'], itemId: string) => {
    setExpandedBySection((current) => ({
      ...current,
      [sectionKey]: current[sectionKey] === itemId ? null : itemId,
    }))
  }

  return (
    <>
      <div className="space-y-8 lg:space-y-10">
        <AssessmentSummaryStrip metrics={metrics} />
        <AssessmentFilterRow activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        <div className="space-y-10 lg:space-y-12">
          {sections.map((section, index) => (
            <div key={section.category} className={index > 0 ? 'pt-2.5 lg:pt-3' : undefined}>
              <AssessmentSection
                section={section}
                expandedId={expandedBySection[section.category]}
                onToggle={handleToggle}
                onRetake={setRetakeTarget}
              />
            </div>
          ))}
        </div>
      </div>

      <RetakeAssessmentModal item={retakeTarget} onClose={() => setRetakeTarget(null)} />
    </>
  )
}

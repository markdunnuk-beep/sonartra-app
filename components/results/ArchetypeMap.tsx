import React from 'react'

import type { ArchetypeSummary } from '@/lib/interpretation/archetypes'

import { ArchetypeIcon, type ArchetypeDisplayState } from '@/components/results/ArchetypeIcon'
import { ARCHETYPE_META } from '@/components/results/archetypeMeta'

function resolveState(archetypeKey: string, summary: ArchetypeSummary): ArchetypeDisplayState {
  if (archetypeKey === summary.primaryKey) {
    return 'primary'
  }

  if (summary.secondaryKey && archetypeKey === summary.secondaryKey) {
    return 'secondary'
  }

  return 'inactive'
}

export function ArchetypeMap({ summary }: { summary: ArchetypeSummary }) {
  return (
    <section className="space-y-4 sm:space-y-5" aria-labelledby="archetype-map-title">
      <div className="space-y-1.5">
        <h3 id="archetype-map-title" className="text-[11px] font-semibold uppercase tracking-[0.18em] text-textPrimary/82">
          Archetype map
        </h3>
        <p className="max-w-[44ch] text-sm leading-6 text-textSecondary/92">A quick recognition view of the 10 Sonartra operating archetypes.</p>
      </div>
      <ol className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-5 lg:gap-4" aria-label="Archetype map">
        {ARCHETYPE_META.map((archetype) => (
          <ArchetypeIcon key={archetype.key} archetype={archetype} state={resolveState(archetype.key, summary)} />
        ))}
      </ol>
    </section>
  )
}

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
    <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Archetype map">
      {ARCHETYPE_META.map((archetype) => (
        <ArchetypeIcon key={archetype.key} archetype={archetype} state={resolveState(archetype.key, summary)} />
      ))}
    </ol>
  )
}

'use client'

import React from 'react'

import { AssessmentRepositoryPage } from '@/components/assessment/AssessmentRepositoryPage'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import type { AssessmentRepositoryItem } from '@/lib/assessment/assessment-repository-types'

export default function AssessmentPageClient({ inventory }: { inventory: AssessmentRepositoryItem[] }) {
  return (
    <AppShell>
      <div className="space-y-8 lg:space-y-10">
        <TopHeader
          title="Assessments"
          subtitle="Track progress, launch diagnostics, and review assessment activity across individual and team workflows."
        />
        <AssessmentRepositoryPage inventory={inventory} />
      </div>
    </AppShell>
  )
}

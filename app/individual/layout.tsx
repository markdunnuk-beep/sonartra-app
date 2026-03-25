import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { Button } from '@/components/ui/Button'

export default function IndividualLayout({ children }: { children: ReactNode }) {
  return (
    <AppShell>
      <div className="space-y-8 lg:space-y-10">
        <TopHeader
          title="Individual"
          subtitle="Assessments handles discovery/start/resume and attempt status. Results is dedicated to persisted outputs and detail views."
        />
        <div className="flex flex-wrap gap-3">
          <Button href="/individual/assessments" variant="secondary">Assessments</Button>
          <Button href="/individual/results" variant="secondary">Results</Button>
        </div>
        {children}
      </div>
    </AppShell>
  )
}

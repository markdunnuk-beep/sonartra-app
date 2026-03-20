import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { assessmentVersions, assessments, getStatusLabel } from '@/lib/admin/domain'

const releaseQueue = assessmentVersions.filter((version) => version.status !== 'live' && version.status !== 'archived')

export default function AdminReleasesPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Releases"
        title="Release readiness and publish control"
        description="Operational queue for validation, preview, publish, pause, and rollback decisions across controlled assessment versions."
        actions={<Button href={releaseQueue[0] ? `/admin/releases/${releaseQueue[0].id}/publish` : '/admin/assessments'} variant="secondary">Open release control</Button>}
      />

      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="eyebrow">Readiness queue</p>
        <div className="mt-4 space-y-3">
          {releaseQueue.map((version) => {
            const assessment = assessments.find((item) => item.id === version.assessmentId)
            return (
              <div key={version.id} className="rounded-2xl border border-white/[0.08] bg-bg/45 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-textPrimary">{assessment?.title} · v{version.versionNumber}</h2>
                    <p className="mt-2 text-sm leading-6 text-textSecondary">{version.changelogSummary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/[0.08] bg-panel/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-textSecondary">{getStatusLabel(version.status)}</span>
                    <span className="rounded-full border border-white/[0.08] bg-panel/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-textSecondary">{getStatusLabel(version.publishStatus)}</span>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button href={`/admin/releases/${version.id}/validation`} variant="ghost">Validation + preview</Button>
                  <Button href={`/admin/releases/${version.id}/publish`} variant="secondary">Publish control</Button>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

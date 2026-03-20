import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Card } from '@/components/ui/Card'
import { assessmentVersions, assessments, getStatusLabel } from '@/lib/admin/domain'

const releaseQueue = assessmentVersions.filter((version) => version.status !== 'live' && version.status !== 'archived')

export default function AdminReleasesPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Releases"
        title="Release readiness and publish control"
        description="Coordinate validation outcomes, preview checkpoints, and publish decisions before any assessment change becomes live."
      />

      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Operational intent</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary">
          Releases will become the action surface for staged assessment changes: what is ready, what is blocked, who approved it, and whether a publish decision should proceed or pause.
        </p>
      </Card>

      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Readiness queue</p>
        <div className="mt-4 space-y-3">
          {releaseQueue.map((version) => {
            const assessment = assessments.find((item) => item.id === version.assessmentId)
            return (
              <div key={version.id} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-textPrimary">
                      {assessment?.title} v{version.versionNumber}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-textSecondary">{version.changelogSummary}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.14em] text-textSecondary">
                    <p>{getStatusLabel(version.status)}</p>
                    <p className="mt-1">{getStatusLabel(version.publishStatus)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-4 text-sm leading-6 text-textSecondary">
                  <p>Rule errors: {version.validationSummary.ruleErrors}</p>
                  <p>Warnings: {version.validationSummary.ruleWarnings}</p>
                  <p>Preview ready: {version.validationSummary.previewReady ? 'Yes' : 'No'}</p>
                  <p>Target: {version.publishTarget.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}

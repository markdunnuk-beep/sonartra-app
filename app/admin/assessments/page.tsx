import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Card } from '@/components/ui/Card'
import {
  assessmentVersions,
  assessments,
  getAssessmentVersionCounts,
  getCurrentLiveAssessmentVersion,
  getStatusLabel,
} from '@/lib/admin/domain'

export default function AdminAssessmentsPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessments registry"
        title="Assessment registry and version control"
        description="Treat assessment definitions as governed system assets with clear registry state, immutable versions, and operational validation context."
      />

      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Operational intent</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary">
          This module will own the registry of Sonartra assessment lines, version lineage, validation state, and publish eligibility so live logic is never overwritten directly.
        </p>
      </Card>

      <div className="grid gap-4">
        {assessments.map((assessment) => {
          const liveVersion = getCurrentLiveAssessmentVersion(assessment, assessmentVersions)
          const versionCounts = getAssessmentVersionCounts(assessment.id, assessmentVersions)

          return (
            <Card key={assessment.id} className="px-6 py-5 sm:px-7 sm:py-6">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{getStatusLabel(assessment.category)}</p>
                  <h2 className="mt-2 text-lg font-semibold tracking-tight text-textPrimary">{assessment.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">{assessment.description}</p>
                </div>
                <div className="rounded-xl border border-border/75 px-3 py-2 text-xs uppercase tracking-[0.14em] text-textSecondary">
                  {getStatusLabel(assessment.status)}
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4 text-sm leading-6 text-textSecondary">
                <p>Live version: {liveVersion?.versionNumber ?? 'Not yet live'}</p>
                <p>Drafts in motion: {versionCounts.draft + versionCounts.in_review + versionCounts.validated}</p>
                <p>Live snapshots: {versionCounts.live}</p>
                <p>Archived history: {versionCounts.archived}</p>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

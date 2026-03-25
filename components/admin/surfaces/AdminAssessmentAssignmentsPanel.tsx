import { submitAdminAssessmentAssignUserAction } from '@/app/admin/assessments/[assessmentId]/actions'
import { Badge, EmptyState, SurfaceSection, Table } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { listAdminAssessmentAssignments } from '@/lib/server/assessment-assignments'
import { formatAdminTimestamp } from '@/lib/admin/wireframe'

function getStatusTone(status: string): 'sky' | 'emerald' | 'slate' | 'amber' | 'rose' {
  if (status === 'assigned') return 'sky'
  if (status === 'in_progress') return 'amber'
  if (status === 'results_ready') return 'emerald'
  if (status === 'failed') return 'rose'
  return 'slate'
}

export async function AdminAssessmentAssignmentsPanel({ assessmentId }: { assessmentId: string }) {
  const assignments = await listAdminAssessmentAssignments(assessmentId)

  return (
    <div className="space-y-4">
      <SurfaceSection
        title="Assign published assessment"
        eyebrow="MVP push workflow"
        description="Assign the current published version to an individual by email. The assignment remains explicit and lifecycle-tracked through completion and result readiness."
      >
        <form action={submitAdminAssessmentAssignUserAction} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <input type="hidden" name="assessmentId" value={assessmentId} />
          <input
            type="email"
            name="targetUserEmail"
            required
            placeholder="user@company.com"
            className="rounded-xl border border-white/10 bg-bg/70 px-3 py-2 text-sm text-textPrimary outline-none ring-0 placeholder:text-textSecondary/80 focus:border-brandPrimary"
          />
          <button type="submit" className="rounded-xl bg-brandPrimary px-4 py-2 text-sm font-medium text-bg hover:opacity-90">Assign</button>
        </form>
      </SurfaceSection>

      <SurfaceSection title="Assignment status" eyebrow="Operational visibility" description="Track assignment state transitions from assigned to in progress and results ready.">
        {assignments.length ? (
          <Table
            columns={['User', 'Version', 'Status', 'Assigned', 'Attempt', 'Result']}
            rows={assignments.map((entry) => [
              <div key={`${entry.id}-user`} className="space-y-1">
                <p className="text-sm font-medium text-textPrimary">{entry.targetUserName}</p>
                <p className="text-xs text-textSecondary">{entry.targetUserEmail}</p>
              </div>,
              <span key={`${entry.id}-version`} className="text-sm text-textPrimary">v{entry.assessmentVersionLabel}</span>,
              <div key={`${entry.id}-status`} className="space-y-1">
                <Badge label={entry.status.replace('_', ' ')} tone={getStatusTone(entry.status)} />
                <p className="text-xs text-textSecondary">{entry.assignedByName ? `By ${entry.assignedByName}` : 'By system'}</p>
              </div>,
              <span key={`${entry.id}-assigned`} className="text-sm text-textSecondary">{formatAdminTimestamp(entry.assignedAt)}</span>,
              <div key={`${entry.id}-attempt`} className="space-y-1">
                <p className="text-xs text-textSecondary break-all">{entry.assessmentId ?? 'Not started'}</p>
                {entry.linkedOrganisationName ? <p className="text-xs text-textSecondary">Org: {entry.linkedOrganisationName}</p> : null}
              </div>,
              <span key={`${entry.id}-result`} className="text-xs text-textSecondary break-all">{entry.latestResultId ?? (entry.status === 'results_ready' ? 'Ready' : 'Pending')}</span>,
            ])}
          />
        ) : (
          <EmptyState title="No assignments yet" detail="Create the first assignment above to push this published assessment to an individual." />
        )}
      </SurfaceSection>
    </div>
  )
}

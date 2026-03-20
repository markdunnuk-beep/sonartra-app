import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Card } from '@/components/ui/Card'
import { auditLogEvents, getStatusLabel, groupAuditEventsByEntityType } from '@/lib/admin/domain'

export default function AdminAuditPage() {
  const grouped = groupAuditEventsByEntityType(auditLogEvents)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Audit"
        title="Operational auditability and evidence"
        description="Provide a durable view of privileged actions, release history, and system-level evidence required for enterprise operations."
      />

      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Operational intent</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary">
          Audit will focus on traceability: who changed assessment controls, tenant state, or privileged access; when those actions occurred; and what operational evidence exists to support them.
        </p>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Recent event stream</p>
          <div className="mt-4 space-y-3">
            {auditLogEvents.map((event) => (
              <div key={event.id} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-textPrimary">{event.summary}</h2>
                    <p className="mt-2 text-sm leading-6 text-textSecondary">
                      {event.actor.displayName} · {event.entity.label} · {event.occurredAt}
                    </p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.14em] text-textSecondary">
                    <p>{getStatusLabel(event.action)}</p>
                    <p className="mt-1">{getStatusLabel(event.entity.entityType)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Evidence-ready timelines</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-textSecondary">
            {Object.entries(grouped).map(([entityType, events]) => (
              <div key={entityType} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
                <h2 className="text-base font-semibold tracking-tight text-textPrimary">{getStatusLabel(entityType)}</h2>
                <p className="mt-2">{events.length} events currently indexed for this entity class.</p>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}

import { Card } from '@/components/ui/Card'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

export function AdminModulePlaceholder({
  eyebrow,
  title,
  description,
  pillars,
  operatingNote,
}: {
  eyebrow: string
  title: string
  description: string
  pillars: Array<{ title: string; detail: string }>
  operatingNote: string
}) {
  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow={eyebrow} title={title} description={description} />
      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Operational intent</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary">{operatingNote}</p>
      </Card>
      <div className="grid gap-4 lg:grid-cols-3">
        {pillars.map((pillar) => (
          <Card key={pillar.title} className="h-full min-h-[220px] px-6 py-5 sm:px-7 sm:py-6">
            <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Control area</p>
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-textPrimary">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-6 text-textSecondary">{pillar.detail}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}

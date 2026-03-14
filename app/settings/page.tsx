import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

const sections = ['Profile', 'Organisation', 'Assessment history', 'Security', 'Notification preferences']

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8">
        <TopHeader title="Settings" subtitle="Account and platform controls" />
        {sections.map((s) => (
          <Card key={s}>
            <h3 className="text-lg font-semibold">{s}</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Input placeholder={`${s} field`} />
              <Input placeholder="Value" />
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  )
}

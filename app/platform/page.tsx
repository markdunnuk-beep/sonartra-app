import { PublicNav } from '@/components/layout/PublicNav'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { layerData } from '@/data/mockData'

export default function PlatformPage() {
  return (
    <div>
      <PublicNav />
      <section className="section">
        <SectionHeading
          eyebrow="Platform"
          title="Performance intelligence for organisational systems"
          description="Sonartra converts behavioural data into strategic operating intelligence."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="panel-hover">
            <h3 className="text-lg font-medium">Why performance is often misunderstood</h3>
            <p className="mt-2 text-sm leading-relaxed text-textSecondary">Most organisations track outputs but miss the behavioural system creating those outputs. Sonartra measures the underlying performance architecture.</p>
          </Card>
          <Card className="panel-hover">
            <h3 className="text-lg font-medium">Different from personality tests</h3>
            <p className="mt-2 text-sm leading-relaxed text-textSecondary">Traditional tools classify traits. Sonartra models operating conditions, decision dynamics, and risk signals tied directly to execution.</p>
          </Card>
        </div>
      </section>
      <section className="section pt-0">
        <SectionHeading title="Three intelligence layers" />
        <div className="grid gap-4 md:grid-cols-3">
          {layerData.map((layer) => (
            <Card key={layer.title} className="panel-hover">
              <h3 className="text-lg font-medium">{layer.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-textSecondary">{layer.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

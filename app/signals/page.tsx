import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { measurePillars } from '@/data/mockData'

export default function SignalsPage() {
  return (
    <div>
      <PublicNav />
      <section className="section">
        <SectionHeading
          eyebrow="Product"
          title="Sonartra Signals"
          description="Assessment engine for behavioural performance intelligence."
          right={<Button href="/assessment">Start Assessment</Button>}
        />
        <Card>
          <p className="text-textSecondary">
            Signals uses 80 questions in approximately 10–12 minutes to produce structured outputs including Dominant
            Behaviour Style, Leadership Architecture, Stress Derailer Risk, and Culture Tension Index.
          </p>
        </Card>
      </section>
      <section className="section pt-0">
        <SectionHeading title="What Signals measures" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {measurePillars.map((p) => (
            <Card key={p}>{p}</Card>
          ))}
        </div>
      </section>
      <PublicFooter />
    </div>
  )
}

import { PublicNav } from '@/components/layout/PublicNav'
import { Card } from '@/components/ui/Card'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { caseStudies, testimonials } from '@/data/mockData'

export default function CaseStudiesPage() {
  return (
    <div>
      <PublicNav />
      <section className="section">
        <SectionHeading title="Case Studies" description="Pilot deployments and outcome metrics." />
        <div className="grid gap-5 md:grid-cols-3">
          {caseStudies.map((c) => (
            <Card key={c.company}>
              <p className="text-sm text-textSecondary">{c.company}</p>
              <p className="mt-3 font-medium">{c.challenge}</p>
              <p className="mt-2 text-accent">{c.outcome}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="section pt-0">
        <SectionHeading title="Testimonials" />
        <div className="grid gap-5 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name}>
              <p className="text-textSecondary">“{t.quote}”</p>
              <p className="mt-3 text-sm">{t.name}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

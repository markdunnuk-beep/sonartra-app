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
        <div className="grid gap-4 md:grid-cols-3">
          {caseStudies.map((c) => (
            <Card key={c.company} className="panel-hover">
              <p className="text-sm text-textSecondary">{c.company}</p>
              <p className="mt-3 text-base font-medium">{c.challenge}</p>
              <p className="mt-3 text-sm text-accent">{c.outcome}</p>
            </Card>
          ))}
        </div>
      </section>
      <section className="section pt-0">
        <SectionHeading title="Testimonials" />
        <div className="grid gap-4 md:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name} className="panel-hover">
              <p className="text-sm leading-relaxed text-textSecondary">“{t.quote}”</p>
              <p className="mt-4 text-sm">{t.name}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}

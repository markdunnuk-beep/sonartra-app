import { Hero } from '@/components/hero/Hero'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { FadeIn } from '@/components/ui/FadeIn'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { caseStudies, layerData, measurePillars, testimonials } from '@/data/mockData'

export default function HomePage() {
  return (
    <div>
      <PublicNav />
      <Hero />

      <section className="section section-tight">
        <SectionHeading eyebrow="Architecture" title="Three-layer intelligence model" />
        <div className="grid gap-5 md:grid-cols-3">
          {layerData.map((layer) => (
            <FadeIn key={layer.title}>
              <Card>
                <h3 className="text-lg font-semibold">{layer.title}</h3>
                <p className="mt-3 text-sm leading-6 text-textSecondary">{layer.description}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading
          title="What Sonartra Measures"
          description="Signals analyses six behavioural domains critical to sustained performance and decision quality."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {measurePillars.map((pillar) => (
            <Card key={pillar} className="transition-colors hover:border-accent/40">
              <p className="text-base font-medium">{pillar}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading title="How it Works" />
        <div className="grid gap-5 md:grid-cols-4">
          {['Assess', 'Analyse', 'Interpret', 'Optimise'].map((step, i) => (
            <Card key={step}>
              <p className="eyebrow">0{i + 1}</p>
              <p className="mt-3 text-lg font-semibold">{step}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading title="Pilot Outcomes" />
        <div className="grid gap-5 lg:grid-cols-3">
          {caseStudies.map((c) => (
            <Card key={c.company}>
              <p className="text-sm text-textSecondary">{c.company}</p>
              <p className="mt-3 text-2xl font-semibold text-accent">{c.metric}</p>
              <p className="mt-3 text-sm text-textSecondary">{c.outcome}</p>
            </Card>
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name}>
              <p className="text-sm leading-6 text-textSecondary">“{t.quote}”</p>
              <p className="mt-4 text-sm text-textPrimary">{t.name}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section pt-0">
        <Card className="text-center">
          <h3 className="text-3xl font-semibold">Deploy performance intelligence at scale.</h3>
          <p className="mx-auto mt-3 max-w-2xl text-textSecondary">
            Run Sonartra Signals and generate actionable behavioural outputs for strategic decisions.
          </p>
          <div className="mt-7 flex justify-center">
            <Button href="/signup">Start with Sonartra Signals</Button>
          </div>
        </Card>
      </section>
      <PublicFooter />
    </div>
  )
}

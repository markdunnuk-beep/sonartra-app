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
                <h3 className="text-lg font-semibold text-[#E4EBF8]">
                  <span className="text-accent-soft">{layer.title.split(' ')[0]}</span>{' '}
                  <span>{layer.title.split(' ').slice(1).join(' ')}</span>
                </h3>
                <p className="text-muted-meta mt-3">{layer.description}</p>
              </Card>
            </FadeIn>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading
          eyebrow="Signals"
          title="What Sonartra Measures"
          description="Signals analyses six behavioural domains critical to sustained performance and decision quality."
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {measurePillars.map((pillar) => (
            <Card key={pillar} className="transition-colors hover:border-accent/40">
              <p className="text-base font-medium text-[#DEE7F6]">
                {pillar.includes('Intelligence') ? (
                  <>
                    {pillar.replace(' Intelligence', '')} <span className="text-accent-soft">Intelligence</span>
                  </>
                ) : (
                  pillar
                )}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading eyebrow="Platform" title="How it Works" />
        <div className="grid gap-5 md:grid-cols-4">
          {['Assess', 'Analyse', 'Interpret', 'Optimise'].map((step, i) => (
            <Card key={step}>
              <p className="eyebrow">0{i + 1}</p>
              <p className="mt-3 text-lg font-semibold text-[#E2EAF8]">{step}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section">
        <SectionHeading eyebrow="Results" title="Pilot Outcomes" />
        <div className="grid gap-5 lg:grid-cols-3">
          {caseStudies.map((c) => (
            <Card key={c.company}>
              <p className="text-muted-meta">{c.company}</p>
              <p className="mt-3 text-2xl font-semibold text-accent">{c.metric}</p>
              <p className="text-muted-meta mt-3">{c.outcome}</p>
            </Card>
          ))}
        </div>
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {testimonials.map((t) => (
            <Card key={t.name}>
              <p className="text-muted-meta">“{t.quote}”</p>
              <p className="mt-4 text-sm text-[#D9E4F5]">{t.name}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section pt-0">
        <Card className="text-center">
          <p className="eyebrow mb-4">Decision Support</p>
          <h3 className="text-3xl font-semibold text-[#ECF2FC]">
            Deploy <span className="headline-emphasis">performance intelligence</span> at scale.
          </h3>
          <p className="prose-support mx-auto mt-4 max-w-2xl">
            Run Sonartra Signals and generate actionable behavioural outputs for sharper strategic insight.
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

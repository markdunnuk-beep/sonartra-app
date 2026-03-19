import { Hero } from '@/components/hero/Hero'
import { PublicFooter } from '@/components/layout/PublicFooter'
import { PublicNav } from '@/components/layout/PublicNav'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/motion/Reveal'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { ArchitectureDiagram } from '@/components/visuals/ArchitectureDiagram'
import { PlatformDashboardPreview } from '@/components/visuals/PlatformDashboardPreview'
import { ResultsPanel } from '@/components/visuals/ResultsPanel'
import { SignalsPreview } from '@/components/visuals/SignalsPreview'
import { caseStudies, layerData, measurePillars, testimonials, workflowSteps } from '@/data/mockData'

export default function HomePage() {
  return (
    <div>
      <PublicNav />
      <Hero />

      <section id="platform-model" className="section section-tight pt-4 md:pt-8">
        <SectionHeading
          eyebrow="Section 2"
          title="Three-Layer Intelligence Model"
          description="Sonartra uses a three-layer model to separate performance analysis by operating level before combining it into one system view."
        />
        <Reveal y={8} className="-mt-6 mb-6 md:-mt-8 md:mb-8">
          <p className="max-w-2xl text-sm leading-relaxed text-[#A9BDD8]">
            The system progresses from individual to team to organisation, so behaviour is interpreted in context, not isolation.
          </p>
        </Reveal>
        <div className="grid items-start gap-4 lg:grid-cols-[1.05fr_1fr] lg:gap-5">
          <Reveal y={10} className="architecture-anchor-effect">
            <ArchitectureDiagram />
          </Reveal>
          <RevealGroup className="grid gap-4" staggerChildren={0.06} delayChildren={0.02}>
            {layerData.map((layer) => (
              <RevealItem key={layer.title}>
                <Card interactive className="h-full p-6">
                  <h3 className="text-lg font-semibold text-[#E4EBF8]">{layer.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#D5E1F2]">{layer.description}</p>
                  <p className="text-muted-meta mt-3">{layer.detail}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      <section className="section section-spacious">
        <SectionHeading
          eyebrow="Section 3"
          title="What Sonartra Measures"
          description="Sonartra measures the performance signals that shape execution, coordination, and judgement under real operating conditions."
        />
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <RevealGroup className="grid gap-4 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-3" staggerChildren={0.05}>
              {measurePillars.map((pillar) => (
                <RevealItem key={pillar.title}>
                  <Card
                    interactive
                    tabIndex={0}
                    className="measure-card flex h-full min-h-[152px] flex-col justify-center gap-3 p-5"
                  >
                    <p className="measure-card-title text-base font-medium text-[#DEE7F6]">{pillar.title}</p>
                    <p className="measure-card-summary text-sm leading-relaxed text-[#B5C3DA]">{pillar.summary}</p>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
            <Reveal y={8} className="mt-6">
              <p className="max-w-xl text-sm leading-relaxed text-[#A9BDD8]">
                These signals are combined into structured performance profiles.
              </p>
            </Reveal>
          </div>
          <Reveal y={8}>
            <SignalsPreview />
          </Reveal>
        </div>
      </section>

      <section className="section section-spacious">
        <SectionHeading
          eyebrow="Section 4"
          title="How It Works"
          description="Sonartra turns raw signal capture into usable intelligence through a continuous four-step processing flow."
        />
        <div className="grid items-start gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <RevealGroup className="grid gap-5 sm:grid-cols-2" staggerChildren={0.06}>
            {workflowSteps.map((step, i) => (
              <RevealItem key={step.title}>
                <Card interactive className="h-full p-6">
                  <p className="eyebrow">0{i + 1}</p>
                  <p className="mt-3 text-lg font-semibold text-[#E2EAF8]">{step.title}</p>
                  <p className="text-muted-meta mt-3">{step.summary}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
          <Reveal y={12} delay={0.08} className="platform-anchor-effect">
            <PlatformDashboardPreview />
          </Reveal>
        </div>
      </section>

      <section className="section section-spacious">
        <SectionHeading eyebrow="Results" title="Pilot Outcomes" />
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <RevealGroup className="grid gap-5 lg:grid-cols-3" staggerChildren={0.06}>
            {caseStudies.map((c) => (
              <RevealItem key={c.company}>
                <Card interactive>
                  <p className="text-muted-meta">{c.company}</p>
                  <p className="mt-3 text-2xl font-semibold text-accent">{c.metric}</p>
                  <p className="text-muted-meta mt-3">{c.outcome}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
          <Reveal y={10} className="results-anchor-effect">
            <ResultsPanel />
          </Reveal>
        </div>
        <RevealGroup className="mt-7 grid gap-5 md:mt-8 lg:grid-cols-3" staggerChildren={0.06}>
          {testimonials.map((t) => (
            <RevealItem key={t.name}>
              <Card interactive>
                <p className="text-muted-meta">“{t.quote}”</p>
                <p className="mt-4 text-sm text-[#D9E4F5]">{t.name}</p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="section pt-4 md:pt-8">
        <Reveal y={8}>
          <Card interactive className="p-8 text-center sm:p-10">
            <p className="eyebrow mb-4">Decision Support</p>
            <h3 className="text-3xl font-semibold text-[#ECF2FC]">
              Activate <span className="headline-emphasis">performance intelligence</span> with Sonartra Signals.
            </h3>
            <p className="prose-support mx-auto mt-4 max-w-2xl">
              Begin with Sonartra Signals, then extend analysis across individuals, teams, and organisational performance.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/signup">Run Sonartra Signals</Button>
            </div>
          </Card>
        </Reveal>
      </section>
      <PublicFooter />
    </div>
  )
}

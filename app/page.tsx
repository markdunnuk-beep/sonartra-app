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

      <section id="platform-model" className="section section-tight pt-4 md:pt-6">
        <SectionHeading
          eyebrow="Section 2"
          title="Three-Layer Intelligence Model"
          description="Sonartra uses a three-layer model to separate performance analysis by operating level before combining it into one system view."
        />
        <Reveal y={8} className="-mt-3 mb-6 md:mb-8">
          <p className="max-w-[38rem] text-[13px] leading-6 text-[#92A7C4]">
            The system progresses from individual to team to organisation, so behaviour is interpreted in context, not isolation.
          </p>
        </Reveal>
        <div className="grid gap-4 md:gap-5">
          <Reveal y={10} className="architecture-anchor-effect mx-auto w-full max-w-5xl">
            <ArchitectureDiagram />
          </Reveal>
          <RevealGroup className="grid gap-3 sm:auto-rows-fr lg:grid-cols-3" staggerChildren={0.06} delayChildren={0.02}>
            {layerData.map((layer) => (
              <RevealItem key={layer.title} className="h-full">
                <Card interactive className="flex h-full flex-col gap-3 p-5 sm:p-6">
                  <p className="card-section-label">{layer.title.split(' ')[0]} Layer</p>
                  <h3 className="text-[1.15rem] font-semibold text-[#E4EBF8]">{layer.title}</h3>
                  <p className="text-sm leading-6 text-[#C6D2E4]">{layer.description}</p>
                  <p className="text-muted-meta mt-auto">{layer.detail}</p>
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
        <div className="grid items-start gap-5 lg:grid-cols-[1.22fr_0.78fr] lg:gap-6">
          <div>
            <RevealGroup className="grid gap-3 sm:auto-rows-fr sm:grid-cols-2 xl:grid-cols-3" staggerChildren={0.05}>
              {measurePillars.map((pillar) => (
                <RevealItem key={pillar.title}>
                  <Card interactive tabIndex={0} className="measure-card flex h-full min-h-[144px] flex-col justify-between gap-3 p-5">
                    <p className="card-section-label">Signal Domain</p>
                    <p className="measure-card-title text-base font-medium text-[#DEE7F6]">{pillar.title}</p>
                    <p className="measure-card-summary text-sm leading-6 text-[#B5C3DA]">{pillar.summary}</p>
                  </Card>
                </RevealItem>
              ))}
            </RevealGroup>
            <Reveal y={8} className="mt-5">
              <p className="max-w-lg text-[13px] leading-6 text-[#8DA2BF]">
                These signals are combined into structured performance profiles.
              </p>
            </Reveal>
          </div>
          <Reveal y={8} className="lg:mx-auto lg:w-full lg:max-w-[420px]">
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
        <div className="grid items-start gap-6 lg:grid-cols-[0.94fr_1.06fr] lg:gap-7">
          <RevealGroup className="grid gap-4 sm:grid-cols-2" staggerChildren={0.06}>
            {workflowSteps.map((step, i) => (
              <RevealItem key={step.title}>
                <Card interactive className="flex h-full flex-col gap-3 p-5 sm:p-6">
                  <p className="eyebrow">0{i + 1}</p>
                  <p className="text-lg font-semibold text-[#E2EAF8]">{step.title}</p>
                  <p className="text-muted-meta">{step.summary}</p>
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
        <SectionHeading eyebrow="Results" title="Pilot Outcomes" description="Early deployments show how behavioural signal analysis improves decision quality, staffing precision, and operating reliability." />
        <div className="grid items-start gap-6 lg:grid-cols-[1.08fr_0.92fr]">
          <RevealGroup className="grid gap-4 lg:grid-cols-3" staggerChildren={0.06}>
            {caseStudies.map((c) => (
              <RevealItem key={c.company}>
                <Card interactive className="flex h-full flex-col gap-3 p-5 sm:p-6">
                  <p className="card-section-label">Pilot Metric</p>
                  <p className="text-sm text-[#AFC0D7]">{c.company}</p>
                  <p className="metric-value text-accent">{c.metric}</p>
                  <p className="text-muted-meta mt-auto">{c.outcome}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
          <Reveal y={10} className="results-anchor-effect">
            <ResultsPanel />
          </Reveal>
        </div>
        <RevealGroup className="mt-6 grid gap-4 md:mt-7 lg:grid-cols-3" staggerChildren={0.06}>
          {testimonials.map((t) => (
            <RevealItem key={t.name}>
              <Card interactive className="flex h-full flex-col gap-4 p-5 sm:p-6">
                <p className="text-[15px] leading-7 text-[#BBCADB]">“{t.quote}”</p>
                <p className="mt-auto text-sm text-[#D9E4F5]">{t.name}</p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
      </section>

      <section className="section pt-4 md:pt-6">
        <Reveal y={8}>
          <Card interactive className="mx-auto max-w-[58rem] p-8 text-center sm:p-10 md:p-12">
            <p className="eyebrow mb-4">Decision Support</p>
            <h3 className="mx-auto max-w-[16ch] text-3xl font-semibold leading-tight text-[#ECF2FC] md:text-[2.45rem]">
              Activate <span className="headline-emphasis">performance intelligence</span> with Sonartra Signals.
            </h3>
            <p className="prose-support mx-auto mt-4 max-w-[36rem]">
              Begin with Sonartra Signals, then extend analysis across individuals, teams, and organisational performance.
            </p>
            <div className="mt-8 flex justify-center">
              <Button href="/signup" className="min-h-11 px-6">
                Run Sonartra Signals
              </Button>
            </div>
          </Card>
        </Reveal>
      </section>
      <PublicFooter />
    </div>
  )
}

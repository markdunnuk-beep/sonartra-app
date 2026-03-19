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
import { caseStudies, measurePillars, testimonials, workflowSteps } from '@/data/mockData'

const homepageLayerData = [
  {
    title: 'Individual Intelligence',
    description: 'Measure behavioural patterns at the individual level.',
    label: 'L01',
    toneClass: 'architecture-layer-card-1',
  },
  {
    title: 'Team Intelligence',
    description: 'Track coordination, interaction, and execution across teams.',
    label: 'L02',
    toneClass: 'architecture-layer-card-2',
  },
  {
    title: 'Organisational Intelligence',
    description: 'Surface organisation-wide performance patterns.',
    label: 'L03',
    toneClass: 'architecture-layer-card-3',
    description: 'Measure behavioural patterns at the individual operating level.',
  },
  {
    title: 'Team Intelligence',
    description: 'Understand coordination, interaction, and execution dynamics across teams.',
  },
  {
    title: 'Organisational Intelligence',
    description: 'Surface system-wide performance patterns across the organisation.',
  },
]

export default function HomePage() {
  return (
    <div>
      <PublicNav />
      <Hero />

      <section id="platform-model" className="section section-tight pt-4 md:pt-6">
        <div className="architecture-system-flow relative">
          <Reveal y={8} className="architecture-anchor-effect">
            <div className="architecture-banner-shell surface relative isolate overflow-hidden px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(101,156,226,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(87,109,145,0.14),transparent_24%),linear-gradient(150deg,rgba(6,11,18,0.98),rgba(7,12,20,0.92)_42%,rgba(5,9,15,0.98))]" />
              <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(130,151,178,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(130,151,178,0.05)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(circle_at_center,black,transparent_92%)]" />
              <div className="relative z-10 space-y-6 sm:space-y-7">
                <div className="max-w-[42rem] space-y-3">
                  <h2 className="headline-section max-w-[18ch] md:max-w-[15ch]">
                    Sonartra <span className="hero-headline-emphasis">Three-Layer Intelligence</span> Model
                  </h2>
                  <p className="prose-support max-w-[42rem] text-[15px] leading-7 text-[#b1c0d3]">
                    Sonartra interprets performance across individual, team, and organisational layers, combining behavioural signals into one operating model.
                  </p>
                </div>

                <ArchitectureDiagram />
              </div>
            </div>
          </Reveal>

          <div className="architecture-flow-connector" aria-hidden="true">
            <span className="architecture-flow-connector-line" />
            <span className="architecture-flow-connector-node" />
          </div>

          <RevealGroup className="mx-auto mt-5 flex w-full max-w-4xl flex-col gap-3.5 md:mt-6" staggerChildren={0.06} delayChildren={0.02}>
            {homepageLayerData.map((layer) => (
              <RevealItem key={layer.title} className="h-full">
                <Card interactive className={`architecture-layer-card ${layer.toneClass} flex h-full flex-col gap-3.5 px-5 py-[1.125rem] sm:px-6 sm:py-[1.375rem]`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="architecture-layer-dot" aria-hidden="true" />
                        <p className="architecture-layer-label">{layer.label}</p>
                      </div>
                      <h3 className="text-[1.15rem] font-semibold text-[#E4EBF8] sm:text-[1.2rem]">{layer.title}</h3>
                    </div>
                    <span className="architecture-live-chip">
                      <span className="hero-live-dot" aria-hidden="true" />
                      <span>Live</span>
                    </span>
                  </div>
                  <p className="max-w-[38rem] text-sm leading-6 text-[#C6D2E4] sm:text-[0.95rem]">{layer.description}</p>
                </Card>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
        <Reveal y={8} className="architecture-anchor-effect">
          <div className="architecture-banner-shell surface relative isolate overflow-hidden px-6 py-7 sm:px-8 sm:py-8 lg:px-10 lg:py-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(101,156,226,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(87,109,145,0.14),transparent_24%),linear-gradient(150deg,rgba(6,11,18,0.98),rgba(7,12,20,0.92)_42%,rgba(5,9,15,0.98))]" />
            <div className="absolute inset-0 opacity-30 bg-[linear-gradient(rgba(130,151,178,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(130,151,178,0.05)_1px,transparent_1px)] bg-[size:36px_36px] [mask-image:radial-gradient(circle_at_center,black,transparent_92%)]" />
            <div className="relative z-10 space-y-6 sm:space-y-7">
              <div className="max-w-[42rem] space-y-3">
                <h2 className="headline-section max-w-[18ch] md:max-w-[15ch]">Sonartra Three-Layer Intelligence Model</h2>
                <p className="prose-support max-w-[42rem] text-[15px] leading-7 text-[#b1c0d3]">
                  Sonartra interprets performance across individual, team, and organisational layers—combining behavioural signals into one operating model.
                </p>
              </div>

              <ArchitectureDiagram />
            </div>
          </div>
        </Reveal>

        <RevealGroup className="mx-auto mt-5 flex w-full max-w-4xl flex-col gap-4 md:mt-6" staggerChildren={0.06} delayChildren={0.02}>
          {homepageLayerData.map((layer, index) => (
            <RevealItem key={layer.title} className="h-full">
              <Card interactive className="architecture-layer-card flex h-full flex-col gap-3.5 px-5 py-[1.125rem] sm:px-6 sm:py-[1.375rem]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="architecture-layer-dot" aria-hidden="true" />
                      <p className="architecture-layer-label">Layer 0{index + 1}</p>
                    </div>
                    <h3 className="text-[1.15rem] font-semibold text-[#E4EBF8] sm:text-[1.2rem]">{layer.title}</h3>
                  </div>
                  <span className="architecture-live-chip">
                    <span className="hero-live-dot" aria-hidden="true" />
                    <span>Live</span>
                  </span>
                </div>
                <p className="max-w-[44rem] text-sm leading-6 text-[#C6D2E4] sm:text-[0.95rem]">{layer.description}</p>
              </Card>
            </RevealItem>
          ))}
        </RevealGroup>
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

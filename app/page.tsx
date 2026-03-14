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
      <section className="section grid items-center gap-10 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-textSecondary">Sonartra Platform</p>
          <h1 className="text-4xl font-semibold leading-tight md:text-6xl">Performance Intelligence for Modern Organisations</h1>
          <p className="mt-5 max-w-xl text-textSecondary">Sonartra analyses behavioural signals across individuals, teams, and organisations to improve execution quality, leadership alignment, and operating performance.</p>
          <div className="mt-7 flex gap-3"><Button href="/assessment">Take the Signals Assessment</Button><Button href="/contact" variant="secondary">Book a Demo</Button></div>
        </div>
        <Card className="relative h-80 overflow-hidden">
          <div className="absolute inset-6 rounded-full border border-accent/30" /><div className="absolute inset-12 rounded-full border border-accent/20" /><div className="absolute inset-20 rounded-full border border-accent/30" /><div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent" />
        </Card>
      </section>

      <section className="section pt-0"><SectionHeading eyebrow="Architecture" title="Three-layer intelligence model" />
        <div className="grid gap-4 md:grid-cols-3">{layerData.map((layer) => <FadeIn key={layer.title}><Card><h3 className="text-lg font-medium">{layer.title}</h3><p className="mt-2 text-sm text-textSecondary">{layer.description}</p></Card></FadeIn>)}</div>
      </section>

      <section className="section"><SectionHeading title="What Sonartra Measures" description="Signals analyses six behavioural domains critical to sustained performance." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{measurePillars.map((p) => <Card key={p} className="hover:border-accent/60"><p>{p}</p></Card>)}</div>
      </section>

      <section className="section"><SectionHeading title="How it Works" />
        <div className="grid gap-4 md:grid-cols-4">{['Assess', 'Analyse', 'Interpret', 'Optimise'].map((step, i) => <Card key={step}><p className="text-xs text-textSecondary">0{i + 1}</p><p className="mt-3 font-medium">{step}</p></Card>)}</div>
      </section>

      <section className="section"><SectionHeading title="Product Preview" />
        <div className="grid gap-4 md:grid-cols-2"><Card className="h-44"><p className="text-sm text-textSecondary">Executive dashboard summary</p></Card><Card className="h-44"><p className="text-sm text-textSecondary">Behaviour pillar distribution</p></Card><Card className="h-44"><p className="text-sm text-textSecondary">Leadership architecture signal</p></Card><Card className="h-44"><p className="text-sm text-textSecondary">Culture and stress risk monitor</p></Card></div>
      </section>

      <section className="section"><SectionHeading title="Pilot Outcomes" />
        <div className="grid gap-4 lg:grid-cols-3">{caseStudies.map((c) => <Card key={c.company}><p className="text-sm text-textSecondary">{c.company}</p><p className="mt-2 text-xl font-semibold text-accent">{c.metric}</p><p className="mt-2 text-sm text-textSecondary">{c.outcome}</p></Card>)}</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">{testimonials.map((t) => <Card key={t.name}><p className="text-sm text-textSecondary">“{t.quote}”</p><p className="mt-3 text-sm text-textPrimary">{t.name}</p></Card>)}</div>
      </section>

      <section className="section"><Card className="text-center"><h3 className="text-2xl font-semibold">Deploy performance intelligence at scale.</h3><p className="mt-2 text-textSecondary">Run Sonartra Signals and generate actionable behavioural outputs for strategic decisions.</p><div className="mt-6"><Button href="/signup">Start with Sonartra Signals</Button></div></Card></section>
    </div>
  )
}

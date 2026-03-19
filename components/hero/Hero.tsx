'use client'

import { Button } from '@/components/ui/Button'
import { HeadlineReveal } from '@/components/ui/motion/HeadlineReveal'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/motion/Reveal'
import { HeroIntelligenceMap } from '@/components/visuals/HeroIntelligenceMap'

export function Hero() {
  return (
    <section className="section grid items-center gap-8 pb-10 pt-10 lg:grid-cols-[1.14fr_0.86fr] lg:gap-12 lg:pb-14 lg:pt-16">
      <RevealGroup className="max-w-[40rem] space-y-6" staggerChildren={0.08}>
        <RevealItem>
          <p className="eyebrow">Performance Intelligence Platform</p>
        </RevealItem>
        <RevealItem y={10}>
          <h1 className="headline-display max-w-[15ch]">
            <HeadlineReveal text="Operational performance intelligence from behavioural signal data.">
              Operational performance intelligence from <span className="headline-emphasis">behavioural signal data</span>.
            </HeadlineReveal>
          </h1>
        </RevealItem>
        <RevealItem>
          <p className="prose-support max-w-[36rem] text-[15px] leading-7 sm:text-base">
            Sonartra analyses behavioural signal data. Signals is the assessment layer; the platform models how people operate, teams interact, and organisations perform to inform decision-making.
          </p>
        </RevealItem>
        <RevealItem>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button href="/assessment-entry" variant="secondary" className="min-h-11 border-border/70 bg-panel/55 px-5 text-[#D7E2F3] hover:border-accent/40 hover:bg-panel/70">
              Run Signals Assessment
            </Button>
            <Button href="#platform-model" variant="ghost" className="min-h-11 px-4 text-[#AFC0D8] hover:bg-panel/45 hover:text-[#E3EBF8]">
              View Platform Model
            </Button>
          </div>
        </RevealItem>
      </RevealGroup>

      <Reveal className="surface hero-anchor-effect relative overflow-hidden p-3 sm:p-4 lg:ml-auto lg:w-[min(100%,31rem)]" y={8} delay={0.1}>
        <div className="absolute inset-x-8 top-0 h-24 bg-gradient-to-b from-accent/15 to-transparent blur-3xl" />
        <div className="relative rounded-xl border border-border/70 bg-bg/70 p-5 sm:p-6">
          <HeroIntelligenceMap />
        </div>
      </Reveal>
    </section>
  )
}

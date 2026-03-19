'use client'

import { Button } from '@/components/ui/Button'
import { HeadlineReveal } from '@/components/ui/motion/HeadlineReveal'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/motion/Reveal'
import { HeroIntelligenceMap } from '@/components/visuals/HeroIntelligenceMap'

export function Hero() {
  return (
    <section className="section grid items-center gap-10 pb-12 pt-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:pb-16 lg:pt-16">
      <RevealGroup className="max-w-[39rem] space-y-7 lg:space-y-8" staggerChildren={0.08}>
        <RevealItem>
          <p className="eyebrow">Performance Intelligence Platform</p>
        </RevealItem>
        <RevealItem y={10}>
          <h1 className="headline-display max-w-[13ch]">
            <HeadlineReveal text="Operational performance intelligence from behavioural signal data.">
              Operational performance intelligence from <span className="headline-emphasis">behavioural signal data</span>.
            </HeadlineReveal>
          </h1>
        </RevealItem>
        <RevealItem>
          <p className="prose-support max-w-[35rem] text-[15px] leading-7 sm:text-base">
            Sonartra analyses behavioural signal data. Signals is the assessment layer; the platform models how people operate, teams interact, and organisations perform to inform decision-making.
          </p>
        </RevealItem>
        <RevealItem>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button href="/assessment-entry" variant="secondary" className="min-h-11 border-white/[0.1] bg-panel/60 px-5 text-[#D7E2F3] hover:border-accent/30 hover:bg-panel/75">
              Run Signals Assessment
            </Button>
            <Button href="#platform-model" variant="ghost" className="min-h-11 px-4 text-[#A7B9D1] hover:bg-panel/40 hover:text-[#E3EBF8]">
              View Platform Model
            </Button>
          </div>
        </RevealItem>
      </RevealGroup>

      <Reveal className="surface hero-anchor-effect relative overflow-hidden p-3 sm:p-4 lg:ml-auto lg:w-[min(100%,31.5rem)]" y={8} delay={0.1}>
        <div className="absolute inset-x-10 top-0 h-20 bg-gradient-to-b from-accent/8 to-transparent blur-3xl" />
        <div className="relative rounded-[1.1rem] border border-white/[0.08] bg-bg/60 p-4 sm:p-5">
          <HeroIntelligenceMap />
        </div>
      </Reveal>
    </section>
  )
}

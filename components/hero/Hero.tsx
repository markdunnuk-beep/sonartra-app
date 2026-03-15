'use client'

import { Button } from '@/components/ui/Button'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/motion/Reveal'
import { HeroIntelligenceMap } from '@/components/visuals/HeroIntelligenceMap'

export function Hero() {
  return (
    <section className="section grid items-center gap-10 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:pt-16">
      <RevealGroup className="space-y-7" staggerChildren={0.08}>
        <RevealItem>
          <p className="eyebrow">Performance Intelligence Platform</p>
        </RevealItem>
        <RevealItem y={10}>
          <h1 className="headline-display">
            Improve execution quality with <span className="headline-emphasis">behavioural intelligence</span>.
          </h1>
        </RevealItem>
        <RevealItem>
          <p className="prose-support max-w-[38rem]">
            Sonartra maps <span className="text-strategic">Individual Intelligence</span>, <span className="text-strategic">Team Intelligence</span>, and{' '}
            <span className="text-strategic">Organisational Intelligence</span> into clear operating insight for better strategic decisions.
          </p>
        </RevealItem>
        <RevealItem>
          <div className="flex flex-wrap gap-3 pt-1">
            <Button href="/assessment" className="min-h-11 px-5">
              Start Signals Assessment
            </Button>
            <Button href="/platform" variant="secondary" className="min-h-11 px-5">
              Explore Platform
            </Button>
          </div>
        </RevealItem>
      </RevealGroup>

      <Reveal className="surface interactive-surface hero-anchor-effect relative overflow-hidden p-4 sm:p-6" y={8} delay={0.1}>
        <div className="absolute inset-x-6 top-0 h-28 bg-gradient-to-b from-accent/20 to-transparent blur-3xl" />
        <div className="relative rounded-xl border border-border/70 bg-bg/70 p-6">
          <HeroIntelligenceMap />
        </div>
      </Reveal>
    </section>
  )
}

'use client'

import { Button } from '@/components/ui/Button'
import { HeadlineReveal } from '@/components/ui/motion/HeadlineReveal'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/motion/Reveal'
import { HeroSignalBackground } from '@/components/hero/HeroSignalBackground'

const intelligenceLayers = ['Individual Intelligence', 'Team Intelligence', 'Organisational Intelligence']

export function Hero() {
  return (
    <section className="section pb-12 pt-8 md:pt-10 lg:pb-16 lg:pt-14">
      <Reveal className="surface hero-anchor-effect hero-premium-shell relative isolate overflow-hidden px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12" y={8}>
        <HeroSignalBackground />

        <div className="relative z-10 grid items-end gap-10 lg:grid-cols-[minmax(0,1.04fr)_minmax(18rem,0.58fr)] lg:gap-12">
          <RevealGroup className="hero-copy-column max-w-[42rem] space-y-7 lg:space-y-8" staggerChildren={0.08}>
            <RevealItem>
              <p className="eyebrow">Performance Intelligence Platform</p>
            </RevealItem>
            <RevealItem y={10}>
              <h1 className="headline-display hero-headline max-w-[14ch] text-balance">
                <HeadlineReveal text="Operational performance intelligence from behavioural signal data.">
                  Operational performance intelligence from <span className="headline-emphasis">behavioural signal data</span>.
                </HeadlineReveal>
              </h1>
            </RevealItem>
            <RevealItem>
              <p className="prose-support max-w-[37rem] text-[15px] leading-7 text-[#b4c0d2] sm:text-base">
                Measure how people operate, how teams interact, and where organisational performance is being strengthened or lost.
              </p>
            </RevealItem>
            <RevealItem>
              <div className="flex flex-wrap gap-3 pt-1">
                <Button href="/assessment-entry" variant="secondary" className="min-h-11 border-white/[0.1] bg-panel/70 px-5 text-[#dce7f6] hover:border-accent/30 hover:bg-panel/85">
                  Run Signals Assessment
                </Button>
                <Button href="#platform-model" variant="ghost" className="min-h-11 px-4 text-[#adbed5] hover:bg-panel/45 hover:text-[#ecf3fd]">
                  View Platform Model
                </Button>
              </div>
            </RevealItem>
          </RevealGroup>

          <div className="relative z-10 flex h-full items-end lg:justify-end">
            <div className="hero-layer-panel w-full max-w-[24rem] rounded-[1.35rem] border border-white/[0.08] bg-[#08111c]/64 p-4 backdrop-blur-md sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8ea6c5]">Sonartra Signals</p>
              <div className="mt-5 space-y-3">
                {intelligenceLayers.map((layer, index) => (
                  <div key={layer} className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3">
                    <div>
                      <p className="text-sm font-medium text-[#e2eaf7]">{layer}</p>
                      <p className="mt-1 text-xs leading-5 text-[#8fa0b8]">
                        {index === 0 && 'Behavioural pattern detection at the individual operating level.'}
                        {index === 1 && 'Interaction, coordination, and execution clarity across groups.'}
                        {index === 2 && 'System-wide performance conditions across the organisation.'}
                      </p>
                    </div>
                    <span className="hero-live-pill shrink-0 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.2em]">
                      Live
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}

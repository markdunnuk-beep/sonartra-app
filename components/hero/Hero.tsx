'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { HeroIntelligenceMap } from '@/components/visuals/HeroIntelligenceMap'
import { createRevealVariants, transitionPresets } from '@/lib/motion/tokens'

export function Hero() {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <section className="section grid items-center gap-10 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:pt-16">
      <motion.div
        variants={prefersReducedMotion ? undefined : createRevealVariants({ y: 10, duration: 0.44 })}
        initial={prefersReducedMotion ? undefined : 'hidden'}
        animate={prefersReducedMotion ? undefined : 'visible'}
        className="space-y-7"
      >
        <p className="eyebrow">Performance Intelligence Platform</p>
        <h1 className="headline-display">
          Improve execution quality with <span className="headline-emphasis">behavioural intelligence</span>.
        </h1>
        <p className="prose-support max-w-[38rem]">
          Sonartra maps <span className="text-strategic">Individual Intelligence</span>, <span className="text-strategic">Team Intelligence</span>, and{' '}
          <span className="text-strategic">Organisational Intelligence</span> into clear operating insight for better strategic decisions.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button href="/assessment" className="min-h-11 px-5">
            Start Signals Assessment
          </Button>
          <Button href="/platform" variant="secondary" className="min-h-11 px-5">
            Explore Platform
          </Button>
        </div>
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.985 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={prefersReducedMotion ? undefined : { ...transitionPresets.reveal, delay: 0.08 }}
        className="surface interactive-surface relative overflow-hidden p-4 sm:p-6"
      >
        <div className="absolute inset-x-6 top-0 h-28 bg-gradient-to-b from-accent/20 to-transparent blur-3xl" />
        <div className="relative rounded-xl border border-border/70 bg-bg/70 p-6">
          <HeroIntelligenceMap />
        </div>
      </motion.div>
    </section>
  )
}

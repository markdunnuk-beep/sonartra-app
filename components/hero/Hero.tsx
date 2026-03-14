'use client'

import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { IntelligenceTriangle } from './IntelligenceTriangle'

export function Hero() {
  const prefersReducedMotion = useReducedMotion() ?? false

  return (
    <section className="section grid items-center gap-10 pt-12 lg:grid-cols-[1.08fr_0.92fr] lg:pt-16">
      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 10 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-7"
      >
        <p className="eyebrow">Performance Intelligence Platform</p>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight md:text-5xl lg:text-6xl">
          Improve execution quality with behavioural intelligence.
        </h1>
        <p className="prose-copy">
          Sonartra maps individual, team, and organisational performance signals into clear operating insight for better
          strategic decisions.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/assessment"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-accent/70 bg-accent px-5 text-sm font-medium text-[#031126] transition hover:-translate-y-0.5 hover:bg-[#6BAFFF]"
          >
            Start Signals Assessment
          </Link>
          <Link
            href="/platform"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border/90 bg-panel/80 px-5 text-sm font-medium text-textPrimary transition hover:border-accent/50"
          >
            Explore Platform
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.98 }}
        animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.08 }}
        className="surface relative overflow-hidden p-4 sm:p-6"
      >
        <div className="absolute inset-x-6 top-0 h-28 bg-gradient-to-b from-accent/20 to-transparent blur-3xl" />
        <div className="relative rounded-xl border border-border/70 bg-bg/70 p-6">
          <IntelligenceTriangle />
        </div>
      </motion.div>
    </section>
  )
}

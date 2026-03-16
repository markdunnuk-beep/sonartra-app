'use client'

import { type ReactNode } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

type HeadlineRevealProps = {
  text: string
  children: ReactNode
  duration?: number
  delay?: number
  className?: string
}

export function HeadlineReveal({ text, children, duration = 1.45, delay = 0.06, className }: HeadlineRevealProps) {
  const reduceMotion = useReducedMotion() ?? false

  if (reduceMotion) {
    return <span className={className}>{children}</span>
  }

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="relative inline-block align-baseline pb-[0.08em]">
        <span className="pointer-events-none invisible block select-none">{children}</span>
        <motion.span
          aria-hidden
          className="absolute inset-x-0 top-0 block will-change-[clip-path]"
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0 0 0)' }}
          transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          {children}
        </motion.span>
      </span>
    </span>
  )
}

'use client'

import { motion, useReducedMotion } from 'framer-motion'

type HeadlineRevealProps = {
  text: string
  duration?: number
  delay?: number
  className?: string
}

export function HeadlineReveal({ text, duration = 1.45, delay = 0.06, className }: HeadlineRevealProps) {
  const reduceMotion = useReducedMotion() ?? false

  if (reduceMotion) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="relative block">
        <span className="pointer-events-none select-none opacity-0">{text}</span>
        <motion.span
          aria-hidden
          className="absolute inset-0 block will-change-[clip-path]"
          initial={{ clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0 0 0)' }}
          transition={{ duration, delay, ease: [0.22, 1, 0.36, 1] }}
        >
          {text}
        </motion.span>
      </span>
    </span>
  )
}

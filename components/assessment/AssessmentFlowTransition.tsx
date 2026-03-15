'use client'

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { type ReactNode } from 'react'
import { motionDuration, motionEase } from '@/lib/motion/tokens'

export function AssessmentFlowTransition({ children, transitionKey }: { children: ReactNode; transitionKey: number }) {
  const reduceMotion = useReducedMotion() ?? false

  if (reduceMotion) {
    return <div>{children}</div>
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: motionDuration.instant, ease: motionEase.standard }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}

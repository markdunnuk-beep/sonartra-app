'use client'

import { type ReactNode } from 'react'
import { motion, useReducedMotion, type HTMLMotionProps, type Variants } from 'framer-motion'
import { createRevealVariants, createStaggerVariants } from '@/lib/motion/tokens'

type RevealProps = {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
  amount?: number
  once?: boolean
  y?: number
  delay?: number
  variants?: Variants
} & Omit<HTMLMotionProps<'div'>, 'children'>

const tagMap = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
} as const

export function Reveal({
  children,
  className,
  as = 'div',
  amount = 0.2,
  once = true,
  y,
  delay,
  variants,
  transition,
  ...rest
}: RevealProps) {
  const reduceMotion = useReducedMotion() ?? false
  const MotionComponent = tagMap[as]

  if (reduceMotion) {
    return (
      <MotionComponent className={className} {...rest}>
        {children}
      </MotionComponent>
    )
  }

  return (
    <MotionComponent
      className={className}
      variants={variants ?? createRevealVariants({ y })}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      transition={{ delay, ...transition }}
      {...rest}
    >
      {children}
    </MotionComponent>
  )
}

type RevealGroupProps = {
  children: ReactNode
  className?: string
  amount?: number
  once?: boolean
  staggerChildren?: number
  delayChildren?: number
}

export function RevealGroup({ children, className, amount = 0.12, once = true, staggerChildren, delayChildren }: RevealGroupProps) {
  const reduceMotion = useReducedMotion() ?? false

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      variants={createStaggerVariants({ staggerChildren, delayChildren })}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
    >
      {children}
    </motion.div>
  )
}

export function RevealItem({ children, className, y }: { children: ReactNode; className?: string; y?: number }) {
  const reduceMotion = useReducedMotion() ?? false

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div className={className} variants={createRevealVariants({ y })}>
      {children}
    </motion.div>
  )
}

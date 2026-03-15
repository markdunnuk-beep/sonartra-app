import { type Transition, type Variants } from 'framer-motion'

export const motionDuration = {
  instant: 0.12,
  fast: 0.2,
  base: 0.32,
  medium: 0.44,
} as const

export const motionEase = {
  standard: [0.22, 1, 0.36, 1],
  emphasize: [0.2, 0.8, 0.2, 1],
  entrance: [0.16, 1, 0.3, 1],
} as const

export const transitionPresets = {
  surfaceHover: {
    duration: motionDuration.fast,
    ease: motionEase.standard,
  } satisfies Transition,
  reveal: {
    duration: motionDuration.base,
    ease: motionEase.entrance,
  } satisfies Transition,
  staggerContainer: {
    duration: motionDuration.base,
    ease: motionEase.entrance,
  } satisfies Transition,
} as const

type RevealOptions = {
  y?: number
  duration?: number
}

export function createRevealVariants(options: RevealOptions = {}): Variants {
  const { y = 14, duration = motionDuration.base } = options

  return {
    hidden: {
      opacity: 0,
      y,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration,
        ease: motionEase.entrance,
      },
    },
  }
}

type StaggerOptions = {
  delayChildren?: number
  staggerChildren?: number
}

export function createStaggerVariants(options: StaggerOptions = {}): Variants {
  const { delayChildren = 0.03, staggerChildren = 0.07 } = options

  return {
    hidden: {},
    visible: {
      transition: {
        delayChildren,
        staggerChildren,
      },
    },
  }
}

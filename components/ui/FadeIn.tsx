'use client'

import { type ReactNode } from 'react'
import { Reveal } from '@/components/ui/motion/Reveal'

export function FadeIn({ children }: { children: ReactNode }) {
  return <Reveal>{children}</Reveal>
}

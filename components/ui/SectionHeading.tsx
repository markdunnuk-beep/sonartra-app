'use client'

import { type ReactNode } from 'react'
import { Reveal } from '@/components/ui/motion/Reveal'

export function SectionHeading({ eyebrow, title, description, right }: { eyebrow?: string; title: string; description?: string; right?: ReactNode }) {
  return (
    <Reveal className="section-heading-shell" y={8}>
      <div className="section-heading-copy">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="headline-section max-w-[16ch]">{title}</h2>
        {description && <p className="prose-support max-w-[36rem]">{description}</p>}
      </div>
      {right}
    </Reveal>
  )
}

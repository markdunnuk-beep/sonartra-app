import { ReactNode } from 'react'

export function SectionHeading({ eyebrow, title, description, right }: { eyebrow?: string; title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="mb-12 flex flex-wrap items-end justify-between gap-5 md:mb-14">
      <div className="max-w-2xl space-y-4">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="headline-section">{title}</h2>
        {description && <p className="prose-support max-w-xl">{description}</p>}
      </div>
      {right}
    </div>
  )
}

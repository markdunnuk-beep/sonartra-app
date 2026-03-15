import { ReactNode } from 'react'

export function SectionHeading({ eyebrow, title, description, right }: { eyebrow?: string; title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl space-y-3.5">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2 className="headline-section">{title}</h2>
        {description && <p className="prose-support max-w-xl">{description}</p>}
      </div>
      {right}
    </div>
  )
}

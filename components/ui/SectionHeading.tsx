import { ReactNode } from 'react'

export function SectionHeading({ eyebrow, title, description, right }: { eyebrow?: string; title: string; description?: string; right?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        {eyebrow && <p className="mb-2 text-xs uppercase tracking-[0.2em] text-textSecondary">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold tracking-tight text-textPrimary md:text-3xl">{title}</h2>
        {description && <p className="mt-3 text-textSecondary">{description}</p>}
      </div>
      {right}
    </div>
  )
}

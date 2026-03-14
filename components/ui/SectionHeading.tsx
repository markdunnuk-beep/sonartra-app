import { ReactNode } from 'react'

export function SectionHeading({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string
  title: string
  description?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-3xl">
        {eyebrow && <p className="muted-label mb-2">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold leading-tight text-textPrimary md:text-3xl">{title}</h2>
        {description && <p className="mt-3 text-sm leading-relaxed text-textSecondary md:text-base">{description}</p>}
      </div>
      {right}
    </div>
  )
}

import React from 'react'
import { ReactNode } from 'react'

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <p className="eyebrow">{eyebrow}</p>
        <div>
          <h1 className="text-[2rem] font-semibold tracking-tight text-textPrimary">{title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  )
}

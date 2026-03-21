import React from 'react'
import { LayoutDashboard } from 'lucide-react'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'

export function AdminPageHeader({
  eyebrow,
  title,
  description,
  actions,
  showDashboardButton = true,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: ReactNode
  showDashboardButton?: boolean
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
      {showDashboardButton || actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {showDashboardButton ? (
            <Button href="/admin" variant="ghost" className="min-h-9 px-3">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Button>
          ) : null}
          {actions}
        </div>
      ) : null}
    </div>
  )
}

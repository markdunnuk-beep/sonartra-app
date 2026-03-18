import React from 'react'
import { clsx } from 'clsx'
import { Card } from './Card'

export function StatCard({
  label,
  value,
  detail,
  className,
  labelClassName,
  valueClassName,
  detailClassName,
}: {
  label: string
  value: string
  detail?: string
  className?: string
  labelClassName?: string
  valueClassName?: string
  detailClassName?: string
}) {
  return (
    <Card className={clsx('group min-h-[124px] px-6 py-5 sm:px-7 sm:py-6', className)}>
      <p className={clsx('text-[11px] uppercase tracking-[0.12em] text-textSecondary', labelClassName)}>{label}</p>
      <p className={clsx('mt-2.5 text-2xl font-semibold tracking-tight text-textPrimary', valueClassName)}>{value}</p>
      {detail && <p className={clsx('mt-3 border-t border-border/70 pt-3 text-sm leading-5 text-textSecondary', detailClassName)}>{detail}</p>}
    </Card>
  )
}

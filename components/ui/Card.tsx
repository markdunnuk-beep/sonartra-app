import React from 'react'
import { clsx } from 'clsx'
import { type HTMLAttributes } from 'react'
import { type ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  interactive?: boolean
} & HTMLAttributes<HTMLDivElement>

export function Card({ children, className, interactive = false, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        'surface relative overflow-hidden p-6 sm:p-7',
        interactive && 'interactive-surface',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.02] before:via-transparent before:to-transparent',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  )
}

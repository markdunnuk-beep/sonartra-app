import { clsx } from 'clsx'
import { type ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  interactive?: boolean
}

export function Card({ children, className, interactive = false }: CardProps) {
  return (
    <div
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

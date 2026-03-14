import { clsx } from 'clsx'
import { ReactNode } from 'react'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'surface relative overflow-hidden p-6 sm:p-7',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.02] before:via-transparent before:to-transparent',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  )
}

import { clsx } from 'clsx'
import { ReactNode } from 'react'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl border border-border/80 bg-panel/90 p-5 shadow-panel backdrop-blur-sm sm:p-6',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.02] before:to-transparent',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  )
}

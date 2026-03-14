import { ReactNode } from 'react'
import { clsx } from 'clsx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border/80 bg-panel/90 p-5 shadow-panel backdrop-blur-sm sm:p-6',
        'relative overflow-hidden before:pointer-events-none before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/[0.02] before:to-transparent',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  )
}

import { clsx } from 'clsx'
import { type ReactNode } from 'react'

type AssessmentShellProps = {
  children: ReactNode
  className?: string
  header?: ReactNode
  footer?: ReactNode
  aside?: ReactNode
}

export function AssessmentShell({ children, className, header, footer, aside }: AssessmentShellProps) {
  return (
    <section
      className={clsx(
        'surface relative mx-auto w-full max-w-4xl overflow-hidden border-border/70 bg-panel/85 p-4 sm:p-6 lg:p-8',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(116,172,255,0.12),transparent_38%)]" />
      <div className="relative flex flex-col gap-6 lg:gap-7">
        {header ? <div>{header}</div> : null}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start lg:gap-8">
          <div className="space-y-5">{children}</div>
          {aside ? <aside className="space-y-3">{aside}</aside> : null}
        </div>
        {footer ? <div>{footer}</div> : null}
      </div>
    </section>
  )
}

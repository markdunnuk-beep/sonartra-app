import { clsx } from 'clsx'

export function AssessmentPrompt({
  question,
  helper,
  label = 'Signal Prompt',
  className,
}: {
  question: string
  helper?: string
  label?: string
  className?: string
}) {
  return (
    <header className={clsx('space-y-3', className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-textSecondary/85">{label}</p>
      <h2 className="text-2xl font-semibold leading-tight text-textPrimary sm:text-[1.75rem]">{question}</h2>
      {helper ? <p className="text-sm leading-6 text-textSecondary">{helper}</p> : null}
    </header>
  )
}

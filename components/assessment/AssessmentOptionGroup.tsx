'use client'

import { clsx } from 'clsx'

const defaultOptions = ['Strongly Agree', 'Agree', 'Neutral', 'Disagree', 'Strongly Disagree']

export function AssessmentOptionGroup({
  selected,
  onSelect,
  options = defaultOptions,
}: {
  selected?: string
  onSelect: (value: string) => void
  options?: string[]
}) {
  return (
    <div className="grid gap-2.5" role="radiogroup" aria-label="Assessment response options">
      {options.map((option) => {
        const isSelected = selected === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(option)}
            className={clsx(
              'interaction-control group w-full rounded-xl border px-4 py-3.5 text-left sm:px-5',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              isSelected
                ? 'border-accent/65 bg-accent/10 text-textPrimary shadow-[inset_0_0_0_1px_rgba(129,188,255,0.26)]'
                : 'border-border/80 bg-bg/45 text-textSecondary hover:border-accent/45 hover:bg-panel/85 hover:text-textPrimary',
            )}
          >
            <span className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{option}</span>
              <span
                className={clsx(
                  'h-2.5 w-2.5 rounded-full border transition-colors duration-200',
                  isSelected ? 'border-accent bg-accent' : 'border-textSecondary/50 bg-transparent group-hover:border-accent/60',
                )}
                aria-hidden
              />
            </span>
          </button>
        )
      })}
    </div>
  )
}

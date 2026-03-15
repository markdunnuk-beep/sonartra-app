'use client'

import { clsx } from 'clsx'
import { KeyboardEvent } from 'react'

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
  const selectedIndex = selected ? options.indexOf(selected) : -1

  const handleArrowNavigation = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    const key = event.key
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) return

    event.preventDefault()

    const move = key === 'ArrowDown' || key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + move + options.length) % options.length
    const nextOption = options[nextIndex]
    onSelect(nextOption)

    requestAnimationFrame(() => {
      const nextButton = event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`button[data-option-index='${nextIndex}']`)
      nextButton?.focus()
    })
  }

  return (
    <div className="grid gap-2.5" role="radiogroup" aria-label="Assessment response options">
      {options.map((option, index) => {
        const isSelected = selected === option
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={isSelected}
            data-option-index={index}
            tabIndex={selectedIndex === -1 ? (index === 0 ? 0 : -1) : isSelected ? 0 : -1}
            onClick={() => onSelect(option)}
            onKeyDown={(event) => handleArrowNavigation(event, index)}
            className={clsx(
              'interaction-control group relative w-full rounded-xl border px-4 py-3.5 text-left sm:px-5',
              'motion-safe:transition-[transform,box-shadow,background-color,border-color,color] motion-safe:duration-200 motion-safe:ease-out',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/75 focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
              'hover:-translate-y-[1px] active:translate-y-[1px] active:duration-75',
              isSelected
                ? 'border-accent/80 bg-[#122641] text-textPrimary shadow-[inset_0_0_0_1px_rgba(146,199,255,0.5),0_10px_20px_-18px_rgba(130,190,255,0.85)]'
                : 'border-border/80 bg-bg/45 text-textSecondary hover:border-accent/50 hover:bg-panel/95 hover:text-textPrimary',
            )}
          >
            <span
              className={clsx(
                'pointer-events-none absolute inset-0 rounded-xl',
                'opacity-0 motion-safe:transition-opacity motion-safe:duration-200',
                isSelected ? 'opacity-100 shadow-[0_0_0_1px_rgba(146,199,255,0.3),0_0_26px_-20px_rgba(133,193,255,0.9)]' : '',
              )}
              aria-hidden
            />
            <span className="relative flex items-center justify-between gap-4">
              <span className="text-sm font-medium">{option}</span>
              <span
                className={clsx(
                  'h-2.5 w-2.5 rounded-full border transition-colors duration-200',
                  isSelected ? 'border-accent bg-accent shadow-[0_0_10px_-4px_rgba(118,184,255,0.95)]' : 'border-textSecondary/50 bg-transparent group-hover:border-accent/60',
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

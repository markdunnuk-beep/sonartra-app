import { clsx } from 'clsx'
import { InputHTMLAttributes } from 'react'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={clsx(
        'h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 placeholder:text-textSecondary focus:border-accent/50 focus:ring',
        className,
      )}
    />
  )
}

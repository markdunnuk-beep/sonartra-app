import { TextareaHTMLAttributes } from 'react'

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="min-h-28 w-full rounded-lg border border-border bg-bg/50 px-3 py-2.5 text-sm text-textPrimary outline-none ring-accent/40 placeholder:text-textSecondary focus:ring"
    />
  )
}

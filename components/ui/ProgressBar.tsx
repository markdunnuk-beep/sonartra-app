export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full rounded-full bg-border/80">
      <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${value}%` }} />
    </div>
  )
}

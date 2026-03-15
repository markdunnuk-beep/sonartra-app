export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="relative h-2.5 w-full overflow-hidden rounded-full border border-border/80 bg-bg/80">
      <div
        className="h-full rounded-full bg-gradient-to-r from-accent/70 via-accent to-blue-400 motion-safe:transition-[width,filter] motion-safe:duration-400 motion-safe:ease-out motion-reduce:transition-none"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

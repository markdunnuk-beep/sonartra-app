export function BarList({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border border-border/65 bg-panel/45 px-3 py-2">
          <div className="mb-1 flex justify-between text-sm text-textSecondary">
            <span>{item.label}</span>
            <span className="font-medium text-textPrimary/95">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-border/90">
            <div
              className="h-full rounded-full bg-accent motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
              style={{ width: `${item.value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

export function BarList({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-sm text-textSecondary"><span>{item.label}</span><span>{item.value}</span></div>
          <div className="h-2 rounded-full bg-border"><div className="h-full rounded-full bg-accent" style={{ width: `${item.value}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

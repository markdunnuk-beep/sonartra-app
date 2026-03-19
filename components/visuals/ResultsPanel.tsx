const leadershipMetrics = [
  ['Strategic Vision', 82],
  ['Execution Discipline', 66],
  ['Risk Appetite', 73],
  ['Conflict Style', 44],
]

export function ResultsPanel() {
  return (
    <div className="visual-shell interactive-surface rounded-[1.375rem] bg-[#0c1624]/82 p-5 sm:p-6">
      <p className="eyebrow">Generated Insight Preview</p>
      <div className="mt-5 rounded-[1rem] border border-white/[0.08] bg-[#0f1b2b]/76 p-4">
        <p className="text-sm font-medium text-[#e2ecfb]">Leadership Architecture</p>
        <div className="mt-3 space-y-2.5">
          {leadershipMetrics.map(([label, value]) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-[#9eb3ce]">
                <span>{label}</span>
                <span>{value}%</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/8">
                <div className="h-full rounded-full bg-accent/65" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
        {[
          ['Culture Tension Index', 'Moderate'],
          ['Stress Derailer Risk', 'Monitored'],
          ['Behavioural Strength Profile', 'Adaptive Strategist'],
          ['Decision Reliability', 'High Confidence'],
        ].map(([title, value]) => (
          <div key={title} className="rounded-[0.95rem] border border-white/[0.08] bg-[#111f31]/72 px-3.5 py-3">
            <p className="text-[11px] uppercase tracking-[0.13em] text-[#90a7c5]">{title}</p>
            <p className="mt-1.5 text-sm text-[#d4e2f5]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

'use client'

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'

export function RadarSummaryChart({ data }: { data: { name: string; score: number }[] }) {
  return (
    <div className="h-72 w-full rounded-xl border border-border/70 bg-bg/45 p-3 sm:p-4">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="68%">
          <PolarGrid stroke="#2A2F36" />
          <PolarAngleAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11, letterSpacing: 0.8 }} />
          <Radar dataKey="score" stroke="#4CA3FF" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

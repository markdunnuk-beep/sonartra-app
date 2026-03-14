'use client'

import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, Radar } from 'recharts'

export function RadarSummaryChart({ data }: { data: { name: string; score: number }[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid stroke="#2A2F36" />
          <PolarAngleAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
          <Radar dataKey="score" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.25} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

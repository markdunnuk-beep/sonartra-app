import { Card } from '@/components/ui/Card'
import { PillTag } from '@/components/ui/PillTag'

export function TeamMatrix({ members }: { members: { name: string; style: string; leadership: string; risk: string; alignment: string }[] }) {
  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold tracking-tight text-textPrimary">Team Intelligence Map</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-textSecondary">
            <tr>
              <th className="pb-3">Name</th>
              <th className="pb-3">Primary Style</th>
              <th className="pb-3">Leadership Pattern</th>
              <th className="pb-3">Risk</th>
              <th className="pb-3">Alignment</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.name} className="border-t border-border/70 text-textPrimary">
                <td className="py-3.5">{m.name}</td>
                <td>{m.style}</td>
                <td>{m.leadership}</td>
                <td>
                  <PillTag label={m.risk} />
                </td>
                <td>{m.alignment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

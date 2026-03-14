import { Card } from '@/components/ui/Card'
import { PillTag } from '@/components/ui/PillTag'

export function TeamMatrix({ members }: { members: { name: string; style: string; leadership: string; risk: string; alignment: string }[] }) {
  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-textPrimary">Team Intelligence Map</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-textSecondary"><tr><th>Name</th><th>Primary Style</th><th>Leadership Pattern</th><th>Risk</th><th>Alignment</th></tr></thead>
          <tbody>
            {members.map((m) => <tr key={m.name} className="border-t border-border text-textPrimary"><td className="py-3">{m.name}</td><td>{m.style}</td><td>{m.leadership}</td><td><PillTag label={m.risk} /></td><td>{m.alignment}</td></tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

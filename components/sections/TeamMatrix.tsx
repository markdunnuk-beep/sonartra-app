import { Card } from '@/components/ui/Card'
import { PillTag } from '@/components/ui/PillTag'

export function TeamMatrix({ members }: { members: { name: string; style: string; leadership: string; risk: string; alignment: string }[] }) {
  return (
    <Card className="panel-hover">
      <h3 className="text-lg font-semibold text-textPrimary">Team Intelligence Map</h3>
      <p className="mt-1 text-sm text-textSecondary">Behaviour, leadership, and risk distribution by assessed member.</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-textSecondary">
            <tr>
              <th className="pb-2">Name</th>
              <th className="pb-2">Primary Style</th>
              <th className="pb-2">Leadership Pattern</th>
              <th className="pb-2">Risk</th>
              <th className="pb-2">Alignment</th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.name} className="border-t border-border text-textPrimary">
                <td className="py-3 pr-4">{m.name}</td>
                <td className="pr-4 text-textSecondary">{m.style}</td>
                <td className="pr-4 text-textSecondary">{m.leadership}</td>
                <td className="pr-4"><PillTag label={m.risk} /></td>
                <td className="text-textSecondary">{m.alignment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

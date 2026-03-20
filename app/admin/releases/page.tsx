import { AdminModulePlaceholder } from '@/components/admin/AdminModulePlaceholder'

export default function AdminReleasesPage() {
  return (
    <AdminModulePlaceholder
      eyebrow="Releases"
      title="Release readiness and publish control"
      description="Coordinate validation outcomes, preview checkpoints, and publish decisions before any assessment change becomes live."
      operatingNote="Releases will become the action surface for staged assessment changes: what is ready, what is blocked, who approved it, and whether a publish decision should proceed or pause."
      pillars={[
        {
          title: 'Readiness queue',
          detail: 'Show versions approaching release with blockers, validation results, and dependency checks in one operational view.',
        },
        {
          title: 'Publish decision trail',
          detail: 'Capture review intent, publish status, and rollout timing so releases stay deliberate and reversible.',
        },
        {
          title: 'Release history',
          detail: 'Maintain a clear record of what moved live, when it changed, and which assessment versions were affected.',
        },
      ]}
    />
  )
}

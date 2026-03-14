import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[280px_minmax(0,1fr)]">
      <Sidebar />
      <main className="min-h-screen p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
    </div>
  )
}

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="lg:flex">
      <Sidebar />
      <main className="min-h-screen flex-1 bg-bg p-4 md:p-8">{children}</main>
    </div>
  )
}

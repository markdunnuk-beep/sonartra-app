import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg lg:flex">
      <Sidebar />
      <main className="min-h-screen flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  )
}

import { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <Sidebar />
      <main className="min-h-screen px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
        {children}
      </main>
    </div>
  )
}

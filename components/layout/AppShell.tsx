import React, { ReactNode } from 'react'
import { Sidebar } from './Sidebar'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[300px_minmax(0,1fr)]">
      <Sidebar />
      <main className="min-h-screen px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8 xl:px-10">{children}</main>
    </div>
  )
}

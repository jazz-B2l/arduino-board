'use client'

import { AppFooter } from './AppFooter'
import { AppHeader } from './AppHeader'
import { AppNav } from './AppNav'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen" style={{ backgroundColor: '#0a0e1a' }}>
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppNav />
        <main className="flex-1 overflow-y-auto relative" id="main-content">
          {children}
        </main>
      </div>
      <AppFooter />
    </div>
  )
}

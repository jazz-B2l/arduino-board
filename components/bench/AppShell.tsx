'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth/AuthContext'
import { AppFooter } from './AppFooter'
import { AppHeader } from './AppHeader'
import { AppNav } from './AppNav'
import { CpuIcon } from 'lucide-react'

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bench-bg text-bench-text">
        <div className="flex flex-col items-center gap-4">
          <CpuIcon size={44} className="text-blue-500 animate-pulse" />
          <p className="text-xs font-mono tracking-widest text-bench-muted uppercase animate-pulse">
            Verifying Workspace Access...
          </p>
        </div>
      </div>
    )
  }

  // Render empty state while redirecting
  if (!user) {
    return (
      <div className="min-h-screen bg-bench-bg" />
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-bench-bg text-bench-text">
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


'use client'

import { EmergencyStop } from './EmergencyStop'
import { StatusPill } from './StatusPill'
import { useBench } from './BenchContext'
import { useAuth } from '@/components/auth/AuthContext'
import Link from 'next/link'
import { LogOutIcon } from 'lucide-react'


export function AppHeader() {
  const { frozen, freeze, unfreeze } = useBench()
  const { user, profile, signOut } = useAuth()

  const initials = (profile?.full_name || user?.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()


  return (
    <>
        {frozen && (
          <div
            className="w-full text-center py-2 text-sm font-mono font-bold tracking-widest uppercase z-50"
            style={{ backgroundColor: '#ef4444', color: '#fff' }}
            role="alert"
          >
            ⏹ EMERGENCY STOP ACTIVATED — acquisition suspended
          </div>
        )}
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 border-b"
          style={{ backgroundColor: '#0d1220', borderColor: '#1f2937' }}
        >
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-sm"
              style={{ backgroundColor: '#1f2937', color: '#3b82f6', border: '1px solid #3b82f6' }}
              aria-hidden="true"
            >
              TB
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: '#3b82f6' }}>
                Test Bench
              </span>
              <span className="text-[10px]" style={{ color: '#64748b' }}>Monitoring Pro</span>
            </div>
          </div>

        {/* Center: status */}
        <div className="flex items-center gap-4">
          <StatusPill frozen={frozen} />
        </div>

        {/* Right side: Emergency stop & User Menu */}
        <div className="flex items-center gap-3">
          <EmergencyStop frozen={frozen} onFreeze={freeze} onResume={unfreeze} />
          
          {user && (
            <div className="flex items-center gap-2.5 border-l border-[#1f2937] pl-3">
              <Link href="/account" className="flex items-center gap-2 hover:opacity-85 transition-all">
                <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold border border-blue-400/20">
                  {initials}
                </div>
                <span className="text-[10px] font-mono text-slate-400 hover:text-slate-200 transition-colors hidden md:inline max-w-[80px] truncate">
                  {profile?.full_name || user.email?.split('@')[0]}
                </span>
              </Link>
              <button
                onClick={signOut}
                title="Sign Out of Workspace"
                className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-colors"
              >
                <LogOutIcon size={12} />
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  )
}

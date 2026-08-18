'use client'

import { EmergencyStop } from './EmergencyStop'
import { StatusPill } from './StatusPill'
import { useBench } from './BenchContext'
import { useAuth } from '@/components/auth/AuthContext'
import { useLanguage } from './LanguageContext'
import Link from 'next/link'
import { LogOutIcon } from 'lucide-react'


export function AppHeader() {
  const { frozen, freeze, unfreeze } = useBench()
  const { user, profile, signOut } = useAuth()
  const { lang, setLang, t } = useLanguage()

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
            {t('header.emergencyBanner')}
          </div>
        )}
        <header
          className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 border-b"
          style={{ backgroundColor: 'var(--bench-header-bg)', borderColor: 'var(--bench-border)' }}
        >
          {/* Logo + title */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center font-mono font-bold text-sm"
              style={{ backgroundColor: 'var(--bench-border)', color: 'var(--bench-info)', border: '1px solid var(--bench-info)' }}
              aria-hidden="true"
            >
              TB
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--bench-info)' }}>
                {t('header.title')}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--bench-muted)' }}>{t('header.subtitle')}</span>
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
            <div className="flex items-center gap-2.5 border-l border-bench-border pl-3">
              <Link href="/account" className="flex items-center gap-2 hover:opacity-85 transition-all">
                <div className="w-6.5 h-6.5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[9px] font-bold border border-blue-400/20">
                  {initials}
                </div>
                <span className="text-[10px] font-mono text-bench-muted hover:text-bench-text transition-colors hidden md:inline max-w-[80px] truncate">
                  {profile?.full_name || user.email?.split('@')[0]}
                </span>
              </Link>
              <button
                onClick={signOut}
                title={t('header.signOut')}
                className="p-1.5 rounded text-bench-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
              >
                <LogOutIcon size={12} />
              </button>
              {/* EN | AR language toggle */}
              <button
                onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
                title="Toggle language"
                className="px-2 py-0.5 rounded border text-[10px] font-mono font-bold transition-colors hover:bg-bench-subtle"
                style={{ borderColor: 'var(--bench-border)', color: 'var(--bench-muted)' }}
              >
                {lang === 'en' ? 'AR' : 'EN'}
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  )
}

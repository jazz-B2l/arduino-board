'use client'

import { useState, useRef, useEffect } from 'react'
import { EmergencyStop } from './EmergencyStop'
import { StatusPill } from './StatusPill'
import { useBench } from './BenchContext'
import { useAuth, formatGuestTime } from '@/components/auth/AuthContext'
import { useLanguage } from './LanguageContext'
import Link from 'next/link'
import { 
  LogOutIcon, 
  LayersIcon, 
  ChevronDownIcon, 
  PlusIcon, 
  CheckIcon, 
  ShieldAlertIcon, 
  CpuIcon,
  FolderIcon,
  ExternalLinkIcon,
  TimerIcon
} from 'lucide-react'
import { BOARD_DETAILS } from '@/lib/types'

export function AppHeader() {
  const { frozen, freeze, unfreeze, activeProject, projects, setActiveProject } = useBench()
  const { user, profile, isGuest, signOut, guestSecondsRemaining, exitGuestMode } = useAuth()
  const { lang, setLang, t } = useLanguage()

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const initials = (profile?.full_name || user?.email || (isGuest ? 'Guest' : 'U'))
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const activeBoardInfo = activeProject?.board_type 
    ? (BOARD_DETAILS[activeProject.board_type] || BOARD_DETAILS['Arduino Uno'])
    : null

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

      {/* Guest Mode banner with 20-min countdown timer */}
      {isGuest && (
        <div className={`w-full border-b px-4 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs z-30 font-mono transition-colors ${
          guestSecondsRemaining <= 300 
            ? 'bg-gradient-to-r from-red-500/25 via-amber-500/20 to-red-500/25 border-red-500/40 text-red-300' 
            : 'bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/20 border-amber-500/30 text-amber-300'
        }`}>
          <div className="flex items-center gap-2 text-amber-300">
            <ShieldAlertIcon size={14} className={`shrink-0 ${guestSecondsRemaining <= 300 ? 'text-red-400 animate-bounce' : 'text-amber-400 animate-pulse'}`} />
            <span className="text-[11px] font-semibold">{t('guest.banner')}</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Live 20-min countdown timer badge */}
            <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-wider ${
              guestSecondsRemaining <= 300
                ? 'bg-red-500/20 border-red-500/50 text-red-200 animate-pulse'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-200'
            }`}>
              <TimerIcon size={12} className={guestSecondsRemaining <= 300 ? 'text-red-400 animate-spin' : 'text-amber-300'} />
              <span>
                {guestSecondsRemaining <= 300 
                  ? t('guest.timerUrgentBadge', { time: formatGuestTime(guestSecondsRemaining) })
                  : t('guest.timerBadge', { time: formatGuestTime(guestSecondsRemaining) })}
              </span>
            </div>

            <Link
              href="/login"
              className="px-3 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold uppercase transition-all shadow-sm hover:scale-105"
            >
              {t('guest.signUpToSave')}
            </Link>

            <button
              type="button"
              onClick={() => exitGuestMode('manual')}
              className="text-[10px] text-amber-300/70 hover:text-amber-200 underline underline-offset-2 transition-colors cursor-pointer"
            >
              {t('guest.exitEarly')}
            </button>
          </div>
        </div>
      )}

      <header
        className="sticky top-0 z-40 flex items-center justify-between px-4 py-2 border-b"
        style={{ backgroundColor: 'var(--bench-header-bg)', borderColor: 'var(--bench-border)' }}
      >
        {/* Left: Logo + title + Active Project Switcher */}
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div
              className="w-7 h-7 rounded flex items-center justify-center font-mono font-bold text-xs"
              style={{ backgroundColor: 'var(--bench-border)', color: 'var(--bench-info)', border: '1px solid var(--bench-info)' }}
              aria-hidden="true"
            >
              TB
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--bench-info)' }}>
                {t('header.title')}
              </span>
              <span className="text-[9px]" style={{ color: 'var(--bench-muted)' }}>{t('header.subtitle')}</span>
            </div>
          </Link>

          {/* Project Switcher Pill */}
          <div className="relative hidden sm:block" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg border border-bench-border bg-bench-surface hover:bg-bench-subtle text-xs transition-all cursor-pointer group"
            >
              <LayersIcon size={13} className="text-blue-400" />
              <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-[9px] uppercase font-mono text-bench-muted/80">Project</span>
                <span className="text-xs font-bold text-bench-text max-w-[130px] truncate">
                  {activeProject?.name || 'Select Project'}
                </span>
              </div>
              {activeProject && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ml-1 hidden md:inline"
                  style={{
                    backgroundColor: `${activeBoardInfo?.badgeColor || '#3b82f6'}18`,
                    color: activeBoardInfo?.badgeColor || '#3b82f6'
                  }}
                >
                  {activeProject.board_type}
                </span>
              )}
              <ChevronDownIcon size={12} className="text-bench-muted group-hover:text-bench-text transition-transform" />
            </button>

            {/* Project Dropdown Menu */}
            {isProjectDropdownOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-bench-border bg-bench-surface shadow-2xl p-2 z-50 flex flex-col gap-1 animate-fade-in font-sans">
                <div className="flex items-center justify-between px-2.5 py-1.5 text-[10px] uppercase font-mono text-bench-muted border-b border-bench-border/50">
                  <span>Switch Workspace</span>
                  <Link
                    href="/projects"
                    onClick={() => setIsProjectDropdownOpen(false)}
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold"
                  >
                    Manage
                    <ExternalLinkIcon size={10} />
                  </Link>
                </div>

                {isGuest ? (
                  <div className="p-3 flex flex-col gap-2.5 text-center">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-mono">
                      <ShieldAlertIcon size={14} />
                      <span>{t('guest.guestMode')}</span>
                    </div>
                    <p className="text-[11px] text-bench-muted leading-tight">
                      {t('guest.projectsLockedDesc')}
                    </p>
                    <Link
                      href="/login"
                      onClick={() => setIsProjectDropdownOpen(false)}
                      className="w-full py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold text-center transition-all shadow-sm"
                    >
                      {t('guest.unlockFullAccess')}
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="max-h-48 overflow-y-auto flex flex-col gap-0.5 py-1">
                      {projects.map(proj => {
                        const isSelected = activeProject?.id === proj.id
                        return (
                          <button
                            key={proj.id}
                            type="button"
                            onClick={() => {
                              setActiveProject(proj)
                              setIsProjectDropdownOpen(false)
                            }}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition-colors cursor-pointer ${
                              isSelected ? 'bg-blue-600/15 text-blue-400 font-bold' : 'hover:bg-bench-subtle text-bench-text'
                            }`}
                          >
                            <div className="flex flex-col truncate pr-2">
                              <span className="truncate">{proj.name}</span>
                              <span className="text-[9px] font-mono text-bench-muted">{proj.board_type}</span>
                            </div>
                            {isSelected && <CheckIcon size={12} className="text-blue-400 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>

                    <Link
                      href="/projects"
                      onClick={() => setIsProjectDropdownOpen(false)}
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-mono font-bold transition-all shadow-sm mt-1"
                    >
                      <PlusIcon size={12} />
                      {t('projects.newProject')}
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: status pill */}
        <div className="flex items-center gap-4">
          <StatusPill frozen={frozen} />
        </div>

        {/* Right side: Emergency stop & User Menu */}
        <div className="flex items-center gap-3">
          <EmergencyStop frozen={frozen} onFreeze={freeze} onResume={unfreeze} />
          
          {/* User / Guest Account Controls */}
          <div className="flex items-center gap-2.5 border-l border-bench-border pl-3">
            {isGuest ? (
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Guest
                </span>
                <Link
                  href="/login"
                  className="text-xs font-mono text-blue-400 hover:text-blue-300 font-bold hover:underline"
                >
                  Sign In
                </Link>
              </div>
            ) : user ? (
              <>
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
                  className="p-1.5 rounded text-bench-muted hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                >
                  <LogOutIcon size={12} />
                </button>
              </>
            ) : null}

            {/* EN | FR | AR language toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'fr' : lang === 'fr' ? 'ar' : 'en')}
              title="Toggle language (EN / FR / AR)"
              className="px-2 py-0.5 rounded border text-[10px] font-mono font-bold transition-colors hover:bg-bench-subtle uppercase cursor-pointer"
              style={{ borderColor: 'var(--bench-border)', color: 'var(--bench-muted)' }}
            >
              {lang.toUpperCase()}
            </button>
          </div>
        </div>
      </header>
    </>
  )
}

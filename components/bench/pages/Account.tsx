'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/components/bench/ThemeContext'
import { useBench } from '../BenchContext'
import { useLanguage } from '../LanguageContext'
import {
  UserIcon,
  MailIcon,
  ShieldCheckIcon,
  CalendarIcon,
  KeyIcon,
  CheckIcon,
  AlertTriangleIcon,
  Loader2Icon,
  LogOutIcon,
  SunIcon,
  MoonIcon
} from 'lucide-react'

export function Account() {
  const { user, profile, role, sessionExpiresAt, signOut, refreshProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const { navLayout, setNavLayout } = useBench()
  const { t } = useLanguage()

  const [fullName, setFullName] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState<string>('Loading...')

  useEffect(() => {
    if (!sessionExpiresAt) {
      setTimeRemaining('No Session')
      return
    }

    const updateCountdown = () => {
      const msLeft = (sessionExpiresAt * 1000) - Date.now()
      if (msLeft <= 0) {
        setTimeRemaining('Expired')
        return
      }

      const totalSecs = Math.floor(msLeft / 1000)
      const mins = Math.floor(totalSecs / 60)
      const secs = totalSecs % 60
      const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      setTimeRemaining(formatted)
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [sessionExpiresAt])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Initialize form field with current profile name
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
    }
  }, [profile])

  if (!user) return null

  // Initials for avatar preview
  const initials = (profile?.full_name || user.email || 'U')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setSaveLoading(true)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      setSuccessMessage('Profile settings saved successfully!')
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to update profile')
    } finally {
      setSaveLoading(false)
    }
  }

  // Format account creation date
  const createdDate = new Date(user.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="p-6 max-w-4xl mx-auto flex flex-col gap-8 mt-4 font-sans select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-bench-border pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg border border-blue-400/20">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-bench-text font-sans tracking-tight">
              {profile?.full_name || 'User Profile'}
            </h1>
            <p className="text-xs text-bench-muted mt-0.5 font-mono">
              Workspace Role: <span className="text-blue-500 capitalize">{role || 'User'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-bench-border text-xs font-mono text-bench-muted hover:text-red-400 hover:border-red-500/25 hover:bg-red-500/10 transition-all cursor-pointer"
        >
          <LogOutIcon size={12} />
          {t('account.signOut')}
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Profile Edit Form */}
        <div
          className="md:col-span-7 rounded-xl border p-6 flex flex-col gap-5 bg-bench-surface border-bench-border shadow-sm"
        >
          <div className="flex flex-col gap-1 border-b border-bench-border pb-3">
            <h3 className="text-sm font-bold text-bench-text flex items-center gap-2">
              <UserIcon size={14} className="text-blue-500" />
              {t('account.profileDetails')}
            </h3>
            <p className="text-[11px] text-bench-muted">{t('account.profileDesc')}</p>
          </div>

          {/* Form Messages */}
          {errorMessage && (
            <div className="p-3 text-xs rounded-lg border bg-red-500/10 text-red-500 border-red-500/25 flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-red-500 shrink-0" />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-xs rounded-lg border bg-emerald-500/10 text-emerald-500 border-emerald-500/25 flex items-center gap-2">
              <CheckIcon size={14} className="text-emerald-500 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            
            {/* Full Name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-bench-muted uppercase tracking-wider font-mono">{t('account.fullName')}</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder={t('account.fullNamePlaceholder')}
                className="w-full px-3 py-2 rounded border bg-bench-input-bg border-bench-border text-xs placeholder-bench-muted/60 text-bench-text focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all font-sans"
              />
            </div>

            {/* Email (Read only) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-bench-muted uppercase tracking-wider font-mono">{t('account.email')}</label>
              <div className="relative">
                <MailIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-bench-muted" />
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full pl-9 pr-3 py-2 rounded border bg-bench-input-bg border-bench-border text-xs text-bench-muted/80 select-all font-sans cursor-not-allowed opacity-60"
                />
              </div>
              <p className="text-[9px] text-bench-muted/70 font-mono">{t('account.emailWarning')}</p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={saveLoading}
              className="self-end flex items-center gap-1.5 px-4 py-2 rounded border text-xs font-mono font-semibold transition-colors"
              style={{
                borderColor:     '#3b82f6',
                color:           '#3b82f6',
                backgroundColor: 'rgba(59,130,246,0.1)',
              }}
            >
              {saveLoading ? (
                <Loader2Icon size={12} className="animate-spin" />
              ) : (
                <CheckIcon size={12} />
              )}
              {t('account.saveChanges')}
            </button>
          </form>
        </div>

        {/* Right Side: Account Credentials / Security Info */}
        <div className="md:col-span-5 flex flex-col gap-6">
          
          {/* Theme Settings Panel */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4 bg-bench-surface border-bench-border shadow-sm"
          >
            <div className="flex flex-col gap-1 border-b border-bench-border pb-3">
              <h3 className="text-sm font-bold text-bench-text flex items-center gap-2">
                <SunIcon size={14} className="text-amber-500" />
                {t('account.themeTitle')}
              </h3>
              <p className="text-[11px] text-bench-muted">{t('account.themeDesc')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-bold'
                    : 'border-bench-border hover:border-bench-text/30 text-bench-muted hover:bg-bench-subtle'
                }`}
              >
                <SunIcon size={14} />
                {t('account.lightMode')}
              </button>

              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-bold'
                    : 'border-bench-border hover:border-bench-text/30 text-bench-muted hover:bg-bench-subtle'
                }`}
              >
                <MoonIcon size={14} />
                {t('account.darkMode')}
              </button>
            </div>
          </div>

          {/* Navigation Layout Preferences Panel */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4 bg-bench-surface border-bench-border shadow-sm"
          >
            <div className="flex flex-col gap-1 border-b border-bench-border pb-3">
              <h3 className="text-sm font-bold text-bench-text flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>
                {t('account.layoutTitle')}
              </h3>
              <p className="text-[11px] text-bench-muted">{t('account.layoutDesc')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-1">
              <button
                type="button"
                onClick={() => setNavLayout('tabs')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  navLayout === 'tabs'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-bold'
                    : 'border-bench-border hover:border-bench-text/30 text-bench-muted hover:bg-bench-subtle'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /></svg>
                {t('account.topTabs')}
              </button>

              <button
                type="button"
                onClick={() => setNavLayout('bottom-tabs')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  navLayout === 'bottom-tabs'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-bold'
                    : 'border-bench-border hover:border-bench-text/30 text-bench-muted hover:bg-bench-subtle'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 15h18" /></svg>
                {t('account.bottomTabs')}
              </button>

              <button
                type="button"
                onClick={() => setNavLayout('sidebar')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  navLayout === 'sidebar'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-bold'
                    : 'border-bench-border hover:border-bench-text/30 text-bench-muted hover:bg-bench-subtle'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M9 3v18" /></svg>
                {t('account.leftSidebar')}
              </button>

              <button
                type="button"
                onClick={() => setNavLayout('right-sidebar')}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-xs font-mono font-semibold transition-all cursor-pointer ${
                  navLayout === 'right-sidebar'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] font-bold'
                    : 'border-bench-border hover:border-bench-text/30 text-bench-muted hover:bg-bench-subtle'
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M15 3v18" /></svg>
                {t('account.rightSidebar')}
              </button>
            </div>
          </div>
          
          {/* Security Information Panel */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4 bg-bench-surface border-bench-border shadow-sm"
          >
            <div className="flex flex-col gap-1 border-b border-bench-border pb-3">
              <h3 className="text-sm font-bold text-bench-text flex items-center gap-2">
                <ShieldCheckIcon size={14} className="text-emerald-500" />
                {t('account.accessInfo')}
              </h3>
              <p className="text-[11px] text-bench-muted">{t('account.securityDescPlain')}</p>
            </div>

            <div className="flex flex-col gap-3 font-mono text-[10px] text-bench-muted">
              
              <div className="flex justify-between items-center border-b border-bench-border pb-2">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <ShieldCheckIcon size={11} className="text-purple-500" />
                  <span>{t('account.expiryLimit')}</span>
                </div>
                <span className="text-bench-text">{t('account.expiryLimitVal')}</span>
              </div>

              <div className="flex justify-between items-center border-b border-bench-border pb-2">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <ShieldCheckIcon size={11} className={timeRemaining === 'Expired' ? 'text-red-500' : 'text-emerald-500'} />
                  <span>{t('account.sessionRemaining')}</span>
                </div>
                <span className={`font-bold ${timeRemaining === 'Expired' ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                  {timeRemaining}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-bench-border pb-2">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <ShieldCheckIcon size={11} />
                  <span>{t('account.role')}:</span>
                </div>
                <span className="text-blue-500 font-bold capitalize">{role || 'User'}</span>
              </div>

              <div className="flex justify-between items-center border-b border-bench-border pb-2">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <CalendarIcon size={11} />
                  <span>{t('account.created')}</span>
                </div>
                <span className="text-bench-text">{createdDate}</span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <KeyIcon size={11} />
                  <span>{t('account.userId')}</span>
                </div>
                <span className="text-[9px] text-bench-muted bg-bench-bg p-1.5 rounded border border-bench-border select-all break-all leading-relaxed">
                  {user.id}
                </span>
              </div>

            </div>
          </div>

          {/* Tip Panel */}
          <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/10 text-[11px] leading-relaxed text-bench-muted">
            <h4 className="font-bold text-bench-text mb-1">{t('account.syncTitle')}</h4>
            {t('account.syncDesc')}
          </div>

          {/* Personal Info Badge */}
          <div className="flex flex-col items-center gap-2 border border-bench-border/60 bg-bench-surface/40 px-4 py-3 rounded-lg backdrop-blur-md transition-all hover:border-blue-500/30 hover:bg-bench-surface/60">
            <span className="text-[10px] uppercase tracking-wider text-blue-400 font-bold">{t('account.developer')}</span>
            <div className="flex items-center gap-4 text-bench-muted">
              <a
                href="mailto:merabtiahmedabderahim213@gmail.com"
                className="flex items-center gap-1.5 hover:text-blue-400 transition-colors text-[11px]"
                title="Email Ahmed Merabti"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-mail text-blue-500"
                  aria-hidden="true"
                >
                  <path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7" />
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                </svg>
                <span>Email</span>
              </a>
              <span className="text-bench-border">|</span>
              <a
                href="https://github.com/jazz-B2l"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-blue-400 transition-colors text-[11px]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-emerald-500"
                >
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                  <path d="M9 18c-4.51 2-5-2-7-2" />
                </svg>
                <span>GitHub</span>
              </a>
              <span className="text-bench-border">|</span>
              <a
                href="https://www.linkedin.com/in/ahmed-merabti-536790282/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-blue-400 transition-colors text-[11px]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-indigo-400"
                >
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect width="4" height="12" x="2" y="9" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
                <span>LinkedIn</span>
              </a>
            </div>
          </div>

        </div>

      </div>

    </div>
  )
}

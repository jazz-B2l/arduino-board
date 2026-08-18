'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/components/bench/ThemeContext'
import { useBench } from '../BenchContext'
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
          Sign Out of Workspace
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
              Profile Details
            </h3>
            <p className="text-[11px] text-bench-muted">Update your public identity on the test bench workspace.</p>
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
              <label className="text-[10px] text-bench-muted uppercase tracking-wider font-mono">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded border bg-bench-input-bg border-bench-border text-xs placeholder-bench-muted/60 text-bench-text focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/25 transition-all font-sans"
              />
            </div>

            {/* Email (Read only) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-bench-muted uppercase tracking-wider font-mono">Registered Email</label>
              <div className="relative">
                <MailIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-bench-muted" />
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full pl-9 pr-3 py-2 rounded border bg-bench-input-bg border-bench-border text-xs text-bench-muted/80 select-all font-sans cursor-not-allowed opacity-60"
                />
              </div>
              <p className="text-[9px] text-bench-muted/70 font-mono">Email changes must be requested through system administrators.</p>
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
              Save Changes
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
                Workspace Theme
              </h3>
              <p className="text-[11px] text-bench-muted">Customize the visual theme of your telemetry workspace.</p>
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
                Light Mode
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
                Dark Mode
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
                Workspace Layout
              </h3>
              <p className="text-[11px] text-bench-muted">Choose your preferred workspace navigation bar layout.</p>
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
                Top Tabs
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
                Bottom Tabs
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
                Left Sidebar
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
                Right Sidebar
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
                Workspace Access info
              </h3>
              <p className="text-[11px] text-bench-muted">Security descriptors for your workspace profile.</p>
            </div>

            <div className="flex flex-col gap-3 font-mono text-[10px] text-bench-muted">
              
              <div className="flex justify-between items-center border-b border-bench-border pb-2">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <ShieldCheckIcon size={11} className="text-purple-500" />
                  <span>Session Expiry Limit:</span>
                </div>
                <span className="text-bench-text">30 Minutes</span>
              </div>

              <div className="flex justify-between items-center border-b border-bench-border pb-2">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <ShieldCheckIcon size={11} className={timeRemaining === 'Expired' ? 'text-red-500' : 'text-emerald-500'} />
                  <span>Session Remaining:</span>
                </div>
                <span className={`font-bold ${timeRemaining === 'Expired' ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`}>
                  {timeRemaining}
                </span>
              </div>

              <div className="flex justify-between items-center border-b border-bench-border pb-2">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <ShieldCheckIcon size={11} />
                  <span>Access Role:</span>
                </div>
                <span className="text-blue-500 font-bold capitalize">{role || 'User'}</span>
              </div>

              <div className="flex justify-between items-center border-b border-bench-border pb-2">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <CalendarIcon size={11} />
                  <span>Created At:</span>
                </div>
                <span className="text-bench-text">{createdDate}</span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-bench-muted">
                  <KeyIcon size={11} />
                  <span>Workspace User ID:</span>
                </div>
                <span className="text-[9px] text-bench-muted bg-bench-bg p-1.5 rounded border border-bench-border select-all break-all leading-relaxed">
                  {user.id}
                </span>
              </div>

            </div>
          </div>

          {/* Tip Panel */}
          <div className="p-4 rounded-lg border bg-blue-500/5 border-blue-500/10 text-[11px] leading-relaxed text-bench-muted">
            <h4 className="font-bold text-bench-text mb-1">R&D Telemetry Sync</h4>
            Your sensor calibration thresholds, dashboard widget layouts, and device connections are synchronized with your account to ensure a seamless experience on any workstation.
          </div>

        </div>

      </div>

    </div>
  )
}

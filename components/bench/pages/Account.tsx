'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/auth/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  UserIcon,
  MailIcon,
  ShieldCheckIcon,
  CalendarIcon,
  KeyIcon,
  CheckIcon,
  AlertTriangleIcon,
  Loader2Icon,
  LogOutIcon
} from 'lucide-react'

export function Account() {
  const { user, profile, role, signOut, refreshProfile } = useAuth()

  const [fullName, setFullName] = useState('')
  const [saveLoading, setSaveLoading] = useState(false)
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
      <div className="flex items-center justify-between border-b border-[#1f2937]/50 pb-4 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-lg border border-blue-400/20">
            {initials}
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-100 font-sans tracking-tight">
              {profile?.full_name || 'User Profile'}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5 font-mono">
              Workspace Role: <span className="text-blue-400 capitalize">{role || 'User'}</span>
            </p>
          </div>
        </div>

        <button
          onClick={signOut}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-slate-800 text-xs font-mono text-slate-400 hover:text-red-400 hover:border-red-950/40 hover:bg-red-950/10 transition-all"
        >
          <LogOutIcon size={12} />
          Sign Out of Workspace
        </button>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Profile Edit Form */}
        <div
          className="md:col-span-7 rounded-xl border p-6 flex flex-col gap-5 bg-[#111827] border-[#1f2937]"
        >
          <div className="flex flex-col gap-1 border-b border-[#1f2937]/45 pb-3">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <UserIcon size={14} className="text-blue-400" />
              Profile Details
            </h3>
            <p className="text-[11px] text-slate-500">Update your public identity on the test bench workspace.</p>
          </div>

          {/* Form Messages */}
          {errorMessage && (
            <div className="p-3 text-xs rounded-lg border bg-red-950/20 text-red-400 border-red-900/40 flex items-center gap-2">
              <AlertTriangleIcon size={14} className="text-red-500 shrink-0" />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-xs rounded-lg border bg-emerald-950/20 text-emerald-400 border-emerald-900/40 flex items-center gap-2">
              <CheckIcon size={14} className="text-emerald-500 shrink-0" />
              <div>{successMessage}</div>
            </div>
          )}

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            
            {/* Full Name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 rounded border bg-slate-950/50 border-[#1f2937] text-xs placeholder-slate-700 text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
              />
            </div>

            {/* Email (Read only) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Registered Email</label>
              <div className="relative">
                <MailIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full pl-9 pr-3 py-2 rounded border bg-slate-900/40 border-[#1f2937]/50 text-xs text-slate-500 select-all font-sans cursor-not-allowed"
                />
              </div>
              <p className="text-[9px] text-slate-600 font-mono">Email changes must be requested through system administrators.</p>
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
          
          {/* Security Information Panel */}
          <div
            className="rounded-xl border p-6 flex flex-col gap-4 bg-[#111827] border-[#1f2937]"
          >
            <div className="flex flex-col gap-1 border-b border-[#1f2937]/45 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <ShieldCheckIcon size={14} className="text-emerald-400" />
                Workspace Access info
              </h3>
              <p className="text-[11px] text-slate-500">Security descriptors for your workspace profile.</p>
            </div>

            <div className="flex flex-col gap-3 font-mono text-[10px] text-slate-400">
              
              <div className="flex justify-between items-center border-b border-[#1f2937]/30 pb-2">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <ShieldCheckIcon size={11} />
                  <span>Access Role:</span>
                </div>
                <span className="text-blue-400 font-bold capitalize">{role || 'User'}</span>
              </div>

              <div className="flex justify-between items-center border-b border-[#1f2937]/30 pb-2">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <CalendarIcon size={11} />
                  <span>Created At:</span>
                </div>
                <span className="text-slate-300">{createdDate}</span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <KeyIcon size={11} />
                  <span>Workspace User ID:</span>
                </div>
                <span className="text-[9px] text-slate-600 bg-slate-950/60 p-1.5 rounded border border-[#1f2937]/30 select-all break-all leading-relaxed">
                  {user.id}
                </span>
              </div>

            </div>
          </div>

          {/* Tip Panel */}
          <div className="p-4 rounded-lg border bg-blue-950/10 border-blue-900/30 text-[11px] leading-relaxed text-slate-400">
            <h4 className="font-bold text-slate-300 mb-1">R&D Telemetry Sync</h4>
            Your sensor calibration thresholds, dashboard widget layouts, and device connections are synchronized with your account to ensure a seamless experience on any workstation.
          </div>

        </div>

      </div>

    </div>
  )
}

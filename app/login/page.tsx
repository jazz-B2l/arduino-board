'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/auth/AuthContext'
import { CpuIcon, LockIcon, MailIcon, UserIcon, ArrowRightIcon, AlertTriangleIcon, Loader2Icon, EyeIcon, EyeOffIcon } from 'lucide-react'

export default function LoginPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-bench-bg text-bench-text">
        <div className="flex flex-col items-center gap-4">
          <CpuIcon size={44} className="text-blue-500 animate-pulse" />
          <p className="text-xs font-mono tracking-widest text-bench-muted uppercase animate-pulse">
            Verifying Authentication...
          </p>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setActionLoading(true)

    try {
      if (isSignUp) {
        // Sign Up
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })

        if (error) throw error

        if (data.session) {
          setSuccessMessage('Registration successful! Redirecting to console...')
          setTimeout(() => router.push('/dashboard'), 1500)
        } else {
          setSuccessMessage('Sign up complete! Please check your email to confirm your account.')
        }
      } else {
        // Sign In
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        setSuccessMessage('Welcome back! Redirecting...')
        setTimeout(() => router.push('/dashboard'), 1000)
      }
    } catch (err: any) {
      let msg = err?.message || 'An error occurred during authentication'
      if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('60 seconds') || msg.toLowerCase().includes('too many requests')) {
        msg = 'Signup/login rate limit reached. Please wait a minute or disable "Confirm email" and adjust rate limits under Authentication settings in your Supabase Dashboard.'
      }
      setErrorMessage(msg)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bench-bg text-bench-text relative overflow-hidden px-4 font-sans">
      
      {/* Background Gradients */}
      <div className="absolute top-[-25%] left-[-15%] w-[70%] h-[70%] rounded-full opacity-10 dark:opacity-20 pointer-events-none blur-[150px]" style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 80%)' }} />
      <div className="absolute bottom-[-25%] right-[-15%] w-[70%] h-[70%] rounded-full opacity-10 dark:opacity-15 pointer-events-none blur-[150px]" style={{ background: 'radial-gradient(circle, #10b981 0%, transparent 80%)' }} />
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(var(--bench-muted) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        
        {/* App Title */}
        <Link href="/" className="flex items-center gap-3 justify-center group self-center mb-2">
          <div className="w-9 h-9 rounded flex items-center justify-center font-mono font-bold text-sm border bg-bench-surface text-blue-400 border-blue-500/30 group-hover:scale-105 transition-transform">
            A#
          </div>
          <span className="text-lg font-extrabold tracking-widest uppercase bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Arduino#board
          </span>
        </Link>

        {/* Auth Card */}
        <div className="bg-bench-surface/80 backdrop-blur-xl border border-bench-border shadow-xl rounded-2xl p-8 flex flex-col gap-6">
          <div className="flex flex-col gap-1.5 text-center">
            <h2 className="text-xl font-bold tracking-tight text-bench-text">
              {isSignUp ? 'Create Workspace Account' : 'Console Authentication'}
            </h2>
            <p className="text-xs text-bench-muted">
              {isSignUp ? 'Register to manage devices & sync telemetry data' : 'Sign in to access your dashboard telemetry console'}
            </p>
          </div>

          {/* Messages */}
          {errorMessage && (
            <div className="p-3 text-xs rounded-lg border bg-red-950/20 text-red-400 border-red-900/40 flex items-center gap-2.5">
              <AlertTriangleIcon size={16} className="text-red-500 shrink-0" />
              <div>{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 text-xs rounded-lg border bg-emerald-950/20 text-emerald-400 border-emerald-900/40 flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-ping" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            
            {/* Full Name (Sign Up only) */}
            {isSignUp && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-bench-muted uppercase tracking-wider font-mono">Full Name</label>
                <div className="relative">
                  <UserIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bench-muted" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-bench-input-bg border-bench-border text-sm text-bench-text placeholder-bench-muted/60 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-bench-muted uppercase tracking-wider font-mono">Email Address</label>
              <div className="relative">
                <MailIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bench-muted" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-bench-input-bg border-bench-border text-sm text-bench-text placeholder-bench-muted/60 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/20 transition-all font-sans"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-bench-muted uppercase tracking-wider font-mono">Password</label>
              <div className="relative">
                <LockIcon size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bench-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 rounded-lg border bg-bench-input-bg border-bench-border text-sm text-bench-text placeholder-bench-muted/60 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-bench-muted hover:text-bench-text transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={actionLoading}
              className="mt-2 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-xs font-mono font-bold transition-all hover:scale-[1.02] hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 cursor-pointer"
            >
              {actionLoading ? (
                <Loader2Icon size={14} className="animate-spin" />
              ) : (
                <>
                  {isSignUp ? 'Create Account' : 'Authenticate'}
                  <ArrowRightIcon size={12} />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="border-t border-bench-border/40 pt-4 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setErrorMessage(null)
                setSuccessMessage(null)
              }}
              className="text-xs text-bench-muted hover:text-blue-500 transition-colors font-sans cursor-pointer"
            >
              {isSignUp ? 'Already registered? Sign in instead' : 'Need an account? Create one here'}
            </button>
          </div>
        </div>

        {/* Back Link */}
        <Link href="/" className="text-xs text-bench-muted hover:text-bench-text transition-colors text-center font-mono">
          ← Back to Landing Page
        </Link>
      </div>
    </div>
  )
}

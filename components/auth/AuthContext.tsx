'use client'

import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export const GUEST_SESSION_DURATION_MS = 20 * 60 * 1000 // 20 minutes
export const GUEST_COOLDOWN_DURATION_MS = 3 * 60 * 60 * 1000 // 3 hours

export const STORAGE_GUEST_MODE = 'bench_guest_mode'
export const STORAGE_GUEST_EXPIRES_AT = 'bench_guest_expires_at'
export const STORAGE_GUEST_COOLDOWN = 'bench_guest_cooldown_until'
export const STORAGE_GUEST_EXPIRED_NOTICE = 'bench_guest_expired_notice'

export function formatGuestTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '00:00'
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export function formatCooldownTime(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0m'
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) {
    return `${hours}h ${mins.toString().padStart(2, '0')}m`
  }
  if (mins > 0) {
    return `${mins}m ${secs.toString().padStart(2, '0')}s`
  }
  return `${secs}s`
}

interface UserProfile {
  id: string
  full_name: string
  avatar_url: string | null
}

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  role: string | null
  isGuest: boolean
  loading: boolean
  sessionExpiresAt: number | null // Unix timestamp in seconds when JWT token expires
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  loginAsGuest: () => boolean
  exitGuestMode: (reason?: 'manual' | 'expired') => void
  guestExpiresAt: number | null
  guestSecondsRemaining: number
  guestCooldownUntil: number | null
  guestCooldownSecondsRemaining: number
  isGuestCooldownActive: boolean
  guestExpiredNotice: boolean
  clearGuestExpiredNotice: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)

  // Guest Timer & Cooldown State
  const [guestExpiresAt, setGuestExpiresAt] = useState<number | null>(null)
  const [guestSecondsRemaining, setGuestSecondsRemaining] = useState<number>(0)
  const [guestCooldownUntil, setGuestCooldownUntil] = useState<number | null>(null)
  const [guestCooldownSecondsRemaining, setGuestCooldownSecondsRemaining] = useState<number>(0)
  const [guestExpiredNotice, setGuestExpiredNotice] = useState<boolean>(false)
  
  const timeoutRef = useRef<any>(null)

  const handleSessionExpiration = (expiresAt: number | null) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    if (expiresAt) {
      setSessionExpiresAt(expiresAt)
      const msRemaining = (expiresAt * 1000) - Date.now()
      if (msRemaining > 0) {
        timeoutRef.current = setTimeout(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (session) {
              signOut().then(() => {
                alert('Your session token has expired for security. Please login again.')
              })
            }
          })
        }, msRemaining)
      } else {
        signOut()
      }
    } else {
      setSessionExpiresAt(null)
    }
  }

  const fetchProfileAndRole = async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle()
      ])

      if (profileRes.data) {
        setProfile(profileRes.data as UserProfile)
      }
      if (roleRes.data) {
        setRole(roleRes.data.role)
      } else {
        setRole('user')
      }
    } catch (err) {
      console.error('Error fetching profile and role:', err)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchProfileAndRole(user.id)
    }
  }

  // Check stored cooldown validity
  const getStoredCooldown = (): number | null => {
    if (typeof window === 'undefined') return null
    try {
      const stored = localStorage.getItem(STORAGE_GUEST_COOLDOWN)
      if (!stored) return null
      const parsed = parseInt(stored, 10)
      if (isNaN(parsed)) {
        localStorage.removeItem(STORAGE_GUEST_COOLDOWN)
        return null
      }
      if (parsed > Date.now()) {
        return parsed
      } else {
        localStorage.removeItem(STORAGE_GUEST_COOLDOWN)
        return null
      }
    } catch {
      return null
    }
  }

  // Trigger 20-min guest session expiration
  const triggerGuestExpiration = useCallback(() => {
    const cooldownUntil = Date.now() + GUEST_COOLDOWN_DURATION_MS
    try {
      localStorage.setItem(STORAGE_GUEST_COOLDOWN, String(cooldownUntil))
      localStorage.setItem(STORAGE_GUEST_EXPIRED_NOTICE, 'true')
      localStorage.removeItem(STORAGE_GUEST_MODE)
      localStorage.removeItem(STORAGE_GUEST_EXPIRES_AT)
      sessionStorage.removeItem(STORAGE_GUEST_MODE)
    } catch (_) {}

    setIsGuest(false)
    setUser(null)
    setProfile(null)
    setRole(null)
    setGuestExpiresAt(null)
    setGuestSecondsRemaining(0)
    setGuestCooldownUntil(cooldownUntil)
    setGuestCooldownSecondsRemaining(Math.ceil(GUEST_COOLDOWN_DURATION_MS / 1000))
    setGuestExpiredNotice(true)

    // Redirect guest back to landing page with expired parameter
    router.push('/?guest_expired=true')
  }, [router])

  // Login as guest (blocks if on 3-hour cooldown)
  const loginAsGuest = (): boolean => {
    const activeCooldown = getStoredCooldown()
    if (activeCooldown && activeCooldown > Date.now()) {
      setGuestCooldownUntil(activeCooldown)
      setGuestCooldownSecondsRemaining(Math.ceil((activeCooldown - Date.now()) / 1000))
      return false
    }

    const expiresAt = Date.now() + GUEST_SESSION_DURATION_MS

    setIsGuest(true)
    setUser(null)
    setProfile({
      id: 'guest',
      full_name: 'Guest User',
      avatar_url: null,
    })
    setRole('guest')
    setGuestExpiresAt(expiresAt)
    setGuestSecondsRemaining(Math.floor(GUEST_SESSION_DURATION_MS / 1000))
    setGuestExpiredNotice(false)

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_GUEST_MODE, 'true')
        localStorage.setItem(STORAGE_GUEST_EXPIRES_AT, String(expiresAt))
        localStorage.removeItem(STORAGE_GUEST_EXPIRED_NOTICE)
        sessionStorage.setItem(STORAGE_GUEST_MODE, 'true')
      } catch (_) {}
    }

    return true
  }

  const exitGuestMode = (reason: 'manual' | 'expired' = 'manual') => {
    if (reason === 'expired') {
      triggerGuestExpiration()
      return
    }

    setIsGuest(false)
    setProfile(null)
    setRole(null)
    setGuestExpiresAt(null)
    setGuestSecondsRemaining(0)

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(STORAGE_GUEST_MODE)
        localStorage.removeItem(STORAGE_GUEST_MODE)
        localStorage.removeItem(STORAGE_GUEST_EXPIRES_AT)
      } catch (_) {}
    }
  }

  const clearGuestExpiredNotice = () => {
    setGuestExpiredNotice(false)
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_GUEST_EXPIRED_NOTICE)
      } catch (_) {}
    }
  }

  // Active 20-min guest countdown timer tick
  useEffect(() => {
    if (!isGuest || !guestExpiresAt) return

    const tick = () => {
      const now = Date.now()
      const remainingMs = guestExpiresAt - now
      const remainingSecs = Math.max(0, Math.floor(remainingMs / 1000))
      setGuestSecondsRemaining(remainingSecs)

      if (remainingMs <= 0) {
        triggerGuestExpiration()
      }
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [isGuest, guestExpiresAt, triggerGuestExpiration])

  // Active 3-hour cooldown countdown timer tick
  useEffect(() => {
    if (!guestCooldownUntil) return

    const tickCooldown = () => {
      const now = Date.now()
      const diffMs = guestCooldownUntil - now
      if (diffMs <= 0) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_GUEST_COOLDOWN)
        }
        setGuestCooldownUntil(null)
        setGuestCooldownSecondsRemaining(0)
      } else {
        setGuestCooldownSecondsRemaining(Math.ceil(diffMs / 1000))
      }
    }

    tickCooldown()
    const interval = setInterval(tickCooldown, 1000)
    return () => clearInterval(interval)
  }, [guestCooldownUntil])

  // Initial authentication & session check on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Check cooldown
      const activeCooldown = getStoredCooldown()
      if (activeCooldown) {
        setGuestCooldownUntil(activeCooldown)
        setGuestCooldownSecondsRemaining(Math.ceil((activeCooldown - Date.now()) / 1000))
      }

      // 2. Check expired notice flag
      if (localStorage.getItem(STORAGE_GUEST_EXPIRED_NOTICE) === 'true') {
        setGuestExpiredNotice(true)
      }

      // 3. Check guest session restoration
      const hasGuestSession = sessionStorage.getItem(STORAGE_GUEST_MODE) === 'true' ||
                               localStorage.getItem(STORAGE_GUEST_MODE) === 'true'

      if (hasGuestSession) {
        if (activeCooldown && activeCooldown > Date.now()) {
          // Cooldown active, revoke guest
          sessionStorage.removeItem(STORAGE_GUEST_MODE)
          localStorage.removeItem(STORAGE_GUEST_MODE)
          localStorage.removeItem(STORAGE_GUEST_EXPIRES_AT)
        } else {
          const expiresStr = localStorage.getItem(STORAGE_GUEST_EXPIRES_AT)
          const expiresVal = expiresStr ? parseInt(expiresStr, 10) : null

          if (!expiresVal || expiresVal <= Date.now()) {
            // Already expired while tab was closed
            triggerGuestExpiration()
          } else {
            // Resume active guest session with remaining duration
            setIsGuest(true)
            setProfile({
              id: 'guest',
              full_name: 'Guest User',
              avatar_url: null,
            })
            setRole('guest')
            setGuestExpiresAt(expiresVal)
            setGuestSecondsRemaining(Math.max(0, Math.floor((expiresVal - Date.now()) / 1000)))
          }
        }
      }
    }

    // 4. Supabase session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsGuest(false)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(STORAGE_GUEST_MODE)
          localStorage.removeItem(STORAGE_GUEST_MODE)
        }
        setUser(session.user)
        handleSessionExpiration(session.expires_at ?? null)
        fetchProfileAndRole(session.user.id).finally(() => {
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    }).catch(err => {
      console.warn('Supabase auth session check failed, continuing as offline/guest:', err)
      setLoading(false)
    })

    // 5. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsGuest(false)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(STORAGE_GUEST_MODE)
          localStorage.removeItem(STORAGE_GUEST_MODE)
        }
        setUser(session.user)
        handleSessionExpiration(session.expires_at ?? null)
        await fetchProfileAndRole(session.user.id)
      } else {
        setUser(null)
        if (typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_GUEST_MODE) !== 'true') {
          setProfile(null)
          setRole(null)
          setIsGuest(false)
        }
        handleSessionExpiration(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [triggerGuestExpiration])

  const signOut = async () => {
    setLoading(true)
    try {
      exitGuestMode('manual')
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      await supabase.auth.signOut()
    } catch (err) {
      console.error('Failed to sign out:', err)
    } finally {
      setLoading(false)
    }
  }

  const isGuestCooldownActive = Boolean(guestCooldownUntil && guestCooldownUntil > Date.now())

  const value: AuthContextValue = {
    user,
    profile,
    role,
    isGuest,
    loading,
    sessionExpiresAt,
    signOut,
    refreshProfile,
    loginAsGuest,
    exitGuestMode,
    guestExpiresAt,
    guestSecondsRemaining,
    guestCooldownUntil,
    guestCooldownSecondsRemaining,
    isGuestCooldownActive,
    guestExpiredNotice,
    clearGuestExpiredNotice,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

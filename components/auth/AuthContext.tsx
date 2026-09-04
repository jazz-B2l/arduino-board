'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

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
  loginAsGuest: () => void
  exitGuestMode: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [isGuest, setIsGuest] = useState<boolean>(false)
  const [loading, setLoading] = useState(true)
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null)
  
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

  const loginAsGuest = () => {
    setIsGuest(true)
    setUser(null)
    setProfile({
      id: 'guest',
      full_name: 'Guest User',
      avatar_url: null,
    })
    setRole('guest')
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('bench_guest_mode', 'true')
    }
  }

  const exitGuestMode = () => {
    setIsGuest(false)
    setProfile(null)
    setRole(null)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('bench_guest_mode')
    }
  }

  useEffect(() => {
    // Check if previously in guest mode
    if (typeof window !== 'undefined') {
      const savedGuest = sessionStorage.getItem('bench_guest_mode')
      if (savedGuest === 'true') {
        setIsGuest(true)
        setProfile({
          id: 'guest',
          full_name: 'Guest User',
          avatar_url: null,
        })
        setRole('guest')
      }
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsGuest(false)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('bench_guest_mode')
        }
        setUser(session.user)
        handleSessionExpiration(session.expires_at ?? null)
        fetchProfileAndRole(session.user.id).finally(() => {
          setLoading(false)
        })
      } else {
        setLoading(false)
      }
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setIsGuest(false)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('bench_guest_mode')
        }
        setUser(session.user)
        handleSessionExpiration(session.expires_at ?? null)
        await fetchProfileAndRole(session.user.id)
      } else {
        setUser(null)
        // If not in guest mode, clear profile
        if (typeof window !== 'undefined' && sessionStorage.getItem('bench_guest_mode') !== 'true') {
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
  }, [])

  const signOut = async () => {
    setLoading(true)
    try {
      exitGuestMode()
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

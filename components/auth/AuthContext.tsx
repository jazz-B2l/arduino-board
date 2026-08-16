'use client'

import { createContext, useContext, useEffect, useState } from 'react'
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
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
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
        setUser(session.user)
        await fetchProfileAndRole(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
        setRole(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setLoading(true)
    try {
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
    loading,
    signOut,
    refreshProfile
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

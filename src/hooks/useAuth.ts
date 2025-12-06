import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@supabase/auth-helpers-react'
import { supabase } from '../lib/supabaseClient'
import type { Profile } from '../types/app'

export function useAuth() {
  const session = useSession()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Load user profile
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!error && data) {
        setUserProfile(data)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    }
  }, [])

  // Initialize auth state
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        setCurrentUser(user)
        await loadProfile(user.id)
      }
      setLoading(false)
    }

    initAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setCurrentUser(session.user)
          await loadProfile(session.user.id)
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null)
          setUserProfile(null)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [loadProfile])

  // Update profile
  const updateProfile = useCallback(async (updates: Partial<Profile>) => {
    if (!currentUser?.id) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', currentUser.id)

      if (!error && userProfile) {
        setUserProfile({ ...userProfile, ...updates })
      }
    } catch (err) {
      console.error('Error updating profile:', err)
    }
  }, [currentUser?.id, userProfile])

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setCurrentUser(null)
    setUserProfile(null)
  }, [])

  return {
    session,
    currentUser,
    userProfile,
    setUserProfile,
    loading,
    loadProfile,
    updateProfile,
    signOut,
    isAuthenticated: !!currentUser
  }
}


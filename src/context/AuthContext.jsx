import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [adminRole, setAdminRole] = useState(null) // null | 'super_admin' | 'admin' | 'staff'
  const [adminPermissions, setAdminPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      setAdminRole(null)
      setAdminPermissions({})
      return
    }
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    setProfile(profileData)

    const { data: adminData } = await supabase
      .from('admin_users')
      .select('role, permissions')
      .eq('id', userId)
      .maybeSingle()
    setAdminRole(adminData?.role || null)
    setAdminPermissions(adminData?.permissions || {})
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return
      setSession(s)
      loadProfile(s?.user?.id).finally(() => setLoading(false))
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      loadProfile(s?.user?.id)
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signInWithGoogle = useCallback(async (redirectPath = '/') => {
    const redirectTo = `${window.location.origin}${redirectPath}`
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(() => loadProfile(session?.user?.id), [loadProfile, session])

  const value = {
    session,
    user: session?.user || null,
    profile,
    isLoggedIn: !!session?.user,
    adminRole,
    adminPermissions,
    isAdmin: !!adminRole,
    isSuperAdmin: adminRole === 'super_admin',
    loading,
    signInWithGoogle,
    signOut,
    refreshProfile
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

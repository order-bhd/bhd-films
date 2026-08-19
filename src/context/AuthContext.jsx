import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)

  // Check manual Super Admin login immediately
  const [manualSuperAdmin, setManualSuperAdmin] = useState(() => {
    return sessionStorage.getItem('bhd_superadmin') === 'true'
  })

  const [adminRole, setAdminRole] = useState(() => {
    return sessionStorage.getItem('bhd_superadmin') === 'true'
      ? 'super_admin'
      : null
  })

  const [adminPermissions, setAdminPermissions] = useState({})
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    // Manual Super Admin has full access
    if (sessionStorage.getItem('bhd_superadmin') === 'true') {
      setManualSuperAdmin(true)
      setAdminRole('super_admin')
      setAdminPermissions({})
      setProfile({
        id: 'manual-super-admin',
        role: 'super_admin'
      })
      return
    }

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

    async function initializeAuth() {
      // First check manual Super Admin login
      if (sessionStorage.getItem('bhd_superadmin') === 'true') {
        if (!mounted) return

        setManualSuperAdmin(true)
        setAdminRole('super_admin')
        setAdminPermissions({})
        setProfile({
          id: 'manual-super-admin',
          role: 'super_admin'
        })
        setLoading(false)
        return
      }

      // Otherwise check Supabase session
      const {
        data: { session: s }
      } = await supabase.auth.getSession()

      if (!mounted) return

      setSession(s)
      await loadProfile(s?.user?.id)

      if (mounted) {
        setLoading(false)
      }
    }

    initializeAuth()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        // Don't overwrite manual Super Admin login
        if (sessionStorage.getItem('bhd_superadmin') === 'true') {
          setManualSuperAdmin(true)
          setAdminRole('super_admin')
          return
        }

        setSession(s)
        await loadProfile(s?.user?.id)
        setLoading(false)
      }
    )

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = `${window.location.origin}/`

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    })

    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    // Remove manual Super Admin access
    sessionStorage.removeItem('bhd_superadmin')

    setManualSuperAdmin(false)
    setAdminRole(null)
    setAdminPermissions({})
    setProfile(null)
    setSession(null)

    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (sessionStorage.getItem('bhd_superadmin') === 'true') {
      setManualSuperAdmin(true)
      setAdminRole('super_admin')
      return
    }

    await loadProfile(session?.user?.id)
  }, [loadProfile, session])

  const value = {
    session,

    // Manual Super Admin should also be treated as logged in
    user: manualSuperAdmin
      ? { id: 'manual-super-admin', username: 'Superadmin' }
      : session?.user || null,

    profile,

    isLoggedIn: manualSuperAdmin || !!session?.user,

    adminRole: manualSuperAdmin ? 'super_admin' : adminRole,

    adminPermissions,

    // THIS IS THE IMPORTANT FIX
    isAdmin: manualSuperAdmin || !!adminRole,

    isSuperAdmin:
      manualSuperAdmin || adminRole === 'super_admin',

    loading,

    signInWithGoogle,
    signOut,
    refreshProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }

  return ctx
}
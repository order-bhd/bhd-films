import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const isManualSuperAdmin = () => {
  return sessionStorage.getItem('bhd_superadmin') === 'true'
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [adminRole, setAdminRole] = useState(null)
  const [adminPermissions, setAdminPermissions] = useState({})
  const [loading, setLoading] = useState(true)
  const [manualSuperAdmin, setManualSuperAdmin] = useState(() =>
    isManualSuperAdmin()
  )

  const SUPER_ADMIN_PERMISSIONS = {
    view_customers: true,
    manage_categories: true,
    manage_services: true,
    manage_rates: true,
    manage_bulk_pricing: true,
    manage_orders: true,
    manage_fund_requests: true,
    manage_wallets: true,
    manage_payment_settings: true,
    manage_offers: true,
    manage_support: true,
    view_audit_log: true,
    manage_admins: true
  }

  const loadProfile = useCallback(async (userId) => {
    // MANUAL SUPER ADMIN HAS PRIORITY
    if (isManualSuperAdmin()) {
      setManualSuperAdmin(true)
      setProfile(null)
      setAdminRole('super_admin')
      setAdminPermissions(SUPER_ADMIN_PERMISSIONS)
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

    // CHECK MANUAL SUPER ADMIN FIRST
    if (isManualSuperAdmin()) {
      setManualSuperAdmin(true)
      setAdminRole('super_admin')
      setAdminPermissions(SUPER_ADMIN_PERMISSIONS)
      setLoading(false)
    } else {
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (!mounted) return

        setSession(s)
        loadProfile(s?.user?.id).finally(() => {
          if (mounted) setLoading(false)
        })
      })
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        if (isManualSuperAdmin()) {
          setManualSuperAdmin(true)
          setAdminRole('super_admin')
          setAdminPermissions(SUPER_ADMIN_PERMISSIONS)
          setLoading(false)
          return
        }

        setSession(s)
        loadProfile(s?.user?.id)
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
    // CLEAR MANUAL SUPER ADMIN LOGIN
    sessionStorage.removeItem('bhd_superadmin')
    setManualSuperAdmin(false)
    setSession(null)
    setProfile(null)
    setAdminRole(null)
    setAdminPermissions({})

    // ALSO SIGN OUT SUPABASE USER
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(() => {
    if (isManualSuperAdmin()) {
      setManualSuperAdmin(true)
      setAdminRole('super_admin')
      setAdminPermissions(SUPER_ADMIN_PERMISSIONS)
      return Promise.resolve()
    }

    return loadProfile(session?.user?.id)
  }, [loadProfile, session])

  const isSuperAdmin =
    manualSuperAdmin || adminRole === 'super_admin'

  const value = {
    session,

    // MANUAL SUPER ADMIN IS ALSO CONSIDERED LOGGED IN
    user: manualSuperAdmin
      ? { id: 'manual-super-admin', role: 'super_admin' }
      : session?.user || null,

    profile,

    isLoggedIn: manualSuperAdmin || !!session?.user,

    adminRole: isSuperAdmin
      ? 'super_admin'
      : adminRole,

    adminPermissions: isSuperAdmin
      ? SUPER_ADMIN_PERMISSIONS
      : adminPermissions,

    isAdmin: isSuperAdmin || !!adminRole,

    isSuperAdmin,

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
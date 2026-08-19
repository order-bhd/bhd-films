import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loader from './Loader'

// Protects every /admin/* page
export default function AdminRoute({ children, permission }) {
  const { isLoggedIn, isAdmin, adminRole, loading } = useAuth()

  // Check manual Super Admin login
  const isManualSuperAdmin =
    sessionStorage.getItem('bhd_superadmin') === 'true'

  // Manual Super Admin gets immediate full access
  if (isManualSuperAdmin) {
    return children
  }

  // Wait only for normal Supabase authentication
  if (loading) return <Loader />

  // Normal Supabase Admin check
  if (!isLoggedIn || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  // Staff restrictions
  if (permission && adminRole === 'staff') {
    const restricted = [
      'manage_wallets',
      'manage_rates',
      'manage_bulk_pricing',
      'manage_payment_settings',
      'manage_admins'
    ]

    if (restricted.includes(permission)) {
      return <Navigate to="/admin" replace />
    }
  }

  return children
}
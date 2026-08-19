import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loader from './Loader'

// Protects every /admin/* page
export default function AdminRoute({ children, permission }) {
  const { isLoggedIn, isAdmin, adminRole, loading } = useAuth()

  // Check manual Super Admin login
  const isManualSuperAdmin =
    sessionStorage.getItem('bhd_superadmin') === 'true'

  if (loading) return <Loader />

  // Allow:
  // 1. Manual Super Admin login
  // OR
  // 2. Normal Supabase Admin login
  if (!isManualSuperAdmin && (!isLoggedIn || !isAdmin)) {
    return <Navigate to="/admin/login" replace />
  }

  // Manual Super Admin gets full access
  if (isManualSuperAdmin) {
    return children
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
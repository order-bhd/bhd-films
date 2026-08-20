import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Loader from './Loader'

// Wraps every /admin/* page. Frontend gating is only a convenience -
// the REAL enforcement happens in Postgres RLS + has_permission(), so
// even if someone bypasses this component they still can't read/write
// anything they're not allowed to.
export default function AdminRoute({ children, permission }) {
  const { isLoggedIn, isAdmin, adminRole, loading } = useAuth()

  if (loading) return <Loader />
  if (!isLoggedIn || !isAdmin) {
    return <Navigate to="/admin/login" replace />
  }
  if (permission && adminRole === 'staff') {
    // Staff-only soft check for nicer UX; DB still enforces the real rule.
    const restricted = ['manage_wallets', 'manage_rates', 'manage_bulk_pricing', 'manage_payment_settings', 'manage_admins']
    if (restricted.includes(permission)) {
      return <Navigate to="/admin" replace />
    }
  }
  return children
}

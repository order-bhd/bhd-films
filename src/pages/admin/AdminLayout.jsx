import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FolderTree,
  Boxes,
  Percent,
  Layers,
  ShoppingBag,
  Banknote,
  History,
  QrCode,
  Gift,
  MessageSquare,
  BarChart3,
  ShieldCheck,
  UserCog,
  LogOut,
  Menu,
  Clapperboard,
  X
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true, perm: null },
  { to: '/admin/customers', label: 'Customers', icon: Users, perm: 'view_customers' },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree, perm: 'manage_categories' },
  { to: '/admin/services', label: 'Services', icon: Boxes, perm: 'manage_services' },
  { to: '/admin/rate-control', label: 'Rate Control', icon: Percent, perm: 'manage_rates' },
  { to: '/admin/bulk-pricing', label: 'Bulk Pricing', icon: Layers, perm: 'manage_bulk_pricing' },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag, perm: 'manage_orders' },
  { to: '/admin/fund-requests', label: 'Fund Requests', icon: Banknote, perm: 'manage_fund_requests' },
  { to: '/admin/wallet-transactions', label: 'Wallet Transactions', icon: History, perm: 'manage_wallets' },
  { to: '/admin/payment-settings', label: 'Payment Settings', icon: QrCode, perm: 'manage_payment_settings' },
  { to: '/admin/offers', label: 'Offers', icon: Gift, perm: 'manage_offers' },
  { to: '/admin/support', label: 'Support Messages', icon: MessageSquare, perm: 'manage_support' },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3, perm: 'view_customers' },
  { to: '/admin/audit-log', label: 'Audit Log', icon: ShieldCheck, perm: 'view_audit_log' },
  { to: '/admin/admins', label: 'Admin Users', icon: UserCog, perm: 'manage_admins' }
]

export default function AdminLayout() {
  const { adminRole, adminPermissions, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Check manual Super Admin login
  const isSuperAdmin =
    sessionStorage.getItem('bhd_superadmin') === 'true'

  // Manual login gets full Super Admin access
  const currentRole = isSuperAdmin ? 'super_admin' : adminRole

  function allowed(perm) {
    if (!perm) return true

    // Super Admin gets everything
    if (currentRole === 'super_admin') return true

    if (currentRole === 'admin') {
      return perm !== 'manage_admins'
    }

    const restricted = [
      'manage_wallets',
      'manage_rates',
      'manage_bulk_pricing',
      'manage_payment_settings',
      'manage_admins'
    ]

    if (restricted.includes(perm)) return false

    return !!adminPermissions?.[perm]
  }

  function handleLogout() {
    // Remove manual Super Admin session
    sessionStorage.removeItem('bhd_superadmin')

    // Sign out normal authentication if present
    Promise.resolve(signOut())
      .catch(() => {})
      .finally(() => {
        navigate('/admin/login', { replace: true })
      })
  }

  const visibleNav = NAV.filter((item) => allowed(item.perm))

  const linkList = (
    <>
      {visibleNav.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            `admin-nav-link${isActive ? ' active' : ''}`
          }
          onClick={() => setMobileOpen(false)}
        >
          <item.icon size={16} />
          {item.label}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="admin-shell">
      <div className="admin-topbar">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 800
          }}
        >
          <Clapperboard size={18} /> BHD Films Admin
        </div>

        <button
          className="icon-btn"
          onClick={() => setMobileOpen(true)}
        >
          <Menu size={18} />
        </button>
      </div>

      {mobileOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="modal-sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="row-between"
              style={{ marginBottom: 14 }}
            >
              <strong>Menu</strong>

              <button
                className="icon-btn"
                onClick={() => setMobileOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {linkList}

            <div className="divider" />

            <button
              className="btn btn-secondary"
              onClick={handleLogout}
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
      )}

      <aside className="admin-sidebar">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontWeight: 800,
            padding: '6px 10px 18px'
          }}
        >
          <Clapperboard size={18} /> BHD Films
        </div>

        {linkList}

        <div className="divider" />

        <button
          className="admin-nav-link"
          style={{
            width: '100%',
            background: 'none',
            border: 'none'
          }}
          onClick={handleLogout}
        >
          <LogOut size={16} /> Logout
        </button>

        <p
          className="text-faint"
          style={{
            fontSize: 10.5,
            padding: '10px 12px 0'
          }}
        >
          Role: {currentRole}
        </p>
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}
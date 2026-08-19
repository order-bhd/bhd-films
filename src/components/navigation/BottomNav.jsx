import { NavLink } from 'react-router-dom'
import { Home, Gift, ReceiptText, Wallet, User } from 'lucide-react'

const ITEMS = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/offers', label: 'Offers', icon: Gift },
  { to: '/orders', label: 'Orders', icon: ReceiptText },
  { to: '/wallet', label: 'Wallet', icon: Wallet },
  { to: '/profile', label: 'Profile', icon: User }
]

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          {({ isActive }) => (
            <>
              <span className="nav-icon-wrap">
                <item.icon size={19} strokeWidth={isActive ? 2.4 : 1.9} />
              </span>
              <span>{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}

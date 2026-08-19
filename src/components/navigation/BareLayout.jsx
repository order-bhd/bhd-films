import { Outlet } from 'react-router-dom'
import AnimatedBackground from '../common/AnimatedBackground'

// Used for full-screen flows without the bottom nav (Login, Payment QR,
// Order Success) but still with the app shell + background.
export default function BareLayout() {
  return (
    <div className="app-shell">
      <AnimatedBackground />
      <main className="app-content no-nav">
        <Outlet />
      </main>
    </div>
  )
}

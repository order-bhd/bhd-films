import { Outlet } from 'react-router-dom'
import AnimatedBackground from '../common/AnimatedBackground'
import TopHeader from './TopHeader'
import BottomNav from './BottomNav'
import InstallBanner from '../common/InstallBanner'

// Shared shell for every customer-facing page: background, header, content
// outlet, bottom nav. Admin pages use their own AdminLayout instead.
export default function AppLayout() {
  return (
    <div className="app-shell">
      <AnimatedBackground />
      <TopHeader />
      <InstallBanner />
      <main className="app-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}

import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'
import type { NavItem } from './nav-config'

interface AppShellProps {
  children: React.ReactNode
  navItems: NavItem[]
}

export function AppShell({ children, navItems }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar navItems={navItems} />
      <Header navItems={navItems} />
      {/* pt-14 clears fixed header (h-14); pb-16 lg:pb-0 clears BottomNav on mobile */}
      <main className="lg:ml-[240px] pt-14 pb-16 lg:pb-0 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
      <BottomNav navItems={navItems} />
    </div>
  )
}

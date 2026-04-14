import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { BottomNav } from './BottomNav'

interface AppShellProps {
  children: React.ReactNode
  role: 'admin' | 'reseller'
  logoUrl?: string
  companyName?: string
}

export function AppShell({ children, role, logoUrl, companyName }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar role={role} logoUrl={logoUrl} companyName={companyName} />
      <Header role={role} />
      {/* pt-14 clears fixed header (h-14); pb-16 lg:pb-0 clears BottomNav on mobile */}
      <main className="lg:ml-[240px] pt-14 pb-16 lg:pb-0 min-h-screen">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
      <BottomNav role={role} />
    </div>
  )
}

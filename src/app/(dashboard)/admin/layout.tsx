import { AppShell } from '@/components/layout/AppShell'
import { ADMIN_NAV } from '@/components/layout/nav-config'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AppShell navItems={ADMIN_NAV}>{children}</AppShell>
}

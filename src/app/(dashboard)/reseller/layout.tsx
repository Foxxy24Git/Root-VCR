import { AppShell } from '@/components/layout/AppShell'
import { RESELLER_NAV } from '@/components/layout/nav-config'

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell navItems={RESELLER_NAV}>{children}</AppShell>
}

import { AppShell } from '@/components/layout/AppShell'

export default function ResellerLayout({ children }: { children: React.ReactNode }) {
  return <AppShell role="reseller">{children}</AppShell>
}

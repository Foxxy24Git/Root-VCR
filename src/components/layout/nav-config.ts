import {
  LayoutDashboard,
  Ticket,
  Users,
  Wallet,
  BarChart3,
  Settings,
} from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { FC } from 'react'

export type NavItem = {
  label: string
  href: string
  icon: FC<LucideProps>
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: (p) => LayoutDashboard(p) },
  { label: 'Vouchers',  href: '/admin/vouchers',  icon: (p) => Ticket(p) },
  { label: 'Resellers', href: '/admin/resellers', icon: (p) => Users(p) },
  { label: 'Wallet',    href: '/admin/wallet',    icon: (p) => Wallet(p) },
  { label: 'Analytics', href: '/admin/analytics', icon: (p) => BarChart3(p) },
  { label: 'Settings',  href: '/admin/settings',  icon: (p) => Settings(p) },
]

export const RESELLER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/reseller/dashboard', icon: (p) => LayoutDashboard(p) },
  { label: 'Vouchers',  href: '/reseller/vouchers',  icon: (p) => Ticket(p) },
  { label: 'Analytics', href: '/reseller/analytics', icon: (p) => BarChart3(p) },
  { label: 'Settings',  href: '/reseller/settings',  icon: (p) => Settings(p) },
]

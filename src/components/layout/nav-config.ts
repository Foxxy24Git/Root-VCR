import {
  LayoutDashboard,
  Ticket,
  Users,
  Wallet,
  BarChart3,
  Settings,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Vouchers',  href: '/admin/vouchers',  icon: Ticket },
  { label: 'Resellers', href: '/admin/resellers', icon: Users },
  { label: 'Wallet',    href: '/admin/wallet',    icon: Wallet },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Settings',  href: '/admin/settings',  icon: Settings },
]

export const RESELLER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/reseller/dashboard', icon: LayoutDashboard },
  { label: 'Vouchers',  href: '/reseller/vouchers',  icon: Ticket },
  { label: 'Analytics', href: '/reseller/analytics', icon: BarChart3 },
  { label: 'Settings',  href: '/reseller/settings',  icon: Settings },
]

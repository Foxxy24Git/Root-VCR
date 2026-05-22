import {
  LayoutDashboard,
  Ticket,
  Users,
  Wallet,
  BarChart3,
  Settings,
  SlidersHorizontal,
  Building2,
  Package,
  Receipt,
  ScrollText,
  Landmark,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type AppRole = 'admin' | 'reseller' | 'super-admin'

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',       href: '/admin/dashboard',        icon: LayoutDashboard },
  { label: 'Vouchers',        href: '/admin/vouchers',         icon: Ticket },
  { label: 'Resellers',       href: '/admin/resellers',        icon: Users },
  { label: 'Wallet',          href: '/admin/wallet',           icon: Wallet },
  { label: 'Analytics',       href: '/admin/analytics',        icon: BarChart3 },
  { label: 'VCR Config',      href: '/admin/voucher-settings', icon: SlidersHorizontal },
  { label: 'Settings',        href: '/admin/settings',         icon: Settings },
]

export const RESELLER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/reseller/dashboard', icon: LayoutDashboard },
  { label: 'Vouchers',  href: '/reseller/vouchers',  icon: Ticket },
  { label: 'Analytics', href: '/reseller/analytics', icon: BarChart3 },
  { label: 'Settings',  href: '/reseller/settings',  icon: Settings },
]

export const SUPER_ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard',     href: '/super-admin',                icon: LayoutDashboard },
  { label: 'Tenants',       href: '/super-admin/tenants',        icon: Building2 },
  { label: 'Plans',         href: '/super-admin/plans',          icon: Package },
  { label: 'Bank Accounts', href: '/super-admin/bank-accounts',  icon: Landmark },
  { label: 'Invoices',      href: '/super-admin/invoices',       icon: Receipt },
  { label: 'Audit Logs',    href: '/super-admin/audit-logs',     icon: ScrollText },
  { label: 'Settings',      href: '/super-admin/settings',       icon: Settings },
]

export function getNav(role: AppRole): NavItem[] {
  switch (role) {
    case 'admin':       return ADMIN_NAV
    case 'reseller':    return RESELLER_NAV
    case 'super-admin': return SUPER_ADMIN_NAV
  }
}

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getNav, type AppRole } from './nav-config'

interface SidebarProps {
  role: AppRole
  logoUrl?: string
  companyName?: string
}

export function Sidebar({ role, logoUrl, companyName }: SidebarProps) {
  const pathname = usePathname()
  const navItems = getNav(role)
  const defaultName = role === 'super-admin' ? 'Root.VCR · Super Admin' : 'Root.VCR'
  const displayName = companyName || defaultName

  return (
    <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full w-[240px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-20 transition-colors duration-200">
      {/* Logo */}
      <div className="h-14 flex items-center px-6 border-b border-slate-200 dark:border-slate-800 shrink-0 gap-2">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={displayName}
            width={32}
            height={32}
            className="h-8 w-auto object-contain"
          />
        ) : null}
        <span className="text-lg font-bold text-primary truncate">{displayName}</span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map((item) => {
          // Super Admin dashboard sits at root "/super-admin" — only match exact, otherwise it stays "active" on every sub-route.
          const isActive =
            item.href === '/super-admin'
              ? pathname === '/super-admin'
              : pathname === item.href || pathname.startsWith(item.href + '/')
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}

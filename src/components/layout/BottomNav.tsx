'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getNav, type AppRole } from './nav-config'

interface BottomNavProps {
  role: AppRole
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const allNav = getNav(role)
  // On mobile (bottom nav) we cap to 5 items max so they fit comfortably; super-admin nav has 6, drop "Settings".
  const navItems = allNav.length > 5 ? allNav.slice(0, 5) : allNav

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-20 flex safe-bottom transition-colors duration-200">
      {navItems.map((item) => {
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
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors',
              isActive
                ? 'text-primary'
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate w-full text-center px-0.5 leading-tight">{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}

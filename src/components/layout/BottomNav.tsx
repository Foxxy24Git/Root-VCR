'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ADMIN_NAV, RESELLER_NAV } from './nav-config'

interface BottomNavProps {
  role: 'admin' | 'reseller'
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const navItems = role === 'admin' ? ADMIN_NAV : RESELLER_NAV

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20 flex safe-bottom">
      {navItems.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        const Icon = item.icon
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-gray-400 hover:text-gray-600'
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

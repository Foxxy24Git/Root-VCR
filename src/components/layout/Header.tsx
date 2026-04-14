'use client'

import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/shared/ThemeToggle'
import { ADMIN_NAV, RESELLER_NAV } from './nav-config'

interface HeaderProps {
  role: 'admin' | 'reseller'
}

export function Header({ role }: HeaderProps) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const navItems = role === 'admin' ? ADMIN_NAV : RESELLER_NAV

  // Derive page title from current route
  const currentNav = navItems.find((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
  const title = currentNav?.label ?? 'Root.VCR'

  const user = session?.user
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U'

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-[240px] h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 flex items-center justify-between px-4 lg:px-6 transition-colors duration-200">
      <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{user?.name ?? '—'}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email ?? '—'}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}

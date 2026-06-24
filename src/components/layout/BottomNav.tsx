'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getNav, type AppRole } from './nav-config'
import { Menu, X } from 'lucide-react'

interface BottomNavProps {
  role: AppRole
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname()
  const allNav = getNav(role)
  const [isOpen, setIsOpen] = useState(false)
  const popupRef = useRef<HTMLDivElement>(null)

  // Close popup on navigation change
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close popup on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Decide if we should show the popup (only if navigation has more than 4 items)
  const showPopup = allNav.length > 4
  const visibleNav = showPopup ? allNav.slice(0, 3) : allNav
  const popupNav = showPopup ? allNav.slice(3) : []

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setIsOpen(false)}
        className={cn(
          'lg:hidden fixed inset-0 bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-sm z-30 transition-opacity duration-300',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
      />

      {/* Vertical Speed Dial Menu */}
      {showPopup && (
        <div
          ref={popupRef}
          className={cn(
            'lg:hidden fixed right-[18px] z-40 flex flex-col items-end gap-3.5 transition-all duration-300 ease-out origin-bottom-right',
            isOpen
              ? 'bottom-36 opacity-100 translate-y-0 scale-100 pointer-events-auto'
              : 'bottom-32 opacity-0 translate-y-4 scale-95 pointer-events-none'
          )}
        >
          {popupNav.map((item, index) => {
            const isActive =
              item.href === '/super-admin'
                ? pathname === '/super-admin'
                : pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{ transitionDelay: isOpen ? `${index * 40}ms` : '0ms' }}
                className={cn(
                  'flex items-center gap-3 transition-all duration-300 ease-out transform active:scale-95',
                  isOpen ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
                )}
              >
                {/* Text Label */}
                <span
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-semibold shadow-md border transition-all duration-200 backdrop-blur-md',
                    isActive
                      ? 'bg-primary text-white border-primary/20 shadow-primary/10'
                      : 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800/80 text-slate-700 dark:text-slate-200'
                  )}
                >
                  {item.label}
                </span>

                {/* Circular Icon Wrapper */}
                <div
                  className={cn(
                    'w-11 h-11 rounded-full flex items-center justify-center shadow-lg border transition-all duration-200',
                    isActive
                      ? 'bg-primary text-white border-primary/20 shadow-primary/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400'
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Floating Action Button (FAB) */}
      {showPopup && (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'lg:hidden fixed right-4 bottom-20 z-50 w-12 h-12 rounded-full flex items-center justify-center bg-primary text-white shadow-lg shadow-primary/30 transition-all duration-300 ease-out outline-none focus:outline-none',
            isOpen ? 'rotate-90 scale-105' : 'hover:scale-105 active:scale-95'
          )}
        >
          {isOpen ? (
            <X className="h-6 w-6 transition-all duration-300" />
          ) : (
            <Menu className="h-6 w-6 transition-all duration-300" />
          )}
        </button>
      )}

      {/* Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 z-50 flex safe-bottom transition-colors duration-200">
        {visibleNav.map((item) => {
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
                'flex flex-col items-center justify-center gap-0.5 py-2 min-h-[56px] text-[10px] font-medium transition-colors flex-1',
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
    </>
  )
}

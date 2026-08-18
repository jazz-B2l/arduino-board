'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  ActivityIcon,
  AlertTriangleIcon,
  BarChart3Icon,
  FileTextIcon,
  LayoutDashboardIcon,
  MonitorIcon,
  SettingsIcon,
  TableIcon,
  CodeIcon,
  UserIcon,
} from 'lucide-react'
import { useBench } from './BenchContext'

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboardIcon },
  { href: '/programmation', label: 'Code',    icon: CodeIcon },
  { href: '/graphiques', label: 'Charts',     icon: BarChart3Icon },
  { href: '/donnees',    label: 'Data',       icon: TableIcon },
  { href: '/alarmes',    label: 'Alarms',     icon: AlertTriangleIcon },
  { href: '/rapports',   label: 'Reports',    icon: FileTextIcon },
  { href: '/parametres', label: 'Settings',   icon: SettingsIcon },
  { href: '/systeme',    label: 'System',     icon: MonitorIcon },
  { href: '/account',    label: 'Account',    icon: UserIcon },
]

export function AppNav() {
  const pathname = usePathname()
  const { alarms, navLayout } = useBench()
  const unacknowledgedAlarms = alarms.filter(a => a.level === 'DANGER').length
  const isHorizontal = navLayout === 'tabs' || navLayout === 'bottom-tabs'
  const isRight = navLayout === 'right-sidebar'
  const isBottom = navLayout === 'bottom-tabs'

  return (
    <nav
      className={`flex-shrink-0 border-bench-border select-none ${
        isHorizontal 
          ? `w-full flex-row overflow-x-auto px-4 py-1 gap-1 justify-center ${isBottom ? 'border-t' : 'border-b'}` 
          : `w-[52px] md:w-44 flex-col py-3 gap-0.5 ${isRight ? 'border-l' : 'border-r'}`
      } flex`}
      style={{ backgroundColor: 'var(--bench-header-bg)' }}
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
        const isAlarms = href === '/alarmes'

        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 transition-all relative ${
              isHorizontal 
                ? 'px-3.5 py-2 my-0.5 rounded-md text-xs border-b-2 hover:bg-bench-subtle/50' 
                : 'px-3 py-2.5 mx-1.5 rounded text-sm hover:bg-bench-subtle/50'
            }`}
            style={{
              backgroundColor: isActive ? 'var(--bench-nav-active)' : 'transparent',
              color: isActive ? 'var(--bench-text)' : 'var(--bench-muted)',
              borderLeft: !isHorizontal && !isRight && isActive ? '2px solid var(--bench-info)' : '2px solid transparent',
              borderRight: !isHorizontal && isRight && isActive ? '2px solid var(--bench-info)' : '2px solid transparent',
              borderBottom: isHorizontal && isActive ? '2px solid var(--bench-info)' : '2px solid transparent',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={isHorizontal ? 14 : 16}
              style={{ color: isActive ? 'var(--bench-info)' : 'var(--bench-muted)', flexShrink: 0 }}
            />
            <span className="hidden md:block font-medium truncate">{label}</span>

            {/* Alarm badge */}
            {isAlarms && unacknowledgedAlarms > 0 && (
              <span
                className={`w-4 h-4 rounded-full text-[9px] font-mono font-bold flex items-center justify-center bg-red-500 text-white shrink-0 ${
                  isHorizontal ? 'ml-1' : 'hidden md:flex ml-auto'
                }`}
              >
                {unacknowledgedAlarms > 9 ? '9+' : unacknowledgedAlarms}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}

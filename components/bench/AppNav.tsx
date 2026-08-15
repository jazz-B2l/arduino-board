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
]

export function AppNav() {
  const pathname = usePathname()
  const { alarms } = useBench()
  const unacknowledgedAlarms = alarms.filter(a => a.level === 'DANGER').length

  return (
    <nav
      className="flex-shrink-0 w-[52px] md:w-44 border-r flex flex-col py-3 gap-0.5"
      style={{ backgroundColor: '#0d1220', borderColor: '#1f2937' }}
      aria-label="Main navigation"
    >
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const isActive = href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href)
        const isAlarms = href === '/alarmes'

        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-3 px-3 py-2.5 mx-1.5 rounded text-sm transition-colors relative"
            style={{
              backgroundColor: isActive ? '#1e293b' : 'transparent',
              color: isActive ? '#e2e8f0' : '#64748b',
              borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <Icon
              size={16}
              style={{ color: isActive ? '#3b82f6' : '#64748b', flexShrink: 0 }}
            />
            <span className="hidden md:block font-medium truncate">{label}</span>

            {/* Alarm badge */}
            {isAlarms && unacknowledgedAlarms > 0 && (
              <span
                className="hidden md:flex ml-auto w-5 h-5 rounded-full text-[10px] font-mono font-bold items-center justify-center"
                style={{ backgroundColor: '#ef4444', color: '#fff' }}
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

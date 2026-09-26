'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Search, GitBranch, BookOpen, Users, MessageSquare, Settings, LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import ProjectSwitcher from './ProjectSwitcher'
import { clsx } from 'clsx'

const NAV = [
  { href: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { href: '/explorer',   icon: Search,           label: 'Explorer'   },
  { href: '/adrs',       icon: BookOpen,         label: 'ADRs'       },
  { href: '/people',     icon: Users,            label: 'People'     },
  { href: '/chat',       icon: MessageSquare,    label: 'AI Chat'    },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { logout, user } = useAuthStore()

  return (
    <aside className="fixed inset-y-0 left-0 flex flex-col bg-brand-900 text-white"
           style={{ width: 'var(--sidebar-w)' }}>
      {/* Logo */}
      <div className="px-4 pt-6 pb-4 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight">SynQ</h1>
        <p className="text-xs text-white/50 mt-0.5">Organizational Memory</p>
      </div>

      {/* Project switcher */}
      <div className="px-3 py-3 border-b border-white/10">
        <ProjectSwitcher />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-white/15 text-white'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Bottom: settings + user */}
      <div className="border-t border-white/10 px-2 py-3 space-y-0.5">
        <Link
          href="/settings"
          className={clsx(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-white/15 text-white'
              : 'text-white/70 hover:bg-white/10 hover:text-white',
          )}
        >
          <Settings className="w-4 h-4 shrink-0" />
          Settings
        </Link>

        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                     text-white/70 hover:bg-white/10 hover:text-white transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sign out
        </button>

        {user && (
          <div className="px-3 pt-2 pb-1">
            <p className="text-xs font-medium text-white truncate">{user.full_name || user.email}</p>
            <p className="text-xs text-white/40 capitalize">{user.role}</p>
          </div>
        )}
      </div>
    </aside>
  )
}

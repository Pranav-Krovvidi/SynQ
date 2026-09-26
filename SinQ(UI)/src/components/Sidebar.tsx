'use client'

import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import AppLogo from '@/components/ui/AppLogo'
import { useAuth } from '@/lib/auth'
import {
  LayoutDashboard, Compass, Server, FolderKanban, GitBranch,
  AlertTriangle, Users, Sparkles, UserPlus, ArrowRightLeft,
  Settings, ChevronLeft, ChevronRight, Circle, ChevronDown, Check,
} from 'lucide-react'

interface NavItem {
  id: string
  label: string
  href: string
  icon: React.ReactNode
  badge?: number
  badgeColor?: string
}

interface NavSection {
  id: string
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    id: 'overview',
    label: 'OVERVIEW',
    items: [
      { id: 'nav-dashboard', label: 'Dashboard', href: '/', icon: <LayoutDashboard size={16} /> },
    ],
  },
  {
    id: 'knowledge',
    label: 'KNOWLEDGE',
    items: [
      { id: 'nav-explorer', label: 'Knowledge Explorer', href: '/knowledge-explorer', icon: <Compass size={16} /> },
      { id: 'nav-services', label: 'Services', href: '/services', icon: <Server size={16} />, badge: 9 },
      { id: 'nav-projects', label: 'Projects', href: '/projects', icon: <FolderKanban size={16} />, badge: 4 },
      { id: 'nav-adrs', label: 'Architecture Decisions', href: '/architecture-decisions', icon: <GitBranch size={16} />, badge: 8 },
      { id: 'nav-incidents', label: 'Incidents', href: '/incidents', icon: <AlertTriangle size={16} />, badge: 3, badgeColor: 'red' },
      { id: 'nav-people', label: 'People', href: '/people', icon: <Users size={16} /> },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    items: [
      { id: 'nav-ask', label: 'Ask SynQ', href: '/ask-syn-q-ai-chat', icon: <Sparkles size={16} /> },
    ],
  },
  {
    id: 'workflows',
    label: 'WORKFLOWS',
    items: [
      { id: 'nav-onboarding', label: 'Onboarding', href: '/onboarding', icon: <UserPlus size={16} /> },
      { id: 'nav-handover', label: 'Handover', href: '/handover', icon: <ArrowRightLeft size={16} /> },
    ],
  },
  {
    id: 'system',
    label: 'SYSTEM',
    items: [
      { id: 'nav-settings', label: 'Settings', href: '/settings', icon: <Settings size={16} /> },
    ],
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false)
  const pathname = usePathname()
  const { user, currentProject, projects, setCurrentProject } = useAuth()
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const isActive = (id: string) => {
    if (id === 'nav-dashboard' && pathname === '/') return true
    if (id === 'nav-ask' && pathname === '/ask-syn-q-ai-chat') return true
    if (id === 'nav-explorer' && pathname === '/knowledge-explorer') return true
    if (id === 'nav-services' && pathname.startsWith('/services')) return true
    if (id === 'nav-adrs' && pathname.startsWith('/architecture-decisions')) return true
    if (id === 'nav-incidents' && pathname.startsWith('/incidents')) return true
    if (id === 'nav-people' && pathname.startsWith('/people')) return true
    if (id === 'nav-projects' && pathname.startsWith('/projects')) return true
    if (id === 'nav-onboarding' && pathname.startsWith('/onboarding')) return true
    if (id === 'nav-handover' && pathname.startsWith('/handover')) return true
    if (id === 'nav-settings' && pathname.startsWith('/settings')) return true
    return false
  }

  return (
    <aside
      className="relative flex flex-col h-screen border-r border-border bg-secondary transition-all duration-300 ease-in-out flex-shrink-0"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-border h-[57px]">
        <AppLogo size={28} />
        {!collapsed && (
          <span className="font-bold text-[15px] tracking-tight text-foreground">SynQ</span>
        )}
      </div>

      {/* Project switcher */}
      {!collapsed && (
        <div className="px-2 pt-3 pb-2" ref={dropdownRef}>
          <p className="text-[10px] font-semibold tracking-widest text-muted-foreground px-2 mb-1.5 uppercase">Project</p>
          <button
            onClick={() => setProjectDropdownOpen(!projectDropdownOpen)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-md bg-muted/60 border border-border hover:border-primary/30 transition-colors text-left"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: currentProject?.color ?? '#00d4aa' }}
            />
            <span className="flex-1 text-[12px] font-medium text-foreground truncate">
              {currentProject?.name ?? 'Select project'}
            </span>
            <ChevronDown size={12} className={`text-muted-foreground transition-transform ${projectDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {projectDropdownOpen && (
            <div className="absolute left-2 right-2 mt-1 z-50 bg-card border border-border rounded-md shadow-xl overflow-hidden">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setCurrentProject(p); setProjectDropdownOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left"
                >
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{p.services} services · {p.adrs} ADRs</p>
                  </div>
                  {currentProject?.id === p.id && (
                    <Check size={11} className="text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        {navSections.map((section) => (
          <div key={section.id} className="mb-4">
            {!collapsed && (
              <p className="text-[10px] font-semibold tracking-widest text-muted-foreground px-2 mb-1.5 uppercase">
                {section.label}
              </p>
            )}
            {section.items.map((item) => {
              const active = isActive(item.id)
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={`
                    flex items-center gap-2.5 rounded-md px-2 py-2 mb-0.5 text-[13px] font-medium transition-all duration-150 relative group
                    sidebar-item
                    ${active ? 'sidebar-item-active' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}
                  `}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge !== undefined && (
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full tabular-nums ${
                          item.badgeColor === 'red'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/25'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge !== undefined && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="border-t border-border p-3">
        <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-background flex-shrink-0">
            {user?.avatar ?? 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground truncate">{user?.name ?? 'Guest'}</p>
              <div className="flex items-center gap-1.5">
                <Circle size={6} className="text-green-400 fill-green-400 flex-shrink-0" />
                <p className="text-[10px] text-muted-foreground truncate">{user?.title ?? ''}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-[70px] w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-150 z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  )
}

'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Bell, Sparkles, ChevronRight, Command } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useProjectCatalog } from '@/lib/useLiveCatalog';
import type { CatalogIncident } from '@/lib/api';

const breadcrumbMap: Record<string, { label: string; parent?: string }> = {
  '/': { label: 'Dashboard' },
  '/ask-syn-q-ai-chat': { label: 'Ask SynQ', parent: 'AI' },
  '/knowledge-explorer': { label: 'Knowledge Explorer', parent: 'Knowledge' },
  '/services': { label: 'Services', parent: 'Engineering' },
  '/services/payment-service': { label: 'Payment Service', parent: 'Services' },
  '/architecture-decisions': { label: 'Architecture Decisions', parent: 'Knowledge' },
  '/incidents': { label: 'Incidents', parent: 'Operations' },
  '/people': { label: 'People', parent: 'Team' },
  '/projects': { label: 'Projects', parent: 'Workspace' },
  '/onboarding': { label: 'Onboarding', parent: 'Team' },
  '/handover': { label: 'Handover', parent: 'Team' },
  '/settings': { label: 'Settings', parent: 'Workspace' },
};

function getBreadcrumb(pathname: string) {
  // Exact match first
  if (breadcrumbMap[pathname]) return breadcrumbMap[pathname];
  // Dynamic ADR detail: /architecture-decisions/:id
  if (pathname.startsWith('/architecture-decisions/')) {
    return {
      label: pathname.split('/').pop()?.toUpperCase() ?? 'ADR',
      parent: 'Architecture Decisions',
    };
  }
  return { label: 'SynQ' };
}

export default function Topbar() {
  const pathname = usePathname();
  const [searchFocused, setSearchFocused] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const { user, currentProject } = useAuth();
  const crumb = getBreadcrumb(pathname);

  // The badge reflects real work: incidents in this project that are still open.
  const { data: incidents } = useProjectCatalog<CatalogIncident>('/catalog/incidents');
  const alerts = incidents.filter((incident) => incident.status !== 'resolved');

  const initials = user
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'SQ';

  return (
    <header className="h-[57px] border-b border-border bg-secondary/60 backdrop-blur-sm flex items-center px-4 gap-4 flex-shrink-0">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-[13px] flex-1 min-w-0">
        <span className="text-muted-foreground">SynQ</span>
        {crumb.parent && (
          <>
            <ChevronRight size={12} className="text-muted-foreground/50" />
            <span className="text-muted-foreground">{crumb.parent}</span>
          </>
        )}
        <ChevronRight size={12} className="text-muted-foreground/50" />
        <span className="text-foreground font-medium">{crumb.label}</span>
      </nav>

      {/* Search */}
      <div
        className={`relative flex items-center transition-all duration-200 ${searchFocused ? 'w-72' : 'w-56'}`}
      >
        <Search size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Search knowledge..."
          className="synq-input w-full pl-8 pr-16 py-1.5 text-[13px] h-8"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <div className="absolute right-2.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Command size={9} />
          <span>K</span>
        </div>
      </div>

      {/* Ask SynQ CTA */}
      <Link
        href="/ask-syn-q-ai-chat"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/25 text-primary text-[13px] font-medium hover:bg-primary/15 hover:border-primary/40 transition-all duration-150"
      >
        <Sparkles size={13} />
        Ask SynQ
      </Link>

      {/* Notifications — unresolved incidents in the selected project */}
      <div className="relative">
        <button
          type="button"
          aria-label={`Notifications${alerts.length ? ` (${alerts.length} unread)` : ''}`}
          aria-expanded={notifOpen}
          onClick={() => setNotifOpen((open) => !open)}
          className="relative w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
        >
          <Bell size={16} />
          {alerts.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-400" />
          )}
        </button>
        {notifOpen && (
          <>
            {/* click-away layer */}
            <button
              type="button"
              aria-hidden
              tabIndex={-1}
              onClick={() => setNotifOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-secondary border border-border rounded-md shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between">
                <p className="text-[12px] font-medium text-foreground">Notifications</p>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {alerts.length}
                </span>
              </div>
              {alerts.length === 0 ? (
                <p className="px-3 py-4 text-[12px] text-muted-foreground">
                  Nothing needs attention in {currentProject?.name ?? 'this workspace'}.
                </p>
              ) : (
                alerts.slice(0, 6).map((incident) => (
                  <Link
                    key={incident.id}
                    href="/incidents"
                    onClick={() => setNotifOpen(false)}
                    className="block px-3 py-2 hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                  >
                    <p className="text-[12px] text-foreground leading-snug line-clamp-1">
                      {incident.id}: {incident.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {incident.severity} · {incident.status} · {incident.service_name}
                    </p>
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* User avatar */}
      <div className="group relative">
        <button className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-background hover:opacity-90 transition-opacity">
          {initials}
        </button>
        {user && (
          <div className="absolute right-0 top-full mt-1.5 w-48 bg-secondary border border-border rounded-md shadow-lg py-1 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity z-50">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[12px] font-medium text-foreground">{user.name}</p>
              <p className="text-[11px] text-muted-foreground">{user.email}</p>
            </div>
            <Link
              href="/settings"
              className="block px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Settings
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

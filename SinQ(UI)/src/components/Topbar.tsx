'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Search, Bell, Sparkles, ChevronRight, Command, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import type { CatalogAdr, CatalogEmployee, CatalogIncident, CatalogService } from '@/lib/api';
import { useLiveCatalog } from '@/lib/useLiveCatalog';

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
    return { label: pathname.split('/').pop()?.toUpperCase() ?? 'ADR', parent: 'Architecture Decisions' };
  }
  return { label: 'SynQ' };
}

export default function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const { user, logout } = useAuth();
  const { data: employees } = useLiveCatalog<CatalogEmployee>('/catalog/employees');
  const { data: services } = useLiveCatalog<CatalogService>('/catalog/services');
  const { data: adrs } = useLiveCatalog<CatalogAdr>('/catalog/adrs');
  const { data: incidents } = useLiveCatalog<CatalogIncident>('/catalog/incidents');
  const crumb = getBreadcrumb(pathname);
  useEffect(() => {
    if (!employees.length) return;
    const savedId = localStorage.getItem('synq_selected_employee');
    const selectedId = savedId && employees.some((employee) => employee.id === savedId)
      ? savedId
      : employees[0].id;
    setSelectedEmployeeId(selectedId);
    localStorage.setItem('synq_selected_employee', selectedId);
  }, [employees]);
  const selectedEmployee = employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0];
  const memberStatus = {
    services: selectedEmployee ? services.filter((service) => service.owner_employee_id === selectedEmployee.id).length : 0,
    adrs: selectedEmployee ? adrs.filter((adr) => adr.author_employee_id === selectedEmployee.id).length : 0,
    incidents: selectedEmployee ? incidents.filter((incident) => incident.owner_employee_id === selectedEmployee.id).length : 0,
  };
  const activeIncidents = useMemo(
    () => incidents.filter((incident) => incident.status !== 'resolved'),
    [incidents],
  );

  const initials = user
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'SQ';

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/knowledge-explorer?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  const signOut = () => {
    logout();
    router.replace('/login');
  };

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
      <form onSubmit={submitSearch} className={`relative flex items-center transition-all duration-200 ${searchFocused ? 'w-72' : 'w-56'}`}>
        <Search size={14} className="absolute left-3 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search knowledge..."
          className="synq-input w-full pl-8 pr-16 py-1.5 text-[13px] h-8"
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <div className="absolute right-2.5 flex items-center gap-0.5 text-[10px] text-muted-foreground">
          <Command size={9} />
          <span>K</span>
        </div>
      </form>

      {/* Ask SynQ CTA */}
      <Link
        href="/ask-syn-q-ai-chat"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/25 text-primary text-[13px] font-medium hover:bg-primary/15 hover:border-primary/40 transition-all duration-150"
      >
        <Sparkles size={13} />
        Ask SynQ
      </Link>

      {/* Notifications */}
      <div className="relative">
        <button
          aria-label="Notifications"
          aria-expanded={notificationsOpen}
          onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }}
          className="relative w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
        >
          <Bell size={16} />
          {activeIncidents.length > 0 && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-semibold flex items-center justify-center">{activeIncidents.length}</span>}
        </button>
        {notificationsOpen && (
          <div className="absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto bg-secondary border border-border rounded-md shadow-xl z-50">
            <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
              <p className="text-[12px] font-semibold text-foreground">Active incidents</p>
              <Link href="/incidents" onClick={() => setNotificationsOpen(false)} className="text-[11px] text-primary hover:underline">View all</Link>
            </div>
            {activeIncidents.length === 0 ? (
              <p className="px-3 py-5 text-center text-[12px] text-muted-foreground">No active incidents</p>
            ) : activeIncidents.slice(0, 8).map((incident) => (
              <Link
                key={incident.id}
                href={`/incidents?incident=${encodeURIComponent(incident.id)}`}
                onClick={() => setNotificationsOpen(false)}
                className="block px-3 py-2.5 border-b border-border last:border-0 hover:bg-muted/60"
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-muted-foreground">{incident.id}</span>
                  <span className="text-[10px] text-red-400 capitalize">{incident.severity}</span>
                </span>
                <span className="block text-[12px] text-foreground mt-1">{incident.title}</span>
                <span className="block text-[10px] text-muted-foreground mt-0.5">{incident.company_name} · {incident.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* User avatar */}
      <div className="relative">
        <button
          aria-label="Open profile menu"
          aria-expanded={profileOpen}
          onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }}
          className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[11px] font-bold text-background hover:opacity-90 transition-opacity"
        >
          {initials}
        </button>
        {profileOpen && user && (
          <div className="absolute right-0 top-full mt-1.5 w-72 bg-secondary border border-border rounded-md shadow-lg py-1 z-50">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[12px] font-medium text-foreground">{user.name}</p>
              <p className="text-[11px] text-muted-foreground">{user.email}</p>
            </div>
            <div className="px-3 py-2 border-b border-border">
              <label htmlFor="profile-employee" className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">View company member</label>
              <select
                id="profile-employee"
                value={selectedEmployee?.id ?? ''}
                onChange={(event) => {
                  setSelectedEmployeeId(event.target.value);
                  localStorage.setItem('synq_selected_employee', event.target.value);
                }}
                className="w-full px-2 py-1.5 bg-background border border-border rounded text-[11px] text-foreground"
              >
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.full_name} · {employee.company_name}</option>)}
              </select>
              {selectedEmployee && (
                <>
                  <p className="text-[10px] text-muted-foreground mt-2">Assigned records · {selectedEmployee.company_name}</p>
                  <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                    <Link href="/services" onClick={() => setProfileOpen(false)} className="rounded bg-background border border-border p-1.5 text-center hover:border-primary/40">
                      <span className="block text-[13px] font-semibold text-foreground">{memberStatus.services}</span><span className="text-[9px] text-muted-foreground">Services</span>
                    </Link>
                    <Link href="/architecture-decisions" onClick={() => setProfileOpen(false)} className="rounded bg-background border border-border p-1.5 text-center hover:border-primary/40">
                      <span className="block text-[13px] font-semibold text-foreground">{memberStatus.adrs}</span><span className="text-[9px] text-muted-foreground">ADRs</span>
                    </Link>
                    <Link href="/incidents" onClick={() => setProfileOpen(false)} className="rounded bg-background border border-border p-1.5 text-center hover:border-primary/40">
                      <span className="block text-[13px] font-semibold text-foreground">{memberStatus.incidents}</span><span className="text-[9px] text-muted-foreground">Incidents</span>
                    </Link>
                  </div>
                </>
              )}
            </div>
            <Link href="/settings" onClick={() => setProfileOpen(false)} className="block px-3 py-1.5 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
              Settings
            </Link>
            <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-[12px] text-muted-foreground hover:text-red-400 hover:bg-muted transition-colors">
              <LogOut size={12} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

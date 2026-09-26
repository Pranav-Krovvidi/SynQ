'use client';

import React, { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { useLiveCatalog } from '@/lib/useLiveCatalog';
import type { CatalogAdr, CatalogEmployee, CatalogIncident, CatalogService } from '@/lib/api';
import {
  ArrowLeft,
  Mail,
  Users,
  Server,
  GitBranch,
  AlertTriangle,
  FolderGit2,
  Radio,
} from 'lucide-react';

type TabId = 'overview' | 'adrs' | 'services' | 'incidents' | 'projects';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Users size={13} /> },
  { id: 'adrs', label: 'ADRs', icon: <GitBranch size={13} /> },
  { id: 'services', label: 'Services', icon: <Server size={13} /> },
  { id: 'incidents', label: 'Incidents', icon: <AlertTriangle size={13} /> },
  { id: 'projects', label: 'Projects', icon: <FolderGit2 size={13} /> },
];

function Empty({ what }: { what: string }) {
  return (
    <p className="py-10 text-center text-[13px] text-muted-foreground">
      No {what} recorded for this person.
    </p>
  );
}

export default function PersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';
  const [tab, setTab] = useState<TabId>('overview');

  const { data: people, loading, error } = useLiveCatalog<CatalogEmployee>('/catalog/employees');
  const { data: adrs } = useLiveCatalog<CatalogAdr>('/catalog/adrs');
  const { data: services } = useLiveCatalog<CatalogService>('/catalog/services');
  const { data: incidents } = useLiveCatalog<CatalogIncident>('/catalog/incidents');

  const person = people.find((p) => p.id === id) ?? null;

  // Everything below is the person's actual footprint, resolved through the
  // ownership foreign keys rather than by matching on display names.
  const myAdrs = useMemo(() => adrs.filter((a) => a.author_employee_id === id), [adrs, id]);
  const myServices = useMemo(
    () => services.filter((s) => s.owner_employee_id === id),
    [services, id]
  );
  const myIncidents = useMemo(
    () => incidents.filter((i) => i.owner_employee_id === id),
    [incidents, id]
  );
  const myProjects = useMemo(() => {
    const seen = new Map<string, string>();
    myAdrs.forEach((a) => seen.set(a.project_id, a.project_name));
    myServices.forEach((s) => seen.set(s.project_id, s.project_name));
    myIncidents.forEach((i) => seen.set(i.project_id, i.project_name));
    return Array.from(seen, ([projectId, name]) => ({ id: projectId, name }));
  }, [myAdrs, myServices, myIncidents]);

  const counts: Record<TabId, number | null> = {
    overview: null,
    adrs: myAdrs.length,
    services: myServices.length,
    incidents: myIncidents.length,
    projects: myProjects.length,
  };

  if (loading && !person) {
    return (
      <AppLayout>
        <p className="p-6 text-[13px] text-muted-foreground">Loading profile…</p>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <p className="p-6 text-[13px] text-red-400">Unable to load profile: {error}</p>
      </AppLayout>
    );
  }

  if (!person) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft size={12} />
            Back
          </button>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Users size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-[14px] font-medium text-foreground mb-1">Person not found</p>
            <Link href="/people" className="mt-3 text-[13px] text-primary hover:underline">
              View all people
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const initials = person.full_name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-5 transition-colors"
        >
          <ArrowLeft size={12} />
          Back
        </button>

        {/* Identity */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[16px] font-bold text-background flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{person.full_name}</h1>
              {person.is_on_call && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10">
                  <Radio size={9} />
                  On call
                </span>
              )}
            </div>
            <p className="text-[13px] text-muted-foreground">{person.job_title}</p>
            <p className="text-[12px] text-muted-foreground/80 mt-0.5">
              {person.team} · {person.company_name}
            </p>
            <a
              href={`mailto:${person.email}`}
              className="mt-2 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-primary transition-colors"
            >
              <Mail size={11} />
              {person.email}
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border mb-5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 text-[13px] whitespace-nowrap border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.icon}
              {t.label}
              {counts[t.id] !== null && (
                <span className="text-[11px] tabular-nums text-muted-foreground">
                  ({counts[t.id]})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Panels */}
        {tab === 'overview' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: 'ADRs written', value: myAdrs.length, icon: <GitBranch size={13} /> },
                { label: 'Services owned', value: myServices.length, icon: <Server size={13} /> },
                {
                  label: 'Incidents owned',
                  value: myIncidents.length,
                  icon: <AlertTriangle size={13} />,
                },
                { label: 'Projects', value: myProjects.length, icon: <FolderGit2 size={13} /> },
              ].map((stat) => (
                <div key={stat.label} className="synq-card p-3">
                  <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                    {stat.icon}
                    <span className="text-[11px]">{stat.label}</span>
                  </div>
                  <p className="text-[20px] font-bold text-foreground tabular-nums">{stat.value}</p>
                </div>
              ))}
            </div>

            <h2 className="text-[13px] font-semibold text-foreground mb-2">Expertise</h2>
            {person.expertise.length === 0 ? (
              <Empty what="expertise" />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {person.expertise.map((skill) => (
                  <span key={skill} className="tech-tag">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'adrs' &&
          (myAdrs.length === 0 ? (
            <Empty what="ADRs" />
          ) : (
            <div className="space-y-2">
              {myAdrs.map((adr) => (
                <Link
                  key={adr.id}
                  href={`/architecture-decisions/${adr.id}`}
                  className="synq-card p-3 card-hover flex items-start justify-between gap-3 block"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{adr.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {adr.project_name} · {adr.service_count} service
                      {adr.service_count === 1 ? '' : 's'}
                    </p>
                  </div>
                  <StatusBadge variant={adr.status} />
                </Link>
              ))}
            </div>
          ))}

        {tab === 'services' &&
          (myServices.length === 0 ? (
            <Empty what="services" />
          ) : (
            <div className="space-y-2">
              {myServices.map((service) => (
                <Link
                  key={service.id}
                  href={`/services/${service.id}`}
                  className="synq-card p-3 card-hover flex items-start justify-between gap-3 block"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-foreground">{service.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                      {service.description ?? service.project_name}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] flex-shrink-0 ${
                      service.status === 'incident' ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {service.status}
                  </span>
                </Link>
              ))}
            </div>
          ))}

        {tab === 'incidents' &&
          (myIncidents.length === 0 ? (
            <Empty what="incidents" />
          ) : (
            <div className="space-y-2">
              {myIncidents.map((incident) => (
                <div key={incident.id} className="synq-card p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-foreground">
                        <span className="font-mono text-[11px] text-muted-foreground mr-1.5">
                          {incident.id}
                        </span>
                        {incident.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {incident.project_name} · {incident.service_name}
                      </p>
                    </div>
                    <span
                      className={`text-[11px] flex-shrink-0 ${
                        incident.status === 'resolved' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {incident.severity} · {incident.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}

        {tab === 'projects' &&
          (myProjects.length === 0 ? (
            <Empty what="projects" />
          ) : (
            <div className="space-y-2">
              {myProjects.map((project) => (
                <div
                  key={project.id}
                  className="synq-card p-3 flex items-center justify-between gap-3"
                >
                  <p className="text-[13px] font-medium text-foreground">{project.name}</p>
                  <p className="text-[11px] text-muted-foreground tabular-nums">
                    {myAdrs.filter((a) => a.project_id === project.id).length} ADRs ·{' '}
                    {myServices.filter((s) => s.project_id === project.id).length} services ·{' '}
                    {myIncidents.filter((i) => i.project_id === project.id).length} incidents
                  </p>
                </div>
              ))}
            </div>
          ))}
      </div>
    </AppLayout>
  );
}

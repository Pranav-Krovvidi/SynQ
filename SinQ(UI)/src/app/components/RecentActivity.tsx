'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { GitBranch, AlertTriangle, Server, ArrowRight } from 'lucide-react';
import { useProjectCatalog } from '@/lib/useLiveCatalog';
import type { CatalogAdr, CatalogIncident, CatalogService } from '@/lib/api';

interface RecentItem {
  id: string;
  title: string;
  meta: string;
  time: string;
  badge?: string;
  href: string;
}

interface RecentSection {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  items: RecentItem[];
}

const badgeColor: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Proposed: 'bg-accent/15 text-accent border border-accent/25',
  Open: 'bg-red-500/15 text-red-400 border border-red-500/25',
  Resolved: 'bg-green-500/15 text-green-400 border border-green-500/25',
};

function relativeTime(value: string | null): string {
  if (!value) return '';
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return '';
  const days = Math.floor((Date.now() - then) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return '1d ago';
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function RecentActivity() {
  const { data: adrs } = useProjectCatalog<CatalogAdr>('/catalog/adrs');
  const { data: incidents } = useProjectCatalog<CatalogIncident>('/catalog/incidents');
  const { data: services } = useProjectCatalog<CatalogService>('/catalog/services');

  // Built from the selected project's own records, so the panel changes with
  // the project instead of restating the same fixtures.
  const recentSections: RecentSection[] = useMemo(
    () =>
      [
        {
          label: 'Architecture Decisions',
          icon: <GitBranch size={11} />,
          color: 'text-accent',
          bgColor: 'bg-accent/10',
          items: [...adrs]
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            .slice(0, 3)
            .map((adr) => ({
              id: adr.id,
              title: adr.title,
              meta: `${adr.author_name ?? 'Unassigned'} · ${adr.project_name}`,
              time: relativeTime(adr.decided_at ?? adr.updated_at),
              badge: adr.status.charAt(0).toUpperCase() + adr.status.slice(1),
              href: `/architecture-decisions/${adr.id}`,
            })),
        },
        {
          label: 'Incidents',
          icon: <AlertTriangle size={11} />,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          items: [...incidents]
            .sort((a, b) => b.started_at.localeCompare(a.started_at))
            .slice(0, 3)
            .map((incident) => ({
              id: incident.id,
              title: `${incident.id}: ${incident.title}`,
              meta: `${incident.owner_name} · ${incident.service_name}`,
              time: relativeTime(incident.started_at),
              badge: incident.status.charAt(0).toUpperCase() + incident.status.slice(1),
              href: '/incidents',
            })),
        },
        {
          label: 'Services',
          icon: <Server size={11} />,
          color: 'text-primary',
          bgColor: 'bg-primary/10',
          items: services.slice(0, 3).map((service) => ({
            id: service.id,
            title: service.name,
            meta: `${service.owner_name ?? 'Unassigned'} · ${service.adr_count} ADRs`,
            time: '',
            badge: service.status === 'incident' ? 'Open' : 'Resolved',
            href: `/services/${service.id}`,
          })),
        },
      ].filter((section) => section.items.length > 0),
    [adrs, incidents, services]
  );

  return (
    <div className="synq-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-foreground">Recent Knowledge</h2>
        <Link
          href="/knowledge-explorer"
          className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
        >
          View all <ArrowRight size={10} />
        </Link>
      </div>
      <div className="space-y-3 flex-1">
        {recentSections.map((section) => (
          <div key={section.label}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div
                className={`w-4 h-4 rounded flex items-center justify-center ${section.bgColor} ${section.color}`}
              >
                {section.icon}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider ${section.color}`}
              >
                {section.label}
              </span>
            </div>
            <div className="space-y-1 pl-1">
              {section.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] text-foreground/90 leading-snug line-clamp-1 group-hover:text-foreground transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground truncate">
                        {item.meta}
                      </span>
                      <span className="text-[10px] text-muted-foreground/40 flex-shrink-0">·</span>
                      <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">
                        {item.time}
                      </span>
                    </div>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${badgeColor[item.badge] || 'bg-muted text-muted-foreground'}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

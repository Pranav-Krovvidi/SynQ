'use client';

import React from 'react';
import Link from 'next/link';
import { Server, ArrowRight, Clock, User, GitBranch, Layers } from 'lucide-react';
import type { CatalogService } from '@/lib/api';
import { useLiveCatalog } from '@/lib/useLiveCatalog';
import { useAuth } from '@/lib/auth';

export default function ContinueCards() {
  const { data: services, loading } = useLiveCatalog<CatalogService>('/catalog/services');
  const { currentProject } = useAuth();
  const recentServices = services
    .filter((service) => !currentProject || service.project_id === currentProject.id)
    .slice(0, 4);

  return (
    <div className="synq-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-foreground">Continue where you left off</h2>
        <Link href="/ask-syn-q-ai-chat" className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
          Open Ask SynQ
        </Link>
      </div>
      <div className="space-y-2.5">
        {recentServices.map((service) => (
          <Link
            key={service.id}
            href={`/services?q=${encodeURIComponent(service.name)}`}
            className="block p-3.5 rounded-lg bg-background border border-border hover:border-primary/30 hover:bg-primary/3 transition-all duration-150 group"
          >
            {/* Top row: icon + title + arrow */}
            <div className="flex items-start gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                <Server size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-foreground truncate">{service.name}</p>
                  <ArrowRight size={13} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{service.project_name} · {service.company_name}</p>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mb-2.5 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <User size={10} className="flex-shrink-0" />
                <span>{service.owner_name ?? service.project_name}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Layers size={10} className="flex-shrink-0" />
                <span>{(service.tech_stack ?? 'Technology not specified').split(',').map((technology) => technology.trim()).join(' · ')}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
                <Clock size={10} className="flex-shrink-0" />
                <span>Updated {new Date(service.updated_at).toLocaleDateString()}</span>
              </div>
            </div>

            {/* Bottom row: completeness + dependencies */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Linked knowledge</span>
                  <span className="text-[11px] font-semibold tabular-nums text-foreground">
                    {service.adr_count + service.incident_count} records
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 bg-primary"
                    style={{ width: `${Math.min(100, (service.adr_count + service.incident_count) * 12)}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0 border border-border rounded px-1.5 py-0.5">
                <GitBranch size={9} />
                <span>{service.adr_count} ADRs</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                <Clock size={9} />
                <span>{service.incident_count} incidents</span>
              </div>
            </div>
          </Link>
        ))}
        {!loading && recentServices.length === 0 && <p className="py-6 text-center text-[12px] text-muted-foreground">No services in this project yet.</p>}
      </div>
    </div>
  );
}
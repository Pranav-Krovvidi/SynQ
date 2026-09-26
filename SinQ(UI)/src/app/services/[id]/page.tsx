'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import {
  Server, ArrowLeft, CheckCircle, AlertCircle, AlertTriangle,
  GitBranch, Users, Sparkles, Tag, Clock,
} from 'lucide-react';
import { mockServices, mockADRs, mockIncidents } from '@/lib/mockData';
import type { ServiceStatus } from '@/lib/mockData';

const statusConfig: Record<ServiceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  operational: { label: 'Operational', color: 'text-emerald-400', icon: <CheckCircle size={13} /> },
  degraded: { label: 'Degraded', color: 'text-amber-400', icon: <AlertCircle size={13} /> },
  incident: { label: 'Incident', color: 'text-red-400', icon: <AlertTriangle size={13} /> },
};

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const service = mockServices.find((s) => s.id === id);

  if (!service) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <button onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft size={12} />Back
          </button>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Server size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-[14px] font-medium text-foreground mb-1">Service not found</p>
            <Link href="/services" className="mt-3 text-[13px] text-primary hover:underline">View all services</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[service.status];

  // Related ADRs and incidents that mention this service
  const relatedADRs = mockADRs.filter((a) => a.services.includes(service.name));
  const relatedIncidents = mockIncidents.filter((i) => i.service === service.name);

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <Link href="/services"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
          <ArrowLeft size={12} />Services
        </Link>

        {/* Header */}
        <div className="border border-border rounded-md p-5 bg-secondary mb-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Server size={18} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{service.name}</h1>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{service.description}</p>
              </div>
            </div>
            <div className={`flex items-center gap-1.5 text-[12px] font-medium flex-shrink-0 ${status.color}`}>
              {status.icon}
              {status.label}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            {[
              { label: 'Owner', value: service.owner },
              { label: 'Team', value: service.team },
              { label: 'Last Updated', value: service.lastUpdated },
              { label: 'ADRs / Incidents', value: `${service.adrCount} / ${service.incidentCount}` },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                <p className="text-[12px] font-medium text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technologies */}
        <div className="border border-border rounded-md p-4 bg-secondary mb-4">
          <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Tag size={11} /> Technology Stack
          </h3>
          <div className="flex flex-wrap gap-2">
            {service.technologies.map((t) => (
              <span key={t} className="text-[12px] font-mono px-2 py-1 rounded-md bg-muted text-muted-foreground border border-border">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Related ADRs */}
        {relatedADRs.length > 0 && (
          <div className="border border-border rounded-md p-4 bg-secondary mb-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <GitBranch size={11} /> Architecture Decisions ({relatedADRs.length})
            </h3>
            <div className="space-y-2">
              {relatedADRs.map((adr) => (
                <Link key={adr.id} href={`/architecture-decisions/${adr.id}`}
                  className="flex items-center justify-between p-3 rounded-md bg-background border border-border hover:border-primary/30 transition-colors group">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono text-primary">{adr.id.toUpperCase()}</span>
                      <p className="text-[12px] font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{adr.title}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Clock size={9} /> {adr.date}
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ml-3 ${
                    adr.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : adr.status === 'draft' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  }`}>{adr.status}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Related Incidents */}
        {relatedIncidents.length > 0 && (
          <div className="border border-border rounded-md p-4 bg-secondary mb-4">
            <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <AlertTriangle size={11} /> Incidents ({relatedIncidents.length})
            </h3>
            <div className="space-y-2">
              {relatedIncidents.map((inc) => (
                <div key={inc.id} className="p-3 rounded-md bg-background border border-border">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground">{inc.id.toUpperCase()}</span>
                      <p className="text-[12px] font-medium text-foreground">{inc.title}</p>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${
                      inc.severity === 'critical' ? 'bg-red-500/10 text-red-400 border-red-500/20'
                        : inc.severity === 'high' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>{inc.severity}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{inc.summary}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ask SynQ shortcut */}
        <div className="p-4 bg-primary/5 border border-primary/20 rounded-md flex items-start gap-3">
          <Sparkles size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground mb-1">Want a full service briefing?</p>
            <p className="text-[12px] text-muted-foreground mb-3">
              Ask SynQ AI for a grounded explanation of what this service does, why it was built this way, and what to know before changing it.
            </p>
            <Link
              href={`/ask-syn-q-ai-chat?q=${encodeURIComponent(`What should I know before changing ${service.name}?`)}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
            >
              <Sparkles size={11} /> Ask SynQ about {service.name} →
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

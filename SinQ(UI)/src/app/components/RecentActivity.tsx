import React from 'react';
import Link from 'next/link';
import { GitBranch, AlertTriangle, FileText, ArrowRight } from 'lucide-react';
import type { CatalogAdr, CatalogDocument, CatalogIncident } from '@/lib/api';
import { useLiveCatalog } from '@/lib/useLiveCatalog';

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

function recentDate(value: string) {
  return new Date(value).toLocaleDateString();
}

const badgeColor: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Proposed: 'bg-accent/15 text-accent border border-accent/25',
  Open: 'bg-red-500/15 text-red-400 border border-red-500/25',
  Resolved: 'bg-green-500/15 text-green-400 border border-green-500/25',
};

export default function RecentActivity() {
  const { data: adrs } = useLiveCatalog<CatalogAdr>('/catalog/adrs');
  const { data: incidents } = useLiveCatalog<CatalogIncident>('/catalog/incidents');
  const { data: documents } = useLiveCatalog<CatalogDocument>('/catalog/documents');
  const recentSections: RecentSection[] = [
    {
      label: 'Architecture Decisions', icon: <GitBranch size={11} />, color: 'text-accent', bgColor: 'bg-accent/10',
      items: adrs.slice(0, 2).map((adr) => ({ id: adr.id, title: adr.title, meta: `${adr.company_name} · ${adr.status}`, time: recentDate(adr.updated_at ?? adr.created_at ?? ''), badge: adr.status, href: `/architecture-decisions?q=${encodeURIComponent(adr.title)}` })),
    },
    {
      label: 'Incidents', icon: <AlertTriangle size={11} />, color: 'text-red-400', bgColor: 'bg-red-500/10',
      items: incidents.slice(0, 2).map((incident) => ({ id: incident.id, title: incident.title, meta: `${incident.owner_name} · ${incident.status}`, time: recentDate(incident.started_at), badge: incident.status === 'resolved' ? 'Resolved' : 'Open', href: `/incidents?incident=${encodeURIComponent(incident.id)}` })),
    },
    {
      label: 'Documents', icon: <FileText size={11} />, color: 'text-amber-400', bgColor: 'bg-amber-500/10',
      items: documents.slice(0, 2).map((document) => ({ id: document.id, title: document.filename, meta: `${document.company_name} · ${document.project_name}`, time: recentDate(document.updated_at), href: `/knowledge-explorer?q=${encodeURIComponent(document.filename)}` })),
    },
  ];

  return (
    <div className="synq-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-foreground">Recent Knowledge</h2>
        <Link href="/knowledge-explorer" className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          View all <ArrowRight size={10} />
        </Link>
      </div>
      <div className="space-y-3 flex-1">
        {recentSections.map((section) => (
          <div key={section.label}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-4 h-4 rounded flex items-center justify-center ${section.bgColor} ${section.color}`}>
                {section.icon}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${section.color}`}>
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
                      <span className="text-[10px] text-muted-foreground truncate">{item.meta}</span>
                      <span className="text-[10px] text-muted-foreground/40 flex-shrink-0">·</span>
                      <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{item.time}</span>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${badgeColor[item.badge] || 'bg-muted text-muted-foreground'}`}>
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
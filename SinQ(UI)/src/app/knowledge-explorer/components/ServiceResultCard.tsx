'use client';

import React from 'react';
import { Server, GitBranch, AlertTriangle, User, ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Service } from '@/lib/mockData';

interface Props {
  service: Service;
  query: string;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function ServiceResultCard({ service, query }: Props) {
  return (
    <div className="synq-card p-4 card-hover cursor-pointer group">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Server size={12} className="text-primary" />
          </div>
          <span className="text-[13px] font-semibold text-foreground truncate">
            {highlight(service.name, query)}
          </span>
        </div>
        <StatusBadge variant={service.status} dot />
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {highlight(service.description, query)}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {service.technologies.map((tech) => (
          <span key={`tech-${service.id}-${tech}`} className="tech-tag">
            {tech}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <GitBranch size={10} />
            <span className="tabular-nums">{service.adrCount} ADRs</span>
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={10} />
            <span className="tabular-nums">{service.incidentCount} incidents</span>
          </span>
        </div>
        <div className="flex items-center gap-1">
          <User size={10} />
          <span>{service.owner.split(' ')[0]}</span>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
        <span className="text-[10px] font-mono text-muted-foreground/60">{service.team}</span>
        <ArrowRight size={12} className="text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}
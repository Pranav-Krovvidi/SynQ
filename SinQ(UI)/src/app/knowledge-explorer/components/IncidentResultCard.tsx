'use client';

import React from 'react';
import { AlertTriangle, Clock, User, ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { Incident } from '@/lib/mockData';

interface Props {
  incident: Incident;
  query: string;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-red-500/20 text-red-300 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function IncidentResultCard({ incident, query }: Props) {
  return (
    <div className={`synq-card p-4 card-hover cursor-pointer group ${
      incident.status !== 'resolved' ? 'border-red-500/20 bg-red-500/3' : ''
    }`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <AlertTriangle size={12} className="text-red-400" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {incident.id.toUpperCase()}
            </span>
            <p className="text-[13px] font-semibold text-foreground leading-snug mt-0.5">
              {highlight(incident.title, query)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusBadge variant={incident.severity} />
          <StatusBadge variant={incident.status} />
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {highlight(incident.summary, query)}
      </p>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Clock size={10} />
            {incident.duration}
          </span>
          <span className="font-mono text-muted-foreground/60">{incident.service}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <User size={10} />
            <span>{incident.owner.split(' ')[0]}</span>
          </div>
          <ArrowRight size={12} className="text-muted-foreground group-hover:text-red-400 transition-colors" />
        </div>
      </div>
    </div>
  );
}
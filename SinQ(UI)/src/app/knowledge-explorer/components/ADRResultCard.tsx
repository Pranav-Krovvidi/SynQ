'use client';

import React from 'react';
import { GitBranch, User, ArrowRight } from 'lucide-react';
import StatusBadge from '@/components/ui/StatusBadge';
import type { ADR } from '@/lib/mockData';

interface Props {
  adr: ADR;
  query: string;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-accent rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function ADRResultCard({ adr, query }: Props) {
  return (
    <div className="synq-card p-4 card-hover cursor-pointer group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <GitBranch size={12} className="text-accent" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
              {adr.id.toUpperCase()}
            </span>
            <p className="text-[13px] font-semibold text-foreground leading-snug mt-0.5">
              {highlight(adr.title, query)}
            </p>
          </div>
        </div>
        <StatusBadge variant={adr.status} />
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {highlight(adr.summary, query)}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {adr.tags.slice(0, 4).map((tag) => (
          <span key={`tag-${adr.id}-${tag}`} className="knowledge-tag">
            {tag}
          </span>
        ))}
        {adr.tags.length > 4 && (
          <span className="text-[10px] text-muted-foreground">+{adr.tags.length - 4}</span>
        )}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <User size={10} />
          <span>{adr.author}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono">{adr.date}</span>
          <ArrowRight size={12} className="text-muted-foreground group-hover:text-accent transition-colors" />
        </div>
      </div>
    </div>
  );
}
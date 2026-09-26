'use client';

import React from 'react';
import { FileText, User, ArrowRight } from 'lucide-react';

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  team: string;
  owner: string;
  tags: string[];
  updatedAt: string;
  summary: string;
}

interface Props {
  document: DocumentItem;
  query: string;
}

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-500/20 text-amber-300 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function DocumentResultCard({ document, query }: Props) {
  return (
    <div className="synq-card p-4 card-hover cursor-pointer group">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <FileText size={12} className="text-amber-400" />
          </div>
          <p className="text-[13px] font-semibold text-foreground leading-snug">
            {highlight(document.title, query)}
          </p>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
          {document.updatedAt}
        </span>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
        {highlight(document.summary, query)}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {document.tags.slice(0, 4).map((tag) => (
          <span key={`dtag-${document.id}-${tag}`} className="knowledge-tag">
            {tag}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <User size={10} />
            {document.owner.split(' ')[0]}
          </span>
          <span className="font-mono text-muted-foreground/60">{document.team}</span>
        </div>
        <ArrowRight size={12} className="text-muted-foreground group-hover:text-amber-400 transition-colors" />
      </div>
    </div>
  );
}
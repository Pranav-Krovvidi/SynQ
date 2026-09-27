'use client';

import React from 'react';
import { X, ExternalLink, GitBranch, AlertTriangle, MessageSquare, FileText, Server, TrendingUp } from 'lucide-react';
import type { ChatSource } from '@/lib/mockData';

interface Props {
  sources: ChatSource[];
  selectedSource: ChatSource | null;
  onSourceSelect: (source: ChatSource) => void;
  onOpenSource: (source: ChatSource) => void;
  onClose: () => void;
}

const sourceIcon: Record<string, React.ReactNode> = {
  adr: <GitBranch size={13} />,
  incident: <AlertTriangle size={13} />,
  slack: <MessageSquare size={13} />,
  document: <FileText size={13} />,
  service: <Server size={13} />,
};

const sourceTypeLabel: Record<string, string> = {
  adr: 'Architecture Decision Record',
  incident: 'Incident Report',
  slack: 'Slack Discussion',
  document: 'Documentation',
  service: 'Service',
};

const sourceAccent: Record<string, string> = {
  adr: 'text-accent',
  incident: 'text-red-400',
  slack: 'text-purple-400',
  document: 'text-amber-400',
  service: 'text-primary',
};

export default function SourcePanel({ sources, selectedSource, onSourceSelect, onOpenSource, onClose }: Props) {
  const active = selectedSource ?? sources[0];

  return (
    <aside className="w-[340px] flex-shrink-0 border-l border-border bg-secondary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <h2 className="text-[13px] font-semibold text-foreground">Knowledge Sources</h2>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-150"
        >
          <X size={13} />
        </button>
      </div>

      {/* Source list */}
      <div className="flex flex-col gap-1 p-3 border-b border-border">
        {sources.map((source) => (
          <button
            key={source.id}
            onClick={() => onSourceSelect(source)}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 ${
              active?.id === source.id
                ? 'bg-primary/8 border border-primary/20' :'hover:bg-muted border border-transparent'
            }`}
          >
            <span className={`flex-shrink-0 ${sourceAccent[source.type]}`}>{sourceIcon[source.type]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-foreground">{source.title}</p>
              <p className="text-[11px] text-muted-foreground truncate">{source.subtitle}</p>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-[11px] font-mono text-green-400 tabular-nums">{source.confidence}%</div>
              <div className="text-[9px] text-muted-foreground">match</div>
            </div>
          </button>
        ))}
      </div>

      {/* Source detail */}
      {active && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={`${sourceAccent[active.type]}`}>{sourceIcon[active.type]}</span>
            <div>
              <p className="text-[11px] text-muted-foreground">{sourceTypeLabel[active.type]}</p>
              <h3 className="text-[14px] font-bold text-foreground">{active.title}</h3>
            </div>
          </div>

          <p className="text-[12px] text-muted-foreground mb-3">{active.subtitle}</p>

          <div className="flex items-center gap-3 mb-4 text-[11px]">
            <span className="text-muted-foreground font-mono">{active.date}</span>
            <div className="flex items-center gap-1 text-green-400">
              <TrendingUp size={10} />
              <span className="tabular-nums">{active.confidence}% confidence</span>
            </div>
          </div>

          <div className="synq-card p-3 mb-4">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Relevant excerpt</p>
            <p className="text-[12px] text-foreground/80 leading-relaxed italic">"{active.excerpt}"</p>
          </div>

          <button onClick={() => onOpenSource(active)} className="btn-secondary w-full flex items-center justify-center gap-2 text-[12px]">
            <ExternalLink size={12} />
            Open full {sourceTypeLabel[active.type]}
          </button>
        </div>
      )}
    </aside>
  );
}
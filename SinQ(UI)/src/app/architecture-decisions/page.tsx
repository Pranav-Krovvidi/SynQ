'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { mockADRs, ADR, ADRStatus } from '@/lib/mockData';
import { GitBranch, Search, User, Clock, Tag, ChevronRight } from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<ADRStatus, { label: string; color: string }> = {
  accepted: { label: 'Accepted', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  proposed: { label: 'Proposed', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  draft: { label: 'Draft', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  superseded: { label: 'Superseded', color: 'bg-muted text-muted-foreground border-border' },
};

function ADRCard({ adr }: { adr: ADR }) {
  const status = statusConfig[adr.status];
  return (
    <Link href={`/architecture-decisions/${adr.id}`}>
      <div className="group border border-border bg-secondary rounded-md p-4 hover:border-primary/40 transition-all duration-150 cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] font-mono text-primary flex-shrink-0">{adr.id.toUpperCase()}</span>
            <h3 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{adr.title}</h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${status.color}`}>{status.label}</span>
            <ChevronRight size={12} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
          </div>
        </div>

        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{adr.summary}</p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {adr.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border flex items-center gap-1">
              <Tag size={8} />{tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><User size={10} />{adr.author}</span>
            <span className="flex items-center gap-1"><Clock size={10} />{adr.date}</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {adr.services.slice(0, 2).map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{s}</span>
            ))}
            {adr.services.length > 2 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">+{adr.services.length - 2}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ArchitectureDecisionsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = mockADRs.filter((a) => {
    const matchSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.summary.toLowerCase().includes(search.toLowerCase()) ||
      a.author.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    accepted: mockADRs.filter((a) => a.status === 'accepted').length,
    proposed: mockADRs.filter((a) => a.status === 'proposed').length,
    draft: mockADRs.filter((a) => a.status === 'draft').length,
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-1">Architecture Decisions</h1>
            <p className="text-[13px] text-muted-foreground">
              {mockADRs.length} decisions recorded · {counts.accepted} accepted · {counts.proposed} proposed · {counts.draft} draft
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: 'Accepted', count: counts.accepted, color: 'text-emerald-400' },
              { label: 'Proposed', count: counts.proposed, color: 'text-blue-400' },
              { label: 'Draft', count: counts.draft, color: 'text-amber-400' },
            ].map((s) => (
              <div key={s.label} className={`text-[11px] font-medium ${s.color} flex items-center gap-1`}>
                <span className="font-mono">{s.count}</span> {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search decisions, authors, tags..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <div className="flex items-center gap-1 bg-secondary border border-border rounded-md p-0.5">
            {(['all', 'accepted', 'proposed', 'draft'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded transition-all duration-150 capitalize ${
                  statusFilter === s
                    ? 'bg-primary text-background' :'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <GitBranch size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">No decisions match your filters.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((adr) => (
              <ADRCard key={adr.id} adr={adr} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

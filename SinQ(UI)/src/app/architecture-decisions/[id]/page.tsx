'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { mockADRs, ADRStatus } from '@/lib/mockData';
import { useLiveCatalog } from '@/lib/useLiveCatalog';
import { adrFromCatalog } from '@/lib/catalogAdapters';
import type { CatalogAdr } from '@/lib/api';
import {
  GitBranch,
  User,
  Clock,
  Tag,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  XCircle,
  Server,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<ADRStatus, { label: string; color: string; icon: React.ReactNode }> = {
  accepted: {
    label: 'Accepted',
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: <CheckCircle2 size={12} />,
  },
  proposed: {
    label: 'Proposed',
    color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: <AlertCircle size={12} />,
  },
  draft: {
    label: 'Draft',
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: <FileEdit size={12} />,
  },
  superseded: {
    label: 'Superseded',
    color: 'bg-muted text-muted-foreground border-border',
    icon: <XCircle size={12} />,
  },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="bg-secondary border border-border rounded-md p-4 text-[13px] text-foreground leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function ADRDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === 'string' ? params.id : '';

  const { data: liveADRs } = useLiveCatalog<CatalogAdr>('/catalog/adrs');
  const liveMatch = liveADRs.find((a) => a.id === id);
  const adr = liveMatch ? adrFromCatalog(liveMatch) : mockADRs.find((a) => a.id === id);

  if (!adr) {
    return (
      <AppLayout>
        <div className="p-6 max-w-3xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <GitBranch size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-[14px] font-medium text-foreground mb-1">ADR not found</p>
            <p className="text-[13px] text-muted-foreground">
              No decision record with id &ldquo;{id}&rdquo; exists.
            </p>
            <Link
              href="/architecture-decisions"
              className="mt-4 text-[13px] text-primary hover:underline"
            >
              View all decisions
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const status = statusConfig[adr.status];

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Back */}
        <Link
          href="/architecture-decisions"
          className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft size={14} /> Architecture Decisions
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded">
              {adr.id.toUpperCase()}
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border ${status.color}`}
            >
              {status.icon} {status.label}
            </span>
          </div>
          <h1 className="text-xl font-bold text-foreground leading-snug mb-3">{adr.title}</h1>
          <div className="flex items-center gap-4 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <User size={11} /> {adr.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} /> {adr.date}
            </span>
          </div>
        </div>

        {/* Tags + Services */}
        <div className="flex flex-wrap gap-2 mb-6">
          {adr.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
            >
              <Tag size={8} /> {tag}
            </span>
          ))}
          {adr.services.map((s) => (
            <span
              key={s}
              className="inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
            >
              <Server size={8} /> {s}
            </span>
          ))}
        </div>

        {/* Sections */}
        <div className="space-y-4">
          <Section title="Summary">
            <p>{adr.summary}</p>
          </Section>

          {adr.context && (
            <Section title="Context">
              <p>{adr.context}</p>
            </Section>
          )}

          {adr.decision && (
            <Section title="Decision">
              <p>{adr.decision}</p>
            </Section>
          )}

          {adr.consequences && (
            <Section title="Consequences">
              <p>{adr.consequences}</p>
            </Section>
          )}
        </div>

        {/* Ask SynQ shortcut */}
        <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-md flex items-start gap-3">
          <Sparkles size={16} className="text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-medium text-foreground mb-1">
              Want deeper context on this decision?
            </p>
            <p className="text-[12px] text-muted-foreground mb-3">
              Ask SynQ AI to explain trade-offs, related incidents, or how this affects services
              you&apos;re working on.
            </p>
            <Link
              href={`/ask-syn-q-ai-chat?q=${encodeURIComponent(`Explain the context and trade-offs behind ${adr.id.toUpperCase()}: ${adr.title}`)}`}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-primary hover:underline"
            >
              <Sparkles size={11} /> Ask SynQ about this decision →
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

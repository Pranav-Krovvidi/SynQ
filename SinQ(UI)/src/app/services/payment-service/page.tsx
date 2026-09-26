'use client';

import React, { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import {
  CheckCircle, Server, Users, GitBranch, AlertTriangle,
  FileText, ArrowRight, AlertCircle, Clock, User, Layers,
  ArrowLeft, Sparkles, Square, WifiOff,
} from 'lucide-react';
import { streamBeforeYouChange } from '@/lib/api';
import { mockADRs, mockIncidents, mockPeople } from '@/lib/mockData';

type Tab = 'overview' | 'dependencies' | 'decisions' | 'incidents' | 'people';

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Layers size={13} /> },
  { id: 'dependencies', label: 'Dependencies', icon: <GitBranch size={13} /> },
  { id: 'decisions', label: 'Decisions', icon: <FileText size={13} /> },
  { id: 'incidents', label: 'Incidents', icon: <AlertTriangle size={13} /> },
  { id: 'people', label: 'People', icon: <Users size={13} /> },
];

const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ?? '';
const DEMO_SERVICE_ID = process.env.NEXT_PUBLIC_PAYMENT_SERVICE_ID ?? '';

const dependencies = [
  { from: 'Order Service', to: 'Payment Service', type: 'upstream', description: 'Sends payment initiation events' },
  { from: 'Payment Service', to: 'Kafka', type: 'downstream', description: 'Publishes payment-events topic' },
  { from: 'Payment Service', to: 'PostgreSQL', type: 'downstream', description: 'Persists transaction records' },
  { from: 'Payment Service', to: 'Notification Service', type: 'downstream', description: 'Triggers payment confirmation emails' },
  { from: 'Payment Service', to: 'Auth Gateway', type: 'downstream', description: 'Validates all inbound requests' },
  { from: 'Payment Service', to: 'Fraud Detection Service', type: 'downstream', description: 'Real-time fraud scoring on every initiation' },
];

// Derive live from mockData for demo consistency
const decisions = mockADRs.filter((a) =>
  ['adr-042', 'adr-029', 'adr-055', 'adr-047', 'adr-049'].includes(a.id)
);
const incidents = mockIncidents.filter((i) =>
  ['inc-127', 'inc-119', 'inc-141'].includes(i.id)
);
const people = mockPeople.filter((p) =>
  ['person-001', 'person-002', 'person-004'].includes(p.id)
);

const statusColors: Record<string, string> = {
  accepted: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  draft: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  proposed: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  superseded: 'bg-muted text-muted-foreground border-border',
};

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/10 text-red-400 border-red-500/20',
  high: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  low: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
};

// ── Before You Change Panel ───────────────────────────────────────────────────
function BYCPanel({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<'idle' | 'streaming' | 'done' | 'error'>('idle');
  const [text, setText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const abortRef = React.useRef<ReturnType<typeof streamBeforeYouChange> | null>(null);

  const runBYC = () => {
    if (!DEMO_PROJECT_ID || !DEMO_SERVICE_ID) {
      // Fallback — no backend env vars set
      setPhase('streaming');
      const mock = `## Before You Change: Payment Service

**⚠️ This response is from demo mode** — set \`NEXT_PUBLIC_API_BASE_URL\`, \`NEXT_PUBLIC_DEMO_PROJECT_ID\`, and \`NEXT_PUBLIC_PAYMENT_SERVICE_ID\` to enable live AI analysis.

### What you must know

**1. Kafka is the only permitted integration path (ADR-042)**
All payment lifecycle events must be published to the \`payment-events\` Kafka topic. Synchronous REST callbacks to downstream services are prohibited — INC-127 proved they cause cascading failures.

**2. Circuit breakers are mandatory for provider calls (ADR-029)**
Every call to Stripe or Adyen must go through the circuit breaker wrapper. Fallback routing to the secondary provider is automatic when the primary circuit is open. Bypassing this is a blocking PR review comment.

**3. All payments require idempotency keys (ADR-047)**
Clients must supply a UUID idempotency key per initiation. Keys expire in 24h and are backed by Redis. Never bypass this — PCI DSS requires idempotent processing.

**4. PostgreSQL pool is sized for steady-state (INC-119)**
Max 300 connections (post INC-119 increase). Flash sale events require pre-scaling coordination with the Platform team. Check the runbook before any high-traffic deployment.

**5. Fraud Detection is now ML-based (ADR-049)**
The rule engine was replaced with a gradient-boosted model. If you touch the fraud score threshold or any feature pipeline code, the model must be retrained and shadow-evaluated before cutover.

### Critical owners to notify
- **Alex Morgan** — Service owner (Payments Engineering)
- **Priya Nair** — Architecture sign-off (Staff Engineer)`;

      let i = 0;
      const interval = setInterval(() => {
        setText(mock.slice(0, i));
        i += 8;
        if (i >= mock.length) {
          setText(mock);
          clearInterval(interval);
          setPhase('done');
        }
      }, 12);
      return;
    }

    setPhase('streaming');
    setText('');
    let accumulated = '';

    abortRef.current = streamBeforeYouChange(
      DEMO_PROJECT_ID,
      DEMO_SERVICE_ID,
      (evt) => {
        if (evt.event === 'token') {
          accumulated += evt.data;
          setText(accumulated);
        }
      },
      () => { setPhase('done'); },
      (err) => { setErrorMsg(err); setPhase('error'); },
    );
  };

  const stop = () => {
    abortRef.current?.abort();
    setPhase('done');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-secondary border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
              <Sparkles size={15} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-foreground">Before You Change</h2>
              <p className="text-[11px] text-muted-foreground">Payment Service — AI-grounded analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-[18px] leading-none">×</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {phase === 'idle' && (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles size={22} className="text-amber-400" />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-2">Ready to analyse Payment Service</h3>
              <p className="text-[13px] text-muted-foreground max-w-sm mx-auto leading-relaxed mb-6">
                SynQ will search ADRs, incidents, and documents to generate a grounded briefing on what you need to know before modifying this service.
              </p>
              {!DEMO_PROJECT_ID && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-amber-400 mb-4">
                  <WifiOff size={11} /> Demo mode — backend env vars not set
                </div>
              )}
              <button
                onClick={runBYC}
                className="px-5 py-2.5 bg-amber-500 text-background text-[13px] font-semibold rounded-md hover:bg-amber-500/90 transition-colors"
              >
                <Sparkles size={13} className="inline mr-1.5" />
                Analyse Payment Service
              </button>
            </div>
          )}

          {(phase === 'streaming' || phase === 'done') && (
            <div>
              <div className="prose prose-sm max-w-none text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
                {text}
                {phase === 'streaming' && <span className="inline-block w-0.5 h-3.5 bg-amber-400 ml-0.5 animate-pulse" />}
              </div>
            </div>
          )}

          {phase === 'error' && (
            <div className="text-center py-8">
              <p className="text-[13px] text-red-400 mb-4">Error: {errorMsg}</p>
              <button onClick={() => { setPhase('idle'); setText(''); setErrorMsg(''); }}
                className="text-[12px] text-primary hover:underline">Try again</button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border flex-shrink-0">
          {phase === 'streaming' ? (
            <button onClick={stop} className="flex items-center gap-1.5 text-[12px] text-red-400 hover:text-red-300">
              <Square size={11} /> Stop
            </button>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            {phase === 'done' && (
              <Link
                href={`/ask-syn-q-ai-chat?q=${encodeURIComponent('What should I know before changing Payment Service?')}`}
                className="text-[12px] text-primary hover:underline flex items-center gap-1"
              >
                <Sparkles size={11} /> Ask follow-up in SynQ AI
              </Link>
            )}
            <button onClick={onClose} className="text-[12px] text-muted-foreground hover:text-foreground">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────
function OverviewTab({ onBYC }: { onBYC: () => void }) {
  return (
    <div className="space-y-5">
      {/* Health */}
      <div className="border border-border rounded-md p-4 bg-secondary">
        <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Service Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Uptime (30d)', value: '99.94%', color: 'text-emerald-400' },
            { label: 'p99 Latency', value: '87ms', color: 'text-foreground' },
            { label: 'Error Rate', value: '0.02%', color: 'text-emerald-400' },
            { label: 'Throughput', value: '2.4k req/s', color: 'text-foreground' },
          ].map((m) => (
            <div key={m.label} className="bg-background rounded-md p-3 border border-border">
              <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
              <p className={`text-[18px] font-bold font-mono ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture summary */}
      <div className="border border-border rounded-md p-4 bg-secondary">
        <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Architecture Summary</h3>
        <p className="text-[13px] text-muted-foreground leading-relaxed mb-3">
          Payment Service is the core monetary processing layer. It receives payment initiation events, validates transactions against external providers (Stripe, Adyen), persists records to PostgreSQL, and emits payment-confirmed events to Kafka.
        </p>
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          As of ADR-042 (Jul 2026), all inter-service communication is asynchronous via Kafka. Synchronous REST is used only for the inbound API surface exposed to the API Gateway.
        </p>
      </div>

      {/* BYC CTA */}
      <div className="border border-amber-500/20 rounded-md p-4 bg-amber-500/5">
        <h3 className="text-[12px] font-semibold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <AlertCircle size={12} />
          Before changing this service
        </h3>
        <p className="text-[13px] text-muted-foreground mb-4">
          SynQ can generate a grounded briefing of architecture decisions, incidents, and constraints you must know before modifying Payment Service.
        </p>
        <button
          onClick={onBYC}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-background text-[12px] font-semibold rounded-md hover:bg-amber-500/90 transition-colors"
        >
          <Sparkles size={13} />
          Run Before You Change Analysis
        </button>
      </div>
    </div>
  );
}

function DependenciesTab() {
  return (
    <div className="space-y-4">
      <div className="border border-border rounded-md p-4 bg-secondary">
        <h3 className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-4">Dependency Map</h3>
        <div className="space-y-2">
          {dependencies.map((dep, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-md bg-background border border-border hover:border-primary/30 transition-colors">
              <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${
                dep.type === 'upstream' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-teal-500/10 text-teal-400 border-teal-500/20'
              }`}>
                {dep.type}
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="text-[12px] font-medium text-foreground">{dep.from}</span>
                <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
                <span className="text-[12px] font-medium text-primary">{dep.to}</span>
              </div>
              <p className="text-[11px] text-muted-foreground hidden md:block">{dep.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DecisionsTab() {
  return (
    <div className="space-y-3">
      {decisions.map((d) => (
        <Link key={d.id} href={`/architecture-decisions/${d.id}`}>
          <div className="border border-border rounded-md p-4 bg-secondary hover:border-primary/40 transition-colors cursor-pointer group">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-primary flex-shrink-0">{d.id.toUpperCase()}</span>
                <h3 className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">{d.title}</h3>
              </div>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border flex-shrink-0 ${statusColors[d.status]}`}>
                {d.status}
              </span>
            </div>
            <p className="text-[12px] text-muted-foreground mb-2">{d.summary}</p>
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1"><User size={10} />{d.author}</span>
              <span className="flex items-center gap-1"><Clock size={10} />{d.date}</span>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function IncidentsTab() {
  return (
    <div className="space-y-3">
      {incidents.map((inc) => (
        <div key={inc.id} className="border border-border rounded-md p-4 bg-secondary">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <span className="text-[10px] font-mono text-muted-foreground mr-2">{inc.id.toUpperCase()}</span>
              <h3 className="inline text-[13px] font-semibold text-foreground">{inc.title}</h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${severityColors[inc.severity]}`}>
                {inc.severity}
              </span>
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${
                inc.status === 'resolved'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
              }`}>
                {inc.status}
              </span>
            </div>
          </div>
          <p className="text-[12px] text-muted-foreground mb-2">{inc.summary}</p>
          {inc.rootCause && (
            <p className="text-[11px] text-muted-foreground/70 italic mb-1">Root cause: {inc.rootCause}</p>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock size={10} />{new Date(inc.startTime).toLocaleDateString()}</span>
            <span>Duration: {inc.duration}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function PeopleTab() {
  return (
    <div className="space-y-3">
      {people.map((p) => (
        <div key={p.id} className="border border-border rounded-md p-4 bg-secondary flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[12px] font-bold text-background flex-shrink-0">
            {p.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-[13px] font-semibold text-foreground">{p.name}</p>
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-teal-500/10 text-teal-400 border-teal-500/20">{p.role}</span>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">{p.team}</p>
            <div className="flex flex-wrap gap-1">
              {p.expertise.map((e) => (
                <span key={e} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{e}</span>
              ))}
            </div>
          </div>
          {p.onCallRotation && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-red-500/10 text-red-400 border-red-500/20 flex-shrink-0">
              On-call
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PaymentServicePage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [bycOpen, setBycOpen] = useState(false);

  return (
    <AppLayout>
      {bycOpen && <BYCPanel onClose={() => setBycOpen(false)} />}

      <div className="p-6 max-w-5xl mx-auto">
        <Link href="/services" className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground mb-4 transition-colors">
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
                <h1 className="text-xl font-bold text-foreground">Payment Service</h1>
                <p className="text-[13px] text-muted-foreground">Core payment processing — transaction validation, Kafka events, Stripe/Adyen integration.</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[12px] text-emerald-400">
                <CheckCircle size={13} />
                <span className="font-medium">Operational</span>
              </div>
              <button
                onClick={() => setBycOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-background text-[12px] font-semibold rounded-md hover:bg-amber-500/90 transition-colors"
              >
                <Sparkles size={12} />
                Before You Change
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
            {[
              { label: 'Owner', value: 'Alex Morgan' },
              { label: 'Team', value: 'Payments Engineering' },
              { label: 'Technology', value: 'Node.js · PostgreSQL · Kafka' },
              { label: 'Last Updated', value: 'Sep 24, 2026' },
            ].map((m) => (
              <div key={m.label}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
                <p className="text-[12px] font-medium text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 border-b border-border mb-5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium border-b-2 transition-all duration-150 -mb-px ${
                activeTab === tab.id
                  ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && <OverviewTab onBYC={() => setBycOpen(true)} />}
        {activeTab === 'dependencies' && <DependenciesTab />}
        {activeTab === 'decisions' && <DecisionsTab />}
        {activeTab === 'incidents' && <IncidentsTab />}
        {activeTab === 'people' && <PeopleTab />}
      </div>
    </AppLayout>
  );
}

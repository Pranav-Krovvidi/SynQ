'use client'

import React from 'react'
import AppLayout from '@/components/AppLayout'
import { ArrowRightLeft, ArrowRight, GitBranch, Users, FileText, Clock } from 'lucide-react'
import Link from 'next/link'

const handoverItems = [
  {
    id: 'ho-001',
    from: 'Alex Morgan',
    to: 'Sofia Reyes',
    service: 'Payment Service',
    status: 'in-progress',
    adrsShared: 4,
    documentsShared: 2,
    startDate: '2026-09-20',
    targetDate: '2026-10-04',
    progress: 60,
    notes: 'Alex is transitioning Payment Service ownership to Sofia while moving to Fraud Detection full-time.',
  },
  {
    id: 'ho-002',
    from: 'Marcus Chen',
    to: 'Priya Nair',
    service: 'Inventory API',
    status: 'completed',
    adrsShared: 6,
    documentsShared: 3,
    startDate: '2026-08-01',
    targetDate: '2026-08-31',
    progress: 100,
    notes: 'Inventory API fully transitioned. All ADRs reviewed, on-call rotation transferred.',
  },
  {
    id: 'ho-003',
    from: 'Omar Hassan',
    to: 'James Wu',
    service: 'API Gateway',
    status: 'planned',
    adrsShared: 0,
    documentsShared: 0,
    startDate: '2026-10-01',
    targetDate: '2026-10-15',
    progress: 0,
    notes: 'Omar rotating off API Gateway ownership. James to take primary ownership before Zero-Trust migration.',
  },
]

const statusConfig: Record<string, { label: string; color: string }> = {
  'in-progress': { label: 'In Progress', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  completed:     { label: 'Completed',   color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  planned:       { label: 'Planned',     color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
}

export default function HandoverPage() {
  return (
    <AppLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground mb-1">Handover</h1>
          <p className="text-[13px] text-muted-foreground">
            Service ownership transitions — track knowledge transfer between engineers
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Active Handovers', value: handoverItems.filter((h) => h.status === 'in-progress').length, color: 'text-blue-400' },
            { label: 'Planned', value: handoverItems.filter((h) => h.status === 'planned').length, color: 'text-amber-400' },
            { label: 'Completed (30d)', value: handoverItems.filter((h) => h.status === 'completed').length, color: 'text-emerald-400' },
          ].map((m) => (
            <div key={m.label} className="border border-border bg-secondary rounded-md p-3">
              <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
              <p className={`text-[22px] font-bold font-mono ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Handovers list */}
        <div className="space-y-3">
          {handoverItems.map((ho) => {
            const st = statusConfig[ho.status]
            return (
              <div key={ho.id} className="border border-border bg-secondary rounded-md p-4">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[13px]">
                      <span className="font-semibold text-foreground">{ho.from}</span>
                      <ArrowRight size={13} className="text-muted-foreground" />
                      <span className="font-semibold text-primary">{ho.to}</span>
                    </div>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${st.color}`}>{st.label}</span>
                  </div>
                  <span className="text-[11px] font-medium text-foreground bg-primary/10 border border-primary/20 px-2 py-0.5 rounded">{ho.service}</span>
                </div>

                <p className="text-[12px] text-muted-foreground mb-3">{ho.notes}</p>

                {ho.status !== 'planned' && (
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
                      <span>Knowledge transfer progress</span>
                      <span className="font-mono text-foreground">{ho.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full progress-bar-fill rounded-full" style={{ width: `${ho.progress}%` }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-2.5 border-t border-border">
                  <span className="flex items-center gap-1"><GitBranch size={10} />{ho.adrsShared} ADRs shared</span>
                  <span className="flex items-center gap-1"><FileText size={10} />{ho.documentsShared} docs shared</span>
                  <span className="flex items-center gap-1"><Clock size={10} />Target: {ho.targetDate}</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 border border-dashed border-border rounded-md p-6 flex flex-col items-center text-center">
          <ArrowRightLeft size={24} className="text-muted-foreground/30 mb-2" />
          <p className="text-[13px] text-muted-foreground mb-1">Start a new handover</p>
          <p className="text-[12px] text-muted-foreground/60">Handover creation requires contributor access</p>
          <Link href="/ask-syn-q-ai-chat" className="mt-3 text-[12px] text-primary hover:underline">
            Ask SynQ to help prepare handover documentation →
          </Link>
        </div>
      </div>
    </AppLayout>
  )
}

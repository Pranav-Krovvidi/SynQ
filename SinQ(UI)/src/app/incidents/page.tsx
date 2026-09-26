'use client'

import React, { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { mockIncidents, Incident, IncidentSeverity, IncidentStatus } from '@/lib/mockData'
import { AlertTriangle, Search, Clock, User, ChevronRight } from 'lucide-react'

const severityConfig: Record<IncidentSeverity, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critical', color: 'bg-red-500/10 text-red-400 border-red-500/20', dot: 'bg-red-400' },
  high:     { label: 'High',     color: 'bg-orange-500/10 text-orange-400 border-orange-500/20', dot: 'bg-orange-400' },
  medium:   { label: 'Medium',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', dot: 'bg-amber-400' },
  low:      { label: 'Low',      color: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
}

const statusConfig: Record<IncidentStatus, { label: string; color: string }> = {
  open:         { label: 'Open',         color: 'bg-red-500/10 text-red-400 border-red-500/20' },
  investigating:{ label: 'Investigating',color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  mitigating:   { label: 'Mitigating',   color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  resolved:     { label: 'Resolved',     color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
}

function IncidentRow({ inc }: { inc: Incident }) {
  const [expanded, setExpanded] = useState(false)
  const sev = severityConfig[inc.severity]
  const st = statusConfig[inc.status]

  return (
    <div className="border border-border bg-secondary rounded-md overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${sev.dot} ${inc.status !== 'resolved' ? 'animate-pulse' : ''}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-mono text-muted-foreground">{inc.id.toUpperCase()}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${sev.color}`}>{sev.label}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${st.color}`}>{st.label}</span>
          </div>
          <h3 className="text-[13px] font-semibold text-foreground truncate">{inc.title}</h3>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[11px] text-muted-foreground flex-shrink-0">
          <span className="flex items-center gap-1"><User size={10} />{inc.owner}</span>
          <span className="flex items-center gap-1"><Clock size={10} />{inc.duration}</span>
          <span className="text-[11px] text-muted-foreground">{inc.service}</span>
        </div>
        <ChevronRight size={14} className={`text-muted-foreground/40 flex-shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`} />
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border pt-3 space-y-3 animate-fade-in">
          <p className="text-[12px] text-muted-foreground leading-relaxed">{inc.summary}</p>
          {inc.rootCause && (
            <div className="border-l-2 border-red-500/40 pl-3">
              <p className="text-[11px] font-semibold text-red-400 mb-1">Root Cause</p>
              <p className="text-[12px] text-muted-foreground">{inc.rootCause}</p>
            </div>
          )}
          {inc.resolution && (
            <div className="border-l-2 border-emerald-500/40 pl-3">
              <p className="text-[11px] font-semibold text-emerald-400 mb-1">Resolution</p>
              <p className="text-[12px] text-muted-foreground">{inc.resolution}</p>
            </div>
          )}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-1">
            <span>Started: {new Date(inc.startTime).toLocaleString()}</span>
            {inc.resolvedTime && <span>Resolved: {new Date(inc.resolvedTime).toLocaleString()}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

export default function IncidentsPage() {
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = mockIncidents.filter((i) => {
    const matchSearch =
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.service.toLowerCase().includes(search.toLowerCase()) ||
      i.owner.toLowerCase().includes(search.toLowerCase())
    const matchSev = severityFilter === 'all' || i.severity === severityFilter
    const matchSt = statusFilter === 'all' || i.status === statusFilter
    return matchSearch && matchSev && matchSt
  })

  const activeCount = mockIncidents.filter((i) => i.status !== 'resolved').length

  return (
    <AppLayout>
      <div className="p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-1">Incidents</h1>
            <p className="text-[13px] text-muted-foreground">
              {mockIncidents.length} total · {activeCount} active
            </p>
          </div>
          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 text-[12px] text-red-400 px-3 py-1.5 rounded-md border border-red-500/20 bg-red-500/8">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              {activeCount} active incident{activeCount > 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search incidents, services, owners..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="mitigating">Mitigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <AlertTriangle size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">No incidents match your filters.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((inc) => <IncidentRow key={inc.id} inc={inc} />)}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

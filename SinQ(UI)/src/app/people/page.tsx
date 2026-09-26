'use client'

import React, { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { mockPeople, Person } from '@/lib/mockData'
import { Users, Search, Mail, Circle } from 'lucide-react'

const teamColors: Record<string, string> = {
  'Payments Engineering': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Commerce Platform':    'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Platform Security':    'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Engagement':           'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Data Platform':        'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
}

const avatarColors = [
  'from-teal-400 to-blue-500',
  'from-purple-400 to-pink-500',
  'from-orange-400 to-red-500',
  'from-cyan-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-green-400 to-teal-500',
  'from-pink-400 to-purple-500',
  'from-amber-400 to-orange-500',
]

function PersonCard({ person, index }: { person: Person; index: number }) {
  const teamColor = teamColors[person.team] ?? 'bg-muted text-muted-foreground border-border'
  const gradient = avatarColors[index % avatarColors.length]

  return (
    <div className="border border-border bg-secondary rounded-md p-4 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0`}>
          {person.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[13px] font-semibold text-foreground">{person.name}</h3>
            {person.onCallRotation && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Circle size={5} className="fill-emerald-400" />on-call
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{person.role}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {person.expertise.map((e) => (
          <span key={e} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border">{e}</span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-border">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${teamColor}`}>{person.team}</span>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{person.servicesOwned} services</span>
          <span>{person.adrsAuthored} ADRs</span>
        </div>
      </div>

      <a href={`mailto:${person.email}`} className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors">
        <Mail size={10} />
        {person.email}
      </a>
    </div>
  )
}

export default function PeoplePage() {
  const [search, setSearch] = useState('')
  const [teamFilter, setTeamFilter] = useState('all')

  const teams = Array.from(new Set(mockPeople.map((p) => p.team)))

  const filtered = mockPeople.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.role.toLowerCase().includes(search.toLowerCase()) ||
      p.expertise.some((e) => e.toLowerCase().includes(search.toLowerCase()))
    const matchTeam = teamFilter === 'all' || p.team === teamFilter
    return matchSearch && matchTeam
  })

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground mb-1">People</h1>
          <p className="text-[13px] text-muted-foreground">
            {mockPeople.length} engineers across {teams.length} teams
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by name, role, or technology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">No people match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((person, i) => <PersonCard key={person.id} person={person} index={i} />)}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

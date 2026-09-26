'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import type { CatalogEmployee } from '@/lib/api';
import { useLiveCatalog } from '@/lib/useLiveCatalog';
import { useAuth } from '@/lib/auth';
import { Users, Search, Mail, Circle } from 'lucide-react';

const teamColors: Record<string, string> = {
  'Payments Engineering': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Commerce Platform': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Platform Security': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Engagement: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Data Platform': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const avatarColors = [
  'from-teal-400 to-blue-500',
  'from-purple-400 to-pink-500',
  'from-orange-400 to-red-500',
  'from-cyan-400 to-teal-500',
  'from-blue-400 to-indigo-500',
  'from-green-400 to-teal-500',
  'from-pink-400 to-purple-500',
  'from-amber-400 to-orange-500',
];

function PersonCard({ person, index }: { person: CatalogEmployee; index: number }) {
  const teamColor = teamColors[person.team] ?? 'bg-muted text-muted-foreground border-border';
  const gradient = avatarColors[index % avatarColors.length];
  const initials = person.full_name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <Link
      href={`/people/${person.id}`}
      className="block border border-border bg-secondary rounded-md p-4 hover:border-primary/30 transition-colors"
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[13px] font-bold text-white flex-shrink-0`}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="text-[13px] font-semibold text-foreground">{person.full_name}</h3>
            {person.is_on_call && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                <Circle size={5} className="fill-emerald-400" />
                on-call
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{person.job_title}</p>
          <p className="text-[10px] text-primary mt-0.5">{person.company_name}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {person.expertise.map((e) => (
          <span
            key={e}
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
          >
            {e}
          </span>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2.5 border-t border-border">
        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${teamColor}`}>
          {person.team}
        </span>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{person.team}</span>
        </div>
      </div>

      <span className="mt-2.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Mail size={10} />
        {person.email}
      </span>
    </Link>
  );
}

export default function PeoplePage() {
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('all');
  // People belong to a company, not a project, so the directory follows the
  // company behind the selected project. Still overridable from the dropdown.
  const { currentProject } = useAuth();
  const [companyFilter, setCompanyFilter] = useState('all');
  const [pinnedProject, setPinnedProject] = useState<string | null>(null);
  const projectCompany = currentProject?.company ?? null;
  if (currentProject && pinnedProject !== currentProject.id) {
    setPinnedProject(currentProject.id);
    setCompanyFilter(projectCompany ?? 'all');
  }
  const { data: people, loading, error } = useLiveCatalog<CatalogEmployee>('/catalog/employees');

  const teams = Array.from(new Set(people.map((person) => person.team))).sort();
  const companies = Array.from(new Set(people.map((person) => person.company_name))).sort();

  const filtered = people.filter((p) => {
    const matchSearch =
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.job_title.toLowerCase().includes(search.toLowerCase()) ||
      p.expertise.some((e) => e.toLowerCase().includes(search.toLowerCase()));
    const matchTeam = teamFilter === 'all' || p.team === teamFilter;
    const matchCompany = companyFilter === 'all' || p.company_name === companyFilter;
    return matchSearch && matchTeam && matchCompany;
  });

  return (
    <AppLayout>
      <div className="p-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground mb-1">People</h1>
          <p className="text-[13px] text-muted-foreground">
            {people.length} employees across {companies.length} companies
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative flex-1 max-w-sm">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search by name, role, or technology..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Companies</option>
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Teams</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {error ? (
          <p className="py-12 text-center text-[13px] text-red-400">
            Unable to load employees: {error}
          </p>
        ) : loading ? (
          <p className="py-12 text-center text-[13px] text-muted-foreground">
            Loading employee directory…
          </p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">No people match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((person, i) => (
              <PersonCard key={person.id} person={person} index={i} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

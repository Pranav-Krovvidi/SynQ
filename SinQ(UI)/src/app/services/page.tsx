'use client';

import React, { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import type { CatalogService } from '@/lib/api';
import { useProjectCatalog } from '@/lib/useLiveCatalog';
import {
  Server,
  Search,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  GitBranch,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

type ServiceStatus = 'operational' | 'degraded' | 'incident';
type LiveService = CatalogService & {
  owner: string;
  team: string;
  technologies: string[];
  adrCount: number;
  incidentCount: number;
  description: string;
};

const statusConfig: Record<
  ServiceStatus,
  { label: string; color: string; icon: React.ReactNode; dot: string }
> = {
  operational: {
    label: 'Operational',
    color: 'text-emerald-400',
    icon: <CheckCircle size={12} />,
    dot: 'bg-emerald-400',
  },
  degraded: {
    label: 'Degraded',
    color: 'text-amber-400',
    icon: <AlertCircle size={12} />,
    dot: 'bg-amber-400',
  },
  incident: {
    label: 'Incident',
    color: 'text-red-400',
    icon: <AlertTriangle size={12} />,
    dot: 'bg-red-400',
  },
};

const teamColors: Record<string, string> = {
  'Payments Engineering': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  'Commerce Platform': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Platform Security': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  Engagement: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  'Data Platform': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

function ServiceCard({ service }: { service: LiveService }) {
  const status = statusConfig[service.status];
  const teamColor = teamColors[service.team] ?? 'bg-muted text-muted-foreground border-border';

  return (
    <Link href={`/services?q=${encodeURIComponent(service.name)}`}>
      <div className="group border border-border bg-secondary rounded-md p-4 hover:border-primary/40 hover:bg-secondary/80 transition-all duration-150 cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Server size={14} className="text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {service.name}
              </h3>
              <p className="text-[11px] text-muted-foreground truncate">{service.owner}</p>
            </div>
          </div>
          <div
            className={`flex items-center gap-1 text-[11px] font-medium flex-shrink-0 ${status.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${status.dot} flex-shrink-0`} />
            {status.label}
          </div>
        </div>

        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">
          {service.description}
        </p>

        <div className="flex flex-wrap gap-1.5 mb-3">
          {service.technologies.map((tech) => (
            <span
              key={tech}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground border border-border"
            >
              {tech}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-border">
          <div className="flex items-center gap-3">
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${teamColor}`}>
              {service.team}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <GitBranch size={10} />
              {service.adrCount} ADRs
            </span>
            <span className="flex items-center gap-1">
              <Zap size={10} />
              {service.incidentCount} incidents
            </span>
            <ChevronRight
              size={12}
              className="text-muted-foreground/40 group-hover:text-primary transition-colors"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const { data, loading, error } = useProjectCatalog<CatalogService>('/catalog/services');
  const mockServices: LiveService[] = data.map((service) => ({
    ...service,
    owner: service.project_name,
    team: service.project_name,
    technologies: (service.tech_stack ?? '')
      .split(',')
      .map((technology) => technology.trim())
      .filter(Boolean),
    adrCount: service.adr_count,
    incidentCount: service.incident_count,
    description: service.description ?? '',
  }));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    const company = params.get('company');
    if (query) setSearch(query);
    if (company) setCompanyFilter(company);
  }, []);

  const teams = Array.from(new Set(mockServices.map((s) => s.team)));
  const companies = Array.from(new Set(mockServices.map((s) => s.company_name))).sort();

  const filtered = mockServices.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description.toLowerCase().includes(search.toLowerCase()) ||
      s.owner.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || s.status === statusFilter;
    const matchTeam = teamFilter === 'all' || s.project_name === teamFilter;
    const matchCompany = companyFilter === 'all' || s.company_name === companyFilter;
    return matchSearch && matchStatus && matchTeam && matchCompany;
  });

  const counts = {
    operational: mockServices.filter((s) => s.status === 'operational').length,
    degraded: 0,
    incident: mockServices.filter((s) => s.status === 'incident').length,
  };

  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground mb-1">Services</h1>
            <p className="text-[13px] text-muted-foreground">
              {mockServices.length} services across {companies.length} companies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {counts.operational} operational
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {counts.degraded} degraded
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {counts.incident} incident
            </div>
          </div>
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
              placeholder="Search services, owners, technologies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">All Companies</option>
            {companies.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="degraded">Degraded</option>
            <option value="incident">Incident</option>
          </select>
          <select
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
            className="px-3 py-2 bg-secondary border border-border rounded-md text-[13px] text-foreground focus:outline-none focus:border-primary/50 transition-colors"
          >
            <option value="all">All Projects</option>
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
            Unable to load services: {error}
          </p>
        ) : loading ? (
          <p className="py-12 text-center text-[13px] text-muted-foreground">Loading services…</p>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Server size={32} className="text-muted-foreground/30 mb-3" />
            <p className="text-[13px] text-muted-foreground">No services match your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

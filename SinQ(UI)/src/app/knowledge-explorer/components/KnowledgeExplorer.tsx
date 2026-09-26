'use client';

import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, X, Compass } from 'lucide-react';
import FilterPanel from './FilterPanel';
import ResultsSection from './ResultsSection';
import {
  mockServices, mockADRs, mockIncidents, mockPeople,
  explorerDocuments, filterOptions, mockProjects,
} from '@/lib/mockData';

export interface ActiveFilters {
  types: string[];
  teams: string[];
  technologies: string[];
  owners: string[];
  dateRange: string;
  project: string;
}

const defaultFilters: ActiveFilters = {
  types: [],
  teams: [],
  technologies: [],
  owners: [],
  dateRange: 'All time',
  project: '',
};

// ── Date-range helpers ────────────────────────────────────────────────────────
function cutoffDate(dateRange: string): Date | null {
  const now = new Date();
  switch (dateRange) {
    case 'Last 7 days':  return new Date(now.getTime() - 7  * 86400000);
    case 'Last 30 days': return new Date(now.getTime() - 30 * 86400000);
    case 'Last 90 days': return new Date(now.getTime() - 90 * 86400000);
    case 'Last year':    return new Date(now.getTime() - 365 * 86400000);
    default:             return null;
  }
}

function afterCutoff(dateStr: string, cutoff: Date | null): boolean {
  if (!cutoff) return true;
  return new Date(dateStr) >= cutoff;
}

// ── Project name → id resolution ─────────────────────────────────────────────
function projectIdForName(name: string): string | null {
  const p = mockProjects.find((p) => p.name === name);
  return p ? p.id : null;
}

export default function KnowledgeExplorer() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<ActiveFilters>(defaultFilters);
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const cutoff = useMemo(() => cutoffDate(filters.dateRange), [filters.dateRange]);
  const projectId = useMemo(() => (filters.project ? projectIdForName(filters.project) : null), [filters.project]);

  const filteredServices = useMemo(() => {
    if (filters.types.length > 0 && !filters.types.includes('Service')) return [];
    return mockServices.filter((s) => {
      if (projectId && s.projectId !== projectId) return false;
      if (!afterCutoff(s.lastUpdated, cutoff)) return false;
      const q = query.toLowerCase();
      const matchesQuery = !query
        || s.name.toLowerCase().includes(q)
        || s.description.toLowerCase().includes(q)
        || s.technologies.some((t) => t.toLowerCase().includes(q));
      const matchesTeam = filters.teams.length === 0 || filters.teams.includes(s.team);
      const matchesTech = filters.technologies.length === 0
        || s.technologies.some((t) => filters.technologies.includes(t));
      const matchesOwner = filters.owners.length === 0 || filters.owners.includes(s.owner);
      return matchesQuery && matchesTeam && matchesTech && matchesOwner;
    });
  }, [query, filters, cutoff, projectId]);

  const filteredADRs = useMemo(() => {
    if (filters.types.length > 0 && !filters.types.includes('ADR')) return [];
    return mockADRs.filter((a) => {
      if (projectId && a.projectId !== projectId) return false;
      if (!afterCutoff(a.date, cutoff)) return false;
      const q = query.toLowerCase();
      const matchesQuery = !query
        || a.title.toLowerCase().includes(q)
        || a.summary.toLowerCase().includes(q)
        || a.tags.some((t) => t.toLowerCase().includes(q))
        || a.author.toLowerCase().includes(q);
      // ADRs: match tech filter against tags (case-insensitive)
      const matchesTech = filters.technologies.length === 0
        || a.tags.some((t) => filters.technologies.some((f) => f.toLowerCase() === t.toLowerCase()));
      const matchesOwner = filters.owners.length === 0 || filters.owners.includes(a.author);
      // ADRs don't have a team field — team filter skipped for ADRs
      return matchesQuery && matchesTech && matchesOwner;
    });
  }, [query, filters, cutoff, projectId]);

  const filteredIncidents = useMemo(() => {
    if (filters.types.length > 0 && !filters.types.includes('Incident')) return [];
    return mockIncidents.filter((i) => {
      if (projectId && i.projectId !== projectId) return false;
      if (!afterCutoff(i.startTime, cutoff)) return false;
      const q = query.toLowerCase();
      const matchesQuery = !query
        || i.title.toLowerCase().includes(q)
        || i.summary.toLowerCase().includes(q)
        || i.service.toLowerCase().includes(q);
      const matchesOwner = filters.owners.length === 0 || filters.owners.includes(i.owner);
      // Incidents don't have a team or tech field directly — skip those filters
      return matchesQuery && matchesOwner;
    });
  }, [query, filters, cutoff, projectId]);

  const filteredPeople = useMemo(() => {
    if (filters.types.length > 0 && !filters.types.includes('Person')) return [];
    return mockPeople.filter((p) => {
      if (projectId && p.projectId !== projectId) return false;
      const q = query.toLowerCase();
      const matchesQuery = !query
        || p.name.toLowerCase().includes(q)
        || p.role.toLowerCase().includes(q)
        || p.team.toLowerCase().includes(q)
        || p.expertise.some((e) => e.toLowerCase().includes(q));
      const matchesTeam = filters.teams.length === 0 || filters.teams.includes(p.team);
      const matchesTech = filters.technologies.length === 0
        || p.expertise.some((e) => filters.technologies.some((f) => f.toLowerCase() === e.toLowerCase()));
      // People don't have an updatedAt — date filter skipped
      // Owner filter doesn't apply to people (they ARE the owners)
      return matchesQuery && matchesTeam && matchesTech;
    });
  }, [query, filters, projectId]);

  const filteredDocs = useMemo(() => {
    if (filters.types.length > 0 && !filters.types.includes('Document')) return [];
    return explorerDocuments.filter((d) => {
      if (!afterCutoff(d.updatedAt, cutoff)) return false;
      const q = query.toLowerCase();
      const matchesQuery = !query
        || d.title.toLowerCase().includes(q)
        || d.summary.toLowerCase().includes(q)
        || d.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTeam = filters.teams.length === 0 || filters.teams.includes(d.team);
      const matchesOwner = filters.owners.length === 0 || filters.owners.includes(d.owner);
      const matchesTech = filters.technologies.length === 0
        || d.tags.some((t) => filters.technologies.some((f) => f.toLowerCase() === t.toLowerCase()));
      return matchesQuery && matchesTeam && matchesOwner && matchesTech;
    });
  }, [query, filters, cutoff]);

  const totalResults =
    filteredServices.length + filteredADRs.length +
    filteredIncidents.length + filteredPeople.length + filteredDocs.length;

  const activeFilterCount =
    filters.types.length + filters.teams.length +
    filters.technologies.length + filters.owners.length +
    (filters.dateRange !== 'All time' ? 1 : 0) +
    (filters.project ? 1 : 0);

  const clearFilters = () => setFilters(defaultFilters);
  const totalIndexed =
    mockServices.length + mockADRs.length +
    mockIncidents.length + mockPeople.length + explorerDocuments.length;

  return (
    <div className="flex h-full max-w-screen-2xl mx-auto">
      {/* Filter panel */}
      {filterPanelOpen && (
        <FilterPanel
          filters={filters}
          onChange={setFilters}
          onClose={() => setFilterPanelOpen(false)}
          options={filterOptions}
        />
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Search header */}
        <div className="px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <h1 className="text-[18px] font-bold text-foreground tracking-tight">Knowledge Explorer</h1>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
              {totalIndexed} items indexed
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search services, ADRs, incidents, people, documents..."
                className="synq-input w-full pl-10 pr-4 py-2.5 text-[13px]"
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            {!filterPanelOpen && (
              <button
                onClick={() => setFilterPanelOpen(true)}
                className="btn-secondary flex items-center gap-2 text-[13px] px-3 py-2.5 flex-shrink-0"
              >
                <SlidersHorizontal size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-primary text-background text-[9px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Results summary */}
          {(query || activeFilterCount > 0) && (
            <div className="flex items-center gap-3 mt-3">
              <span className="text-[12px] text-muted-foreground">
                <span className="font-semibold text-foreground tabular-nums">{totalResults}</span> results
                {query && <span> for &ldquo;<span className="text-primary">{query}</span>&rdquo;</span>}
                {filters.project && <span className="ml-1">in <span className="text-primary">{filters.project}</span></span>}
                {filters.dateRange !== 'All time' && <span className="ml-1">· {filters.dateRange}</span>}
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-[11px] text-muted-foreground hover:text-red-400 transition-colors flex items-center gap-1"
                >
                  <X size={10} />
                  Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {totalResults === 0 && (query || activeFilterCount > 0) ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-muted-foreground mb-4">
                <Compass size={20} />
              </div>
              <h3 className="text-[15px] font-semibold text-foreground mb-2">No knowledge items found</h3>
              <p className="text-[13px] text-muted-foreground max-w-xs leading-relaxed">
                Try adjusting your search query or removing some filters to broaden the results.
              </p>
              <button onClick={clearFilters} className="mt-4 btn-secondary text-[13px]">
                Clear all filters
              </button>
            </div>
          ) : (
            <ResultsSection
              services={filteredServices}
              adrs={filteredADRs}
              incidents={filteredIncidents}
              people={filteredPeople}
              documents={filteredDocs}
              query={query}
              activeSection={activeSection}
              onSectionToggle={(s) => setActiveSection(activeSection === s ? null : s)}
            />
          )}
        </div>
      </div>
    </div>
  );
}

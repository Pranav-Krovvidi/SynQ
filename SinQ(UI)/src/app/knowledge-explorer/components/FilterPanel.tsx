'use client';

import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, SlidersHorizontal } from 'lucide-react';
import type { ActiveFilters } from './KnowledgeExplorer';

interface Props {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  onClose: () => void;
  options: {
    types: string[];
    teams: string[];
    technologies: string[];
    owners: string[];
    dateRanges: string[];
    projects: string[];
  };
}

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(true);
  return (
    <div className="border-b border-border pb-4 mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full mb-2.5 group"
      >
        <span className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
        {open ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
      </button>
      {open && children}
    </div>
  );
}

function MultiChip({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (val: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={`chip-${opt}`}
            onClick={() => onToggle(opt)}
            className={`text-[11px] px-2 py-1 rounded-md border transition-all duration-150 ${
              active
                ? 'filter-chip-active' :'bg-muted/30 text-muted-foreground border-border hover:border-primary/25 hover:text-foreground'
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterPanel({ filters, onChange, onClose, options }: Props) {
  const toggle = (key: keyof Pick<ActiveFilters, 'types' | 'teams' | 'technologies' | 'owners'>, val: string) => {
    const current = filters[key];
    onChange({
      ...filters,
      [key]: current.includes(val) ? current.filter((v) => v !== val) : [...current, val],
    });
  };

  const activeCount =
    filters.types.length +
    filters.teams.length +
    filters.technologies.length +
    filters.owners.length +
    (filters.dateRange !== 'All time' ? 1 : 0) +
    (filters.project ? 1 : 0);

  return (
    <aside className="w-[240px] flex-shrink-0 border-r border-border bg-secondary flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={13} className="text-muted-foreground" />
          <span className="text-[13px] font-semibold text-foreground">Filters</span>
          {activeCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-primary text-background text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={() =>
                onChange({ types: [], teams: [], technologies: [], owners: [], dateRange: 'All time', project: '' })
              }
              className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
            >
              Clear all
            </button>
          )}
          <button
            onClick={onClose}
            className="w-5 h-5 rounded flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Filter body */}
      <div className="flex-1 overflow-y-auto p-4">
        <FilterSection label="Type">
          <MultiChip
            options={options.types}
            selected={filters.types}
            onToggle={(v) => toggle('types', v)}
          />
        </FilterSection>

        <FilterSection label="Team">
          <MultiChip
            options={options.teams}
            selected={filters.teams}
            onToggle={(v) => toggle('teams', v)}
          />
        </FilterSection>

        <FilterSection label="Technology">
          <MultiChip
            options={options.technologies}
            selected={filters.technologies}
            onToggle={(v) => toggle('technologies', v)}
          />
        </FilterSection>

        <FilterSection label="Owner">
          <div className="space-y-1">
            {options.owners.map((owner) => {
              const initials = owner.split(' ').map((n) => n[0]).join('');
              const active = filters.owners.includes(owner);
              return (
                <button
                  key={`owner-${owner}`}
                  onClick={() => toggle('owners', owner)}
                  className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-left transition-all duration-150 ${
                    active
                      ? 'bg-primary/8 border border-primary/20' :'hover:bg-muted border border-transparent'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 ${
                    active ? 'bg-primary text-background' : 'bg-muted text-muted-foreground'
                  }`}>
                    {initials}
                  </div>
                  <span className={`text-[12px] ${active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                    {owner}
                  </span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        <FilterSection label="Date Range">
          <div className="space-y-1">
            {options.dateRanges.map((range) => (
              <button
                key={`date-${range}`}
                onClick={() => onChange({ ...filters, dateRange: range })}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] transition-all duration-150 ${
                  filters.dateRange === range
                    ? 'bg-primary/8 text-primary border border-primary/20' :'text-muted-foreground hover:bg-muted border border-transparent'
                }`}
              >
                <span className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                  filters.dateRange === range ? 'border-primary bg-primary' : 'border-muted-foreground'
                }`} />
                {range}
              </button>
            ))}
          </div>
        </FilterSection>

        <div>
          <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground mb-2.5">Project</p>
          <div className="space-y-1">
            {options.projects.map((proj) => (
              <button
                key={`proj-${proj}`}
                onClick={() => onChange({ ...filters, project: filters.project === proj ? '' : proj })}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-[12px] transition-all duration-150 ${
                  filters.project === proj
                    ? 'bg-accent/8 text-accent border border-accent/20' :'text-muted-foreground hover:bg-muted border border-transparent'
                }`}
              >
                <span className="text-[9px] font-mono">◆</span>
                <span className="truncate">{proj}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
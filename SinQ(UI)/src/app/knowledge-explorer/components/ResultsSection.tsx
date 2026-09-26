'use client';

import React from 'react';
import { ChevronDown, ChevronUp, Server, GitBranch, AlertTriangle, Users, FileText } from 'lucide-react';
import type { Service, ADR, Incident, Person } from '@/lib/mockData';
import ServiceResultCard from './ServiceResultCard';
import ADRResultCard from './ADRResultCard';
import IncidentResultCard from './IncidentResultCard';
import PersonResultCard from './PersonResultCard';
import DocumentResultCard from './DocumentResultCard';

interface DocumentItem {
  id: string;
  title: string;
  type: string;
  team: string;
  owner: string;
  tags: string[];
  updatedAt: string;
  summary: string;
}

interface Props {
  services: Service[];
  adrs: ADR[];
  incidents: Incident[];
  people: Person[];
  documents: DocumentItem[];
  query: string;
  activeSection: string | null;
  onSectionToggle: (section: string) => void;
}

interface SectionHeaderProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  sectionId: string;
  activeSection: string | null;
  onToggle: (id: string) => void;
  accentClass: string;
}

function SectionHeader({ icon, label, count, sectionId, activeSection, onToggle, accentClass }: SectionHeaderProps) {
  const collapsed = activeSection !== null && activeSection !== sectionId;
  return (
    <button
      onClick={() => onToggle(sectionId)}
      className="flex items-center gap-2.5 w-full mb-3 group"
    >
      <div className={`w-6 h-6 rounded-md flex items-center justify-center ${accentClass}`}>
        {icon}
      </div>
      <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">
        {label}
      </span>
      <span className="text-[11px] font-mono text-muted-foreground tabular-nums px-1.5 py-0.5 rounded bg-muted">
        {count}
      </span>
      <div className="ml-auto text-muted-foreground">
        {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
      </div>
    </button>
  );
}

export default function ResultsSection({
  services, adrs, incidents, people, documents, query, activeSection, onSectionToggle,
}: Props) {
  const collapsed = (id: string) => activeSection !== null && activeSection !== id;

  const sections = [
    { id: 'services', count: services.length, show: services.length > 0 },
    { id: 'adrs', count: adrs.length, show: adrs.length > 0 },
    { id: 'incidents', count: incidents.length, show: incidents.length > 0 },
    { id: 'people', count: people.length, show: people.length > 0 },
    { id: 'documents', count: documents.length, show: documents.length > 0 },
  ];

  const totalVisible = sections.filter((s) => s.show).length;

  if (totalVisible === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-[13px]">
        No results match your current filters.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Services */}
      {services.length > 0 && (
        <div>
          <SectionHeader
            icon={<Server size={13} className="text-primary" />}
            label="Services"
            count={services.length}
            sectionId="services"
            activeSection={activeSection}
            onToggle={onSectionToggle}
            accentClass="bg-primary/10"
          />
          {!collapsed('services') && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-3 gap-3">
              {services.map((s) => (
                <ServiceResultCard key={s.id} service={s} query={query} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ADRs */}
      {adrs.length > 0 && (
        <div>
          <SectionHeader
            icon={<GitBranch size={13} className="text-accent" />}
            label="Architecture Decisions"
            count={adrs.length}
            sectionId="adrs"
            activeSection={activeSection}
            onToggle={onSectionToggle}
            accentClass="bg-accent/10"
          />
          {!collapsed('adrs') && (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-3">
              {adrs.map((a) => (
                <ADRResultCard key={a.id} adr={a} query={query} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Incidents */}
      {incidents.length > 0 && (
        <div>
          <SectionHeader
            icon={<AlertTriangle size={13} className="text-red-400" />}
            label="Incidents"
            count={incidents.length}
            sectionId="incidents"
            activeSection={activeSection}
            onToggle={onSectionToggle}
            accentClass="bg-red-500/10"
          />
          {!collapsed('incidents') && (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-3">
              {incidents.map((i) => (
                <IncidentResultCard key={i.id} incident={i} query={query} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* People */}
      {people.length > 0 && (
        <div>
          <SectionHeader
            icon={<Users size={13} className="text-purple-400" />}
            label="People"
            count={people.length}
            sectionId="people"
            activeSection={activeSection}
            onToggle={onSectionToggle}
            accentClass="bg-purple-500/10"
          />
          {!collapsed('people') && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
              {people.map((p) => (
                <PersonResultCard key={p.id} person={p} query={query} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      {documents.length > 0 && (
        <div>
          <SectionHeader
            icon={<FileText size={13} className="text-amber-400" />}
            label="Documents"
            count={documents.length}
            sectionId="documents"
            activeSection={activeSection}
            onToggle={onSectionToggle}
            accentClass="bg-amber-500/10"
          />
          {!collapsed('documents') && (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-2 gap-3">
              {documents.map((d) => (
                <DocumentResultCard key={d.id} document={d} query={query} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
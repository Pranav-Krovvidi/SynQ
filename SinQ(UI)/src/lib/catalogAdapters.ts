/**
 * Adapters from backend catalog rows to the shapes the existing UI renders.
 *
 * The cards, detail pages and explorer were written against the mockData
 * interfaces. Mapping onto those same shapes lets every one of them render
 * live records without being rewritten, and keeps the demo-mode fixtures and
 * the live path interchangeable.
 */

import type { CatalogAdr, CatalogEmployee, CatalogIncident, CatalogService } from '@/lib/api';
import type {
  ADR,
  ADRStatus,
  Incident,
  IncidentSeverity,
  IncidentStatus,
  Person,
  Service,
} from '@/lib/mockData';

function shortDate(value: string | null): string {
  if (!value) return '';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
}

function splitList(value: string | null): string[] {
  // Keyed by value in the result cards, so duplicates must not survive.
  return Array.from(
    new Set(
      (value ?? '')
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    )
  );
}

/** The backend allows 'deprecated'; the UI's union calls that 'superseded'. */
function toAdrStatus(status: CatalogAdr['status']): ADRStatus {
  return status === 'deprecated' ? 'superseded' : status;
}

export function adrFromCatalog(row: CatalogAdr): ADR {
  const summary = row.decision || row.context || '';
  return {
    id: row.id,
    title: row.title,
    status: toAdrStatus(row.status),
    author: row.author_name ?? 'Unassigned',
    date: shortDate(row.decided_at ?? row.updated_at),
    services: [],
    // A project and its company usually share a name; the result cards key
    // each tag by value, so repeats collide as React keys.
    tags: Array.from(new Set([row.project_name, row.company_name].filter(Boolean))),
    summary,
    projectId: row.project_id,
    context: row.context ?? undefined,
    decision: row.decision ?? undefined,
    consequences: row.consequences ?? undefined,
  };
}

export function serviceFromCatalog(row: CatalogService): Service {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    team: row.project_name,
    owner: row.owner_name ?? 'Unassigned',
    technologies: splitList(row.tech_stack),
    adrCount: row.adr_count,
    incidentCount: row.incident_count,
    lastUpdated: '',
    description: row.description ?? '',
    projectId: row.project_id,
  };
}

export function incidentFromCatalog(row: CatalogIncident): Incident {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity as IncidentSeverity,
    status: row.status as IncidentStatus,
    service: row.service_name,
    owner: row.owner_name,
    startTime: shortDate(row.started_at),
    resolvedTime: row.resolved_at ? shortDate(row.resolved_at) : undefined,
    duration: '',
    summary: row.summary,
    projectId: row.project_id,
    rootCause: row.root_cause || undefined,
    resolution: row.resolution || undefined,
  };
}

/**
 * People have no project of their own, so their counts are derived from the
 * records that point at them.
 */
export function personFromCatalog(
  row: CatalogEmployee,
  adrs: CatalogAdr[],
  services: CatalogService[]
): Person {
  return {
    id: row.id,
    name: row.full_name,
    role: row.job_title,
    team: row.team,
    servicesOwned: services.filter((s) => s.owner_employee_id === row.id).length,
    adrsAuthored: adrs.filter((a) => a.author_employee_id === row.id).length,
    avatar: row.full_name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
    expertise: Array.from(new Set(row.expertise)),
    projectId: '',
    email: row.email,
    onCallRotation: row.is_on_call,
  };
}

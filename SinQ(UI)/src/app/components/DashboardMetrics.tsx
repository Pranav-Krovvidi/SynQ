'use client';

import React, { useMemo } from 'react';
import { Server, GitBranch, AlertTriangle, Users } from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import { useProjectCatalog } from '@/lib/useLiveCatalog';
import { useLiveCatalog } from '@/lib/useLiveCatalog';
import { useAuth } from '@/lib/auth';
import type { CatalogAdr, CatalogEmployee, CatalogIncident, CatalogService } from '@/lib/api';

/**
 * Headline counts for the project selected in the sidebar.
 *
 * Everything here is derived from the live catalog, so switching projects
 * re-counts against that project's rows rather than showing company totals.
 */
export default function DashboardMetrics() {
  const { currentProject } = useAuth();
  const services = useProjectCatalog<CatalogService>('/catalog/services');
  const adrs = useProjectCatalog<CatalogAdr>('/catalog/adrs');
  const incidents = useProjectCatalog<CatalogIncident>('/catalog/incidents');
  const { data: employees } = useLiveCatalog<CatalogEmployee>('/catalog/employees');

  const loading = services.loading || adrs.loading || incidents.loading;

  const activeIncidents = useMemo(
    () => incidents.data.filter((incident) => incident.status !== 'resolved').length,
    [incidents.data]
  );

  // "Owners" means people actually accountable for something in this project,
  // not the whole company directory.
  const owners = useMemo(() => {
    const ids = new Set<string>();
    services.data.forEach((service) => {
      if (service.owner_employee_id) ids.add(service.owner_employee_id);
    });
    adrs.data.forEach((adr) => {
      if (adr.author_employee_id) ids.add(adr.author_employee_id);
    });
    incidents.data.forEach((incident) => {
      if (incident.owner_employee_id) ids.add(incident.owner_employee_id);
    });
    return ids.size;
  }, [services.data, adrs.data, incidents.data]);

  const show = (value: number) => (loading ? '—' : String(value));

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      <MetricCard
        label="Services"
        value={show(services.data.length)}
        changeLabel={currentProject?.name ?? 'All projects'}
        icon={<Server size={14} />}
        accent="teal"
      />
      <MetricCard
        label="Architecture Decisions"
        value={show(adrs.data.length)}
        changeLabel={currentProject?.name ?? 'All projects'}
        icon={<GitBranch size={14} />}
        accent="blue"
      />
      <MetricCard
        label="Total Incidents"
        value={show(incidents.data.length)}
        changeLabel={currentProject?.name ?? 'All projects'}
        icon={<AlertTriangle size={14} />}
        accent="amber"
      />
      <MetricCard
        label="Active Incidents"
        value={show(activeIncidents)}
        changeLabel="unresolved"
        icon={<AlertTriangle size={14} />}
        accent="red"
        alert={activeIncidents > 0}
      />
      <MetricCard
        label="Active Owners"
        value={show(owners)}
        changeLabel={`of ${employees.length} people`}
        icon={<Users size={14} />}
        accent="purple"
      />
    </div>
  );
}

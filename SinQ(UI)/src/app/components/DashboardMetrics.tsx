import React from 'react';
import { Server, GitBranch, AlertTriangle, Users } from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import type { CatalogAdr, CatalogEmployee, CatalogIncident, CatalogService } from '@/lib/api';
import { useLiveCatalog } from '@/lib/useLiveCatalog';

export default function DashboardMetrics() {
  const { data: services } = useLiveCatalog<CatalogService>('/catalog/services');
  const { data: adrs } = useLiveCatalog<CatalogAdr>('/catalog/adrs');
  const { data: incidents } = useLiveCatalog<CatalogIncident>('/catalog/incidents');
  const { data: employees } = useLiveCatalog<CatalogEmployee>('/catalog/employees');
  const activeIncidents = incidents.filter((incident) => incident.status !== 'resolved').length;

  // 5 cards → grid-cols-5 single row on xl+, 3+2 on lg, 2+2+1 on md
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      <MetricCard
        label="Services"
        value={services.length}
        subValue="Live"
        icon={<Server size={14} />}
        accent="teal"
      />
      <MetricCard
        label="Architecture Decisions"
        value={adrs.length}
        subValue="Live"
        icon={<GitBranch size={14} />}
        accent="blue"
      />
      <MetricCard
        label="Total Incidents"
        value={incidents.length}
        subValue="Live"
        icon={<AlertTriangle size={14} />}
        accent="amber"
      />
      <MetricCard
        label="Active Incidents"
        value={activeIncidents}
        subValue="Live"
        icon={<AlertTriangle size={14} />}
        accent="red"
        alert
      />
      <MetricCard
        label="Team Members"
        value={employees.length}
        subValue="Directory"
        icon={<Users size={14} />}
        accent="purple"
      />
    </div>
  );
}
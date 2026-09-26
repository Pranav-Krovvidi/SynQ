import React from 'react';
import { Server, GitBranch, AlertTriangle, Users } from 'lucide-react';
import MetricCard from '@/components/ui/MetricCard';
import { dashboardMetrics } from '@/lib/mockData';

export default function DashboardMetrics() {
  // 5 cards → grid-cols-5 single row on xl+, 3+2 on lg, 2+2+1 on md
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 gap-4">
      <MetricCard
        label="Services"
        value={dashboardMetrics?.services?.value}
        change={dashboardMetrics?.services?.change}
        changeLabel="this month"
        icon={<Server size={14} />}
        accent="teal"
      />
      <MetricCard
        label="Architecture Decisions"
        value={dashboardMetrics?.adrs?.value}
        change={dashboardMetrics?.adrs?.change}
        changeLabel="this month"
        icon={<GitBranch size={14} />}
        accent="blue"
      />
      <MetricCard
        label="Total Incidents"
        value={dashboardMetrics?.incidents?.value}
        change={dashboardMetrics?.incidents?.change}
        changeLabel="vs last month"
        icon={<AlertTriangle size={14} />}
        accent="amber"
      />
      <MetricCard
        label="Active Incidents"
        value={dashboardMetrics?.activeIncidents?.value}
        change={dashboardMetrics?.activeIncidents?.change}
        changeLabel="vs yesterday"
        icon={<AlertTriangle size={14} />}
        accent="red"
        alert
      />
      <MetricCard
        label="Active Owners"
        value={dashboardMetrics?.owners?.value}
        change={dashboardMetrics?.owners?.change}
        changeLabel="this month"
        icon={<Users size={14} />}
        accent="purple"
      />
    </div>
  );
}
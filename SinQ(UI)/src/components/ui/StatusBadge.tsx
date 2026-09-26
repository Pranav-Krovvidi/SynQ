import React from 'react';


type BadgeVariant =
  | 'operational' |'degraded' |'incident' |'resolved' |'accepted' |'proposed' |'draft' |'superseded' |'critical' |'high' |'medium' |'low' |'open' |'investigating' |'mitigating' |'service' |'adr' |'person' |'document' |'project';

interface StatusBadgeProps {
  variant: BadgeVariant;
  label?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
}

const variantConfig: Record<BadgeVariant, { className: string; defaultLabel: string; dotColor?: string }> = {
  operational: { className: 'status-operational', defaultLabel: 'Operational', dotColor: 'bg-green-400' },
  degraded: { className: 'status-degraded', defaultLabel: 'Degraded', dotColor: 'bg-yellow-400' },
  incident: { className: 'status-incident', defaultLabel: 'Incident', dotColor: 'bg-red-400' },
  resolved: { className: 'bg-muted text-muted-foreground border border-border', defaultLabel: 'Resolved' },
  accepted: { className: 'bg-primary/10 text-primary border border-primary/25', defaultLabel: 'Accepted' },
  proposed: { className: 'bg-blue-500/10 text-blue-400 border border-blue-500/25', defaultLabel: 'Proposed' },
  draft: { className: 'bg-muted text-muted-foreground border border-border', defaultLabel: 'Draft' },
  superseded: { className: 'bg-muted text-muted-foreground/70 border border-border', defaultLabel: 'Superseded' },
  critical: { className: 'severity-critical', defaultLabel: 'Critical' },
  high: { className: 'severity-high', defaultLabel: 'High' },
  medium: { className: 'severity-medium', defaultLabel: 'Medium' },
  low: { className: 'severity-low', defaultLabel: 'Low' },
  open: { className: 'status-incident', defaultLabel: 'Open' },
  investigating: { className: 'status-degraded', defaultLabel: 'Investigating' },
  mitigating: { className: 'bg-orange-500/10 text-orange-400 border border-orange-500/25', defaultLabel: 'Mitigating' },
  service: { className: 'bg-primary/10 text-primary border border-primary/20', defaultLabel: 'Service' },
  adr: { className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20', defaultLabel: 'ADR' },
  person: { className: 'bg-purple-500/10 text-purple-400 border border-purple-500/20', defaultLabel: 'Person' },
  document: { className: 'bg-orange-500/10 text-orange-400 border border-orange-500/20', defaultLabel: 'Document' },
  project: { className: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20', defaultLabel: 'Project' },
};

export default function StatusBadge({ variant, label, size = 'sm', dot = false }: StatusBadgeProps) {
  const config = variantConfig[variant];
  const displayLabel = label ?? config.defaultLabel;

  return (
    <span className={`
      inline-flex items-center gap-1 rounded-md font-mono font-medium tracking-wide
      ${size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-1'}
      ${config.className}
    `}>
      {dot && config.dotColor && (
        <span className={`w-1.5 h-1.5 rounded-full ${config.dotColor} flex-shrink-0`} />
      )}
      {displayLabel}
    </span>
  );
}
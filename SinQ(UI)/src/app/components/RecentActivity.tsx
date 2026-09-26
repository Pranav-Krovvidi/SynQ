import React from 'react';
import { GitBranch, AlertTriangle, FileText, Lightbulb, ArrowRight } from 'lucide-react';

interface RecentItem {
  id: string;
  title: string;
  meta: string;
  time: string;
  badge?: string;
}

interface RecentSection {
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  items: RecentItem[];
}

const recentSections: RecentSection[] = [
  {
    label: 'Architecture Decisions',
    icon: <GitBranch size={11} />,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    items: [
      { id: 'adr-1', title: 'ADR-055: Standardize on mTLS for service-to-service auth', meta: 'James Wu · Platform Security', time: '2h ago', badge: 'Draft' },
      { id: 'adr-2', title: 'ADR-051: Migrate Order Service from MongoDB to PostgreSQL', meta: 'Priya Nair · Commerce Platform', time: '16h ago', badge: 'Proposed' },
    ],
  },
  {
    label: 'Incidents',
    icon: <AlertTriangle size={11} />,
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    items: [
      { id: 'inc-1', title: 'INC-134: Analytics Pipeline Kafka rebalance storm', meta: 'Yuki Tanaka · Investigating', time: '2h 30m ago', badge: 'Open' },
      { id: 'inc-2', title: 'INC-131: Auth Gateway Memory Leak resolved', meta: 'James Wu · Auth Gateway', time: '24d ago', badge: 'Resolved' },
    ],
  },
  {
    label: 'Documentation Updates',
    icon: <FileText size={11} />,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    items: [
      { id: 'doc-1', title: 'Payments Engineering Runbook — on-call procedures updated', meta: 'Alex Morgan · Payments Engineering', time: '3d ago' },
      { id: 'doc-2', title: 'Zero-Trust Network Architecture Spec — cert-manager section added', meta: 'James Wu · Platform Security', time: '1w ago' },
    ],
  },
  {
    label: 'Lessons Learned',
    icon: <Lightbulb size={11} />,
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    items: [
      { id: 'll-1', title: 'ADR-042 postmortem: Kafka decoupling prevented INC-127 from being worse', meta: 'Alex Morgan · Payments', time: '43d ago' },
    ],
  },
];

const badgeColor: Record<string, string> = {
  Draft: 'bg-muted text-muted-foreground',
  Proposed: 'bg-accent/15 text-accent border border-accent/25',
  Open: 'bg-red-500/15 text-red-400 border border-red-500/25',
  Resolved: 'bg-green-500/15 text-green-400 border border-green-500/25',
};

export default function RecentActivity() {
  return (
    <div className="synq-card p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-foreground">Recent Knowledge</h2>
        <button className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
          View all <ArrowRight size={10} />
        </button>
      </div>
      <div className="space-y-3 flex-1">
        {recentSections.map((section) => (
          <div key={section.label}>
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className={`w-4 h-4 rounded flex items-center justify-center ${section.bgColor} ${section.color}`}>
                {section.icon}
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${section.color}`}>
                {section.label}
              </span>
            </div>
            <div className="space-y-1 pl-1">
              {section.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[11.5px] text-foreground/90 leading-snug line-clamp-1 group-hover:text-foreground transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] text-muted-foreground truncate">{item.meta}</span>
                      <span className="text-[10px] text-muted-foreground/40 flex-shrink-0">·</span>
                      <span className="text-[10px] text-muted-foreground font-mono flex-shrink-0">{item.time}</span>
                    </div>
                  </div>
                  {item.badge && (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${badgeColor[item.badge] || 'bg-muted text-muted-foreground'}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
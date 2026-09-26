'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { knowledgeGrowthData } from '@/lib/mockData';

const KnowledgeGrowthChartInner = dynamic(
  () => import('./KnowledgeGrowthChartInner'),
  { ssr: false, loading: () => <div className="h-[220px] animate-pulse bg-muted rounded-lg" /> }
);

export default function KnowledgeGrowthChart() {
  return (
    <div className="synq-card p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[13px] font-semibold text-foreground">Knowledge Growth</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Items documented over the last 7 months</p>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary" />ADRs</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-accent" />Docs</span>
          <span className="flex items-center gap-1.5 text-muted-foreground"><span className="w-2 h-2 rounded-full bg-orange-400" />Incidents</span>
        </div>
      </div>
      <KnowledgeGrowthChartInner data={knowledgeGrowthData} />
    </div>
  );
}
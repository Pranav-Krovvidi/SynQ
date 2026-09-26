'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface DataPoint {
  month: string;
  services: number;
  adrs: number;
  incidents: number;
  docs: number;
}

interface Props {
  data: DataPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="synq-card p-3 shadow-elevated text-[12px] min-w-[140px]">
      <p className="font-semibold text-foreground mb-2">{label} 2026</p>
      {payload.map((entry: any) => (
        <div key={`tip-${entry.name}`} className="flex items-center justify-between gap-4 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: entry.color }} />
            <span className="text-muted-foreground capitalize">{entry.name}</span>
          </div>
          <span className="font-mono font-medium tabular-nums text-foreground">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function KnowledgeGrowthChartInner({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="grad-adrs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-docs" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.2} />
            <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="grad-incidents" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="adrs"
          stroke="var(--primary)"
          strokeWidth={1.5}
          fill="url(#grad-adrs)"
        />
        <Area
          type="monotone"
          dataKey="docs"
          stroke="var(--accent)"
          strokeWidth={1.5}
          fill="url(#grad-docs)"
        />
        <Area
          type="monotone"
          dataKey="incidents"
          stroke="#f97316"
          strokeWidth={1.5}
          fill="url(#grad-incidents)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
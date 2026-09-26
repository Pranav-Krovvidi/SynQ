import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MetricCardProps {
  label: string;
  value: number | string;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  accent?: 'teal' | 'blue' | 'red' | 'amber' | 'purple';
  size?: 'sm' | 'md' | 'lg';
  alert?: boolean;
  subValue?: string;
}

const accentConfig = {
  teal: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueBorder: 'border-primary/20',
  },
  blue: {
    iconBg: 'bg-accent/10',
    iconColor: 'text-accent',
    valueBorder: 'border-accent/20',
  },
  red: {
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-400',
    valueBorder: 'border-red-500/20',
  },
  amber: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-400',
    valueBorder: 'border-amber-500/20',
  },
  purple: {
    iconBg: 'bg-purple-500/10',
    iconColor: 'text-purple-400',
    valueBorder: 'border-purple-500/20',
  },
};

export default function MetricCard({
  label,
  value,
  change,
  changeLabel,
  icon,
  accent = 'teal',
  size = 'md',
  alert = false,
  subValue,
}: MetricCardProps) {
  const config = accentConfig[accent];

  const TrendIcon = change === undefined ? null
    : change > 0 ? TrendingUp
    : change < 0 ? TrendingDown
    : Minus;

  const trendColor = change === undefined ? ''
    : alert
      ? (change > 0 ? 'text-red-400' : 'text-green-400')
      : (change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-muted-foreground');

  return (
    <div className={`
      synq-card p-4 flex flex-col gap-3 transition-all duration-200 hover:border-primary/20
      ${alert ? 'border-red-500/30 bg-red-500/5' : ''}
    `}>
      <div className="flex items-start justify-between">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-muted-foreground">
          {label}
        </p>
        {icon && (
          <div className={`w-7 h-7 rounded-md flex items-center justify-center ${config.iconBg} ${config.iconColor}`}>
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <span className={`tabular-nums font-bold leading-none ${
          size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-3xl' : 'text-2xl'
        } ${alert ? 'text-red-400' : 'text-foreground'}`}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {subValue && (
          <span className="text-[11px] text-muted-foreground mb-1">{subValue}</span>
        )}
      </div>

      {(change !== undefined || changeLabel) && (
        <div className="flex items-center gap-1.5">
          {TrendIcon && change !== undefined && (
            <TrendIcon size={12} className={trendColor} />
          )}
          {change !== undefined && (
            <span className={`text-[11px] font-medium tabular-nums ${trendColor}`}>
              {change > 0 ? '+' : ''}{change}
            </span>
          )}
          {changeLabel && (
            <span className="text-[11px] text-muted-foreground">{changeLabel}</span>
          )}
        </div>
      )}
    </div>
  );
}
'use client';

import React from 'react';
import { GitBranch, Server, ArrowRight } from 'lucide-react';
import type { Person } from '@/lib/mockData';

interface Props {
  person: Person;
  query: string;
}

const avatarColors = [
  'from-primary to-accent',
  'from-purple-500 to-accent',
  'from-accent to-primary',
  'from-orange-400 to-red-500',
  'from-green-400 to-primary',
  'from-pink-500 to-purple-500',
];

function highlight(text: string, query: string): React.ReactNode {
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-purple-500/20 text-purple-300 rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function PersonResultCard({ person, query }: Props) {
  const colorIdx = person.id.charCodeAt(person.id.length - 1) % avatarColors.length;

  return (
    <div className="synq-card p-4 card-hover cursor-pointer group">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center text-[12px] font-bold text-background flex-shrink-0`}>
          {person.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground">
            {highlight(person.name, query)}
          </p>
          <p className="text-[11px] text-muted-foreground truncate">
            {highlight(person.role, query)}
          </p>
          <span className="text-[10px] font-mono text-muted-foreground/60">{person.team}</span>
        </div>
        <ArrowRight size={12} className="text-muted-foreground group-hover:text-purple-400 transition-colors flex-shrink-0 mt-1" />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {person.expertise.slice(0, 3).map((exp) => (
          <span key={`exp-${person.id}-${exp}`} className="tech-tag">
            {exp}
          </span>
        ))}
        {person.expertise.length > 3 && (
          <span className="text-[10px] text-muted-foreground self-center">+{person.expertise.length - 3}</span>
        )}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-3 border-t border-border/50">
        <span className="flex items-center gap-1">
          <Server size={10} />
          <span className="tabular-nums">{person.servicesOwned}</span> services
        </span>
        <span className="flex items-center gap-1">
          <GitBranch size={10} />
          <span className="tabular-nums">{person.adrsAuthored}</span> ADRs
        </span>
      </div>
    </div>
  );
}

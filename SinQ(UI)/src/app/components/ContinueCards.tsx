'use client';

import React from 'react';
import { Server, ArrowRight, Clock, User, GitBranch, Layers } from 'lucide-react';
import { continueCards } from '@/lib/mockData';

const completenessColor = (pct: number) => {
  if (pct >= 80) return 'text-green-400';
  if (pct >= 50) return 'text-amber-400';
  return 'text-red-400';
};

const completenessBarColor = (pct: number) => {
  if (pct >= 80) return 'bg-green-400';
  if (pct >= 50) return 'bg-amber-400';
  return 'bg-red-400';
};

export default function ContinueCards() {
  return (
    <div className="synq-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[13px] font-semibold text-foreground">Continue where you left off</h2>
        <button className="text-[11px] text-muted-foreground hover:text-primary transition-colors">
          View history
        </button>
      </div>
      <div className="space-y-2.5">
        {continueCards.map((card) => (
          <div
            key={card.id}
            className="p-3.5 rounded-lg bg-background border border-border hover:border-primary/30 hover:bg-primary/3 transition-all duration-150 cursor-pointer group"
          >
            {/* Top row: icon + title + arrow */}
            <div className="flex items-start gap-3 mb-2.5">
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary mt-0.5">
                <Server size={14} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-foreground truncate">{card.title}</p>
                  <ArrowRight size={13} className="text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{card.subtitle}</p>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mb-2.5 flex-wrap">
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <User size={10} className="flex-shrink-0" />
                <span>{card.owner}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Layers size={10} className="flex-shrink-0" />
                <span>{card.technology.join(' · ')}</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
                <Clock size={10} className="flex-shrink-0" />
                <span>Updated {card.lastUpdated}</span>
              </div>
            </div>

            {/* Bottom row: completeness + dependencies */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">Knowledge completeness</span>
                  <span className={`text-[11px] font-semibold tabular-nums ${completenessColor(card.completeness)}`}>
                    {card.completeness}%
                  </span>
                </div>
                <div className="h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${completenessBarColor(card.completeness)}`}
                    style={{ width: `${card.completeness}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0 border border-border rounded px-1.5 py-0.5">
                <GitBranch size={9} />
                <span>{card.dependencies} deps</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground flex-shrink-0">
                <Clock size={9} />
                <span>{card.lastVisited}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
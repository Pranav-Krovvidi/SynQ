'use client';

import React from 'react';
import { CheckCircle2, Circle, Lock, ArrowRight } from 'lucide-react';
import { onboardingSteps } from '@/lib/mockData';

const PROGRESS = 68;
const TOTAL = onboardingSteps.length;
const COMPLETED = onboardingSteps.filter((s) => s.completed).length;

export default function OnboardingProgress() {
  return (
    <div className="synq-card p-4 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-[13px] font-semibold text-foreground">Your Onboarding</h2>
          <p className="text-[11px] text-muted-foreground mt-0.5">Backend Engineering — Payments</p>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-[26px] font-bold tabular-nums leading-none" style={{ color: 'var(--color-primary)' }}>
            {PROGRESS}%
          </span>
          <p className="text-[10px] text-muted-foreground mt-0.5">complete</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full progress-bar-fill transition-all duration-700"
          style={{ width: `${PROGRESS}%` }}
        />
      </div>

      {/* Steps */}
      <div className="space-y-0.5 flex-1 overflow-hidden">
        {onboardingSteps.slice(0, 8).map((step) => {
          const isCurrent = (step as any).current;
          return (
            <div
              key={step.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-all duration-150 ${
                isCurrent
                  ? 'bg-accent/8 border border-accent/20'
                  : step.completed
                  ? 'opacity-55'
                  : step.locked
                  ? 'opacity-25' :'hover:bg-muted/50 cursor-pointer'
              }`}
            >
              {step.completed ? (
                <CheckCircle2 size={13} className="text-primary flex-shrink-0" />
              ) : step.locked ? (
                <Lock size={11} className="text-muted-foreground flex-shrink-0" />
              ) : isCurrent ? (
                <ArrowRight size={13} className="text-accent flex-shrink-0" />
              ) : (
                <Circle size={13} className="text-muted-foreground/40 flex-shrink-0" />
              )}
              <span className={`text-[11.5px] flex-1 leading-snug ${
                isCurrent ? 'text-foreground font-medium' : step.completed ? 'text-foreground/70' : 'text-foreground/80'
              }`}>
                {step.title}
              </span>
              {isCurrent && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-accent/15 text-accent border border-accent/25 flex-shrink-0">
                  NOW
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          <span className="text-foreground font-medium">{COMPLETED}</span> of <span className="text-foreground font-medium">{TOTAL}</span> steps · <span className="text-primary font-medium">{TOTAL - COMPLETED} remaining</span>
        </p>
        <button className="text-[11px] text-primary hover:text-primary/80 transition-colors flex items-center gap-1">
          Continue <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}
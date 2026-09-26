'use client';

import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardMetrics from './components/DashboardMetrics';
import ContinueCards from './components/ContinueCards';
import KnowledgeGrowthChart from './components/KnowledgeGrowthChart';
import RecentActivity from './components/RecentActivity';
import OnboardingProgress from './components/OnboardingProgress';
import AskSynQInput from './components/AskSynQInput';
import { useAuth } from '@/lib/auth';

export default function DashboardPage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <AppLayout>
      <div className="max-w-screen-2xl mx-auto px-6 py-6 xl:px-8 2xl:px-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-[22px] font-bold text-foreground tracking-tight">{greeting}, {firstName}</h1>
            <p className="text-[13px] text-muted-foreground mt-0.5">
              Here&apos;s what&apos;s changed in your company&apos;s technical memory
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Knowledge synced
            </span>
          </div>
        </div>

        {/* Active incident alert */}
        <div className="mb-5 flex items-center gap-3 px-4 py-3 rounded-lg bg-red-500/8 border border-red-500/25 text-[13px]">
          <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
          <span className="text-red-300 font-medium">Active incident:</span>
          <span className="text-foreground/80">INC-134 — Analytics Pipeline Kafka rebalance storm · 2h 30m ongoing</span>
          <span className="ml-auto text-muted-foreground hover:text-foreground cursor-pointer text-[12px]">View →</span>
        </div>

        {/* Metrics */}
        <DashboardMetrics />

        {/* Middle row: Continue + Onboarding */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5 mt-5">
          <div className="lg:col-span-2">
            <ContinueCards />
          </div>
          <div className="lg:col-span-1">
            <OnboardingProgress />
          </div>
        </div>

        {/* Bottom row: Chart + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3 gap-5 mt-5">
          <div className="lg:col-span-2">
            <KnowledgeGrowthChart />
          </div>
          <div className="lg:col-span-1">
            <RecentActivity />
          </div>
        </div>

        {/* Ask SynQ */}
        <div className="mt-5">
          <AskSynQInput />
        </div>
      </div>
    </AppLayout>
  );
}

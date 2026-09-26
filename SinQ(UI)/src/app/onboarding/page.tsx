'use client'

import React, { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { onboardingSteps, OnboardingStep } from '@/lib/mockData'
import { useAuth } from '@/lib/auth'
import { UserPlus, CheckCircle2, Circle, Lock, Clock, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'

function StepRow({ step, onToggle }: { step: OnboardingStep; onToggle: (id: string) => void }) {
  return (
    <div className={`border rounded-md p-4 transition-all duration-150 ${
      step.completed
        ? 'border-primary/25 bg-primary/5 onboarding-step-complete'
        : step.current
          ? 'border-blue-500/40 bg-blue-500/8 onboarding-step-active'
          : step.locked
            ? 'border-border bg-secondary/40 opacity-60'
            : 'border-border bg-secondary hover:border-primary/20'
    }`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => !step.locked && onToggle(step.id)}
          disabled={step.locked}
          className="flex-shrink-0"
        >
          {step.completed ? (
            <CheckCircle2 size={18} className="text-primary" />
          ) : step.locked ? (
            <Lock size={16} className="text-muted-foreground/40" />
          ) : (
            <Circle size={18} className={step.current ? 'text-blue-400' : 'text-muted-foreground/40'} />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`text-[13px] font-semibold ${step.completed ? 'text-muted-foreground line-through' : step.current ? 'text-blue-300' : 'text-foreground'}`}>
              {step.title}
            </h3>
            {step.current && (
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">Current</span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{step.description}</p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock size={10} />
            {step.estimatedTime}
          </span>
          {!step.locked && !step.completed && (
            <ChevronRight size={14} className="text-muted-foreground/40" />
          )}
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const { user } = useAuth()
  const [steps, setSteps] = useState(onboardingSteps)

  const completed = steps.filter((s) => s.completed).length
  const total = steps.length
  const progress = Math.round((completed / total) * 100)

  const toggle = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => s.id === id ? { ...s, completed: !s.completed, current: s.completed ? false : s.current } : s)
    )
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground mb-1">Onboarding Plan</h1>
          <p className="text-[13px] text-muted-foreground">
            {user?.name ?? 'Developer'} · Payments Engineering · NovaPay Platform
          </p>
        </div>

        {/* Progress */}
        <div className="border border-border bg-secondary rounded-md p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[13px] font-semibold text-foreground">{completed} of {total} steps complete</span>
            <span className="text-[13px] font-mono text-primary">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full progress-bar-fill rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          {progress >= 40 && progress < 100 && (
            <p className="text-[11px] text-muted-foreground mt-2">
              Good progress! You're ready to start reviewing Payment Service incidents.
            </p>
          )}
        </div>

        {/* Ask SynQ shortcut */}
        <Link
          href="/ask-syn-q-ai-chat"
          className="flex items-center gap-3 border border-primary/25 bg-primary/5 rounded-md px-4 py-3 mb-5 hover:border-primary/40 transition-colors"
        >
          <Sparkles size={15} className="text-primary flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[13px] font-medium text-foreground">Ask SynQ about your onboarding</p>
            <p className="text-[11px] text-muted-foreground">Get AI-guided explanations for any step in your plan</p>
          </div>
          <ChevronRight size={14} className="text-muted-foreground/40" />
        </Link>

        {/* Steps */}
        <div className="space-y-2.5">
          {steps.map((step) => (
            <StepRow key={step.id} step={step} onToggle={toggle} />
          ))}
        </div>
      </div>
    </AppLayout>
  )
}

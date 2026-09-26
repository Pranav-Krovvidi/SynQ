'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowRight, ChevronRight } from 'lucide-react';

const suggestions = [
  'Why was Kafka chosen for payments?',
  'Who owns the Payment Service?',
  'What should I know before changing authentication?',
  'Show me incidents related to payments.',
];

export default function AskSynQInput() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSubmit = () => {
    if (query.trim()) {
      router.push('/ask-syn-q-ai-chat');
    }
  };

  const handleSuggestion = (s: string) => {
    setQuery(s);
    router.push('/ask-syn-q-ai-chat');
  };

  return (
    <div className="synq-card p-5 border-primary/20" style={{ background: 'linear-gradient(135deg, rgba(var(--color-primary-rgb, 20 184 166), 0.06) 0%, rgba(var(--color-accent-rgb, 59 130 246), 0.04) 100%)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center flex-shrink-0">
          <Sparkles size={14} className="text-primary" />
        </div>
        <div>
          <h2 className="text-[15px] font-semibold text-foreground leading-tight">Ask SynQ</h2>
          <p className="text-[11px] text-muted-foreground">Ask anything about your company's systems...</p>
        </div>
        <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 flex-shrink-0">
          AI-powered
        </span>
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3 mb-3">
        <div className="relative flex-1">
          <Sparkles size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/50 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask anything about your company's systems..."
            className="synq-input w-full pl-9 pr-4 py-2.5 text-[13px]"
          />
        </div>
        <button
          onClick={handleSubmit}
          className="btn-primary flex items-center gap-2 px-4 flex-shrink-0 text-[13px]"
        >
          <ArrowRight size={14} />
          Ask SynQ
        </button>
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-[11px] text-muted-foreground mr-1">Try asking:</span>
        {suggestions.map((s) => (
          <button
            key={`sug-${s.slice(0, 20)}`}
            onClick={() => handleSuggestion(s)}
            className="flex items-center gap-1 text-[11.5px] px-3 py-1.5 rounded-md bg-muted/50 text-foreground/70 border border-border hover:border-primary/40 hover:text-foreground hover:bg-primary/5 transition-all duration-150 group"
          >
            <ChevronRight size={10} className="text-primary/60 group-hover:text-primary transition-colors flex-shrink-0" />
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
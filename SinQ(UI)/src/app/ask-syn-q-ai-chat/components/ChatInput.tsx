'use client';

import React, { useRef, useEffect } from 'react';
import { Sparkles, ArrowUp, Square } from 'lucide-react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  onSend: (text: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
}

export default function ChatInput({ value, onChange, onSend, onStop, disabled, streaming }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !disabled && !streaming) {
        onSend(value);
      }
    }
  };

  const canSend = value.trim() && !disabled && !streaming;

  return (
    <div className={`flex items-end gap-2 p-3 rounded-xl border transition-all duration-150 ${
      disabled ? 'border-border bg-input/50' : 'border-border bg-input focus-within:border-primary/40'
    }`}>
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={streaming ? 'SynQ is thinking...' : 'Ask about any service, decision, incident, or person in your company...'}
          disabled={disabled}
          rows={1}
          className="w-full bg-transparent text-[13px] text-foreground resize-none outline-none placeholder:text-muted-foreground/60 leading-relaxed py-0.5"
          style={{ minHeight: '22px', maxHeight: '160px' }}
        />
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 mb-0.5">
        <span className="text-[10px] text-muted-foreground/50 font-mono hidden sm:block">
          {streaming ? 'streaming...' : '⏎ Send'}
        </span>
        {streaming ? (
          <button
            onClick={onStop}
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-all duration-150"
            title="Stop generation"
          >
            <Square size={11} />
          </button>
        ) : (
          <button
            onClick={() => { if (canSend) { onSend(value); } }}
            disabled={!canSend}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 ${
              canSend
                ? 'bg-primary text-background hover:bg-primary/90 active:scale-95'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            }`}
          >
            <ArrowUp size={13} />
          </button>
        )}
      </div>
    </div>
  );
}

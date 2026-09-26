'use client';

import React, { useState } from 'react';
import { Sparkles, User, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import type { ChatMessage, ChatSource } from '@/lib/mockData';

interface Props {
  message: ChatMessage;
  onSourceClick: (source: ChatSource) => void;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    // Bold
    const parts = line.split(/\*\*(.*?)\*\*/g);
    const rendered = parts.map((part, j) =>
      j % 2 === 1
        ? <strong key={`bold-${i}-${j}`} className="font-semibold text-foreground">{part}</strong>
        : <React.Fragment key={`text-${i}-${j}`}>{part}</React.Fragment>
    );

    if (line.startsWith('**') && line.endsWith('**') && parts.length === 3) {
      return <p key={`line-${i}`} className="font-semibold text-foreground mt-3 mb-1">{parts[1]}</p>;
    }

    if (line.startsWith('- ') || line.match(/^\d+\./)) {
      return (
        <li key={`li-${i}`} className="ml-4 mb-1">
          {rendered}
        </li>
      );
    }

    if (line === '') return <br key={`br-${i}`} />;

    return <p key={`p-${i}`} className="mb-1 leading-relaxed">{rendered}</p>;
  });
}

const sourceTypeConfig = {
  adr: { label: 'ADR', className: 'bg-accent/10 text-accent border-accent/25' },
  incident: { label: 'Incident', className: 'bg-red-500/10 text-red-400 border-red-500/25' },
  slack: { label: 'Slack', className: 'bg-purple-500/10 text-purple-400 border-purple-500/25' },
  document: { label: 'Doc', className: 'bg-amber-500/10 text-amber-400 border-amber-500/25' },
  service: { label: 'Service', className: 'bg-primary/10 text-primary border-primary/25' },
};

export default function ChatMessageBubble({ message, onSourceClick }: Props) {
  const [sourcesExpanded, setSourcesExpanded] = useState(true);
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
        isUser
          ? 'bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/25' :'bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/25'
      }`}>
        {isUser
          ? <User size={13} className="text-accent" />
          : <Sparkles size={13} className="text-primary" />
        }
      </div>

      <div className={`flex flex-col gap-2 max-w-[680px] ${isUser ? 'items-end' : 'items-start'}`}>
        {/* Timestamp + role */}
        <div className={`flex items-center gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
          <span className="text-[11px] font-medium text-foreground/70">
            {isUser ? 'You' : 'SynQ'}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">{message.timestamp}</span>
        </div>

        {/* Message bubble */}
        <div className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
          isUser ? 'chat-user-bubble text-foreground/90' : 'chat-ai-bubble text-foreground/90'
        }`}>
          {isUser
            ? <p>{message.content}</p>
            : <div className="space-y-0.5">{renderMarkdown(message.content)}</div>
          }
        </div>

        {/* Sources */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="w-full">
            <button
              onClick={() => setSourcesExpanded(!sourcesExpanded)}
              className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                <Sparkles size={9} />
                <span className="font-medium">Grounded in {message.sources.length} company sources</span>
              </div>
              {sourcesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>

            {sourcesExpanded && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {message.sources.map((source) => {
                  const config = sourceTypeConfig[source.type];
                  return (
                    <button
                      key={source.id}
                      onClick={() => onSourceClick(source)}
                      className="source-card-hover text-left synq-card p-3 rounded-lg"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${config.className}`}>
                          {config.label}
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{source.confidence}%</span>
                          <div className="w-1 h-1 rounded-full bg-green-400" />
                        </div>
                      </div>
                      <p className="text-[12px] font-semibold text-foreground leading-tight mb-1">{source.title}</p>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">{source.subtitle}</p>
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-muted-foreground/60">
                        <ExternalLink size={9} />
                        <span>View source</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
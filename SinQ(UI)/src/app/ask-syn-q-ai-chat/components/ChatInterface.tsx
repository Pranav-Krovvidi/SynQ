'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { mockChatHistory, followUpSuggestions } from '@/lib/mockData';
import { useProjectCatalog } from '@/lib/useLiveCatalog';
import type { CatalogAdr, CatalogIncident, CatalogService } from '@/lib/api';
import type { ChatMessage, ChatSource } from '@/lib/mockData';
import { streamChat, type SSEEvent } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import ChatMessageBubble from './ChatMessageBubble';
import SourcePanel from './SourcePanel';
import ChatInput from './ChatInput';
import { Sparkles, Info, Shield, ChevronRight, WifiOff } from 'lucide-react';
import { mockServices, mockADRs, mockIncidents } from '@/lib/mockData';

// ── Demo project ID (matches seed_demo.py NovaPay Platform) ──────────────────
// In production this would come from auth context. For the demo we use proj-001.
const DEMO_PROJECT_ID = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID ?? ''

function useBackendAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1'
    fetch(`${base.replace(/\/api\/v1$/, '')}/healthz`, { method: 'GET' })
      .then((r) => setAvailable(r.ok))
      .catch(() => setAvailable(false))
  }, [])
  return available
}

export default function ChatInterface() {
  const router = useRouter();
  const { currentProject } = useAuth();
  // The chat used to query NEXT_PUBLIC_DEMO_PROJECT_ID regardless of the
  // selected project, so questions about one project were answered from
  // another. The env value is now only a fallback.
  const projectId = currentProject?.id ?? DEMO_PROJECT_ID;
  const backendAvailable = useBackendAvailable();

  const [messages, setMessages] = useState<ChatMessage[]>(mockChatHistory)
  const [selectedSource, setSelectedSource] = useState<ChatSource | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [inputValue, setInputValue] = useState('')
  const [sourcePanelOpen, setSourcePanelOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Read pre-filled query from URL (?q=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const q = params.get('q')
    if (q) setInputValue(q)
  }, [])

  // Prompts are built from this project's real ADRs and services. The bundled
  // list named entities (INC-127, ADR-042) that exist only in the fixtures, so
  // every one of them came back "not enough evidence".
  const { data: liveAdrs } = useProjectCatalog<CatalogAdr>('/catalog/adrs');
  const { data: liveServices } = useProjectCatalog<CatalogService>('/catalog/services');
  const { data: liveIncidents } = useProjectCatalog<CatalogIncident>('/catalog/incidents');

  const suggestions = useMemo(() => {
    const out: string[] = [];
    liveAdrs.slice(0, 2).forEach((adr) => {
      const subject = adr.title.replace(/^ADR-\d+\s*[—-]\s*/, '');
      out.push(`Why did we decide: ${subject}?`);
    });
    liveServices.slice(0, 1).forEach((service) => {
      out.push(`What should I know before modifying ${service.name}?`);
    });
    if (liveAdrs.length > 0) out.push('How many ADRs has Alex Morgan written?');
    return out.length > 0 ? out : followUpSuggestions;
  }, [liveAdrs, liveServices]);

  const buildHistory = useCallback(
    (msgs: ChatMessage[]) =>
      msgs
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }))
        .slice(-20),
    []
  );

  const handleSend = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return
    setError(null)

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
    }

    const next = [...messages, userMsg]
    setMessages(next)

      // ── Real backend path ───────────────────────────────────────────────
      if (backendAvailable && projectId) {
        setIsStreaming(true);
        setStreamingText('');

        let accumulated = ''
        let citations: ChatSource[] = []

        abortRef.current = streamChat(
          projectId,
          text,
          buildHistory(messages),
          (evt: SSEEvent) => {
            if (evt.event === 'token') {
              let delta = evt.data
              try {
                const payload = JSON.parse(evt.data) as { delta?: string }
                delta = payload.delta ?? evt.data
              } catch { /* accept plain-text token events too */ }
              accumulated += delta
              setStreamingText(accumulated)
            } else if (evt.event === 'citations') {
              try {
                const payload = JSON.parse(evt.data) as { citations?: Array<{
                  entity_type: string; entity_id: string; entity_title: string; snippet: string
                }> } | Array<{
                  entity_type: string; entity_id: string; entity_title: string; snippet: string
                }>
                const raw = Array.isArray(payload) ? payload : payload.citations ?? []
                citations = raw.map((c, i) => ({
                  id: `cit-${i}`,
                  type: (c.entity_type === 'adr' ? 'adr'
                    : c.entity_type === 'incident' ? 'incident'
                    : 'document') as ChatSource['type'],
                  title: c.entity_title,
                  subtitle: c.entity_id,
                  date: '',
                  excerpt: c.snippet,
                  confidence: 90 - i * 5,
                }))
              } catch { /* ignore parse errors */ }
            }
          },
          () => {
            // done
            const aiMsg: ChatMessage = {
              id: `msg-ai-${Date.now()}`,
              role: 'assistant',
              content: accumulated,
              sources: citations.length > 0 ? citations : undefined,
              timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
            }
            setMessages((prev) => [...prev, aiMsg])
            setStreamingText('')
            setIsStreaming(false)
          },
          (err) => {
            setError(err)
            setIsStreaming(false)
            setStreamingText('')
          },
        )
      } else {
        // ── Mock fallback (no backend / no project ID) ────────────────────────
        setIsStreaming(true)
        setTimeout(() => {
          const aiMsg: ChatMessage = {
            id: `msg-ai-${Date.now()}`,
            role: 'assistant',
            content: `**SynQ demo mode** — backend not connected.\n\nYour question about **"${text}"** would be answered by searching ${mockServices.length} services, ${mockADRs.length} ADRs, and ${mockIncidents.length} incidents in your NovaPay knowledge base.\n\nConnect the backend and add \`NEXT_PUBLIC_API_BASE_URL\` + \`NEXT_PUBLIC_DEMO_PROJECT_ID\` to your environment to enable live AI responses.`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }),
          }
          setMessages((p) => [...p, aiMsg])
          setIsStreaming(false)
        }, 900)
      }
    
  }, [isStreaming, backendAvailable, buildHistory, messages, projectId]);

  const handleStop = () => {
    abortRef.current?.abort()
    setIsStreaming(false)
    setStreamingText('')
  }

  const handleSourceClick = (source: ChatSource) => {
    setSelectedSource(source);
    setSourcePanelOpen(true);
  };

  const handleOpenSource = (source: ChatSource) => {
    setSourcePanelOpen(false);
    const query = encodeURIComponent(source.title);
    if (source.type === 'adr') router.push(`/architecture-decisions?q=${query}`);
    else if (source.type === 'incident') router.push(`/incidents?incident=${encodeURIComponent(source.subtitle || source.title)}`);
    else if (source.type === 'service') router.push(`/services?q=${query}`);
    else router.push(`/knowledge-explorer?q=${query}`);
  };

  return (
    <div className="flex h-full max-w-screen-2xl mx-auto">
      {/* Main chat area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Chat header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/25 flex items-center justify-center">
              <Sparkles size={15} className="text-primary" />
            </div>
            <div>
              <h1 className="text-[14px] font-semibold text-foreground">Ask SynQ</h1>
              <p className="text-[11px] text-muted-foreground">Grounded in your company's technical memory</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {backendAvailable === false && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 px-2 py-1 rounded-md border border-amber-500/25 bg-amber-500/8">
                <WifiOff size={11} />
                Demo mode
              </div>
            )}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-3 py-1.5 rounded-md border border-border bg-card">
              <Shield size={11} className="text-primary" />
              Evidence-based · No hallucinations
            </div>
            <button
              onClick={() => setSourcePanelOpen(!sourcePanelOpen)}
              className="btn-secondary text-[12px] px-3 py-1.5 flex items-center gap-1.5"
            >
              <Info size={12} />
              Sources
            </button>
          </div>
        </div>

        {/* Context banner */}
        <div className="mx-6 mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/15 text-[12px] text-muted-foreground flex-shrink-0">
          <Sparkles size={11} className="text-primary flex-shrink-0" />
          <span>
            SynQ has access to{' '}
            <span className="text-foreground font-medium">{liveServices.length} services</span>,{' '}
            <span className="text-foreground font-medium">{liveAdrs.length} ADRs</span>,{' '}
            <span className="text-foreground font-medium">{liveIncidents.length} incidents</span>
            {currentProject && (
              <span>
                {' '}
                for <span className="text-foreground font-medium">{currentProject.name}</span>
              </span>
            )}
            .
          </span>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/25 text-[12px] text-red-400 flex-shrink-0">
            <span className="flex-1">Error: {error}</span>
            <button onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground">✕</button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} onSourceClick={handleSourceClick} />
          ))}

          {/* Streaming bubble */}
          {isStreaming && (
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Sparkles size={13} className="text-primary animate-pulse" />
              </div>
              <div className="chat-ai-bubble rounded-xl px-4 py-3 max-w-2xl">
                {streamingText ? (
                  <p className="text-[13px] text-foreground/90 leading-relaxed whitespace-pre-wrap">{streamingText}<span className="inline-block w-0.5 h-3.5 bg-primary ml-0.5 animate-pulse" /></p>
                ) : (
                  <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-1">Searching knowledge base...</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Follow-up suggestions */}
        {!isStreaming && (
          <div className="px-6 pb-3 flex-shrink-0">
            <div className="flex flex-wrap gap-2 mb-3">
              {suggestions.map((s) => (
                <button
                  key={`followup-${s.slice(0, 20)}`}
                  onClick={() => handleSend(s)}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
                >
                  <ChevronRight size={11} />
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="px-6 pb-5 flex-shrink-0">
          <ChatInput
            value={inputValue}
            onChange={setInputValue}
            onSend={(t) => { handleSend(t); setInputValue('') }}
            onStop={isStreaming ? handleStop : undefined}
            disabled={false}
            streaming={isStreaming}
          />
          <p className="text-[10px] text-muted-foreground/60 text-center mt-2">
            SynQ answers are grounded in documented company knowledge. Always verify critical decisions with service owners.
          </p>
        </div>
      </div>

      {/* Source panel */}
      {sourcePanelOpen && (
        <SourcePanel
          sources={
            messages.filter(m => m.role === 'assistant' && m.sources).flatMap(m => m.sources ?? [])
              .filter((s, i, a) => a.findIndex(x => x.id === s.id) === i)
              .slice(0, 6)
          }
          selectedSource={selectedSource}
          onSourceSelect={setSelectedSource}
          onOpenSource={handleOpenSource}
          onClose={() => setSourcePanelOpen(false)}
        />
      )}
    </div>
  )
}

'use client'
/**
 * AI Chat page
 *
 * - Connected to real backend SSE via chatStream() / bycStream()
 * - Uses NEXT_PUBLIC_API_BASE_URL (falls back to /api/v1 proxy in dev)
 * - Shows "demo mode" banner when backend env vars are not set
 * - Supports Before You Change mode when ?service=<id>&name=<name> is in URL
 * - Streaming cursor while tokens arrive; citations expand after done
 * - Conversation history sent with every request (capped at 10 turns)
 */
import { useState, useRef, useEffect, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { chatStream, bycStream } from '@/lib/api'
import { Send, Loader2, BookOpen, MessageSquare, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import type { ChatMessage, Citation } from '@/types'
import { clsx } from 'clsx'

// ── Demo mode (no backend) ────────────────────────────────────────────────
const DEMO_MODE = !process.env.NEXT_PUBLIC_API_BASE_URL

const DEMO_RESPONSES: Record<string, string> = {
  default: "I'm running in demo mode — no backend is connected.\n\nTo enable live AI responses, add `NEXT_PUBLIC_API_BASE_URL` and `NEXT_PUBLIC_DEMO_PROJECT_ID` to your environment variables.",
  'alex morgan': "Alex Morgan has written **3 ADRs** in the NovaPay project:\n1. [SOURCE 1] ADR-001 — Use PostgreSQL for all persistence\n2. [SOURCE 2] ADR-004 — Idempotency Keys for Payment Deduplication\n3. [SOURCE 3] ADR-007 — Rate Limiting Strategy for the API Gateway\n\nTo get live answers, connect the backend.",
  'how many adr': "In demo mode, I can see the NovaPay knowledge base has **8 ADRs** across 9 services and 7 incidents.\n\nFor live AI answers connect `NEXT_PUBLIC_API_BASE_URL`.",
}

function getDemoResponse(question: string): string {
  const q = question.toLowerCase()
  if (q.includes('alex morgan')) return DEMO_RESPONSES['alex morgan']
  if (q.includes('how many adr') || q.includes('adr')) return DEMO_RESPONSES['how many adr']
  return DEMO_RESPONSES.default
}

// ── Citation chip component ───────────────────────────────────────────────
function CitationChip({ citation, index }: { citation: Citation; index: number }) {
  const [open, setOpen] = useState(false)
  const typeColor =
    citation.entity_type === 'adr' ? 'bg-purple-50 text-purple-700 border-purple-200' :
    citation.entity_type === 'document' ? 'bg-blue-50 text-blue-700 border-blue-200' :
    'bg-gray-50 text-gray-600 border-gray-200'

  return (
    <div className={`border rounded-lg text-xs overflow-hidden ${typeColor}`}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-3 py-2 font-medium"
      >
        <span>[{index}] {citation.entity_type?.toUpperCase() ?? 'SOURCE'} — {citation.entity_title ?? 'Unknown'}</span>
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>
      {open && citation.snippet && (
        <div className="px-3 pb-2 text-gray-600 border-t border-current/10">
          <p className="mt-1 line-clamp-3">{citation.snippet}</p>
        </div>
      )}
    </div>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────
function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-brand-600 flex items-center justify-center shrink-0 mt-1">
          <MessageSquare className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      <div className={clsx('max-w-[80%] space-y-2', isUser && 'items-end')}>
        <div className={clsx(
          'rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-brand-600 text-white rounded-tr-sm'
            : 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm',
        )}>
          {msg.content}
          {msg.streaming && (
            <span className="inline-block w-1.5 h-4 bg-gray-400 ml-0.5 animate-pulse rounded-sm" />
          )}
        </div>

        {/* Citations */}
        {msg.citations && msg.citations.length > 0 && (
          <div className="space-y-1.5 ml-1">
            <p className="text-xs text-gray-400 font-medium">Sources</p>
            {msg.citations.map((c, i) => (
              <CitationChip key={i} citation={c} index={c.source_index} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function ChatPage() {
  const { currentProject } = useAuthStore()
  const searchParams = useSearchParams()
  const serviceId   = searchParams.get('service')
  const serviceName = searchParams.get('name')
  const isBYC       = !!serviceId

  const pid = currentProject?.id
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const bycFired  = useRef(false)

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── Parse SSE stream ──
  async function consumeSSE(response: Response, msgIndex: number) {
    const reader = response.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) return

    let buffer = ''
    let finalAnswer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      const parts = buffer.split('\n\n')
      buffer = parts.pop() ?? ''

      for (const part of parts) {
        const lines = part.trim().split('\n')
        let eventType = 'message'
        let data = ''
        for (const line of lines) {
          if (line.startsWith('event: ')) eventType = line.slice(7).trim()
          if (line.startsWith('data: '))  data = line.slice(6).trim()
        }
        if (!data) continue

        try {
          const payload = JSON.parse(data)

          if (eventType === 'token') {
            finalAnswer += payload.delta ?? ''
            setMessages((prev) => {
              const next = [...prev]
              next[msgIndex] = { ...next[msgIndex], content: finalAnswer, streaming: true }
              return next
            })
          }

          if (eventType === 'context' && payload.service_summary) {
            // BYC: render service header card as first assistant message
            const summary = payload.service_summary
            setMessages((prev) => {
              const next = [...prev]
              next[msgIndex] = {
                ...next[msgIndex],
                content: `**${summary.name}**${summary.description ? '\n' + summary.description : ''}`,
                streaming: true,
              }
              return next
            })
          }

          if (eventType === 'citations') {
            const cits: Citation[] = payload.citations ?? []
            setMessages((prev) => {
              const next = [...prev]
              next[msgIndex] = { ...next[msgIndex], citations: cits, streaming: true }
              return next
            })
          }

          if (eventType === 'done') {
            setMessages((prev) => {
              const next = [...prev]
              next[msgIndex] = { ...next[msgIndex], streaming: false }
              return next
            })
            setStreaming(false)
          }
        } catch { /* skip malformed */ }
      }
    }
    setStreaming(false)
  }

  // ── Send message ──
  const sendMessage = useCallback(async (question: string) => {
    if (!question.trim() || streaming) return

    const userMsg: ChatMessage = { role: 'user', content: question }
    const assistantMsg: ChatMessage = { role: 'assistant', content: '', streaming: true }

    setMessages((prev) => [...prev, userMsg, assistantMsg])
    const msgIndex = messages.length + 1 // index of the assistant message
    setInput('')
    setStreaming(true)

    // Demo mode — no backend
    if (DEMO_MODE || !pid) {
      await new Promise((r) => setTimeout(r, 600))
      const reply = getDemoResponse(question)
      setMessages((prev) => {
        const next = [...prev]
        next[msgIndex] = { ...next[msgIndex], content: reply, streaming: false }
        return next
      })
      setStreaming(false)
      return
    }

    try {
      const history = messages
        .filter((m) => !m.streaming)
        .slice(-20)
        .map(({ role, content }) => ({ role, content }))

      const resp = await chatStream(pid, question, history)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      await consumeSSE(resp, msgIndex)
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev]
        next[msgIndex] = {
          ...next[msgIndex],
          content: `Error: ${(err as Error).message}. Is the backend running?`,
          streaming: false,
        }
        return next
      })
      setStreaming(false)
    }
  }, [messages, streaming, pid])

  // ── BYC auto-trigger on mount ──
  useEffect(() => {
    if (!isBYC || bycFired.current || streaming || !pid) return
    bycFired.current = true

    if (DEMO_MODE) {
      const q = `Before you change ${serviceName ?? 'this service'}`
      sendMessage(q)
      return
    }

    const assistantMsg: ChatMessage = { role: 'assistant', content: '', streaming: true }
    setMessages([assistantMsg])
    setStreaming(true)

    bycStream(pid, serviceId!).then(async (resp) => {
      if (!resp.ok) {
        setMessages([{ role: 'assistant', content: `HTTP ${resp.status} — is the backend running?`, streaming: false }])
        setStreaming(false)
        return
      }
      await consumeSSE(resp, 0)
    }).catch((err) => {
      setMessages([{ role: 'assistant', content: `Error: ${(err as Error).message}`, streaming: false }])
      setStreaming(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBYC, pid])

  if (!currentProject && !DEMO_MODE) {
    return <div className="p-8 text-gray-400 text-center">Select a project first.</div>
  }

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]" style={{ height: '100vh' }}>
      {/* Header */}
      <div className="border-b border-gray-100 bg-white px-6 py-4 shrink-0">
        <div className="flex items-center gap-3">
          <MessageSquare className="w-5 h-5 text-brand-500" />
          <div>
            <h1 className="font-semibold text-gray-900">
              {isBYC ? `Before You Change: ${serviceName}` : 'AI Knowledge Assistant'}
            </h1>
            <p className="text-xs text-gray-400">
              {DEMO_MODE
                ? 'Demo mode — add NEXT_PUBLIC_API_BASE_URL to connect backend'
                : `${currentProject?.name ?? ''} · Powered by SynQ RAG`}
            </p>
          </div>
        </div>

        {DEMO_MODE && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800">
              <strong>SynQ demo mode — backend not connected.</strong><br />
              Add <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_API_BASE_URL</code> and{' '}
              <code className="bg-amber-100 px-1 rounded">NEXT_PUBLIC_DEMO_PROJECT_ID</code> to your environment
              to enable live AI responses.
            </p>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="text-center text-gray-400 pt-16 space-y-4">
            <MessageSquare className="w-12 h-12 mx-auto opacity-20" />
            <p className="font-medium">Ask anything about {currentProject?.name ?? 'your project'}</p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {[
                'How many ADRs has Alex Morgan written?',
                'What does the Payment Service depend on?',
                'What are the most critical past incidents?',
                'Which ADRs affect the Auth Service?',
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs bg-white border border-gray-200 rounded-full px-4 py-2
                             hover:border-brand-400 hover:text-brand-700 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <Bubble key={i} msg={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-6 py-4 shrink-0">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input) }}
          className="flex items-end gap-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="Ask a question… (Enter to send, Shift+Enter for newline)"
            rows={1}
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none
                       focus:outline-none focus:ring-2 focus:ring-brand-500 max-h-32"
            style={{ minHeight: '44px' }}
          />
          <button
            type="submit"
            disabled={streaming || !input.trim()}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed
                       text-white p-3 rounded-xl transition-colors shrink-0"
          >
            {streaming
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  )
}

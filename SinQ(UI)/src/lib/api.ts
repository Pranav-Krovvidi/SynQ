/**
 * SynQ backend API client.
 *
 * All requests go to NEXT_PUBLIC_API_BASE_URL (set at build time / runtime).
 * Falls back to http://localhost:8000/api/v1 for local dev.
 *
 * SSE streaming helper: streamChat / streamBeforeYouChange
 *   Yields parsed SSE events as they arrive.
 *   Event types: context | token | citations | done | error
 */

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1').replace(/\/$/, '')

// ── Auth token ────────────────────────────────────────────────────────────────
function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('synq_jwt')
    return raw ?? null
  } catch {
    return null
  }
}

function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ── REST helpers ──────────────────────────────────────────────────────────────
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${detail}`)
  }
  return res.json() as Promise<T>
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export interface TokenResponse { access_token: string; token_type: 'bearer' }
export interface MeResponse { id: string; email: string; full_name: string; role: string }

export async function apiLogin(email: string, password: string): Promise<TokenResponse> {
  const form = new URLSearchParams({ username: email, password })
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  })
  if (!res.ok) throw new Error('Invalid credentials')
  const data = await res.json() as TokenResponse
  if (typeof window !== 'undefined') localStorage.setItem('synq_jwt', data.access_token)
  return data
}

export function apiLogout() {
  if (typeof window !== 'undefined') localStorage.removeItem('synq_jwt')
}

// ── SSE event shape ───────────────────────────────────────────────────────────
export interface SSEEvent {
  event: 'context' | 'token' | 'citations' | 'done' | 'error'
  data: string
}

/**
 * Open an SSE stream to a POST endpoint.
 * Calls onEvent for each parsed SSE event, then calls onDone when the stream ends.
 * Returns an AbortController so the caller can cancel.
 */
export function openSSEStream(
  path: string,
  body: Record<string, unknown>,
  onEvent: (evt: SSEEvent) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  const ctrl = new AbortController()

  ;(async () => {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...authHeaders(),
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        onError(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`)
        return
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        // SSE messages are separated by double newline
        const parts = buf.split('\n\n')
        buf = parts.pop() ?? ''   // last incomplete chunk stays in buffer

        for (const part of parts) {
          if (!part.trim()) continue
          let event: SSEEvent['event'] = 'token'
          let data = ''
          for (const line of part.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim() as SSEEvent['event']
            else if (line.startsWith('data:')) data = line.slice(5).trim()
          }
          onEvent({ event, data })
          if (event === 'done') { onDone(); return }
          if (event === 'error') { onError(data); return }
        }
      }
      onDone()
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        onError((err as Error).message ?? 'Stream error')
      }
    }
  })()

  return ctrl
}

// ── Chat ──────────────────────────────────────────────────────────────────────
export function streamChat(
  projectId: string,
  question: string,
  history: Array<{ role: string; content: string }>,
  onEvent: (evt: SSEEvent) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  return openSSEStream(
    `/projects/${projectId}/chat`,
    { question, conversation_history: history },
    onEvent, onDone, onError,
  )
}

// ── Before You Change ─────────────────────────────────────────────────────────
export function streamBeforeYouChange(
  projectId: string,
  serviceId: string,
  onEvent: (evt: SSEEvent) => void,
  onDone: () => void,
  onError: (err: string) => void,
): AbortController {
  return openSSEStream(
    `/projects/${projectId}/before-you-change/${serviceId}`,
    { question: '', conversation_history: [] },
    onEvent, onDone, onError,
  )
}

import axios from 'axios'

// In prod NEXT_PUBLIC_API_BASE_URL is the full backend URL.
// In dev the Next.js rewrite proxies /api/v1/* → localhost:8000/api/v1/*
const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL
  ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`
  : '/api/v1')

export const api = axios.create({
  baseURL: BASE,
  headers: { 'Content-Type': 'application/json' },
})

// Inject token from localStorage on every request
api.interceptors.request.use((cfg) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('synq-auth')
    if (raw) {
      try {
        const { state } = JSON.parse(raw)
        if (state?.token) cfg.headers.Authorization = `Bearer ${state.token}`
      } catch { /* ignore */ }
    }
  }
  return cfg
})

// Auto-redirect on 401
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('synq-auth')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (email: string, password: string, full_name: string, role = 'viewer') =>
    api.post('/auth/register', { email, password, full_name, role }),
  me:       () => api.get('/auth/me'),
}

// ── Projects ──────────────────────────────────────────────────────────────
export const projectsApi = {
  list:   () => api.get('/projects'),
  get:    (id: string) => api.get(`/projects/${id}`),
  create: (name: string, description?: string) =>
    api.post('/projects', { name, description }),
  update: (id: string, data: { name?: string; description?: string }) =>
    api.patch(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
}

// ── Services ──────────────────────────────────────────────────────────────
export const servicesApi = {
  list:   (pid: string) => api.get(`/projects/${pid}/services`),
  get:    (pid: string, sid: string) => api.get(`/projects/${pid}/services/${sid}`),
  create: (pid: string, data: object) => api.post(`/projects/${pid}/services`, data),
  update: (pid: string, sid: string, data: object) =>
    api.patch(`/projects/${pid}/services/${sid}`, data),
  delete: (pid: string, sid: string) => api.delete(`/projects/${pid}/services/${sid}`),
}

// ── ADRs ──────────────────────────────────────────────────────────────────
export const adrsApi = {
  list:   (pid: string, status?: string) =>
    api.get(`/projects/${pid}/adrs`, { params: status ? { status } : {} }),
  get:    (pid: string, id: string) => api.get(`/projects/${pid}/adrs/${id}`),
  create: (pid: string, data: object) => api.post(`/projects/${pid}/adrs`, data),
  update: (pid: string, id: string, data: object) =>
    api.patch(`/projects/${pid}/adrs/${id}`, data),
  delete: (pid: string, id: string) => api.delete(`/projects/${pid}/adrs/${id}`),
}

// ── Documents ─────────────────────────────────────────────────────────────
export const documentsApi = {
  list:   (pid: string) => api.get(`/projects/${pid}/documents`),
  delete: (pid: string, id: string) => api.delete(`/projects/${pid}/documents/${id}`),
}

// ── Chat ──────────────────────────────────────────────────────────────────
// Returns the raw fetch Response for SSE consumption
export function chatStream(pid: string, question: string, history: object[]) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''
  const token = getToken()
  return fetch(`${base}/api/v1/projects/${pid}/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question, conversation_history: history }),
  })
}

export function bycStream(pid: string, sid: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || ''
  const token = getToken()
  return fetch(`${base}/api/v1/projects/${pid}/before-you-change/${sid}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ question: '' }),
  })
}

export function chatHistory(pid: string) {
  return api.get(`/projects/${pid}/chat/history`)
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('synq-auth')
    if (!raw) return null
    return JSON.parse(raw)?.state?.token ?? null
  } catch { return null }
}

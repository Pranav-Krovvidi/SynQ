/**
 * Shared TypeScript types for SynQ.
 *
 * These mirror the Pydantic response schemas defined in the backend.
 * Full type definitions are added per-entity in WS-4 through WS-7.
 */

// ---------------------------------------------------------------------------
// Common
// ---------------------------------------------------------------------------
export interface ApiError {
  detail: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  limit: number
  offset: number
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export type UserRole = 'admin' | 'contributor' | 'viewer'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
}

export interface TokenResponse {
  access_token: string
  token_type: 'bearer'
}

// ---------------------------------------------------------------------------
// Project
// ---------------------------------------------------------------------------
export interface Project {
  id: string
  name: string
  description: string | null
  created_at: string
}

// ---------------------------------------------------------------------------
// Service (stub — full type added in WS-4)
// ---------------------------------------------------------------------------
export interface ServiceSummary {
  id: string
  name: string
  description: string | null
  tags: string[]
}

// ---------------------------------------------------------------------------
// ADR (stub — full type added in WS-4)
// ---------------------------------------------------------------------------
export type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded'

export interface AdrSummary {
  id: string
  title: string
  status: AdrStatus
  decided_at: string | null
}

// ---------------------------------------------------------------------------
// Chat / RAG
// ---------------------------------------------------------------------------
export interface Citation {
  source_index: number
  entity_type: string
  entity_id: string
  entity_title: string
  snippet: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  query_log_id?: string
}

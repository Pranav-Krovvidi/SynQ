// Shared TypeScript types mirroring backend Pydantic schemas

export type UserRole = 'admin' | 'contributor' | 'viewer'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  is_active: boolean
}

export interface TokenResponse {
  access_token: string
  token_type: string
}

export interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  tech_stack: string | null
  repo_url: string | null
  tags: string[]
  project_id: string
  created_at: string
  updated_at: string
}

export type AdrStatus = 'proposed' | 'accepted' | 'deprecated' | 'superseded'

export interface Adr {
  id: string
  title: string
  context: string | null
  decision: string | null
  consequences: string | null
  status: AdrStatus
  decided_at: string | null
  project_id: string
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  filename: string
  mime_type: string
  project_id: string
  created_at: string
  updated_at: string
}

export interface Citation {
  source_index: number
  entity_type: string | null
  entity_id: string | null
  entity_title: string | null
  snippet: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  query_log_id?: string
  streaming?: boolean
}

export interface QueryLogEntry {
  id: string
  question: string
  answer: string | null
  latency_ms: number | null
  created_at: string | null
}

export interface ProjectStats {
  services: number
  adrs: number
  documents: number
}

// Person: derived from ADR created_by info — we synthesise from ADR author data
export interface Person {
  id: string          // synthetic: email-based
  name: string
  email: string
  role: string
  adrCount: number
  adrs: Adr[]
}

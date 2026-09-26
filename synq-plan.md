# SynQ — Implementation Plan

## Overview

SynQ is an AI-powered organizational memory and developer onboarding platform.
The MVP delivers five features: Knowledge Explorer, AI Knowledge Assistant,
Architecture Decision Memory, Developer Onboarding, and Before You Change analysis.

The demo company is **NovaPay** — a fictional fintech payments platform with six
services, six ADRs, three incidents, and three teams. The primary audience is IBM judges,
so IBM watsonx.ai is the AI provider and IBM Code Engine is the recommended backend host.

**Stack:**
- Frontend: React 18 + TypeScript + Vite, deployed to Vercel
- Backend: FastAPI (Python 3.11), deployed to IBM Code Engine (Docker container)
- Database: PostgreSQL 15 + pgvector extension, hosted on Neon.tech (free tier, serverless)
- AI: IBM watsonx.ai — `ibm/granite-3-3-8b-instruct` (chat), `ibm/slate-125m-english-rtrvr` (embeddings)
- Streaming: Server-Sent Events (SSE) for AI chat responses
- Containerization: Docker + Docker Compose for local development

**Deployment topology:**
- Vercel — React frontend (static build, CDN-distributed)
- IBM Code Engine — FastAPI backend (Docker container, scales to zero)
- Neon.tech — PostgreSQL + pgvector (serverless, free tier adequate for hackathon)
- IBM watsonx.ai — LLM and embedding inference

**Base images (IBM Code Engine compliant):**
- Backend: `registry.redhat.io/ubi9/python-311-minimal:latest`
- Frontend build: `node:20-alpine` (build stage only; output is static files to Vercel)

**Non-goals for MVP:**
- Live integrations with GitHub, Jira, Confluence, PagerDuty, or Slack
- Multi-tenant / multi-org support
- Automated ADR extraction from commit history
- Advanced analytics or dashboards
- Real-time collaboration

---

## Workstream Map and Dependencies

```
WS-1  Project Scaffolding & Infrastructure
  └── WS-2  Database Schema & Migrations         (depends on WS-1)
        └── WS-3  Authentication                 (depends on WS-2)
        └── WS-4  Entity CRUD APIs               (depends on WS-2)
              └── WS-5  Ingestion Pipeline        (depends on WS-4)
                    └── WS-6  RAG & AI Pipeline   (depends on WS-5)
                          └── WS-7  Chat API      (depends on WS-6)
WS-8  Frontend Shell & Routing                   (depends on WS-1, parallel with WS-2..7)
  └── WS-9  Knowledge Explorer UI                (depends on WS-4, WS-8)
  └── WS-10 Graph Visualization UI               (depends on WS-4, WS-8)
  └── WS-11 ADR Editor UI                        (depends on WS-4, WS-8)
  └── WS-12 AI Chat UI                           (depends on WS-7, WS-8)
  └── WS-13 Onboarding Planner UI                (depends on WS-4, WS-8)
WS-14 Demo Seed Data                             (depends on WS-4)
WS-15 End-to-End Integration & Docker Compose    (depends on all workstreams)
```

Workstreams WS-2, WS-8 can begin immediately after WS-1.
Workstreams WS-3 and WS-4 can proceed in parallel after WS-2.
Workstreams WS-9 through WS-13 can proceed in parallel after WS-8 + their backend dependency.

---

## WS-1 — Project Scaffolding & Infrastructure

**Status:** [ ] pending

### Intent
Create the monorepo structure, tooling configuration, and Docker Compose setup so all
other workstreams have a stable, runnable foundation from day one.

### Expected Outcomes
- Running `docker compose up` starts postgres, backend (hot-reload), and frontend (dev server)
- Backend returns `200 {"status": "ok"}` from `GET /health`
- Frontend renders a placeholder page at `http://localhost:5173`
- Environment variable templates exist for both frontend and backend
- CI-ready linting and formatting configs are in place

### Directory Structure
```
synq/
  backend/
    app/
      api/          # route modules
      core/         # config, security, dependencies
      db/           # session, base model
      models/       # SQLAlchemy ORM models
      schemas/      # Pydantic request/response schemas
      services/     # business logic
      ingestion/    # document chunking and embedding
      rag/          # retrieval and prompt assembly
    alembic/        # migrations
    tests/
    Dockerfile
    requirements.txt
    pyproject.toml
  frontend/
    src/
      components/   # shared UI components
      pages/        # page-level components
      features/     # feature modules (explorer, chat, adr, onboarding)
      hooks/        # custom React hooks
      api/          # typed API client (axios + React Query)
      store/        # Zustand global state
      types/        # shared TypeScript types
    public/
    Dockerfile
    package.json
    vite.config.ts
    tsconfig.json
  docker-compose.yml
  docker-compose.prod.yml
  .env.example
  README.md
```

### Todo List
1. Create the monorepo root with `docker-compose.yml` and `.env.example`
2. Scaffold the FastAPI backend with `pyproject.toml`, `requirements.txt`, and `app/main.py`
3. Add `GET /health` route returning `{"status": "ok", "version": "0.1.0"}`
4. Configure `uvicorn` with hot-reload in the backend `Dockerfile` (development target)
5. Scaffold the React + TypeScript + Vite frontend with `package.json` and `vite.config.ts`
6. Add ESLint, Prettier, and TypeScript strict mode to frontend
7. Configure CORS in FastAPI to allow the frontend dev origin
8. Add `postgres` service to Docker Compose with pgvector-enabled image (`pgvector/pgvector:pg15`)
9. Wire all three services together in Docker Compose with shared network and env vars
10. Add `README.md` with local setup instructions

### Relevant Context
- Docker image for pgvector: `pgvector/pgvector:pg15`
- Backend base image: `python:3.11-slim`
- Frontend base image: `node:20-alpine`
- All secrets injected via environment variables — never hardcoded

---

## WS-2 — Database Schema & Migrations

**Status:** [ ] pending

### Intent
Define the complete relational schema for all SynQ entities and relationships.
Use Alembic for migrations so the schema can be evolved safely.

### Expected Outcomes
- `alembic upgrade head` creates all tables on a clean Postgres instance
- pgvector extension is enabled in the migration
- All entity tables, relationship junction tables, and the chunks table exist
- Foreign key constraints and indexes are in place

### Schema

#### Core Entity Tables

**users**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
email         TEXT UNIQUE NOT NULL
name          TEXT NOT NULL
hashed_password TEXT NOT NULL
role          TEXT NOT NULL  -- 'admin' | 'contributor' | 'viewer'
created_at    TIMESTAMPTZ DEFAULT now()
```

**teams**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
name          TEXT UNIQUE NOT NULL
description   TEXT
created_at    TIMESTAMPTZ DEFAULT now()
```

**projects**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
name          TEXT UNIQUE NOT NULL
description   TEXT
created_at    TIMESTAMPTZ DEFAULT now()
```

**services**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id    UUID REFERENCES projects(id) ON DELETE CASCADE
name          TEXT NOT NULL
description   TEXT
repo_url      TEXT
tags          TEXT[]
created_at    TIMESTAMPTZ DEFAULT now()
UNIQUE(project_id, name)
```

**people**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id    UUID REFERENCES projects(id) ON DELETE CASCADE
name          TEXT NOT NULL
email         TEXT
role          TEXT   -- job title / role description
team_id       UUID REFERENCES teams(id)
created_at    TIMESTAMPTZ DEFAULT now()
```

**adrs** (Architecture Decision Records)
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id    UUID REFERENCES projects(id) ON DELETE CASCADE
title         TEXT NOT NULL
status        TEXT NOT NULL  -- 'proposed' | 'accepted' | 'deprecated' | 'superseded'
context       TEXT
options_considered TEXT
decision      TEXT
consequences  TEXT
decided_at    DATE
superseded_by UUID REFERENCES adrs(id)
created_by    UUID REFERENCES users(id)
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()
```

**incidents**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id    UUID REFERENCES projects(id) ON DELETE CASCADE
title         TEXT NOT NULL
severity      TEXT  -- 'P1' | 'P2' | 'P3' | 'P4'
description   TEXT
occurred_at   DATE
status        TEXT  -- 'open' | 'resolved' | 'postmortem_complete'
created_at    TIMESTAMPTZ DEFAULT now()
```

**requirements**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id    UUID REFERENCES projects(id) ON DELETE CASCADE
title         TEXT NOT NULL
type          TEXT  -- 'functional' | 'non_functional' | 'compliance' | 'business'
description   TEXT
source        TEXT
created_at    TIMESTAMPTZ DEFAULT now()
```

**documents**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id    UUID REFERENCES projects(id) ON DELETE CASCADE
title         TEXT NOT NULL
source_type   TEXT  -- 'upload' | 'url' | 'manual'
file_type     TEXT  -- 'markdown' | 'pdf' | 'text'
content       TEXT
url           TEXT
ingested_at   TIMESTAMPTZ DEFAULT now()
```

**chunks** (for RAG)
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
document_id   UUID REFERENCES documents(id) ON DELETE CASCADE
entity_type   TEXT   -- 'adr' | 'incident' | 'requirement' | 'service' | 'document'
entity_id     UUID   -- FK to the parent entity (polymorphic, not enforced by FK)
content       TEXT NOT NULL
chunk_index   INT NOT NULL
embedding     VECTOR(384)   -- dimension matches slate-125m; configurable
created_at    TIMESTAMPTZ DEFAULT now()
```

**onboarding_plans**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id    UUID REFERENCES projects(id) ON DELETE CASCADE
developer_id  UUID REFERENCES users(id)
target_service_id UUID REFERENCES services(id)
status        TEXT  -- 'active' | 'completed' | 'archived'
created_by    UUID REFERENCES users(id)
created_at    TIMESTAMPTZ DEFAULT now()
```

**onboarding_items**
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
plan_id       UUID REFERENCES onboarding_plans(id) ON DELETE CASCADE
entity_type   TEXT   -- 'adr' | 'incident' | 'requirement' | 'document'
entity_id     UUID
completed     BOOLEAN DEFAULT false
display_order INT
```

**query_logs** (audit / citation tracing)
```
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id       UUID REFERENCES users(id)
project_id    UUID REFERENCES projects(id)
question      TEXT
answer        TEXT
chunk_ids     UUID[]  -- chunks used in the response
model_id      TEXT
created_at    TIMESTAMPTZ DEFAULT now()
```

#### Relationship Junction Tables

**service_dependencies**
```
service_id    UUID REFERENCES services(id) ON DELETE CASCADE
depends_on_id UUID REFERENCES services(id) ON DELETE CASCADE
dep_type      TEXT  -- 'hard' | 'soft' | 'async'
PRIMARY KEY (service_id, depends_on_id)
```

**service_owners** (person or team owning a service)
```
service_id    UUID REFERENCES services(id) ON DELETE CASCADE
owner_type    TEXT  -- 'person' | 'team'
owner_id      UUID
role          TEXT  -- 'primary' | 'backup'
PRIMARY KEY (service_id, owner_type, owner_id)
```

**service_adrs**
```
service_id    UUID REFERENCES services(id) ON DELETE CASCADE
adr_id        UUID REFERENCES adrs(id) ON DELETE CASCADE
PRIMARY KEY (service_id, adr_id)
```

**service_incidents**
```
service_id    UUID REFERENCES services(id) ON DELETE CASCADE
incident_id   UUID REFERENCES incidents(id) ON DELETE CASCADE
impact_level  TEXT  -- 'direct' | 'indirect'
PRIMARY KEY (service_id, incident_id)
```

**service_requirements**
```
service_id    UUID REFERENCES services(id) ON DELETE CASCADE
requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE
PRIMARY KEY (service_id, requirement_id)
```

**service_documents**
```
service_id    UUID REFERENCES services(id) ON DELETE CASCADE
document_id   UUID REFERENCES documents(id) ON DELETE CASCADE
PRIMARY KEY (service_id, document_id)
```

**adr_requirements**
```
adr_id        UUID REFERENCES adrs(id) ON DELETE CASCADE
requirement_id UUID REFERENCES requirements(id) ON DELETE CASCADE
PRIMARY KEY (adr_id, requirement_id)
```

**adr_incidents**
```
adr_id        UUID REFERENCES adrs(id) ON DELETE CASCADE
incident_id   UUID REFERENCES incidents(id) ON DELETE CASCADE
PRIMARY KEY (adr_id, incident_id)
```

**people_teams**
```
person_id     UUID REFERENCES people(id) ON DELETE CASCADE
team_id       UUID REFERENCES teams(id) ON DELETE CASCADE
PRIMARY KEY (person_id, team_id)
```

#### Indexes
```sql
CREATE INDEX ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX ON chunks (entity_type, entity_id);
CREATE INDEX ON services (project_id);
CREATE INDEX ON adrs (project_id, status);
CREATE INDEX ON incidents (project_id);
CREATE INDEX ON documents (project_id);
```

### Todo List
1. Enable pgvector extension in the initial Alembic migration
2. Create Alembic migration for all entity tables (users through query_logs)
3. Create Alembic migration for all junction tables
4. Create all indexes including the IVFFlat index on chunks.embedding
5. Create SQLAlchemy ORM models for all tables in `app/models/`
6. Create a `db/session.py` with async session factory using `asyncpg`
7. Verify `alembic upgrade head` runs cleanly on a fresh Postgres instance

### Relevant Context
- Use `sqlalchemy[asyncio]` with `asyncpg` driver
- Vector dimension 384 matches `ibm/slate-125m-english-rtrvr`; set via env var `EMBEDDING_DIMENSION`
- IVFFlat index requires at least one row before it can be created; use `CREATE INDEX IF NOT EXISTS` in migration
- Alembic env.py must import all models to auto-generate migrations correctly

---

## WS-3 — Authentication

**Status:** [ ] pending

### Intent
Implement JWT-based authentication with role-based access control.
Roles: `admin`, `contributor`, `viewer`. All API routes (except `/health` and `/auth/*`) are protected.
Project-level scoping is enforced at the service layer.

### Expected Outcomes
- `POST /auth/register` creates a new user
- `POST /auth/login` returns a signed JWT access token
- Protected routes return `401` without a valid token
- Routes that mutate data return `403` for `viewer` role
- `admin` role can create/delete projects; `contributor` can create entities within a project

### Token Design
```
JWT payload:
{
  "sub": "<user_id>",
  "email": "<email>",
  "role": "<role>",
  "exp": <unix_timestamp>
}
```

Access token TTL: 8 hours (suitable for a hackathon demo; production would use refresh tokens).

### Role Permission Matrix

| Action                      | admin | contributor | viewer |
|-----------------------------|-------|-------------|--------|
| Create / delete project     | yes   | no          | no     |
| Create / update entities    | yes   | yes         | no     |
| Delete entities             | yes   | no          | no     |
| Upload documents            | yes   | yes         | no     |
| Ask AI questions            | yes   | yes         | yes    |
| View all entities           | yes   | yes         | yes    |
| Manage users                | yes   | no          | no     |

### Todo List
1. Add `passlib[bcrypt]` and `python-jose[cryptography]` to requirements
2. Implement `app/core/security.py`: password hashing, JWT sign/verify
3. Implement `app/core/dependencies.py`: `get_current_user`, `require_role(role)` FastAPI dependencies
4. Implement `POST /auth/register` and `POST /auth/login` routes
5. Add `GET /auth/me` returning the current user's profile
6. Write unit tests for JWT sign/verify and the login flow
7. Add seed admin user in the demo seed script (WS-14)

### Relevant Context
- Use `python-jose` for JWT, not PyJWT (better FastAPI ecosystem support)
- `get_current_user` dependency is reused in every protected router

---

## WS-4 — Entity CRUD APIs

**Status:** [ ] pending

### Intent
Implement REST CRUD endpoints for all core entities: services, teams, people, ADRs,
incidents, requirements, documents, and their relationships.
These are the data backbone that all frontend workstreams and the AI pipeline consume.

### Expected Outcomes
- Full CRUD for: projects, services, teams, people, ADRs, incidents, requirements, documents
- Relationship endpoints: add/remove links between entities (e.g. service ↔ ADR)
- All responses include the entity's full relationship context
- Pagination on list endpoints (limit/offset)
- Project-scoped: all entity endpoints require `project_id` filter or path param

### API Route Structure
```
/projects                          GET, POST
/projects/{project_id}             GET, PUT, DELETE

/projects/{project_id}/services              GET, POST
/projects/{project_id}/services/{id}         GET, PUT, DELETE
/projects/{project_id}/services/{id}/adrs    GET, POST, DELETE (link/unlink)
/projects/{project_id}/services/{id}/incidents     GET, POST, DELETE
/projects/{project_id}/services/{id}/requirements  GET, POST, DELETE
/projects/{project_id}/services/{id}/dependencies  GET, POST, DELETE
/projects/{project_id}/services/{id}/owners        GET, POST, DELETE

/projects/{project_id}/teams               GET, POST
/projects/{project_id}/teams/{id}          GET, PUT, DELETE

/projects/{project_id}/people              GET, POST
/projects/{project_id}/people/{id}         GET, PUT, DELETE

/projects/{project_id}/adrs                GET, POST
/projects/{project_id}/adrs/{id}           GET, PUT, DELETE

/projects/{project_id}/incidents           GET, POST
/projects/{project_id}/incidents/{id}      GET, PUT, DELETE

/projects/{project_id}/requirements        GET, POST
/projects/{project_id}/requirements/{id}   GET, PUT, DELETE

/projects/{project_id}/documents           GET, POST
/projects/{project_id}/documents/{id}      GET, DELETE
```

### Key Response Shapes

**Service detail (GET /projects/{pid}/services/{id}):**
```json
{
  "id": "uuid",
  "name": "Payment Service",
  "description": "...",
  "repo_url": "...",
  "tags": ["payments", "critical"],
  "owners": [{"type": "team", "id": "uuid", "name": "Payments Team", "role": "primary"}],
  "dependencies": [{"id": "uuid", "name": "Auth Service", "dep_type": "hard"}],
  "adrs": [{"id": "uuid", "title": "...", "status": "accepted"}],
  "incidents": [{"id": "uuid", "title": "...", "severity": "P1"}],
  "requirements": [{"id": "uuid", "title": "..."}],
  "documents": [{"id": "uuid", "title": "..."}]
}
```

**ADR detail (GET /projects/{pid}/adrs/{id}):**
```json
{
  "id": "uuid",
  "title": "...",
  "status": "accepted",
  "context": "...",
  "options_considered": "...",
  "decision": "...",
  "consequences": "...",
  "decided_at": "2024-01-15",
  "superseded_by": null,
  "created_by": {"id": "uuid", "name": "..."},
  "services": [...],
  "requirements": [...],
  "incidents": [...]
}
```

### Todo List
1. Create Pydantic schemas (`app/schemas/`) for all entities — request and response variants
2. Create service layer (`app/services/`) with DB query logic for each entity type
3. Implement project CRUD router
4. Implement services router including relationship sub-routes
5. Implement teams, people, ADRs, incidents, requirements routers
6. Implement documents router (metadata only; file content handled in WS-5)
7. Add pagination (limit/offset) to all list endpoints
8. Wire all routers into `app/main.py` under `/api/v1`
9. Write integration tests for CRUD operations on at least services and ADRs

### Relevant Context
- Use FastAPI `APIRouter` with prefix per entity type
- Relationship sub-routes return arrays of linked entity summaries (not full objects)
- `project_id` is always validated against the authenticated user's accessible projects

---

## WS-5 — Ingestion Pipeline

**Status:** [ ] pending

### Intent
Implement the document ingestion pipeline: accept a file upload or raw text,
extract content, split into chunks, generate embeddings via watsonx, and store
chunks + embeddings in the `chunks` table.

Structured entity ingestion (ADR text, service description, incident description)
also flows through this pipeline so they are searchable semantically.

### Expected Outcomes
- `POST /projects/{pid}/ingest/upload` accepts a file (markdown, text, PDF) and stores it
- Uploaded document is chunked, embedded, and searchable within seconds
- All ADR, incident, and requirement text is auto-ingested when entities are created/updated
- Embedding dimension is configurable via `EMBEDDING_DIMENSION` env var
- Ingestion is idempotent: re-ingesting a document deletes old chunks first

### Chunking Strategy
- Split documents by double-newline (paragraph) boundaries first
- Then apply max-token sliding window (300 tokens, 50 token overlap) if paragraphs exceed limit
- Each chunk retains: `entity_type`, `entity_id`, `chunk_index`, and the raw text
- Structured entities (ADRs, incidents, requirements) are treated as single chunks unless text exceeds 600 tokens

### Embedding Strategy
- Call `POST /ml/v1/text/embeddings` on watsonx.ai with `ibm/slate-125m-english-rtrvr`
- Batch up to 20 chunks per API call
- Store the embedding vector in `chunks.embedding` using pgvector
- If watsonx is unreachable, raise a clear 503 with a human-readable message (do not silently fail)

### PDF Parsing
- Use `pymupdf` (fitz) for PDF text extraction
- Extract text page-by-page, concatenate with page break markers
- Fall back to error if a PDF produces empty text (scanned/image PDF is not supported in MVP)

### Todo List
1. Add `pymupdf`, `tiktoken` to requirements
2. Implement `app/ingestion/chunker.py`: paragraph + sliding window chunker
3. Implement `app/ingestion/embedder.py`: watsonx embedding API client with batching
4. Implement `app/ingestion/ingest.py`: orchestrator that wires chunker → embedder → DB insert
5. Implement `POST /projects/{pid}/ingest/upload` file upload endpoint
6. Implement `POST /projects/{pid}/ingest/text` raw text ingestion endpoint
7. Add auto-ingestion trigger in entity create/update service methods (ADR, incident, requirement, service description)
8. Implement idempotency: delete existing chunks for an entity before re-ingesting
9. Write a unit test for the chunker with a known-length document
10. Write an integration test for the ingestion endpoint using a short markdown file

### Relevant Context
- watsonx embedding endpoint: `{WATSONX_URL}/ml/v1/text/embeddings?version=2024-05-01`
- Payload: `{"model_id": "<EMBEDDING_MODEL_ID>", "inputs": ["text1", "text2"], "project_id": "<WATSONX_PROJECT_ID>"}`
- `tiktoken` is used to count tokens for chunking; use `cl100k_base` encoding as an approximation

---

## WS-6 — RAG & AI Pipeline

**Status:** [ ] pending

### Intent
Implement the Retrieval-Augmented Generation pipeline:
1. Retrieve relevant chunks using hybrid search (keyword + semantic)
2. Assemble a grounded prompt that constrains the LLM to cited evidence only
3. Call watsonx.ai chat completions
4. Return the answer with explicit source citations

The system must never assert facts not present in retrieved context.
If context is insufficient, the answer must say so explicitly.

### Expected Outcomes
- Given a question and a project/service scope, the pipeline returns a grounded answer
- Every claim in the answer is backed by a cited source (entity type + entity title + snippet)
- If no relevant chunks are found, the answer is "I don't have enough evidence to answer this."
- All RAG calls are logged to `query_logs` with the chunk IDs used

### Retrieval Strategy (Hybrid)

**Step 1 — Semantic search:**
```sql
SELECT id, entity_type, entity_id, content,
       1 - (embedding <=> query_vector) AS cosine_similarity
FROM chunks
WHERE project_id = :project_id
  AND (entity_type = :scope_type AND entity_id = :scope_id  -- optional scope
       OR :scope_id IS NULL)
ORDER BY embedding <=> query_vector
LIMIT 20;
```

**Step 2 — Keyword search (tsvector):**
```sql
SELECT id, entity_type, entity_id, content,
       ts_rank(to_tsvector('english', content), query) AS rank
FROM chunks, to_tsquery('english', :keywords) query
WHERE to_tsvector('english', content) @@ query
  AND project_id = :project_id
LIMIT 20;
```

**Step 3 — Reciprocal Rank Fusion:**
Merge and re-rank the two result sets using RRF (k=60). Take the top 8 chunks.

**Step 4 — Context window assembly:**
Concatenate the top 8 chunks with source labels:
```
[SOURCE 1: ADR — "Idempotency Keys for Payment Deduplication"]
<chunk text>

[SOURCE 2: Incident — "P1 Payment Timeout Cascade"]
<chunk text>
...
```

### Prompt Templates

**System prompt (all queries):**
```
You are SynQ, an AI assistant for software engineering teams.
Your job is to answer questions about the organization's systems, decisions, and history.

CRITICAL RULES:
1. Only use information from the SOURCES provided below.
2. For every claim you make, cite the source using [SOURCE N].
3. If the sources do not contain enough information to answer the question,
   respond with: "I don't have enough evidence in the available sources to answer this."
4. Never invent people, services, decisions, or technical facts.
5. Be concise but complete. Guide the developer; do not dump all information at once.
```

**Before You Change prompt template:**
```
A developer is about to modify the "{service_name}" service.
Using only the SOURCES below, answer:
"What are the most important things this developer should know before making changes?"

Focus on:
- Key architectural decisions that constrain this service
- Past incidents that reveal fragility or gotchas
- Critical dependencies that could be affected
- Current owners to consult

Do not list every ADR. Prioritize the highest-impact knowledge first.
Surface 3-5 key points, then offer to go deeper on any of them.

SOURCES:
{context}
```

### Streaming Design
The pipeline uses Server-Sent Events (SSE) to stream token deltas to the frontend.
Citations are sent as a final structured event after the full answer is assembled.

SSE event sequence per request:
```
event: token
data: {"delta": "The Payment Service"}

event: token
data: {"delta": " uses idempotency keys"}

... (one event per token or small chunk from watsonx stream)

event: citations
data: {"citations": [...], "query_log_id": "uuid"}

event: done
data: {}
```

The watsonx SDK's `generate_text_stream()` method yields token deltas.
Citation extraction runs on the full assembled answer after streaming completes,
then is sent as the `citations` event before `done`.

### Todo List
1. Add `ibm-watsonx-ai` Python SDK and `sse-starlette` to requirements
2. Implement `app/rag/retriever.py`: semantic search, keyword search, RRF merge
3. Implement `app/rag/context_builder.py`: assemble ranked chunks into a labeled context string
4. Implement `app/rag/llm_client.py`: watsonx streaming client using `generate_text_stream()`
5. Implement `app/rag/pipeline.py`: async generator that yields SSE events (token → citations → done)
6. Implement `app/rag/prompts.py`: all prompt templates as constants
7. Implement citation extraction: parse `[SOURCE N]` from full assembled answer; map to chunk metadata
8. Implement query logging to `query_logs` after the stream completes
9. Write a unit test for the RRF merge function
10. Write an integration test for the full pipeline with a mock streaming LLM response

### Relevant Context
- Use `ibm-watsonx-ai` SDK's `ModelInference.generate_text_stream()` for streaming
- Wrap the async generator with `sse-starlette`'s `EventSourceResponse`
- Chunk `entity_type` and `entity_id` are used to build citation metadata (title, link, type)
- `generate_text_stream()` returns an iterator; wrap in `asyncio.to_thread` for async compatibility

---

## WS-7 — Chat API

**Status:** [ ] pending

### Intent
Expose the RAG pipeline via HTTP endpoints that the frontend Chat UI consumes.
Supports both global chat and entity-scoped chat (e.g. scoped to a specific service).
Also exposes the dedicated "Before You Change" endpoint.

### Expected Outcomes
- `POST /api/v1/projects/{pid}/chat` returns an SSE stream of token deltas + final citations event
- `POST /api/v1/projects/{pid}/chat/service/{sid}` scopes retrieval to a specific service
- `POST /api/v1/projects/{pid}/before-you-change/{sid}` returns a streaming BYC analysis
- All streaming endpoints use `Content-Type: text/event-stream`
- Multi-turn conversation is supported by passing `conversation_history` in the request body

### Request / Response Shapes

**Chat request (POST body — JSON):**
```json
{
  "question": "Why does the Payment Service use idempotency keys?",
  "conversation_history": [
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

**SSE stream response (text/event-stream):**
```
event: token
data: {"delta": "The Payment Service uses"}

event: token
data: {"delta": " idempotency keys because..."}

event: citations
data: {
  "citations": [
    {
      "source_index": 1,
      "entity_type": "adr",
      "entity_id": "uuid",
      "entity_title": "Idempotency Keys for Payment Deduplication",
      "snippet": "We chose idempotency keys over database locks because..."
    }
  ],
  "query_log_id": "uuid"
}

event: done
data: {}
```

**Before You Change SSE stream** — identical event shape; first token event arrives within ~1s.
The `service_summary` (owner, dep count, incident count) is sent as a separate `context` event
before the first `token` event so the UI can render the header immediately.

### Todo List
1. Implement `POST /projects/{pid}/chat` as SSE endpoint using `EventSourceResponse`
2. Implement `POST /projects/{pid}/chat/service/{sid}` service-scoped SSE endpoint
3. Implement `POST /projects/{pid}/before-you-change/{sid}` SSE endpoint with `context` event
4. Add `GET /projects/{pid}/chat/history` returning the last 20 query logs for the user
5. Validate that conversation history is capped at 10 turns to avoid context overflow
6. Ensure CORS headers allow EventSource connections from the Vercel frontend origin
7. Write integration tests for the Before You Change endpoint against the NovaPay seed data

### Relevant Context
- The `before-you-change` endpoint pre-populates the prompt using the template in WS-6
- Service summary metadata is fetched from the entity tables, not from the LLM

---

## WS-8 — Frontend Shell & Routing

**Status:** [ ] pending

### Intent
Create the React application shell: routing, layout, navigation, auth context,
API client setup, and design system configuration.
All other frontend workstreams build their pages inside this shell.

### Expected Outcomes
- IBM Carbon Design System is installed and a global theme is applied
- React Router v6 routes are defined for all pages (with lazy loading)
- A persistent sidebar navigation links to: Explorer, Graph, ADRs, Chat, Onboarding
- Auth context provides `useAuth()` hook with current user, login, logout
- React Query client is configured for all API calls
- Protected routes redirect unauthenticated users to `/login`
- Axios instance is configured with base URL and JWT Authorization header injection

### Route Structure
```
/login                       LoginPage
/                            redirect to /projects
/projects                    ProjectListPage
/projects/:pid               ProjectLayout (wraps all project routes)
  /projects/:pid/explorer    KnowledgeExplorerPage
  /projects/:pid/graph       GraphVisualizationPage
  /projects/:pid/adrs        ADRListPage
  /projects/:pid/adrs/new    ADREditorPage
  /projects/:pid/adrs/:id    ADRDetailPage
  /projects/:pid/adrs/:id/edit ADREditorPage
  /projects/:pid/services/:id ServiceDetailPage
  /projects/:pid/chat        ChatPage
  /projects/:pid/chat/service/:sid ChatPage (service-scoped)
  /projects/:pid/onboarding  OnboardingListPage
  /projects/:pid/onboarding/new OnboardingPlanPage
  /projects/:pid/onboarding/:id OnboardingPlanPage
```

### Design System
- **IBM Carbon Design System** (`@carbon/react`) for all UI components
- Carbon tokens for color, typography, spacing
- Dark/light theme toggle stored in localStorage
- Responsive layout: sidebar collapses to hamburger on mobile

### Todo List
1. Install `@carbon/react`, `react-router-dom`, `@tanstack/react-query`, `axios`, `zustand`
2. Configure Carbon theme and global CSS resets
3. Create `AppRouter.tsx` with all routes defined using lazy imports
4. Create `AuthContext.tsx` with login/logout/user state
5. Create `api/client.ts`: Axios instance with base URL and auth interceptor
6. Create `api/` modules for each entity type (typed request/response functions)
7. Create `AppLayout.tsx`: sidebar + topbar shell with Carbon components
8. Create `ProtectedRoute.tsx` component that checks auth state
9. Create `LoginPage.tsx` with email/password form
10. Configure React Query devtools for development

### Relevant Context
- Carbon Design System: `https://carbondesignsystem.com/`
- IBM judges will recognize and appreciate Carbon — use it consistently
- Zustand store holds: current project, current user, sidebar collapse state

---

## WS-9 — Knowledge Explorer UI

**Status:** [ ] pending

### Intent
Implement the Knowledge Explorer: a searchable, browsable catalog of all entities
within a project. This is the primary navigation surface for understanding "what exists".

### Expected Outcomes
- Search bar performs hybrid (semantic + keyword) search across all entity types
- Results are grouped by type (Services, ADRs, Incidents, etc.) with type badges
- Clicking a service opens the Service Detail page
- Service Detail page shows: description, owners, dependencies, ADRs, incidents, requirements, documents
- Each linked item is clickable and navigates to that entity's detail
- "Before You Change" button is prominently placed on the Service Detail page

### Key Pages

**KnowledgeExplorerPage:**
- Search input at the top (debounced, 300ms)
- Filter chips: All / Services / ADRs / Incidents / People / Documents
- Result cards with entity type icon, title, snippet, and tags

**ServiceDetailPage:**
- Header: service name, team badge, repo link
- Tabbed sections: Overview, Dependencies, ADRs, Incidents, Requirements, Documents
- "Before You Change" CTA button (navigates to scoped Chat)
- Ownership panel in the sidebar

### Todo List
1. Implement `GET /projects/{pid}/search?q=&type=` endpoint in the backend (if not already covered by WS-4)
2. Create `KnowledgeExplorerPage.tsx` with search and filter logic
3. Create `SearchResultCard.tsx` reusable component
4. Create `ServiceDetailPage.tsx` with tabbed layout using Carbon Tabs
5. Create `ADRDetailPage.tsx` showing full ADR fields + linked entities
6. Create `IncidentDetailPage.tsx`
7. Wire "Before You Change" button to navigate to `/projects/:pid/chat/service/:sid`
8. Add loading skeletons using Carbon SkeletonText during data fetch

### Relevant Context
- The search endpoint should query both the `chunks` table (semantic) and entity tables (keyword on name/title)
- Use React Query `useQuery` for all data fetching with appropriate cache keys

---

## WS-10 — Graph Visualization UI

**Status:** [ ] pending

### Intent
Implement an interactive graph visualization showing relationships between entities.
This is a key demo differentiator — IBM judges should be able to see the
knowledge graph of NovaPay's six services and their interconnections visually.

### Expected Outcomes
- React Flow canvas displays services as nodes
- Edges represent: depends_on, governed_by (ADR), affected_by (incident)
- Clicking a node opens a side panel with entity summary and "View Detail" link
- Node types have distinct colors/icons (service=blue, ADR=purple, incident=red)
- Graph is scoped to the current project; can be filtered by entity type
- Graph fits to screen on load; pan and zoom work correctly

### Node / Edge Design

**Node types and colors:**
- Service: IBM Blue (#0f62fe), circle icon
- ADR: IBM Purple (#8a3ffc), document icon
- Incident: IBM Red (#da1e28), warning icon
- Team: IBM Teal (#009d9a), people icon

**Edge types:**
- `depends_on`: gray solid arrow
- `governed_by`: purple dashed arrow
- `affected_by`: red dashed arrow

### Backend requirement
```
GET /projects/{pid}/graph
Response:
{
  "nodes": [{"id": "uuid", "type": "service|adr|incident|team", "label": "...", "data": {...}}],
  "edges": [{"source": "uuid", "target": "uuid", "type": "depends_on|governed_by|affected_by"}]
}
```

### Todo List
1. Add `reactflow` to frontend dependencies
2. Implement `GET /projects/{pid}/graph` backend endpoint that assembles nodes + edges from the DB
3. Create `GraphVisualizationPage.tsx` with React Flow canvas
4. Create custom node components for each entity type
5. Create `EntitySidePanel.tsx`: slides in from right when a node is clicked
6. Add filter toggle buttons (show/hide ADRs, incidents, teams on the graph)
7. Implement auto-layout using React Flow's `dagre` layout algorithm
8. Test with NovaPay seed data: 6 service nodes + ADR + incident nodes visible

### Relevant Context
- `reactflow` package: `https://reactflow.dev`
- For auto-layout, use the `@dagrejs/dagre` layout algorithm via the React Flow layout example
- The graph endpoint is read-only and does not require write permissions

---

## WS-11 — ADR Editor UI

**Status:** [ ] pending

### Intent
Implement the ADR creation and editing interface.
ADRs are the cornerstone of SynQ's value — the UI must make them easy to write
and clearly display the structured fields (context, options, decision, consequences).

### Expected Outcomes
- ADR list page shows all ADRs with status badges (Proposed, Accepted, Deprecated, Superseded)
- "New ADR" opens a multi-section form with all structured fields
- Each field has a helpful placeholder/hint explaining what to write
- "Link to Services" multi-select connects the ADR to affected services
- Saving triggers auto-ingestion (chunking + embedding) in the background
- Superseded ADRs show a banner with a link to the superseding ADR

### Todo List
1. Create `ADRListPage.tsx` with status filter tabs and Carbon DataTable
2. Create `ADREditorPage.tsx` with form sections using Carbon TextArea for long fields
3. Add "Link Services" multi-select using Carbon MultiSelect
4. Add "Link Requirements" and "Link Incidents" multi-selects
5. Add "Supersedes" ADR picker (shows when status is set to "superseded")
6. On save, call `POST` or `PUT /adrs` and show a success toast notification
7. Create `ADRStatusBadge.tsx` component with color-coded Carbon Tag

### Relevant Context
- ADR form field hints should reference the RFC-style format (Nygard ADR format)
- Auto-ingestion happens server-side; the frontend just shows a "Indexing..." indicator after save

---

## WS-12 — AI Chat UI

**Status:** [ ] pending

### Intent
Implement the AI Knowledge Assistant chat interface.
This is the primary value demonstration for IBM judges.
The UI must display grounded answers with visible, clickable citations.

### Expected Outcomes
- Chat interface with message bubbles (user right, assistant left)
- **Streaming**: tokens appear progressively as the LLM generates them (no spinner-then-dump)
- Citations render as expandable chips below the assistant message after streaming completes
- Clicking a citation navigates to the source entity detail page
- "Before You Change" entry point: a button on the Service Detail page opens chat pre-loaded with the BYC prompt
- Empty state shows suggested questions ("What does Payment Service depend on?", etc.)
- Conversation history is maintained within the session (not persisted across sessions)

### Streaming Implementation
Use the browser's native `EventSource` API (or `fetch` with `ReadableStream`) to consume the SSE stream:

```
SSE event: token  → append delta to the in-progress assistant message bubble
SSE event: context → render the BYC service summary header card
SSE event: citations → attach citations array to the completed message
SSE event: done   → mark message as complete; re-enable send button
```

The assistant message bubble renders a blinking cursor at the end of the in-progress text.
Once `done` is received, the cursor disappears and citations appear beneath the bubble.

### Citation Rendering
Each assistant message includes a `citations` array received in the `citations` SSE event:
```
[1] ADR — "Idempotency Keys for Payment Deduplication"  [view →]
[2] Incident — "P1 Payment Timeout Cascade"              [view →]
```

### Before You Change Entry Point
When accessed via `/projects/:pid/chat/service/:sid`:
- The chat opens with a service summary card (name, owner, dep count) rendered from the `context` SSE event
- The BYC query is automatically sent on mount; tokens begin streaming within ~1s
- The developer sees the guided response build in real time and can ask follow-up questions

### Todo List
1. Create `ChatPage.tsx` with message list and input bar
2. Create `MessageBubble.tsx` with user/assistant variants; assistant variant shows streaming cursor
3. Create `CitationList.tsx` that renders citation chips with entity type icon and title
4. Create `ChatInput.tsx` with textarea (Shift+Enter for newline, Enter to send) and send button; disabled during streaming
5. Implement SSE consumption: `useChatStream` custom hook using `fetch` + `ReadableStream` parser
6. Implement streaming cursor: blinking `|` appended to in-progress message text
7. Implement "Before You Change" auto-trigger: detect `sid` param on mount and fire BYC request
7. Add suggested questions in the empty state using Carbon ClickableTile
8. Add a "Copy answer" button on assistant messages
9. Wire citation click to navigate to the correct entity detail page

### Relevant Context
- Use React Query mutation for the chat POST (not a query — it's not cached)
- Conversation history is stored in React component state (array of message objects)
- The `query_log_id` in the response can be used for future feedback features

---

## WS-13 — Onboarding Planner UI

**Status:** [ ] pending

### Intent
Implement the Developer Onboarding feature: a manager or admin creates an onboarding plan
for a new developer targeting a specific service, SynQ auto-generates a reading list
from all linked knowledge, and the developer can track progress.

### Expected Outcomes
- Onboarding plan list shows all plans with developer name and target service
- "New Plan" form: pick developer (user), pick target service, SynQ auto-generates item list
- Generated item list includes: service's linked ADRs, incidents, requirements, documents
- Developer can mark items as complete
- Scoped AI chat button opens Chat scoped to the plan's target service

### Auto-generation Logic (backend)
When a plan is created for `service_id`:
1. Fetch all ADRs linked to the service → add to `onboarding_items`
2. Fetch all incidents linked to the service (severity P1/P2 only) → add
3. Fetch all requirements linked to the service → add
4. Fetch all documents linked to the service → add
5. Order: ADRs first, then incidents, then requirements, then documents

### Todo List
1. Implement `POST /projects/{pid}/onboarding` with auto-generation logic
2. Implement `PATCH /projects/{pid}/onboarding/{plan_id}/items/{item_id}` to toggle completion
3. Create `OnboardingListPage.tsx` with plan cards
4. Create `OnboardingPlanPage.tsx` with grouped reading list (Carbon Accordion by type)
5. Add completion checkboxes using Carbon Checkbox
6. Add progress bar (Carbon ProgressBar) showing completed / total items
7. Add "Ask AI about this service" button opening the service-scoped chat

---

## WS-14 — Demo Seed Data (NovaPay)

**Status:** [ ] pending

### Intent
Create a realistic, richly interconnected demo dataset for the NovaPay fictional company.
This dataset must make the IBM judge demo compelling. Every entity should have enough
text to produce good embeddings and meaningful AI answers.

### NovaPay Entity Inventory

**Teams (3):**
- Payments Team
- Platform Team
- Data Team

**People (6):**
- Alice Chen — Staff Engineer, Payments Team
- Bob Kumar — Engineering Manager, Payments Team
- Carlos Rivera — Senior Engineer, Platform Team
- Diana Park — Staff Engineer, Platform Team
- Elena Moss — Data Engineer, Data Team
- Frank Liu — On-Call Engineer, Payments Team

**Services (6):**
1. **Payment Service** — Processes customer payment transactions. Depends on: Auth Service, Fraud Detection Service, Notification Service. Owner: Payments Team (Alice Chen primary)
2. **Auth Service** — Handles authentication and JWT issuance. Depends on: Notification Service. Owner: Platform Team (Carlos Rivera primary)
3. **Fraud Detection Service** — Real-time fraud scoring for transactions. Depends on: Reporting Service. Owner: Payments Team (Frank Liu primary)
4. **Notification Service** — Sends email and SMS notifications. No service dependencies. Owner: Platform Team (Diana Park primary)
5. **Reporting Service** — Read-only analytics over a Postgres read replica. Depends on: Payments DB (external). Owner: Data Team (Elena Moss primary)
6. **API Gateway** — Edge proxy. Routes to: Payment Service, Auth Service. Owner: Platform Team (Carlos Rivera primary)

**ADRs (6):**
1. **ADR-001** — Accepted: "Use idempotency keys for payment deduplication instead of database locks"
   - Context: Payments were occasionally duplicated under high concurrency during the Black Friday 2023 load test
   - Options: DB-level locking vs. client-supplied idempotency keys
   - Decision: Idempotency keys — more scalable, client-retryable
   - Consequences: Clients must store and resend idempotency keys; 24-hour key expiry window
   - Links: Payment Service, ADR addresses requirement REQ-001

2. **ADR-002** — Accepted: "Use SQS over Kafka for notification delivery"
   - Context: Team evaluated Kafka for event streaming; operational complexity was too high for team size
   - Options: Apache Kafka vs. AWS SQS vs. RabbitMQ
   - Decision: AWS SQS — managed service, no cluster maintenance, sufficient throughput
   - Consequences: No replay from beginning of log; at-least-once delivery; poison queue for dead letters
   - Links: Notification Service, Payment Service

3. **ADR-003** — Superseded by ADR-007: "Use a rule-based engine for fraud detection"
   - Context: Team needed fraud detection at launch; no ML expertise available
   - Decision: Heuristic rule engine (velocity checks, geo-anomaly, amount thresholds)
   - Superseded by ADR-007
   - Links: Fraud Detection Service

4. **ADR-007** — Accepted: "Migrate fraud detection to an ML model (supersedes ADR-003)"
   - Context: Rule engine generated 12% false positive rate causing customer complaints; P2 incident INC-002
   - Decision: Introduce a gradient-boosted model trained on historical transaction data; deploy via feature flag
   - Consequences: Model requires retraining pipeline; cold-start problem during feature flag rollout
   - Links: Fraud Detection Service, links to INC-002

5. **ADR-004** — Accepted: "JWT with short expiry plus refresh tokens for Auth Service"
   - Context: Session-based auth did not work for stateless microservice architecture
   - Options: Sessions vs. long-lived JWT vs. short JWT + refresh
   - Decision: 15-minute access tokens + 7-day refresh tokens; refresh token stored in HttpOnly cookie
   - Consequences: INC-003 (logout did not invalidate refresh token) led to adding a token blocklist
   - Links: Auth Service, INC-003

6. **ADR-005** — Accepted: "Reporting Service is read-replica only and never writes to primary DB"
   - Context: Ad-hoc reporting queries were causing lock contention on the primary Postgres instance
   - Decision: Dedicated read replica; all reporting queries run there; no write path
   - Consequences: Up to 500ms replication lag acceptable for reporting; must document that reports are near-real-time
   - Links: Reporting Service

**Incidents (3):**
1. **INC-001** — P1 Resolved: "Payment Service timeout cascade — Black Friday 2023"
   - Description: Under peak load, Payment Service calls to Fraud Detection Service timed out. Missing circuit breaker caused cascading failures. 47 minutes of degraded payment processing.
   - Root cause: No circuit breaker between Payment Service and Fraud Detection Service
   - Outcome: Circuit breaker implemented; led to ADR-001 idempotency work to handle retries safely
   - Links: Payment Service, Fraud Detection Service

2. **INC-002** — P2 Resolved: "Fraud Detection false positive spike — March 2024"
   - Description: Rule engine change to geo-anomaly scoring caused 12% of legitimate transactions to be flagged as fraudulent. Customer complaints for 6 hours.
   - Root cause: Insufficient testing of rule engine changes; no canary deployment
   - Outcome: Triggered ADR-007 decision to migrate to ML model
   - Links: Fraud Detection Service, Payment Service

3. **INC-003** — P2 Resolved: "Auth tokens not invalidated on logout"
   - Description: A user reported that after logging out, their JWT could still be used to authenticate for up to 15 minutes. No token blocklist was in place.
   - Root cause: Stateless JWT design had no revocation mechanism
   - Outcome: Token blocklist (Redis) added; ADR-004 updated with consequences section
   - Links: Auth Service

**Requirements (4):**
1. **REQ-001** — Compliance: "Payment deduplication — PCI DSS requirement for idempotent payment processing"
2. **REQ-002** — Non-functional: "Payment Service must process 1000 TPS with p99 < 200ms"
3. **REQ-003** — Compliance: "User authentication must support token revocation within 1 minute of logout (SOC2)"
4. **REQ-004** — Business: "Fraud detection false positive rate must be below 2% to meet SLA"

**Documents (3):**
1. "NovaPay Architecture Overview" — Markdown describing the overall system, design principles, and service map
2. "Payment Service Runbook" — Markdown with operational guidance, known failure modes, and on-call tips
3. "Fraud Detection Migration Plan" — Markdown detailing the ADR-007 ML migration roadmap and rollout plan

### Seed Script Requirements
- Python script at `backend/scripts/seed_demo.py`
- Uses the REST API (not direct DB inserts) so it validates the API works end-to-end
- Idempotent: running it twice does not create duplicates (delete-and-recreate or upsert)
- Creates the admin user `admin@novapay.com` / `novapay2024` if not present
- All document content is rich enough (300+ words each) to produce meaningful embeddings

### Todo List
1. Write `seed_demo.py` with all entity creation calls in dependency order
2. Write full document text for the three NovaPay documents (Architecture Overview, Payment Runbook, Fraud Migration Plan)
3. Write full ADR text for all six ADRs (rich enough for good embeddings)
4. Run the seed script against a local instance and verify the graph endpoint returns all 6 services
5. Run a manual "Before You Change" query on Payment Service and verify citations reference ADR-001, INC-001

---

## WS-15 — End-to-End Integration & Docker Compose

**Status:** [ ] pending

### Intent
Wire all workstreams together, verify the full application works end-to-end,
ensure Docker Compose starts everything cleanly, and validate the demo scenario.

### Expected Outcomes
- `docker compose up` starts the full stack with no errors
- Frontend is accessible at `http://localhost:5173`
- Backend API docs are accessible at `http://localhost:8000/docs`
- Seed script runs successfully and populates NovaPay data
- The hero demo flow works end-to-end: login → select Payment Service → Before You Change → grounded AI answer with citations
- CORS is configured correctly for local and production origins
- All environment variables are documented in `.env.example`

### Docker Compose Services
```yaml
services:
  postgres:
    image: pgvector/pgvector:pg15
    environment:
      POSTGRES_DB: synq
      POSTGRES_USER: synq
      POSTGRES_PASSWORD: synq_dev
    ports: ["5432:5432"]
    volumes: ["pgdata:/var/lib/postgresql/data"]

  backend:
    build:
      context: ./backend
      target: development   # dev target uses python:3.11-slim for local speed
    environment:
      DATABASE_URL: postgresql+asyncpg://synq:synq_dev@postgres:5432/synq
      WATSONX_API_KEY: ${WATSONX_API_KEY}
      WATSONX_PROJECT_ID: ${WATSONX_PROJECT_ID}
      WATSONX_URL: ${WATSONX_URL}
      LLM_MODEL_ID: ${LLM_MODEL_ID:-ibm/granite-3-3-8b-instruct}
      EMBEDDING_MODEL_ID: ${EMBEDDING_MODEL_ID:-ibm/slate-125m-english-rtrvr}
      EMBEDDING_DIMENSION: ${EMBEDDING_DIMENSION:-384}
      JWT_SECRET: ${JWT_SECRET}
      JWT_EXPIRE_HOURS: 8
    depends_on: [postgres]
    ports: ["8000:8000"]
    volumes: ["./backend:/app"]   # hot-reload mount

  frontend:
    build: ./frontend
    environment:
      VITE_API_BASE_URL: http://localhost:8000/api/v1
    depends_on: [backend]
    ports: ["5173:5173"]
    volumes: ["./frontend/src:/app/src"]   # hot-reload mount
```

### Backend Dockerfile (multi-stage)
```dockerfile
# Stage 1: development — fast iteration locally
FROM python:3.11-slim AS development
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Stage 2: production — IBM Code Engine compliant (Red Hat UBI)
FROM registry.redhat.io/ubi9/python-311-minimal:latest AS production
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
# Run migrations then start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

The `production` stage is what gets pushed to IBM Code Engine.
The `development` stage is used locally via Docker Compose for fast hot-reload.

### Required Environment Variables (.env.example)
```
# watsonx.ai
WATSONX_API_KEY=
WATSONX_PROJECT_ID=
WATSONX_URL=https://us-south.ml.cloud.ibm.com
LLM_MODEL_ID=ibm/granite-3-3-8b-instruct
EMBEDDING_MODEL_ID=ibm/slate-125m-english-rtrvr
EMBEDDING_DIMENSION=384

# Auth
JWT_SECRET=change-me-in-production

# Database
# Local (Docker Compose): set automatically by compose environment block
# Production (Neon.tech): postgresql+asyncpg://user:pass@host/synq?sslmode=require
DATABASE_URL=postgresql+asyncpg://synq:synq_dev@localhost:5432/synq

# Frontend (Vercel environment variable)
VITE_API_BASE_URL=https://your-code-engine-app.us-south.codeengine.appdomain.cloud/api/v1
```

### Todo List
1. Finalize `docker-compose.yml` with all three services, hot-reload mounts, and correct networking
2. Create multi-stage `backend/Dockerfile` with `development` and `production` targets
3. Create `docker-compose.prod.yml` with production overrides (production Dockerfile target, no volume mounts)
3. Verify `alembic upgrade head` runs as a Docker entrypoint before the backend starts
4. Run the full seed script inside Docker (`docker compose exec backend python scripts/seed_demo.py`)
5. Walk through the complete demo scenario and fix any integration issues
6. Document the demo script in `README.md` (step-by-step for judges)

---

## Error Handling Strategy

### Backend
- All exceptions are caught by a global FastAPI exception handler
- `HTTPException` is used for expected errors (404, 403, 400)
- Unhandled exceptions return `500` with a generic message (no stack traces in production)
- watsonx API failures return `503 Service Unavailable` with a human-readable message
- Validation errors from Pydantic return `422` with field-level detail
- DB constraint violations are caught and converted to `409 Conflict`

### Frontend
- React Query's `onError` handler displays Carbon `InlineNotification` banners
- Network errors show a persistent error toast: "Could not connect to SynQ server"
- AI chat errors show an inline error inside the chat (not a page-level error)
- 401 responses trigger automatic redirect to `/login` via the Axios interceptor
- Form validation errors use Carbon form validation patterns (inline field errors)

---

## Testing Strategy

### Backend
- **Unit tests** (`pytest`): chunker, RRF merge function, JWT sign/verify, prompt template assembly
- **Integration tests** (`pytest` + `httpx` + test DB): CRUD endpoints, ingestion endpoint, chat endpoint
- **Test database**: separate `synq_test` database; reset between tests using transactions
- **Mock watsonx**: use `unittest.mock` to mock the watsonx SDK in integration tests — never call real API in tests
- Target: unit tests on all pure functions; integration tests on all API routes

### Frontend
- **Unit tests** (`vitest`): CitationList rendering, MessageBubble rendering, ADR status badge
- **Integration tests** (`React Testing Library`): chat flow, search flow, ADR form submit
- **Mock API**: use `msw` (Mock Service Worker) to intercept API calls in tests
- No E2E tests for MVP (Playwright/Cypress adds too much setup time)

---

## Implementation Order Summary

The safest order for a single developer or small team:

1. WS-1 (Scaffold) → WS-2 (Schema) → WS-3 (Auth) + WS-4 (CRUD) in parallel
2. WS-5 (Ingestion) → WS-6 (RAG) → WS-7 (Chat API)
3. WS-8 (Frontend Shell) — can start in parallel with WS-2 onwards
4. WS-14 (Seed Data) — as soon as WS-4 is done
5. WS-9 + WS-10 + WS-11 + WS-12 + WS-13 — frontend features, parallel after WS-8
6. WS-15 (Integration) — final wiring and demo validation

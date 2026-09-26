# SynQ

> AI-powered organisational memory for software engineering teams.

SynQ creates a connected knowledge layer across people, projects, services, architecture decisions, incidents, and requirements — so developers can answer "What should I know before changing this service?" with grounded, cited answers.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite + IBM Carbon |
| Backend | FastAPI (Python 3.11) |
| Database | PostgreSQL 15 + pgvector |
| AI | Google AI Studio — Gemini (chat + embeddings) |
| Streaming | Server-Sent Events (SSE) |
| Containers | Docker + Docker Compose |

---

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (or Docker Engine + Compose plugin)
- [Node.js 20+](https://nodejs.org/) (for frontend development without Docker)
- [Python 3.11+](https://www.python.org/) (for backend development without Docker)
- A Google AI Studio API key — free, no credit card: https://aistudio.google.com/apikey

---

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone https://github.com/your-org/synq.git
cd synq

# 2. Create your .env file
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY

# 3. Start the full stack
docker compose up

# 4. Verify
#   Frontend:  http://localhost:5173
#   Backend:   http://localhost:8000/health
#   API docs:  http://localhost:8000/docs
```

---

## Local Development (without Docker)

### Backend

```bash
cd backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy and configure environment
cp ../.env.example .env
# Edit .env — at minimum set DATABASE_URL to a local Postgres instance

# Run database migrations
alembic upgrade head

# Start the development server
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start the Vite dev server (proxies /api/* to localhost:8000)
npm run dev
```

---

## Project Structure

```
synq/
  backend/              FastAPI application
    app/
      api/              Route modules (WS-4)
      core/             Config, security, dependencies
      db/               Async session factory (WS-2)
      models/           SQLAlchemy ORM models (WS-2)
      schemas/          Pydantic schemas (WS-4)
      services/         Business logic (WS-4)
      ingestion/        Document chunking + embedding (WS-5)
      rag/              Retrieval + LLM pipeline (WS-6)
    alembic/            Database migrations
    tests/              pytest test suite
  frontend/             React + TypeScript application
    src/
      api/              Typed Axios API client
      components/       Shared UI components (WS-8)
      features/         Feature modules (WS-9 — WS-13)
      hooks/            Custom React hooks
      pages/            Page-level components
      store/            Zustand global state
      types/            Shared TypeScript types
  data/                 Seed data (WS-14)
  docs/                 Architecture docs and demo script
  docker-compose.yml    Local development stack
  .env.example          Environment variable template
  synq-plan.md          Full implementation plan
```

---

## Running Tests

```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
npm test
```

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables with descriptions.

The minimum set to run locally:

| Variable | Description |
|---|---|
| `GOOGLE_API_KEY` | Google AI Studio API key ([get one free](https://aistudio.google.com/apikey)) |
| `LLM_MODEL_ID` | Chat model (default `gemini-3.6-flash`) |
| `EMBEDDING_MODEL_ID` | Embedding model (default `gemini-embedding-001`) |
| `EMBEDDING_DIMENSION` | Vector width — must match the pgvector column (default `768`) |
| `JWT_SECRET` | Secret key for signing JWTs |
| `DATABASE_URL` | PostgreSQL connection string |

---

## Deployment

| Service | Platform |
|---|---|
| Frontend | [Vercel](https://vercel.com) — set `VITE_API_BASE_URL` to the backend URL |
| Backend | [IBM Code Engine](https://cloud.ibm.com/codeengine) — deploy the `production` Docker target |
| Database | [Neon.tech](https://neon.tech) — serverless PostgreSQL with pgvector |

---

## Implementation Plan

The full workstream-by-workstream implementation plan is in [`synq-plan.md`](synq-plan.md).

Current status: **WS-1 (Scaffolding) complete.**

---

## Demo Company: NovaPay

The built-in demo dataset features **NovaPay**, a fictional fintech payments platform with:
- 6 services (Payment, Auth, Fraud Detection, Notification, Reporting, API Gateway)
- 6 Architecture Decision Records
- 3 incidents (including a P1 payment outage)
- 4 compliance and business requirements

Run the seed script after WS-14 is complete:
```bash
cd backend
python scripts/seed_demo.py
```

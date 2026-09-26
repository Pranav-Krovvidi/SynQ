"""
SynQ Backend — application entry point.

Starts a FastAPI application with:
- CORS configured for the React frontend origin
- /health liveness probe
- API v1 router with auth, projects, services, ADRs, documents
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings

app = FastAPI(
    title="SynQ API",
    description="AI-powered organisational memory for software engineering teams.",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# CORS — allow the Vite dev server and the production Vercel frontend
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Liveness probe — used by Docker Compose, Code Engine, and load balancers
# ---------------------------------------------------------------------------
@app.get("/health", tags=["system"])
@app.get("/healthz", tags=["system"])   # alias polled by the frontend
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}


# ---------------------------------------------------------------------------
# API v1 — all feature routers registered here
# ---------------------------------------------------------------------------
from fastapi import APIRouter  # noqa: E402

from app.api.v1 import auth, catalog, projects, services, adrs, documents, ingest, chat  # noqa: E402

api_v1 = APIRouter(prefix="/api/v1")


@api_v1.get("/ping", tags=["system"])
async def ping() -> dict:
    """Quick check that the v1 router is reachable."""
    return {"message": "pong"}


api_v1.include_router(auth.router)
api_v1.include_router(catalog.router)
api_v1.include_router(projects.router)
api_v1.include_router(services.router)
api_v1.include_router(adrs.router)
api_v1.include_router(documents.router)
api_v1.include_router(ingest.router)
api_v1.include_router(chat.router)

app.include_router(api_v1)

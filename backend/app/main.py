"""
SynQ Backend — application entry point.

Starts a FastAPI application with:
- CORS configured for the React frontend origin
- /health liveness probe
- API v1 router (placeholder, populated by future workstreams)
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
async def health() -> dict:
    return {"status": "ok", "version": "0.1.0"}


# ---------------------------------------------------------------------------
# API v1 router — feature routers are registered here in later workstreams
# ---------------------------------------------------------------------------
from fastapi import APIRouter  # noqa: E402

api_v1 = APIRouter(prefix="/api/v1")


@api_v1.get("/ping", tags=["system"])
async def ping() -> dict:
    """Quick check that the v1 router is reachable."""
    return {"message": "pong"}


app.include_router(api_v1)

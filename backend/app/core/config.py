"""
Application configuration.

All settings are read from environment variables (or a .env file in development).
No secret should ever be hardcoded here.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ------------------------------------------------------------------
    # Database
    # ------------------------------------------------------------------
    database_url: str = "postgresql+asyncpg://synq:synq_dev@localhost:5432/synq"

    # ------------------------------------------------------------------
    # Auth
    # ------------------------------------------------------------------
    jwt_secret: str = "change-me-in-development"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 8

    # ------------------------------------------------------------------
    # Google AI Studio (Gemini)
    # ------------------------------------------------------------------
    # Free API key: https://aistudio.google.com/apikey
    google_api_key: str = ""

    # Check which models have a free-tier row for your key at
    # https://aistudio.google.com/rate-limit — override via LLM_MODEL_ID.
    llm_model_id: str = "gemini-3.6-flash"

    # gemini-embedding-001 supports task types and Matryoshka truncation.
    # (gemini-embedding-2-preview does NOT accept task_type.)
    embedding_model_id: str = "gemini-embedding-001"

    # gemini-embedding-001 emits 3072 dims natively and can be truncated to
    # any width; Google recommends 3072, 1536 or 768.  This value is the
    # pgvector column width — changing it requires a new migration.
    embedding_dimension: int = 768

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    cors_origins: list[str] = [
        "http://localhost:3000",   # Next.js dev server
        "http://localhost:8000",   # direct backend access
        "https://synq.vercel.app", # production Vercel deployment
    ]


settings = Settings()

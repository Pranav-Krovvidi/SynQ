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
    # watsonx.ai
    # ------------------------------------------------------------------
    watsonx_api_key: str = ""
    watsonx_project_id: str = ""
    watsonx_url: str = "https://us-south.ml.cloud.ibm.com"
    llm_model_id: str = "ibm/granite-3-3-8b-instruct"
    embedding_model_id: str = "ibm/slate-125m-english-rtrvr"
    embedding_dimension: int = 384

    # ------------------------------------------------------------------
    # CORS
    # ------------------------------------------------------------------
    cors_origins: list[str] = [
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # alternative local port
        "https://synq.vercel.app", # production Vercel deployment
    ]


settings = Settings()

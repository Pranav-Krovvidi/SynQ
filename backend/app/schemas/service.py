"""
app.schemas.service — Pydantic models for Service CRUD.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class ServiceCreate(BaseModel):
    name: str
    description: str | None = None
    tech_stack: str | None = None
    repo_url: str | None = None
    tags: list[str] = []


class ServiceUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    tech_stack: str | None = None
    repo_url: str | None = None
    tags: list[str] | None = None


class ServiceOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    tech_stack: str | None
    repo_url: str | None
    tags: list[str]
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

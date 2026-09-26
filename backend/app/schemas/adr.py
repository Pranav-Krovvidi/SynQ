"""
app.schemas.adr — Pydantic models for ADR CRUD.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel

AdrStatus = str  # "proposed" | "accepted" | "deprecated" | "superseded"


class AdrCreate(BaseModel):
    title: str
    context: str | None = None
    decision: str | None = None
    consequences: str | None = None
    status: AdrStatus = "proposed"
    decided_at: datetime | None = None
    service_ids: list[uuid.UUID] = []


class AdrUpdate(BaseModel):
    title: str | None = None
    context: str | None = None
    decision: str | None = None
    consequences: str | None = None
    status: AdrStatus | None = None
    decided_at: datetime | None = None
    service_ids: list[uuid.UUID] | None = None


class AdrOut(BaseModel):
    id: uuid.UUID
    title: str
    context: str | None
    decision: str | None
    consequences: str | None
    status: str
    decided_at: datetime | None
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

"""
app.schemas.document — Pydantic models for Document listing.

Documents are created by the ingestion pipeline (WS-5), not directly
via a user-facing create endpoint.  Only list/get/delete are exposed here.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: uuid.UUID
    filename: str
    mime_type: str
    storage_path: str | None
    page_count: int | None
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

"""
app.services.document — read/delete operations for Document.

Documents are created by the ingestion pipeline (WS-5); this service
only provides list, get, and delete for the CRUD API.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document


async def get_document(db: AsyncSession, document_id: uuid.UUID) -> Document | None:
    result = await db.execute(select(Document).where(Document.id == document_id))
    return result.scalar_one_or_none()


async def list_documents(
    db: AsyncSession,
    project_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
) -> list[Document]:
    result = await db.execute(
        select(Document)
        .where(Document.project_id == project_id)
        .order_by(Document.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def delete_document(db: AsyncSession, document: Document) -> None:
    await db.delete(document)
    await db.commit()

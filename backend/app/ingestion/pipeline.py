"""
app.ingestion.pipeline — end-to-end ingestion orchestration.

Flow
----
  upload bytes
      │
      ▼
  chunker.chunk_bytes()          ← extract text + split into TextChunks
      │
      ▼
  embedder.embed_texts()         ← call Gemini embeddings for each chunk
      │
      ▼
  persist Document + Chunks      ← write to PostgreSQL via SQLAlchemy

Public entry-point
------------------
  ingest_document(db, project_id, filename, mime_type, data)
      → Document ORM object with all Chunk rows committed

  ingest_adr_text(db, adr)
      → re-chunks the ADR body and upserts Chunk rows
"""

from __future__ import annotations

import logging
import uuid

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.ingestion.chunker import chunk_bytes, chunk_text
from app.ingestion.embedder import embed_texts
from app.models.document import Chunk, Document
from app.models.adr import Adr

logger = logging.getLogger(__name__)


async def ingest_document(
    db: AsyncSession,
    project_id: uuid.UUID,
    filename: str,
    mime_type: str,
    data: bytes,
) -> Document:
    """
    Ingest a raw file upload into a project.

    1. Persist a ``Document`` row.
    2. Extract text and split into chunks.
    3. Embed all chunks in batches via Gemini.
    4. Persist ``Chunk`` rows with embeddings.

    Parameters
    ----------
    db:         Active async database session.
    project_id: UUID of the owning project.
    filename:   Original filename (used for display).
    mime_type:  MIME type — determines the text-extraction strategy.
    data:       Raw file bytes.

    Returns
    -------
    Document
        The newly persisted Document ORM object.
    """
    # ------------------------------------------------------------------ #
    # 1. Extract text and chunk
    # ------------------------------------------------------------------ #
    text_chunks, page_count = chunk_bytes(data, mime_type)
    logger.info(
        "Ingesting %r: %d chunks from %d page(s)",
        filename, len(text_chunks), page_count,
    )

    # ------------------------------------------------------------------ #
    # 2. Persist Document
    # ------------------------------------------------------------------ #
    document = Document(
        filename=filename,
        mime_type=mime_type,
        page_count=page_count,
        project_id=project_id,
    )
    db.add(document)
    await db.flush()  # get document.id without committing yet

    # ------------------------------------------------------------------ #
    # 3. Embed all chunk texts in one batched call
    # ------------------------------------------------------------------ #
    texts = [c.content for c in text_chunks]
    vectors = await embed_texts(texts)

    # ------------------------------------------------------------------ #
    # 4. Persist Chunk rows
    # ------------------------------------------------------------------ #
    for tc, vector in zip(text_chunks, vectors):
        chunk = Chunk(
            content=tc.content,
            token_count=tc.token_count,
            chunk_index=tc.chunk_index,
            embedding=vector,
            document_id=document.id,
        )
        db.add(chunk)

    await db.commit()
    await db.refresh(document)
    logger.info("Ingestion complete: document_id=%s", document.id)
    return document


async def ingest_adr_text(db: AsyncSession, adr: Adr) -> None:
    """
    (Re-)chunk and embed the text body of an ADR.

    Deletes existing Chunk rows for this ADR before inserting new ones,
    so this function is safe to call after an ADR update.

    The ADR body is formed by concatenating:
      context + decision + consequences
    """
    body_parts = [
        adr.context or "",
        adr.decision or "",
        adr.consequences or "",
    ]
    body = "\n\n".join(p for p in body_parts if p.strip())
    if not body.strip():
        logger.debug("ADR %s has no text body — skipping ingestion", adr.id)
        return

    # Remove stale chunks
    await db.execute(delete(Chunk).where(Chunk.adr_id == adr.id))

    text_chunks = chunk_text(body)
    texts = [c.content for c in text_chunks]
    vectors = await embed_texts(texts)

    for tc, vector in zip(text_chunks, vectors):
        chunk = Chunk(
            content=tc.content,
            token_count=tc.token_count,
            chunk_index=tc.chunk_index,
            embedding=vector,
            adr_id=adr.id,
        )
        db.add(chunk)

    await db.commit()
    logger.info(
        "ADR ingestion complete: adr_id=%s, %d chunks", adr.id, len(text_chunks)
    )

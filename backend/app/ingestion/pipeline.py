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

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ingestion.chunker import chunk_bytes, chunk_text
from app.ingestion.embedder import embed_texts
from app.models.document import Chunk, Document
from app.models.adr import Adr
from app.models.incident import Incident
from app.models.service import Service

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


# ---------------------------------------------------------------------------
# Catalog entities as searchable text
#
# Retrieval only sees Chunks, and Chunks hang off a Document or an ADR. Services
# and incidents had neither, so none of their prose was searchable and the model
# answered "I don't have enough evidence" for anything outside the ADRs. Each
# record is indexed as a synthetic Document, which needs no schema change and
# reuses the existing document retrieval path.
# ---------------------------------------------------------------------------

async def _index_as_document(
    db: AsyncSession,
    *,
    project_id: uuid.UUID,
    filename: str,
    body: str,
) -> int:
    """Replace the synthetic document named `filename` with freshly embedded text.

    Keyed on (project_id, filename) so re-running is idempotent rather than
    accumulating duplicates.
    """
    if not body.strip():
        return 0

    existing = await db.scalar(
        select(Document).where(
            Document.project_id == project_id, Document.filename == filename
        )
    )
    if existing is not None:
        await db.execute(delete(Chunk).where(Chunk.document_id == existing.id))
        document = existing
    else:
        document = Document(
            filename=filename,
            mime_type="text/plain",
            project_id=project_id,
        )
        db.add(document)
        await db.flush()

    text_chunks = chunk_text(body)
    vectors = await embed_texts([c.content for c in text_chunks])
    for tc, vector in zip(text_chunks, vectors):
        db.add(
            Chunk(
                content=tc.content,
                token_count=tc.token_count,
                chunk_index=tc.chunk_index,
                embedding=vector,
                document_id=document.id,
            )
        )
    return len(text_chunks)


async def ingest_service_text(db: AsyncSession, service: Service) -> int:
    """Make a service's description and tech stack searchable."""
    parts = [
        f"Service: {service.name}",
        service.description or "",
        f"Tech stack: {service.tech_stack}" if service.tech_stack else "",
        f"Tags: {', '.join(service.tags)}" if service.tags else "",
    ]
    body = "\n\n".join(p for p in parts if p.strip())
    count = await _index_as_document(
        db,
        project_id=service.project_id,
        filename=f"service::{service.name}",
        body=body,
    )
    logger.info("Service ingestion: %s -> %d chunks", service.name, count)
    return count


async def ingest_incident_text(db: AsyncSession, incident: Incident) -> int:
    """Make an incident's narrative searchable.

    Summary, root cause and resolution are the parts people actually ask about.
    """
    parts = [
        f"Incident {incident.incident_key}: {incident.title}",
        f"Severity: {incident.severity}. Status: {incident.status}.",
        incident.summary or "",
        f"Root cause: {incident.root_cause}" if incident.root_cause else "",
        f"Resolution: {incident.resolution}" if incident.resolution else "",
    ]
    body = "\n\n".join(p for p in parts if p.strip())
    count = await _index_as_document(
        db,
        project_id=incident.project_id,
        filename=f"incident::{incident.incident_key}",
        body=body,
    )
    logger.info("Incident ingestion: %s -> %d chunks", incident.incident_key, count)
    return count

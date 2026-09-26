"""
Document and Chunk models.

Document — a source file (PDF, Markdown, etc.) uploaded to a Project.
Chunk    — a text fragment extracted from a Document, with a pgvector
           embedding column for semantic search.
"""

from __future__ import annotations

import uuid

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.config import settings
from app.models.base import Base, TimestampMixin


class Document(TimestampMixin, Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    filename: Mapped[str] = mapped_column(String(512), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(128), nullable=False, default="text/plain")
    storage_path: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # relationships
    project: Mapped["Project"] = relationship(  # type: ignore[name-defined]
        "Project", back_populates="documents"
    )
    chunks: Mapped[list["Chunk"]] = relationship(
        "Chunk", back_populates="document", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Document id={self.id} filename={self.filename!r}>"


class Chunk(TimestampMixin, Base):
    """
    A text chunk extracted from a Document or ADR, with a pgvector embedding.

    Source discriminator:
      - document_id set → came from a Document
      - adr_id set      → came from an ADR (body text)
    """

    __tablename__ = "chunks"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # pgvector column — dimension pulled from settings so it matches the model
    embedding: Mapped[list[float]] = mapped_column(
        Vector(settings.embedding_dimension), nullable=True
    )

    # source FK — exactly one should be non-null
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), nullable=True, index=True
    )
    adr_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("adrs.id", ondelete="CASCADE"), nullable=True, index=True
    )

    # relationships
    document: Mapped["Document | None"] = relationship(
        "Document", back_populates="chunks"
    )
    adr: Mapped["Adr | None"] = relationship(  # type: ignore[name-defined]
        "Adr", back_populates="chunks"
    )

    def __repr__(self) -> str:
        return f"<Chunk id={self.id} index={self.chunk_index} tokens={self.token_count}>"

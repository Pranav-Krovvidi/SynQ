"""
QueryLog model.

Records every RAG query for audit, analytics, and re-ranking signals.
"""

from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class QueryLog(TimestampMixin, Base):
    __tablename__ = "query_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # comma-separated chunk UUIDs that were retrieved
    retrieved_chunk_ids: Mapped[str | None] = mapped_column(Text, nullable=True)
    feedback_score: Mapped[float | None] = mapped_column(Float, nullable=True)

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    project_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # relationships
    user: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="query_logs"
    )

    def __repr__(self) -> str:
        return f"<QueryLog id={self.id} user_id={self.user_id}>"

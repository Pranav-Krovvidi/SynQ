"""
ADR (Architecture Decision Record) model.

Status lifecycle: proposed → accepted | deprecated | superseded
An ADR can be linked to many Services via the adr_services join table.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, Table, Text, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.employee import Employee


# Many-to-many join table: ADR ↔ Service
adr_services = Table(
    "adr_services",
    Base.metadata,
    Column("adr_id", ForeignKey("adrs.id", ondelete="CASCADE"), primary_key=True),
    Column("service_id", ForeignKey("services.id", ondelete="CASCADE"), primary_key=True),
)


class Adr(TimestampMixin, Base):
    __tablename__ = "adrs"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(512), nullable=False)
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    decision: Mapped[str | None] = mapped_column(Text, nullable=True)
    consequences: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="proposed", index=True
    )
    decided_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_employee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # relationships
    project: Mapped["Project"] = relationship(  # type: ignore[name-defined]
        "Project", back_populates="adrs"
    )
    author_employee: Mapped["Employee | None"] = relationship("Employee")
    services: Mapped[list["Service"]] = relationship(  # type: ignore[name-defined]
        "Service", secondary="adr_services", back_populates="adrs"
    )
    chunks: Mapped[list["Chunk"]] = relationship(  # type: ignore[name-defined]
        "Chunk", back_populates="adr", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Adr id={self.id} title={self.title!r} status={self.status}>"

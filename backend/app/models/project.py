"""
Project model.

A Project is the top-level container — all Services, ADRs, and Documents
belong to exactly one Project.
"""

from __future__ import annotations

import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    owner_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # relationships
    owner: Mapped["User"] = relationship(  # type: ignore[name-defined]
        "User", back_populates="projects"
    )
    services: Mapped[list["Service"]] = relationship(  # type: ignore[name-defined]
        "Service", back_populates="project", cascade="all, delete-orphan"
    )
    adrs: Mapped[list["Adr"]] = relationship(  # type: ignore[name-defined]
        "Adr", back_populates="project", cascade="all, delete-orphan"
    )
    documents: Mapped[list["Document"]] = relationship(  # type: ignore[name-defined]
        "Document", back_populates="project", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Project id={self.id} name={self.name!r}>"

"""
Service model.

Represents a software service (microservice, library, data store, etc.)
within a Project.  Tags are stored as a plain text array via PostgreSQL ARRAY.
"""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from typing import TYPE_CHECKING

from sqlalchemy import ARRAY, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin

if TYPE_CHECKING:
    from app.models.employee import Employee


class Service(TimestampMixin, Base):
    __tablename__ = "services"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    tech_stack: Mapped[str | None] = mapped_column(Text, nullable=True)
    repo_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    tags: Mapped[list[str]] = mapped_column(
        ARRAY(String(64)), nullable=False, default=list
    )

    owner_employee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner_employee_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True, index=True
    )

    # relationships
    owner_employee: Mapped["Employee | None"] = relationship("Employee")
    project: Mapped["Project"] = relationship(  # type: ignore[name-defined]
        "Project", back_populates="services"
    )
    owner_employee: Mapped["Employee | None"] = relationship("Employee")
    adrs: Mapped[list["Adr"]] = relationship(  # type: ignore[name-defined]
        "Adr", secondary="adr_services", back_populates="services"
    )

    def __repr__(self) -> str:
        return f"<Service id={self.id} name={self.name!r}>"

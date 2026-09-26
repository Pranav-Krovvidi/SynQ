"""Company model for grouping projects and employee profiles."""

from __future__ import annotations

import uuid

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Company(TimestampMixin, Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    industry: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)

    projects: Mapped[list["Project"]] = relationship(
        "Project", back_populates="company"
    )
    employees: Mapped[list["Employee"]] = relationship(
        "Employee", back_populates="company", cascade="all, delete-orphan"
    )
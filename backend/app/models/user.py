"""
User model.

Roles
-----
- admin       : full access including user management
- contributor : can create/edit entities and run chat
- viewer      : read-only + chat
"""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    role: Mapped[str] = mapped_column(String(32), nullable=False, default="viewer")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    # relationships (back-populated by child models)
    projects: Mapped[list["Project"]] = relationship(  # type: ignore[name-defined]
        "Project", back_populates="owner", cascade="all, delete-orphan"
    )
    query_logs: Mapped[list["QueryLog"]] = relationship(  # type: ignore[name-defined]
        "QueryLog", back_populates="user", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"

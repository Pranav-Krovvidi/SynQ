"""
app.models — SQLAlchemy ORM models.

Import this package to ensure all models are registered with Base.metadata
before running Alembic autogenerate or creating tables.
"""

from app.models.base import Base, TimestampMixin  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.service import Service  # noqa: F401
from app.models.adr import Adr, adr_services  # noqa: F401
from app.models.document import Document, Chunk  # noqa: F401
from app.models.query_log import QueryLog  # noqa: F401

__all__ = [
    "Base",
    "TimestampMixin",
    "User",
    "Project",
    "Service",
    "Adr",
    "adr_services",
    "Document",
    "Chunk",
    "QueryLog",
]

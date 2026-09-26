"""
conftest.py — shared pytest fixtures for the SynQ test suite.

Creates a per-test SQLite database with all tables, patching
PostgreSQL-only column types (ARRAY, Vector) to SQLite equivalents
so no live database is needed for unit tests.
"""

from __future__ import annotations

import json
import pytest
from sqlalchemy import Text, TypeDecorator
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db.session import get_db
from app.main import app
from app.models.base import Base


# ---------------------------------------------------------------------------
# JsonList — TypeDecorator that serialises list↔JSON for SQLite
# ---------------------------------------------------------------------------
class JsonList(TypeDecorator):
    """Stores a Python list as a JSON string; transparent on Postgres."""

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is None:
            return "[]"
        return json.dumps(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return []
        return json.loads(value)


# ---------------------------------------------------------------------------
# Patch ARRAY and Vector to SQLite-compatible types — test-only
# ---------------------------------------------------------------------------
def _patch_metadata_for_sqlite(metadata):
    """
    Walk every column in metadata and replace ARRAY / Vector with SQLite-
    compatible equivalents so the schema can be created in-memory.
    """
    from sqlalchemy import ARRAY
    try:
        from pgvector.sqlalchemy import Vector
        _vector_type = Vector
    except ImportError:
        _vector_type = None

    for table in metadata.tables.values():
        for col in table.columns:
            if isinstance(col.type, ARRAY):
                col.type = JsonList()   # round-trips list ↔ JSON string
            elif _vector_type and isinstance(col.type, _vector_type):
                col.type = JsonList()   # round-trips list[float] ↔ JSON string


_patch_metadata_for_sqlite(Base.metadata)


# ---------------------------------------------------------------------------
# Async SQLite engine
# ---------------------------------------------------------------------------
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


@pytest.fixture(autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.fixture
def override_db(setup_db):
    async def _get_test_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()

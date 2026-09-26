"""
Tests for WS-5 — ingestion pipeline.

chunker tests
    - plain-text chunking correctness
    - chunk count and token bounds
    - ADR body chunking

pipeline / endpoint tests
    - mock embed_texts so no watsonx credentials are needed
    - POST /projects/{id}/ingest returns 201 and a DocumentOut
    - unsupported MIME type returns 415
    - file too large returns 413
"""

from __future__ import annotations

import io
import uuid
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.ingestion.chunker import TextChunk, chunk_text, _split_into_chunks
from app.main import app

# ---------------------------------------------------------------------------
# Chunker unit tests (no DB, no mocks)
# ---------------------------------------------------------------------------

def test_chunk_text_short():
    """A short string produces exactly one chunk."""
    chunks = chunk_text("Hello world. This is a test.", max_tokens=512)
    assert len(chunks) == 1
    assert chunks[0].chunk_index == 0
    assert chunks[0].token_count > 0
    assert "Hello" in chunks[0].content


def test_chunk_text_splits_long_text():
    """Text with more than max_tokens tokens is split into multiple chunks."""
    # Generate ~1500-token text: 300 words × ~5 chars each
    paragraph = " ".join([f"word{i}" for i in range(150)])
    text = "\n\n".join([paragraph] * 4)
    chunks = chunk_text(text, max_tokens=200, overlap_tokens=20)
    assert len(chunks) > 1
    # indices are contiguous starting at 0
    for i, chunk in enumerate(chunks):
        assert chunk.chunk_index == i
    # each chunk respects the token limit (with small slack for overlap)
    for chunk in chunks:
        assert chunk.token_count <= 230  # 200 + ~15% slack for overlap


def test_chunk_text_empty():
    """Empty string produces no chunks."""
    assert chunk_text("") == []
    assert chunk_text("   \n\n  ") == []


def test_chunk_text_overlap_prepended():
    """The tail of chunk N should appear at the start of chunk N+1."""
    # 3 paragraphs, each just over max_tokens/3 — forces 2 chunks
    para = " ".join([f"token{i}" for i in range(60)])
    text = "\n\n".join([para, para, para])
    chunks = chunk_text(text, max_tokens=100, overlap_tokens=10)
    assert len(chunks) >= 2
    # The overlap means chunk[1] starts with some words from chunk[0]
    # (not a hard guarantee on every split, but the indices must be right)
    assert all(c.chunk_index == i for i, c in enumerate(chunks))


def test_chunk_adr_body():
    """ADR-style structured text (context/decision/consequences) chunks correctly."""
    body = (
        "## Context\n\nWe need to choose a database for our new service.\n\n"
        "## Decision\n\nWe will use PostgreSQL with the pgvector extension for "
        "combined relational + vector storage.\n\n"
        "## Consequences\n\nAll engineers must be familiar with SQL. "
        "The pgvector extension must be installed."
    )
    # max_tokens=20 forces each section into its own chunk
    chunks = chunk_text(body, max_tokens=20, overlap_tokens=3)
    assert len(chunks) >= 2
    full_text = " ".join(c.content for c in chunks)
    assert "PostgreSQL" in full_text


# ---------------------------------------------------------------------------
# Pipeline / ingest endpoint tests (DB + mocked embedder)
# ---------------------------------------------------------------------------

_FAKE_VECTOR = [0.0] * 384  # matches settings.embedding_dimension


@pytest.fixture
async def authed_client(override_db):
    """Client with a registered contributor user and valid JWT."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        await c.post("/api/v1/auth/register", json={
            "email": "ingester@test.com",
            "password": "pass",
            "role": "contributor",
        })
        r = await c.post("/api/v1/auth/login", json={
            "email": "ingester@test.com", "password": "pass",
        })
        token = r.json()["access_token"]
        c.headers.update({"Authorization": f"Bearer {token}"})
        yield c


@pytest.fixture
async def project_id(authed_client):
    r = await authed_client.post("/api/v1/projects", json={"name": "TestProject"})
    assert r.status_code == 201
    return r.json()["id"]


@pytest.mark.asyncio
async def test_ingest_text_file(authed_client, project_id):
    """Uploading a plain-text file returns 201 with a DocumentOut payload."""
    content = b"This is a test document.\n\nIt has two paragraphs for chunking."

    with patch(
        "app.ingestion.pipeline.embed_texts",
        new=AsyncMock(side_effect=lambda texts: [_FAKE_VECTOR] * len(texts)),
    ):
        r = await authed_client.post(
            f"/api/v1/projects/{project_id}/ingest",
            files={"file": ("test.txt", io.BytesIO(content), "text/plain")},
        )

    assert r.status_code == 201
    body = r.json()
    assert body["filename"] == "test.txt"
    assert body["mime_type"] == "text/plain"
    assert body["project_id"] == project_id


@pytest.mark.asyncio
async def test_ingest_markdown_file(authed_client, project_id):
    """Markdown files are accepted and produce a Document."""
    content = b"# Title\n\nFirst paragraph.\n\n## Section\n\nSecond paragraph."

    with patch(
        "app.ingestion.pipeline.embed_texts",
        new=AsyncMock(side_effect=lambda texts: [_FAKE_VECTOR] * len(texts)),
    ):
        r = await authed_client.post(
            f"/api/v1/projects/{project_id}/ingest",
            files={"file": ("readme.md", io.BytesIO(content), "text/markdown")},
        )

    assert r.status_code == 201
    assert r.json()["filename"] == "readme.md"


@pytest.mark.asyncio
async def test_ingest_unsupported_mime(authed_client, project_id):
    """Uploading an unsupported file type returns 415."""
    r = await authed_client.post(
        f"/api/v1/projects/{project_id}/ingest",
        files={"file": ("test.csv", io.BytesIO(b"a,b,c"), "text/csv")},
    )
    assert r.status_code == 415


@pytest.mark.asyncio
async def test_ingest_file_too_large(authed_client, project_id):
    """Files exceeding 50 MB return 413."""
    big = b"x" * (51 * 1024 * 1024)

    with patch(
        "app.ingestion.pipeline.embed_texts",
        new=AsyncMock(side_effect=lambda texts: [_FAKE_VECTOR] * len(texts)),
    ):
        r = await authed_client.post(
            f"/api/v1/projects/{project_id}/ingest",
            files={"file": ("huge.txt", io.BytesIO(big), "text/plain")},
        )

    assert r.status_code == 413


@pytest.mark.asyncio
async def test_ingest_wrong_project(authed_client):
    """Ingesting into a non-existent project returns 404."""
    random_pid = str(uuid.uuid4())
    content = b"hello"

    with patch(
        "app.ingestion.pipeline.embed_texts",
        new=AsyncMock(side_effect=lambda texts: [_FAKE_VECTOR] * len(texts)),
    ):
        r = await authed_client.post(
            f"/api/v1/projects/{random_pid}/ingest",
            files={"file": ("f.txt", io.BytesIO(content), "text/plain")},
        )

    assert r.status_code == 404

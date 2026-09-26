"""Regression tests for bugs found during the debug pass."""
from __future__ import annotations

import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import create_access_token
from app.main import app


@pytest.fixture
async def client(override_db):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


async def test_malformed_token_subject_returns_401(client):
    """A validly-signed token whose `sub` is not a UUID must yield 401."""
    token = create_access_token(subject="not-a-uuid")
    r = await client.get(
        "/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 401, f"got {r.status_code}"


async def test_service_scope_is_applied_in_semantic_search():
    """scope_type='service' must narrow the SQL, not silently fall back."""
    from app.rag.retriever import _semantic_search

    captured = {}

    class FakeResult:
        def fetchall(self):
            return []

    class FakeDB:
        async def execute(self, sql, params=None):
            captured["sql"] = str(sql)
            captured["params"] = params
            return FakeResult()

    sid = uuid.uuid4()
    await _semantic_search(
        FakeDB(), [0.1, 0.2], uuid.uuid4(), "service", sid, 20
    )
    assert "scope_id" in captured["sql"], (
        "service scope was dropped; SQL has no scope filter:\n" + captured["sql"]
    )


async def test_byc_pipeline_scopes_retrieval_to_service():
    """run_byc_pipeline must pass the service scope to the retriever."""
    import app.rag.pipeline as pipeline

    seen = {}

    async def fake_retrieve(db, question, project_id, scope_type=None,
                            scope_id=None, top_n=8):
        seen["scope_type"] = scope_type
        seen["scope_id"] = scope_id
        return []

    async def fake_save(*a, **k):
        return uuid.uuid4()

    orig_r, orig_s = pipeline.retrieve_chunks, pipeline._save_query_log
    pipeline.retrieve_chunks, pipeline._save_query_log = fake_retrieve, fake_save
    try:
        sid = uuid.uuid4()
        gen = pipeline.run_byc_pipeline(
            db=None, user=None, project_id=uuid.uuid4(), service_id=sid,
            service_name="billing", service_summary={},
        )
        async for _ in gen:
            pass
        assert seen["scope_type"] == "service", (
            f"BYC retrieval not service-scoped: scope_type={seen['scope_type']!r}"
        )
        assert seen["scope_id"] == sid
    finally:
        pipeline.retrieve_chunks, pipeline._save_query_log = orig_r, orig_s


def test_embedding_dimension_matches_pgvector_column():
    """The configured width must match the vector(N) column in the migration.

    A mismatch is fatal at insert time ("expected N dimensions, not M"), and
    Gemini will happily return whatever width is asked for, so nothing else
    catches it.
    """
    import re
    from pathlib import Path
    from app.core.config import settings

    # Google recommends these widths for gemini-embedding-001.
    assert settings.embedding_dimension in (768, 1536, 3072), (
        f"{settings.embedding_dimension} is not a recommended width"
    )

    migration = Path(__file__).parent.parent / "alembic/versions/0001_initial_schema.py"
    src = migration.read_text()
    # The migration derives its width from settings, so they cannot drift.
    assert "Vector(settings.embedding_dimension)" in src, (
        "migration hardcodes a vector width instead of reading settings"
    )


async def test_query_and_document_embeddings_use_different_task_types():
    """Retrieval quality depends on embedding queries as queries.

    Gemini embeds RETRIEVAL_QUERY and RETRIEVAL_DOCUMENT differently; using
    the document task type for a search query silently degrades ranking.
    """
    import app.rag.retriever as r
    from app.ingestion.embedder import TASK_DOCUMENT, TASK_QUERY

    seen = {}

    async def fake_embed(texts, task_type=None):
        seen["task_type"] = task_type
        return [[0.1] * 768]

    async def fake_sem(db, vec, pid, st, sid, limit):
        return []

    async def fake_kw(db, q, pid, limit, st=None, sid=None):
        return []

    o = (r.embed_texts, r._semantic_search, r._keyword_search)
    r.embed_texts, r._semantic_search, r._keyword_search = fake_embed, fake_sem, fake_kw
    try:
        await r.retrieve_chunks(None, "how do retries work?", uuid.uuid4())
    finally:
        r.embed_texts, r._semantic_search, r._keyword_search = o

    assert seen["task_type"] == TASK_QUERY, (
        f"query embedded as {seen['task_type']!r}, expected {TASK_QUERY}"
    )
    assert TASK_QUERY != TASK_DOCUMENT


def test_generation_params_use_gemini_key_names():
    """Gemini's GenerateContentConfig takes `max_output_tokens`.

    watsonx's `max_new_tokens` / `max_tokens` are silently ignored here, which
    would drop the grounded low-temperature setting.
    """
    from google.genai import types
    from app.rag.llm_client import _DEFAULT_PARAMS

    assert "max_new_tokens" not in _DEFAULT_PARAMS
    assert _DEFAULT_PARAMS["max_output_tokens"] == 1024
    assert _DEFAULT_PARAMS["temperature"] == 0.1
    # Every key must be a real field, or the SDK rejects the config.
    for key in _DEFAULT_PARAMS:
        assert key in types.GenerateContentConfig.model_fields, key


async def test_system_prompt_and_params_reach_the_api():
    """The system prompt goes in system_instruction, not into contents."""
    import app.rag.llm_client as lc

    seen = {}

    class FakeModels:
        async def generate_content_stream(self, *, model, contents, config):
            seen.update(model=model, contents=contents, config=config)

            async def _gen():
                yield type("C", (), {"text": "hi"})()
            return _gen()

    class FakeClient:
        aio = type("A", (), {"models": FakeModels()})()

    orig = lc._get_client
    lc._get_client = lambda: FakeClient()
    try:
        out = [t async for t in lc.stream_tokens("SYSTEM", "USER")]
    finally:
        lc._get_client = orig

    assert out == ["hi"]
    assert seen["config"].system_instruction == "SYSTEM"
    assert seen["config"].max_output_tokens == 1024
    assert seen["config"].temperature == 0.1
    # The system prompt must NOT be duplicated into the turn list.
    assert seen["contents"] == [{"role": "user", "parts": [{"text": "USER"}]}]


async def test_history_maps_assistant_role_to_model():
    """Gemini names the assistant role `model`; `assistant` is invalid."""
    import app.rag.llm_client as lc

    contents = lc._build_contents(
        "now this",
        [{"role": "user", "content": "earlier q"},
         {"role": "assistant", "content": "earlier a"}],
    )
    roles = [c["role"] for c in contents]
    assert roles == ["user", "model", "user"], roles
    assert "assistant" not in roles


async def test_scoped_retrieval_falls_back_to_project_wide():
    """A scope that matches nothing must retry project-wide, as documented."""
    import app.rag.retriever as r

    calls = []

    async def fake_sem(db, vec, pid, st, sid, limit):
        calls.append(st)
        return [] if st == "service" else [uuid.uuid4()]

    async def fake_kw(db, q, pid, limit, st=None, sid=None):
        return []

    async def fake_embed(texts, task_type=None):
        return [[0.1, 0.2]]

    class FakeResult:
        def scalars(self):
            class S:
                def all(self): return []
            return S()

    class FakeDB:
        async def execute(self, *a, **k): return FakeResult()

    o = (r._semantic_search, r._keyword_search, r.embed_texts)
    r._semantic_search, r._keyword_search, r.embed_texts = fake_sem, fake_kw, fake_embed
    try:
        await r.retrieve_chunks(
            FakeDB(), "q", uuid.uuid4(), scope_type="service", scope_id=uuid.uuid4()
        )
    finally:
        r._semantic_search, r._keyword_search, r.embed_texts = o

    assert calls == ["service", None], f"no project-wide fallback: {calls}"


async def test_adr_create_and_update_are_indexed(client):
    """An ADR must be chunked+embedded on write, or it is invisible to RAG.

    A service's chunks are reachable only through its ADRs, so an unindexed
    ADR also leaves service-scoped chat and Before You Change empty.
    """
    from sqlalchemy import func, select
    from app.models.document import Chunk
    from tests.conftest import TestSessionLocal

    r = await client.post("/api/v1/auth/register", json={
        "email": "adr-index@example.com", "password": "s3cret-pass",
        "full_name": "Dev", "role": "admin"})
    assert r.status_code == 201, r.text
    r = await client.post("/api/v1/auth/login", json={
        "email": "adr-index@example.com", "password": "s3cret-pass"})
    auth = {"Authorization": f"Bearer {r.json()['access_token']}"}

    r = await client.post("/api/v1/projects", json={"name": "P"}, headers=auth)
    pid = r.json()["id"]

    r = await client.post(f"/api/v1/projects/{pid}/adrs", json={
        "title": "Use exponential backoff",
        "context": "Retry storms overwhelmed the billing service.",
        "decision": "Adopt exponential backoff with jitter.",
        "consequences": "Slower worst-case recovery.",
        "status": "accepted"}, headers=auth)
    assert r.status_code == 201, r.text
    adr_id = r.json()["id"]

    async def count_chunks():
        async with TestSessionLocal() as s:
            return (await s.execute(
                select(func.count()).select_from(Chunk)
                .where(Chunk.adr_id == uuid.UUID(adr_id))
            )).scalar_one()

    assert await count_chunks() > 0, "ADR was not indexed on create"

    # An update must re-index rather than leave stale chunks behind.
    r = await client.patch(f"/api/v1/projects/{pid}/adrs/{adr_id}", json={
        "decision": "Adopt token-bucket rate limiting instead."}, headers=auth)
    assert r.status_code == 200, r.text
    assert await count_chunks() > 0, "ADR lost its index on update"

    async with TestSessionLocal() as s:
        rows = (await s.execute(
            select(Chunk.content).where(Chunk.adr_id == uuid.UUID(adr_id))
        )).scalars().all()
    assert any("token-bucket" in c for c in rows), (
        f"chunks are stale after update: {rows}"
    )


async def test_tokens_stream_incrementally():
    """Chunks must reach the caller as produced, not in one burst at the end.

    The pipeline wraps these in SSE `token` events, so buffering the whole
    generation first would defeat the streaming UX entirely.
    """
    import asyncio
    import time
    import app.rag.llm_client as lc

    class FakeModels:
        async def generate_content_stream(self, *, model, contents, config):
            async def _gen():
                for i in range(4):
                    await asyncio.sleep(0.1)
                    yield type("C", (), {"text": f"t{i}"})()
            return _gen()

    class FakeClient:
        aio = type("A", (), {"models": FakeModels()})()

    orig = lc._get_client
    lc._get_client = lambda: FakeClient()
    try:
        t0 = time.monotonic()
        times = []
        async for _ in lc.stream_tokens("sys", "user"):
            times.append(time.monotonic() - t0)
    finally:
        lc._get_client = orig

    assert len(times) == 4
    assert times[0] < 0.25, f"first chunk buffered until {times[0]:.2f}s"
    assert times[-1] - times[0] > 0.15, "chunks arrived in a single burst"


async def test_stream_error_propagates_after_partial_output():
    """A mid-stream SDK failure must surface, not be silently truncated."""
    import app.rag.llm_client as lc

    class FakeModels:
        async def generate_content_stream(self, *, model, contents, config):
            async def _gen():
                yield type("C", (), {"text": "partial"})()
                raise ValueError("gemini exploded")
            return _gen()

    class FakeClient:
        aio = type("A", (), {"models": FakeModels()})()

    orig = lc._get_client
    lc._get_client = lambda: FakeClient()
    try:
        got = []
        with pytest.raises(RuntimeError, match="LLM call failed"):
            async for t in lc.stream_tokens("s", "u"):
                got.append(t)
    finally:
        lc._get_client = orig
    assert got == ["partial"]


async def test_textless_chunks_are_skipped():
    """Safety blocks and usage-only deltas carry no text; they must not crash."""
    import app.rag.llm_client as lc

    class FakeModels:
        async def generate_content_stream(self, *, model, contents, config):
            async def _gen():
                yield type("C", (), {"text": None})()
                yield type("C", (), {"text": ""})()
                yield type("C", (), {"text": "real"})()
            return _gen()

    class FakeClient:
        aio = type("A", (), {"models": FakeModels()})()

    orig = lc._get_client
    lc._get_client = lambda: FakeClient()
    try:
        out = [t async for t in lc.stream_tokens("s", "u")]
    finally:
        lc._get_client = orig
    assert out == ["real"]

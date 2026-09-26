"""
Tests for WS-6 (RAG pipeline) and WS-7 (Chat API).

WS-6 unit tests:
  - RRF merge function (pure logic, no DB)
  - Citation extraction from answer text
  - Context builder output format

WS-7 integration tests:
  - POST /chat endpoint with a mocked LLM and retriever
  - POST /before-you-change endpoint with mocked pipeline
  - GET  /chat/history endpoint
"""

from __future__ import annotations

import json
import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.rag.citations import Citation, RetrievedChunk, extract_citations
from app.rag.context_builder import build_context
from app.rag.retriever import _rrf_merge


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
async def client(override_db):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


async def _register_and_login(client, email="rag@test.com", role="contributor"):
    await client.post("/api/v1/auth/register", json={
        "email": email, "password": "pass", "role": role,
    })
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "pass"})
    return r.json()["access_token"]


async def _make_project(client, token, name="RagProject"):
    r = await client.post(
        "/api/v1/projects",
        json={"name": name},
        headers={"Authorization": f"Bearer {token}"},
    )
    return r.json()["id"]


async def _make_service(client, token, pid, name="PaymentService"):
    r = await client.post(
        f"/api/v1/projects/{pid}/services",
        json={"name": name},
        headers={"Authorization": f"Bearer {token}"},
    )
    return r.json()["id"]


# ---------------------------------------------------------------------------
# WS-6 unit: RRF merge
# ---------------------------------------------------------------------------

def test_rrf_merge_both_lists():
    """Chunks appearing in both lists rank higher than single-list chunks."""
    a = uuid.uuid4()
    b = uuid.uuid4()
    c = uuid.uuid4()
    d = uuid.uuid4()

    sem = [a, b, c]       # a at rank 1, b at rank 2, c at rank 3
    kw  = [b, a, d]       # b at rank 1, a at rank 2, d at rank 3

    merged = _rrf_merge(sem, kw)
    ids = [m[0] for m in merged]

    # a and b should be at the top (appear in both lists)
    assert ids[0] in (a, b)
    assert ids[1] in (a, b)
    # c and d each appear in one list
    assert set(ids) == {a, b, c, d}


def test_rrf_merge_empty_lists():
    assert _rrf_merge([], []) == []


def test_rrf_merge_single_list():
    a, b, c = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    merged = _rrf_merge([a, b, c], [])
    ids = [m[0] for m in merged]
    assert ids == [a, b, c]


def test_rrf_merge_scores_decrease():
    """RRF scores must decrease monotonically in a single-list scenario."""
    ids = [uuid.uuid4() for _ in range(5)]
    merged = _rrf_merge(ids, [])
    scores = [s for _, s in merged]
    assert scores == sorted(scores, reverse=True)


def test_rrf_merge_deduplicates():
    """The same chunk ID appearing in both lists is merged, not duplicated."""
    a = uuid.uuid4()
    merged = _rrf_merge([a], [a])
    assert len(merged) == 1


# ---------------------------------------------------------------------------
# WS-6 unit: citation extraction
# ---------------------------------------------------------------------------

def _make_chunk(entity_type="adr", title="Test ADR") -> RetrievedChunk:
    return RetrievedChunk(
        id=uuid.uuid4(),
        content="Some relevant context about the system.",
        entity_type=entity_type,
        entity_id=uuid.uuid4(),
        entity_title=title,
    )


def test_extract_citations_basic():
    chunks = [_make_chunk(title="ADR One"), _make_chunk(title="ADR Two")]
    answer = "The service uses [SOURCE 1] and also [SOURCE 2]."
    cits = extract_citations(answer, chunks)
    assert len(cits) == 2
    assert cits[0].source_index == 1
    assert cits[0].entity_title == "ADR One"
    assert cits[1].source_index == 2
    assert cits[1].entity_title == "ADR Two"


def test_extract_citations_deduplicates():
    chunks = [_make_chunk()]
    answer = "[SOURCE 1] says X. As per [SOURCE 1], Y."
    cits = extract_citations(answer, chunks)
    assert len(cits) == 1


def test_extract_citations_out_of_range():
    chunks = [_make_chunk()]
    answer = "[SOURCE 5] references something that doesn't exist."
    cits = extract_citations(answer, chunks)
    assert len(cits) == 0


def test_extract_citations_empty_answer():
    chunks = [_make_chunk()]
    assert extract_citations("", chunks) == []


def test_extract_citations_no_sources():
    chunks = [_make_chunk()]
    answer = "This answer has no citations at all."
    assert extract_citations(answer, chunks) == []


def test_extract_citations_snippet_truncated():
    long_content = "x" * 500
    chunk = RetrievedChunk(
        id=uuid.uuid4(),
        content=long_content,
        entity_type="document",
        entity_id=uuid.uuid4(),
        entity_title="Big Doc",
    )
    cits = extract_citations("[SOURCE 1] mentioned.", [chunk])
    assert len(cits[0].snippet) <= 200


# ---------------------------------------------------------------------------
# WS-6 unit: context builder
# ---------------------------------------------------------------------------

def test_build_context_labels():
    chunks = [
        _make_chunk(entity_type="adr", title="My ADR"),
        _make_chunk(entity_type="document", title="my-doc.md"),
    ]
    ctx = build_context(chunks)
    assert "[SOURCE 1: ADR" in ctx
    assert '"My ADR"' in ctx
    assert "[SOURCE 2: Document" in ctx
    assert '"my-doc.md"' in ctx


def test_build_context_empty():
    assert build_context([]) == ""


# ---------------------------------------------------------------------------
# WS-7 integration: chat endpoint with mocked pipeline
# ---------------------------------------------------------------------------

def _mock_rag_pipeline(events):
    """Return an async generator that yields the given event dicts."""
    async def _gen(*args, **kwargs):
        for evt in events:
            yield evt
    return _gen


_SAMPLE_EVENTS = [
    {"event": "token",     "data": json.dumps({"delta": "Hello "})},
    {"event": "token",     "data": json.dumps({"delta": "world"})},
    {"event": "citations", "data": json.dumps({"citations": [], "query_log_id": str(uuid.uuid4())})},
    {"event": "done",      "data": json.dumps({})},
]


@pytest.mark.asyncio
async def test_chat_endpoint_streams(client):
    token = await _register_and_login(client)
    pid = await _make_project(client, token)
    auth = {"Authorization": f"Bearer {token}"}

    with patch(
        "app.api.v1.chat.run_rag_pipeline",
        side_effect=_mock_rag_pipeline(_SAMPLE_EVENTS),
    ):
        r = await client.post(
            f"/api/v1/projects/{pid}/chat",
            json={"question": "What is the payment service?"},
            headers=auth,
        )

    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]
    body = r.text
    assert "event: token" in body
    assert "event: citations" in body
    assert "event: done" in body


@pytest.mark.asyncio
async def test_chat_service_scoped_endpoint(client):
    token = await _register_and_login(client, email="svc@test.com")
    pid = await _make_project(client, token, name="ScopedProject")
    sid = await _make_service(client, token, pid)
    auth = {"Authorization": f"Bearer {token}"}

    with patch(
        "app.api.v1.chat.run_rag_pipeline",
        side_effect=_mock_rag_pipeline(_SAMPLE_EVENTS),
    ):
        r = await client.post(
            f"/api/v1/projects/{pid}/chat/service/{sid}",
            json={"question": "Any incidents?"},
            headers=auth,
        )

    assert r.status_code == 200
    assert "text/event-stream" in r.headers["content-type"]


_BYC_EVENTS = [
    {"event": "context",   "data": json.dumps({"service_summary": {"name": "PaySvc"}})},
    {"event": "token",     "data": json.dumps({"delta": "Key things: "})},
    {"event": "citations", "data": json.dumps({"citations": [], "query_log_id": str(uuid.uuid4())})},
    {"event": "done",      "data": json.dumps({})},
]


@pytest.mark.asyncio
async def test_before_you_change_endpoint(client):
    token = await _register_and_login(client, email="byc@test.com")
    pid = await _make_project(client, token, name="BYCProject")
    sid = await _make_service(client, token, pid, name="BYCSvc")
    auth = {"Authorization": f"Bearer {token}"}

    with patch(
        "app.api.v1.chat.run_byc_pipeline",
        side_effect=_mock_rag_pipeline(_BYC_EVENTS),
    ):
        r = await client.post(
            f"/api/v1/projects/{pid}/before-you-change/{sid}",
            json={"question": ""},
            headers=auth,
        )

    assert r.status_code == 200
    body = r.text
    assert "event: context" in body
    assert "event: token" in body
    assert "event: done" in body


@pytest.mark.asyncio
async def test_chat_history_empty(client):
    token = await _register_and_login(client, email="hist@test.com")
    pid = await _make_project(client, token, name="HistProject")
    auth = {"Authorization": f"Bearer {token}"}

    r = await client.get(f"/api/v1/projects/{pid}/chat/history", headers=auth)
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_chat_unauthenticated(client):
    r = await client.post(
        f"/api/v1/projects/{uuid.uuid4()}/chat",
        json={"question": "hi"},
    )
    assert r.status_code in (401, 403)


@pytest.mark.asyncio
async def test_byc_unknown_service(client):
    token = await _register_and_login(client, email="byc2@test.com")
    pid = await _make_project(client, token, name="BYCProject2")
    auth = {"Authorization": f"Bearer {token}"}

    r = await client.post(
        f"/api/v1/projects/{pid}/before-you-change/{uuid.uuid4()}",
        json={"question": ""},
        headers=auth,
    )
    assert r.status_code == 404

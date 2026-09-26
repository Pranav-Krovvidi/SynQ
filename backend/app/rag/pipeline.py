"""
app.rag.pipeline — async SSE event generator for the full RAG pipeline.

SSE event sequence
------------------
1. event: token   data: {"delta": "<text>"}   (one per token from the LLM)
2. event: citations data: {"citations": [...], "query_log_id": "<uuid>"}
3. event: done    data: {}

For the Before You Change variant an additional event is emitted first:
0. event: context  data: {"service_summary": {...}}

Usage::

    async for event in run_rag_pipeline(db, user, ...):
        yield event   # inside an EventSourceResponse generator
"""

from __future__ import annotations

import json
import logging
import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import asdict

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.query_log import QueryLog
from app.models.user import User
from app.rag.citations import Citation, extract_citations
from app.rag.catalog_facts import build_catalog_facts
from app.rag.context_builder import build_context
from app.rag.llm_client import stream_tokens
from app.rag.prompts import SYSTEM_PROMPT, build_byc_prompt, build_rag_user_prompt
from app.rag.retriever import RetrievedChunk, retrieve_chunks

logger = logging.getLogger(__name__)

# If no chunks are found we return this canned answer instead of calling the LLM.
_NO_CONTEXT_ANSWER = (
    "I don't have enough evidence in the available sources to answer this."
)


# ---------------------------------------------------------------------------
# SSE event helpers
# ---------------------------------------------------------------------------

def _token_event(delta: str) -> dict:
    return {"event": "token", "data": json.dumps({"delta": delta})}


def _citations_event(citations: list[Citation], query_log_id: uuid.UUID) -> dict:
    return {
        "event": "citations",
        "data": json.dumps({
            "citations": [
                {
                    "source_index": c.source_index,
                    "entity_type": c.entity_type,
                    "entity_id": c.entity_id,
                    "entity_title": c.entity_title,
                    "snippet": c.snippet,
                }
                for c in citations
            ],
            "query_log_id": str(query_log_id),
        }),
    }


def _done_event() -> dict:
    return {"event": "done", "data": json.dumps({})}


def _context_event(service_summary: dict) -> dict:
    return {"event": "context", "data": json.dumps({"service_summary": service_summary})}


# ---------------------------------------------------------------------------
# Query log persistence
# ---------------------------------------------------------------------------

async def _save_query_log(
    db: AsyncSession,
    user: User,
    project_id: uuid.UUID,
    question: str,
    answer: str,
    chunks: list[RetrievedChunk],
    latency_ms: int,
) -> uuid.UUID:
    chunk_ids_str = ",".join(str(c.id) for c in chunks)
    log = QueryLog(
        question=question,
        answer=answer,
        retrieved_chunk_ids=chunk_ids_str,
        latency_ms=latency_ms,
        user_id=user.id,
        project_id=project_id,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log.id


# ---------------------------------------------------------------------------
# Main pipeline
# ---------------------------------------------------------------------------

async def run_rag_pipeline(
    db: AsyncSession,
    user: User,
    project_id: uuid.UUID,
    question: str,
    conversation_history: list[dict] | None = None,
    scope_type: str | None = None,
    scope_id: uuid.UUID | None = None,
) -> AsyncIterator[dict]:
    """
    Full RAG pipeline as an async generator of SSE event dicts.

    Emits: token* → citations → done
    """
    start_ms = int(time.monotonic() * 1000)

    # 1. Retrieve relevant chunks.
    # Retrieval needs the embedding provider; a counting question does not, so a
    # provider outage degrades the answer rather than failing the request.
    try:
        chunks = await retrieve_chunks(
            db=db,
            question=question,
            project_id=project_id,
            scope_type=scope_type,
            scope_id=scope_id,
        )
    except Exception:  # noqa: BLE001 — provider/network failures must not 500
        logger.exception("chunk retrieval failed; answering from project facts only")
        chunks = []

    # Counts and per-person attribution come from aggregates, not from vector
    # search, so they are gathered separately and always offered to the model.
    facts = await build_catalog_facts(db, project_id)

    if not chunks and not facts:
        # No context — emit the canned answer without calling the LLM
        yield _token_event(_NO_CONTEXT_ANSWER)
        log_id = await _save_query_log(
            db, user, project_id, question, _NO_CONTEXT_ANSWER, [], 0
        )
        yield _citations_event([], log_id)
        yield _done_event()
        return

    # 2. Build context string
    context = build_context(chunks) if chunks else ""
    if facts:
        context = f"[PROJECT FACTS — authoritative counts]\n{facts}\n\n{context}".rstrip()

    # 3. Build user prompt
    user_prompt = build_rag_user_prompt(question, context)

    # 4. Stream tokens from the LLM
    assembled_answer = ""
    async for token in stream_tokens(SYSTEM_PROMPT, user_prompt, conversation_history):
        assembled_answer += token
        yield _token_event(token)

    # 5. Extract citations from the full answer
    citations = extract_citations(assembled_answer, chunks)

    # 6. Persist query log
    elapsed_ms = int(time.monotonic() * 1000) - start_ms
    log_id = await _save_query_log(
        db, user, project_id, question, assembled_answer, chunks, elapsed_ms
    )

    # 7. Emit citations + done
    yield _citations_event(citations, log_id)
    yield _done_event()


async def run_byc_pipeline(
    db: AsyncSession,
    user: User,
    project_id: uuid.UUID,
    service_id: uuid.UUID,
    service_name: str,
    service_summary: dict,
    conversation_history: list[dict] | None = None,
) -> AsyncIterator[dict]:
    """
    Before You Change pipeline.

    Emits: context → token* → citations → done
    """
    start_ms = int(time.monotonic() * 1000)

    # Emit the service summary card before the first token
    yield _context_event(service_summary)

    # Retrieve chunks scoped to this service — fall back to project-wide if empty
    chunks = await retrieve_chunks(
        db=db,
        question=f"important things to know before changing {service_name}",
        project_id=project_id,
        scope_type="service",
        scope_id=service_id,
    )

    byc_question = f"What are the most important things to know before changing {service_name}?"

    if not chunks:
        yield _token_event(_NO_CONTEXT_ANSWER)
        log_id = await _save_query_log(
            db, user, project_id, byc_question, _NO_CONTEXT_ANSWER, [], 0
        )
        yield _citations_event([], log_id)
        yield _done_event()
        return

    context = build_context(chunks)
    user_prompt = build_byc_prompt(service_name, context)

    assembled_answer = ""
    async for token in stream_tokens(SYSTEM_PROMPT, user_prompt, conversation_history):
        assembled_answer += token
        yield _token_event(token)

    citations = extract_citations(assembled_answer, chunks)

    elapsed_ms = int(time.monotonic() * 1000) - start_ms
    log_id = await _save_query_log(
        db, user, project_id, byc_question, assembled_answer, chunks, elapsed_ms
    )

    yield _citations_event(citations, log_id)
    yield _done_event()

"""
app.rag.retriever — hybrid (semantic + keyword) chunk retrieval with RRF merge.

Algorithm
---------
1. Embed the query text via Gemini.
2. Run a cosine-similarity vector search on ``chunks``.
3. Run a full-text keyword search on ``chunks`` using tsvector.
4. Merge and re-rank the two result sets with Reciprocal Rank Fusion (k=60).
5. Return the top-N chunks with metadata.

The ``project_id`` filter is mandatory.  ``scope_type`` + ``scope_id`` optionally
restrict retrieval to chunks belonging to a single entity (e.g. one service).
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.ingestion.embedder import TASK_QUERY, embed_texts
from app.models.document import Chunk

logger = logging.getLogger(__name__)

RRF_K = 60
DEFAULT_SEMANTIC_LIMIT = 20
DEFAULT_KEYWORD_LIMIT = 20
DEFAULT_TOP_N = 8


# ---------------------------------------------------------------------------
# Result type
# ---------------------------------------------------------------------------

@dataclass
class RetrievedChunk:
    id: uuid.UUID
    content: str
    entity_type: str | None   # 'adr' | 'document' | None
    entity_id: uuid.UUID | None
    entity_title: str | None  # resolved from the parent row, best-effort
    rrf_score: float = 0.0


# ---------------------------------------------------------------------------
# RRF helper
# ---------------------------------------------------------------------------

def _rrf_merge(
    semantic_ids: list[uuid.UUID],
    keyword_ids: list[uuid.UUID],
    k: int = RRF_K,
) -> list[tuple[uuid.UUID, float]]:
    """
    Reciprocal Rank Fusion over two ranked lists.

    Returns a list of (chunk_id, rrf_score) sorted descending by score.
    Chunks that appear in only one list still receive a score from that list.
    """
    scores: dict[uuid.UUID, float] = {}

    for rank, cid in enumerate(semantic_ids, start=1):
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank)

    for rank, cid in enumerate(keyword_ids, start=1):
        scores[cid] = scores.get(cid, 0.0) + 1.0 / (k + rank)

    return sorted(scores.items(), key=lambda x: x[1], reverse=True)


# ---------------------------------------------------------------------------
# Scope filter
# ---------------------------------------------------------------------------

def _scope_filter(
    scope_type: str | None,
    scope_id: uuid.UUID | None,
    params: dict,
) -> str:
    """
    Return an extra SQL predicate narrowing retrieval to a single entity,
    adding any bind parameters it needs to *params*.

    A service owns no chunks directly — it is linked to ADRs through the
    ``adr_services`` join table — so a service scope resolves through that
    table.  Returns "" when there is nothing to narrow by.
    """
    if not scope_id or scope_type not in ("adr", "document", "service"):
        return ""

    params["scope_id"] = str(scope_id)

    if scope_type == "adr":
        return "AND c.adr_id = :scope_id"
    if scope_type == "document":
        return "AND c.document_id = :scope_id"
    return (
        "AND c.adr_id IN ("
        " SELECT asvc.adr_id FROM adr_services asvc"
        " WHERE asvc.service_id = :scope_id"
        ")"
    )


# ---------------------------------------------------------------------------
# Semantic search
# ---------------------------------------------------------------------------

async def _semantic_search(
    db: AsyncSession,
    query_vector: list[float],
    project_id: uuid.UUID,
    scope_type: str | None,
    scope_id: uuid.UUID | None,
    limit: int,
) -> list[uuid.UUID]:
    """
    Return chunk IDs ranked by cosine similarity to *query_vector*.

    We filter by project through the parent document / adr join.
    For now we retrieve chunks that belong to documents or ADRs in the project.
    """
    # Build the query as raw SQL so we can use the pgvector <=> operator.
    # We pull document_id and adr_id and use a sub-query per source type.

    params: dict = {
        "query_vec": str(query_vector),
        "project_id": str(project_id),
        "limit": limit,
    }

    scope_filter = _scope_filter(scope_type, scope_id, params)

    sql = text(f"""
        SELECT c.id
        FROM chunks c
        LEFT JOIN documents d ON d.id = c.document_id
        LEFT JOIN adrs a ON a.id = c.adr_id
        WHERE
            c.embedding IS NOT NULL
            AND (d.project_id = :project_id OR a.project_id = :project_id)
            {scope_filter}
        ORDER BY c.embedding <=> CAST(:query_vec AS vector)
        LIMIT :limit
    """)

    result = await db.execute(sql, params)
    return [row[0] for row in result.fetchall()]


# ---------------------------------------------------------------------------
# Keyword search
# ---------------------------------------------------------------------------

async def _keyword_search(
    db: AsyncSession,
    keywords: str,
    project_id: uuid.UUID,
    limit: int,
    scope_type: str | None = None,
    scope_id: uuid.UUID | None = None,
) -> list[uuid.UUID]:
    """
    Return chunk IDs ranked by full-text ts_rank.

    Strips non-alphanumeric characters from *keywords* to build the tsquery.
    Falls back to an empty list if the query string produces no valid tokens.
    """
    # Sanitise: keep only word characters, join with <->  (phrase proximity)
    import re
    tokens = re.findall(r"\w+", keywords)
    if not tokens:
        return []
    tsquery = " | ".join(tokens)  # OR across all tokens

    params: dict = {
        "tsquery": tsquery,
        "project_id": str(project_id),
        "limit": limit,
    }
    scope_filter = _scope_filter(scope_type, scope_id, params)

    sql = text(f"""
        SELECT c.id
        FROM chunks c
        LEFT JOIN documents d ON d.id = c.document_id
        LEFT JOIN adrs a ON a.id = c.adr_id
        WHERE
            to_tsvector('english', c.content) @@ to_tsquery('english', :tsquery)
            AND (d.project_id = :project_id OR a.project_id = :project_id)
            {scope_filter}
        ORDER BY ts_rank(to_tsvector('english', c.content), to_tsquery('english', :tsquery)) DESC
        LIMIT :limit
    """)

    result = await db.execute(sql, params)
    return [row[0] for row in result.fetchall()]


# ---------------------------------------------------------------------------
# Public retrieval entry point
# ---------------------------------------------------------------------------

async def retrieve_chunks(
    db: AsyncSession,
    question: str,
    project_id: uuid.UUID,
    scope_type: str | None = None,
    scope_id: uuid.UUID | None = None,
    top_n: int = DEFAULT_TOP_N,
) -> list[RetrievedChunk]:
    """
    Hybrid retrieval with RRF merge.

    Parameters
    ----------
    db:          Async DB session.
    question:    Natural-language query string.
    project_id:  Project to scope retrieval to.
    scope_type:  Optional — 'adr' | 'document' | 'service' to narrow scope.
    scope_id:    Optional entity UUID to narrow scope.
    top_n:       Number of chunks to return after RRF merge.

    Returns
    -------
    List of :class:`RetrievedChunk`, ranked best-first.
    """
    # 1. Embed the question — as a QUERY, not a document. Gemini embeds the
    # two roles differently and retrieval is measurably better when the
    # asymmetry is respected.
    vectors = await embed_texts([question], task_type=TASK_QUERY)
    query_vector = vectors[0]

    # 2. + 3. Hybrid search, scoped if a scope was requested.  A scope that
    # matches nothing falls back to project-wide retrieval so a narrow
    # question never returns an empty answer.
    for attempt_scope_type, attempt_scope_id in (
        (scope_type, scope_id),
        (None, None),
    ):
        sem_ids = await _semantic_search(
            db, query_vector, project_id,
            attempt_scope_type, attempt_scope_id, DEFAULT_SEMANTIC_LIMIT,
        )
        kw_ids = await _keyword_search(
            db, question, project_id, DEFAULT_KEYWORD_LIMIT,
            attempt_scope_type, attempt_scope_id,
        )
        logger.debug(
            "scope=%s → %d semantic, %d keyword chunks",
            attempt_scope_type, len(sem_ids), len(kw_ids),
        )
        if sem_ids or kw_ids or attempt_scope_type is None:
            break
        logger.debug("No chunks in scope %s — retrying project-wide", scope_type)

    # 4. RRF merge
    merged = _rrf_merge(sem_ids, kw_ids)[:top_n]

    if not merged:
        return []

    # 5. Fetch the actual chunk rows in bulk
    top_ids = [cid for cid, _ in merged]
    score_map = {cid: score for cid, score in merged}

    rows = await db.execute(
        select(Chunk).where(Chunk.id.in_(top_ids))
    )
    chunk_rows: list[Chunk] = list(rows.scalars().all())

    # Build result objects, preserving RRF rank order
    chunk_by_id = {c.id: c for c in chunk_rows}
    result: list[RetrievedChunk] = []

    for cid in top_ids:
        chunk = chunk_by_id.get(cid)
        if chunk is None:
            continue

        # Determine entity metadata
        if chunk.adr_id:
            entity_type = "adr"
            entity_id = chunk.adr_id
            # Lazy-load title from ADR
            entity_title = await _resolve_adr_title(db, chunk.adr_id)
        elif chunk.document_id:
            entity_type = "document"
            entity_id = chunk.document_id
            entity_title = await _resolve_document_title(db, chunk.document_id)
        else:
            entity_type = None
            entity_id = None
            entity_title = None

        result.append(RetrievedChunk(
            id=chunk.id,
            content=chunk.content,
            entity_type=entity_type,
            entity_id=entity_id,
            entity_title=entity_title,
            rrf_score=score_map.get(cid, 0.0),
        ))

    return result


# ---------------------------------------------------------------------------
# Title resolution helpers (best-effort; return None on miss)
# ---------------------------------------------------------------------------

async def _resolve_adr_title(db: AsyncSession, adr_id: uuid.UUID) -> str | None:
    from app.models.adr import Adr
    row = await db.get(Adr, adr_id)
    return row.title if row else None


async def _resolve_document_title(db: AsyncSession, doc_id: uuid.UUID) -> str | None:
    from app.models.document import Document
    row = await db.get(Document, doc_id)
    return row.filename if row else None

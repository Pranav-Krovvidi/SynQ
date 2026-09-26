"""
app.rag.citations — extract [SOURCE N] citations from the assembled answer.

After the full answer has been streamed, we parse [SOURCE N] references
and map them back to the chunk metadata so the frontend can render
clickable citation chips.
"""

from __future__ import annotations

import re
import uuid
from dataclasses import dataclass

from app.rag.retriever import RetrievedChunk


@dataclass
class Citation:
    source_index: int
    entity_type: str | None
    entity_id: str | None   # UUID as string, or None
    entity_title: str | None
    snippet: str            # first 200 chars of the chunk content


_SOURCE_RE = re.compile(r"\[SOURCE\s+(\d+)\]", re.IGNORECASE)


def extract_citations(
    answer: str,
    chunks: list[RetrievedChunk],
) -> list[Citation]:
    """
    Parse all ``[SOURCE N]`` references in *answer* and return deduplicated
    :class:`Citation` objects sorted by first appearance.

    Parameters
    ----------
    answer:
        The full assembled answer text from the LLM.
    chunks:
        The ranked chunk list that was passed to the prompt (1-indexed).

    Returns
    -------
    list[Citation]
        One entry per unique source index found in the answer, in order.
    """
    seen: set[int] = set()
    citations: list[Citation] = []

    for match in _SOURCE_RE.finditer(answer):
        idx = int(match.group(1))
        if idx in seen:
            continue
        seen.add(idx)

        # chunks list is 0-indexed; source labels start at 1
        chunk_index = idx - 1
        if chunk_index < 0 or chunk_index >= len(chunks):
            continue

        chunk = chunks[chunk_index]
        citations.append(Citation(
            source_index=idx,
            entity_type=chunk.entity_type,
            entity_id=str(chunk.entity_id) if chunk.entity_id else None,
            entity_title=chunk.entity_title,
            snippet=chunk.content[:200],
        ))

    return citations

"""
app.rag.context_builder — assemble retrieved chunks into a labeled context string.

The output format is consumed directly by the prompt templates and is also
used during citation extraction (matching [SOURCE N] references).
"""

from __future__ import annotations

from app.rag.retriever import RetrievedChunk


def build_context(chunks: list[RetrievedChunk]) -> str:
    """
    Concatenate chunks into a numbered source list.

    Example output::

        [SOURCE 1: ADR — "Use PostgreSQL for all persistence"]
        We evaluated MySQL, MongoDB, and PostgreSQL ...

        [SOURCE 2: Document — "payment-service-runbook.md"]
        The payment service processes ...

    Parameters
    ----------
    chunks:
        Ranked list of retrieved chunks (best-first).

    Returns
    -------
    str
        The assembled context string ready for insertion into a prompt.
    """
    parts: list[str] = []

    for i, chunk in enumerate(chunks, start=1):
        label = _make_label(i, chunk)
        parts.append(f"{label}\n{chunk.content.strip()}")

    return "\n\n".join(parts)


def _make_label(index: int, chunk: RetrievedChunk) -> str:
    """Build the [SOURCE N: type — "title"] header line."""
    if chunk.entity_type == "adr":
        type_label = "ADR"
    elif chunk.entity_type == "document":
        type_label = "Document"
    else:
        type_label = "Knowledge"

    title = chunk.entity_title or "Untitled"
    return f'[SOURCE {index}: {type_label} — "{title}"]'

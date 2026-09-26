"""
app.ingestion.chunker — text extraction and token-aware chunking.

Supported sources
-----------------
- PDF files  (via PyMuPDF / fitz)
- Markdown / plain-text files
- Raw strings (for ADR body text)

Chunking strategy
-----------------
Splits on paragraph boundaries first, then trims to *max_tokens* using
tiktoken.  Adjacent small paragraphs are merged until the limit is reached
(greedy packing).  Each chunk records its token count and zero-based index
within the source document.
"""

from __future__ import annotations

import io
from dataclasses import dataclass, field
from pathlib import Path

import tiktoken

_ENCODING = tiktoken.get_encoding("cl100k_base")  # same family as slate-125m


def _token_count(text: str) -> int:
    return len(_ENCODING.encode(text))


# ---------------------------------------------------------------------------
# Public data class returned by the chunker
# ---------------------------------------------------------------------------

@dataclass
class TextChunk:
    content: str
    token_count: int
    chunk_index: int


# ---------------------------------------------------------------------------
# Extraction helpers
# ---------------------------------------------------------------------------

def _extract_pdf(data: bytes) -> tuple[str, int]:
    """Return (full_text, page_count) from raw PDF bytes."""
    import fitz  # PyMuPDF

    doc = fitz.open(stream=data, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n\n".join(pages), len(pages)


def _extract_text(data: bytes) -> tuple[str, int]:
    """Decode bytes as UTF-8 text; page_count is always 1 for text files."""
    return data.decode("utf-8", errors="replace"), 1


# ---------------------------------------------------------------------------
# Core chunker
# ---------------------------------------------------------------------------

def _split_into_chunks(text: str, max_tokens: int, overlap_tokens: int) -> list[TextChunk]:
    """
    Split *text* into chunks of at most *max_tokens*.

    Algorithm
    ---------
    1. Split on double-newline (paragraph boundary).
    2. Pack paragraphs greedily into a window.
    3. When the window would exceed *max_tokens*, flush it.
    4. The *overlap_tokens* tail of the previous chunk is prepended to the
       next window to preserve context across boundaries.
    """
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    if not paragraphs:
        return []

    chunks: list[TextChunk] = []
    window: list[str] = []
    window_tokens = 0
    overlap_text = ""

    def flush(w: list[str]) -> str:
        raw = "\n\n".join(w)
        return (overlap_text + "\n\n" + raw).strip() if overlap_text else raw

    for para in paragraphs:
        para_tokens = _token_count(para)

        # Single paragraph larger than the window — split by sentences
        if para_tokens > max_tokens:
            if window:
                text_out = flush(window)
                chunks.append(TextChunk(
                    content=text_out,
                    token_count=_token_count(text_out),
                    chunk_index=len(chunks),
                ))
                overlap_text = " ".join(window[-1].split()[-overlap_tokens:])
                window, window_tokens = [], 0

            # Hard split: slide a token window over the long paragraph
            words = para.split()
            sub_window: list[str] = []
            sub_tokens = 0
            for word in words:
                wt = _token_count(word)
                if sub_tokens + wt > max_tokens and sub_window:
                    content = " ".join(sub_window)
                    chunks.append(TextChunk(
                        content=content,
                        token_count=_token_count(content),
                        chunk_index=len(chunks),
                    ))
                    # overlap: last N tokens of sub_window
                    overlap_words = sub_window[max(0, len(sub_window) - overlap_tokens):]
                    sub_window = overlap_words + [word]
                    sub_tokens = _token_count(" ".join(sub_window))
                else:
                    sub_window.append(word)
                    sub_tokens += wt
            if sub_window:
                content = " ".join(sub_window)
                chunks.append(TextChunk(
                    content=content,
                    token_count=_token_count(content),
                    chunk_index=len(chunks),
                ))
            overlap_text = " ".join(sub_window[-overlap_tokens:]) if sub_window else ""
            continue

        if window_tokens + para_tokens > max_tokens and window:
            text_out = flush(window)
            chunks.append(TextChunk(
                content=text_out,
                token_count=_token_count(text_out),
                chunk_index=len(chunks),
            ))
            overlap_text = " ".join(window[-1].split()[-overlap_tokens:])
            window, window_tokens = [], 0

        window.append(para)
        window_tokens += para_tokens

    # Flush remainder
    if window:
        text_out = flush(window)
        chunks.append(TextChunk(
            content=text_out,
            token_count=_token_count(text_out),
            chunk_index=len(chunks),
        ))

    return chunks


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chunk_bytes(
    data: bytes,
    mime_type: str,
    max_tokens: int = 512,
    overlap_tokens: int = 50,
) -> tuple[list[TextChunk], int]:
    """
    Extract text from *data* and return ``(chunks, page_count)``.

    Parameters
    ----------
    data:
        Raw file bytes.
    mime_type:
        MIME type string — ``"application/pdf"`` triggers PDF extraction;
        everything else is treated as UTF-8 text.
    max_tokens:
        Maximum tokens per chunk (default 512).
    overlap_tokens:
        Number of tokens from the tail of the previous chunk to prepend
        as context overlap (default 50).
    """
    if mime_type == "application/pdf":
        text, page_count = _extract_pdf(data)
    else:
        text, page_count = _extract_text(data)

    return _split_into_chunks(text, max_tokens, overlap_tokens), page_count


def chunk_text(
    text: str,
    max_tokens: int = 512,
    overlap_tokens: int = 50,
) -> list[TextChunk]:
    """
    Chunk a plain string (e.g. an ADR body).

    Returns a list of :class:`TextChunk` objects.
    """
    return _split_into_chunks(text, max_tokens, overlap_tokens)

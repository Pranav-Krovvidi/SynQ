"""
app.ingestion — document ingestion pipeline.
"""

from app.ingestion.chunker import TextChunk, chunk_bytes, chunk_text  # noqa: F401
from app.ingestion.embedder import embed_texts  # noqa: F401
from app.ingestion.pipeline import ingest_adr_text, ingest_document  # noqa: F401

__all__ = [
    "TextChunk",
    "chunk_bytes",
    "chunk_text",
    "embed_texts",
    "ingest_document",
    "ingest_adr_text",
]

"""
app.ingestion — document ingestion pipeline.
"""

from app.ingestion.chunker import TextChunk, chunk_bytes, chunk_text  # noqa: F401
from app.ingestion.embedder import embed_texts  # noqa: F401
from app.ingestion.pipeline import (  # noqa: F401
    ingest_adr_text,
    ingest_document,
    ingest_incident_text,
    ingest_service_text,
)

__all__ = [
    "TextChunk",
    "chunk_bytes",
    "chunk_text",
    "embed_texts",
    "ingest_document",
    "ingest_adr_text",
    "ingest_service_text",
    "ingest_incident_text",
]

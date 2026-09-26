"""
app.ingestion.embedder — watsonx.ai embedding calls.

Uses ibm-watsonx-ai to call the slate-125m-english-rtrvr model and return
a list of float vectors, one per input text.

Batching
--------
The API accepts up to 10 texts per request.  ``embed_texts`` automatically
splits larger lists into batches of ``BATCH_SIZE`` and concatenates results.
"""

from __future__ import annotations

import asyncio
import logging
from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)

BATCH_SIZE = 10  # watsonx embedding API batch limit


@lru_cache(maxsize=1)
def _get_client():
    """
    Lazily initialise the watsonx.ai Embeddings client.

    Cached so we only create one client per process.  This function is
    intentionally NOT async — the SDK constructor is synchronous.
    """
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import Embeddings

    credentials = Credentials(
        url=settings.watsonx_url,
        api_key=settings.watsonx_api_key,
    )
    return Embeddings(
        model_id=settings.embedding_model_id,
        credentials=credentials,
        project_id=settings.watsonx_project_id,
    )


def _embed_batch_sync(texts: list[str]) -> list[list[float]]:
    """Call the embedding API synchronously for a single batch."""
    client = _get_client()
    response = client.embed_documents(texts=texts)
    return response


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """
    Embed a list of texts using watsonx slate-125m.

    Splits into batches of ``BATCH_SIZE``, runs each batch in a thread
    (to avoid blocking the event loop), then returns all vectors in order.

    Parameters
    ----------
    texts:
        List of strings to embed.

    Returns
    -------
    list[list[float]]
        One embedding vector per input text, in the same order.
    """
    if not texts:
        return []

    loop = asyncio.get_event_loop()
    all_vectors: list[list[float]] = []

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        logger.debug("Embedding batch %d/%d (%d texts)", i // BATCH_SIZE + 1,
                     -(-len(texts) // BATCH_SIZE), len(batch))
        vectors = await loop.run_in_executor(None, _embed_batch_sync, batch)
        all_vectors.extend(vectors)

    return all_vectors

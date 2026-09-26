"""
app.ingestion.embedder — Google AI Studio (Gemini) embedding calls.

Uses google-genai to call ``gemini-embedding-001`` and return a list of float
vectors, one per input text.

Dimensionality
--------------
The model emits 3072 dimensions natively and supports Matryoshka truncation to
a narrower width via ``output_dimensionality``.  We request
``settings.embedding_dimension`` (768) so the vectors match the ``chunks.embedding``
pgvector column.

Truncated vectors are **not** unit length, and Google requires callers to
normalise them manually for any width below 3072 — see ``_l2_normalise``.

Task types
----------
Retrieval quality improves when documents and queries are embedded for their
respective roles, so ``embed_texts`` takes a *task_type*: pass ``TASK_QUERY``
when embedding a search query, and leave the default for indexed content.
"""

from __future__ import annotations

import logging
import math

from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)

# Texts per embed_content call. The API documents no hard cap; this keeps
# individual requests small enough to retry cheaply.
BATCH_SIZE = 100

# Asymmetric retrieval task types (gemini-embedding-001).
TASK_DOCUMENT = "RETRIEVAL_DOCUMENT"
TASK_QUERY = "RETRIEVAL_QUERY"


@lru_cache(maxsize=1)
def _get_client():
    """
    Lazily initialise the Gemini client (one per process).

    Imported inside the function so the module can be imported — and the rest
    of the app can start — without google-genai present or a key configured.
    """
    from google import genai

    if not settings.google_api_key:
        raise RuntimeError(
            "GOOGLE_API_KEY is not set. Get a free key at "
            "https://aistudio.google.com/apikey"
        )
    return genai.Client(api_key=settings.google_api_key)


def _l2_normalise(vector: list[float]) -> list[float]:
    """
    Scale *vector* to unit length.

    Required for gemini-embedding-001 whenever ``output_dimensionality`` is
    below 3072: the truncated vector is no longer normalised. Cosine distance
    is scale-invariant, so this does not change ``<=>`` results, but it keeps
    the stored vectors valid for L2 and inner-product operators too.
    """
    norm = math.sqrt(sum(v * v for v in vector))
    if norm == 0.0:
        return vector
    return [v / norm for v in vector]


async def embed_texts(
    texts: list[str],
    task_type: str = TASK_DOCUMENT,
) -> list[list[float]]:
    """
    Embed *texts* with Gemini, returning one unit-length vector per input.

    Splits into batches of ``BATCH_SIZE``.  The SDK's async client is used
    directly, so no thread offloading is needed.

    Parameters
    ----------
    texts:
        Strings to embed.  An empty list short-circuits without an API call.
    task_type:
        ``TASK_DOCUMENT`` (default) for content being indexed, or
        ``TASK_QUERY`` for a search query.

    Returns
    -------
    list[list[float]]
        One embedding per input text, in the same order, each of width
        ``settings.embedding_dimension``.
    """
    if not texts:
        return []

    from google.genai import types

    client = _get_client()
    config = types.EmbedContentConfig(
        task_type=task_type,
        output_dimensionality=settings.embedding_dimension,
    )

    all_vectors: list[list[float]] = []
    total_batches = -(-len(texts) // BATCH_SIZE)

    for i in range(0, len(texts), BATCH_SIZE):
        batch = texts[i : i + BATCH_SIZE]
        logger.debug(
            "Embedding batch %d/%d (%d texts, task=%s)",
            i // BATCH_SIZE + 1, total_batches, len(batch), task_type,
        )
        try:
            response = await client.aio.models.embed_content(
                model=settings.embedding_model_id,
                contents=batch,
                config=config,
            )
        except Exception as exc:
            logger.error("Gemini embedding error: %s", exc)
            raise

        returned = response.embeddings or []
        if len(returned) != len(batch):
            raise RuntimeError(
                f"Gemini returned {len(returned)} embeddings for {len(batch)} "
                "texts; refusing to mis-align vectors with chunks"
            )
        all_vectors.extend(_l2_normalise(list(e.values)) for e in returned)

    return all_vectors

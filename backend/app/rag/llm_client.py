"""
app.rag.llm_client — Google AI Studio (Gemini) streaming LLM client.

Wraps ``google.genai`` ``aio.models.generate_content_stream()`` and exposes an
async generator of text chunk strings.

The SDK ships a native async client, so tokens are forwarded to the caller as
the model produces them — no thread offloading or queue bridging required.
"""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Default generation parameters
# ---------------------------------------------------------------------------

_DEFAULT_PARAMS = {
    "max_output_tokens": 1024,
    "temperature": 0.1,       # low temperature = more grounded, less creative
}


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


def _build_contents(
    user_prompt: str,
    conversation_history: list[dict] | None,
) -> list[dict]:
    """
    Assemble Gemini ``contents`` from the prior turns plus the new prompt.

    Gemini names the assistant role ``model``, not ``assistant``, so the
    history roles used elsewhere in the app are translated here.  The system
    prompt is *not* part of ``contents`` — it goes in ``system_instruction``.
    """
    contents: list[dict] = []

    if conversation_history:
        # Cap at 10 turns (20 messages) to avoid context overflow
        for message in conversation_history[-20:]:
            role = "model" if message.get("role") == "assistant" else "user"
            contents.append({
                "role": role,
                "parts": [{"text": message.get("content") or ""}],
            })

    contents.append({"role": "user", "parts": [{"text": user_prompt}]})
    return contents


async def stream_tokens(
    system_prompt: str,
    user_prompt: str,
    conversation_history: list[dict] | None = None,
) -> AsyncIterator[str]:
    """
    Async generator yielding text chunks from the Gemini model.

    Parameters
    ----------
    system_prompt:
        The system instruction (e.g. ``SYSTEM_PROMPT`` from prompts.py), passed
        as ``system_instruction`` rather than as a message.
    user_prompt:
        The assembled user message (question + context).
    conversation_history:
        Optional list of prior ``{"role": ..., "content": ...}`` turns,
        capped to 10 turns (20 messages) inside this function.

    Yields
    ------
    str
        Text chunks in generation order.

    Raises
    ------
    RuntimeError
        If the API call fails — including mid-stream, after some chunks have
        already been yielded.
    """
    from google.genai import types

    client = _get_client()
    contents = _build_contents(user_prompt, conversation_history)
    config = types.GenerateContentConfig(
        system_instruction=system_prompt,
        **_DEFAULT_PARAMS,
    )

    try:
        stream = await client.aio.models.generate_content_stream(
            model=settings.llm_model_id,
            contents=contents,
            config=config,
        )
        async for chunk in stream:
            # A chunk can carry no text (safety blocks, usage-only deltas).
            text = getattr(chunk, "text", None)
            if text:
                yield text
    except Exception as exc:
        logger.error("Gemini streaming error: %s", exc)
        raise RuntimeError(f"LLM call failed: {exc}") from exc

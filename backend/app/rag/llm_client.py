"""
app.rag.llm_client — watsonx.ai streaming LLM client.

Wraps ``ibm_watsonx_ai.foundation_models.ModelInference.generate_text_stream()``
and exposes an async generator of text token strings.

The SDK call is synchronous, so we run it inside ``asyncio.to_thread`` to
avoid blocking the event loop.
"""

from __future__ import annotations

import asyncio
import logging
from collections.abc import AsyncIterator
from functools import lru_cache

from app.core.config import settings

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Default generation parameters
# ---------------------------------------------------------------------------

_DEFAULT_PARAMS = {
    "max_new_tokens": 1024,
    "temperature": 0.1,       # low temperature = more grounded, less creative
    "repetition_penalty": 1.1,
}


@lru_cache(maxsize=1)
def _get_model():
    """
    Lazily initialise the watsonx ModelInference client (one per process).

    The SDK constructor is synchronous, so we cache the result.
    """
    from ibm_watsonx_ai import Credentials
    from ibm_watsonx_ai.foundation_models import ModelInference

    credentials = Credentials(
        url=settings.watsonx_url,
        api_key=settings.watsonx_api_key,
    )
    return ModelInference(
        model_id=settings.llm_model_id,
        credentials=credentials,
        project_id=settings.watsonx_project_id,
        params=_DEFAULT_PARAMS,
    )


def _build_messages(
    system_prompt: str,
    user_prompt: str,
    conversation_history: list[dict] | None,
) -> list[dict]:
    """Assemble the messages list for the chat endpoint."""
    messages: list[dict] = [{"role": "system", "content": system_prompt}]

    if conversation_history:
        # Cap at 10 turns (20 messages) to avoid context overflow
        history = conversation_history[-20:]
        messages.extend(history)

    messages.append({"role": "user", "content": user_prompt})
    return messages


def _stream_sync(messages: list[dict]) -> list[str]:
    """
    Call the watsonx streaming API synchronously.

    Returns a list of token strings.  We collect them all here so the
    thread can finish cleanly; the async layer re-yields them one by one.
    """
    model = _get_model()
    tokens: list[str] = []
    try:
        for chunk in model.chat_stream(messages=messages):
            # SDK yields dicts: {"choices": [{"delta": {"content": "..."}}]}
            choices = chunk.get("choices") or []
            for choice in choices:
                delta = choice.get("delta") or {}
                content = delta.get("content") or ""
                if content:
                    tokens.append(content)
    except Exception as exc:
        logger.error("watsonx streaming error: %s", exc)
        raise
    return tokens


async def stream_tokens(
    system_prompt: str,
    user_prompt: str,
    conversation_history: list[dict] | None = None,
) -> AsyncIterator[str]:
    """
    Async generator that yields token strings from the watsonx LLM.

    The blocking SDK call is offloaded to a thread pool via
    ``asyncio.to_thread``.  All tokens are collected in the thread,
    then yielded one-by-one here so the event loop stays unblocked.

    Parameters
    ----------
    system_prompt:
        The system instruction (e.g. ``SYSTEM_PROMPT`` from prompts.py).
    user_prompt:
        The assembled user message (question + context).
    conversation_history:
        Optional list of prior ``{"role": ..., "content": ...}`` turns,
        capped to 10 turns (20 messages) inside this function.

    Yields
    ------
    str
        Individual token strings in generation order.
    """
    messages = _build_messages(system_prompt, user_prompt, conversation_history)

    try:
        tokens = await asyncio.to_thread(_stream_sync, messages)
    except Exception as exc:
        raise RuntimeError(f"LLM call failed: {exc}") from exc

    for token in tokens:
        yield token

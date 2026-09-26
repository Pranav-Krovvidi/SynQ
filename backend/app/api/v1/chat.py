"""
app.api.v1.chat — Chat and Before You Change SSE endpoints (WS-7).

Routes
------
POST /projects/{pid}/chat
    Global project-scoped RAG chat.  Returns an SSE stream.

POST /projects/{pid}/chat/service/{sid}
    Service-scoped RAG chat.  Retrieval is narrowed to the given service's
    linked chunks.

POST /projects/{pid}/before-you-change/{sid}
    Before You Change analysis.  Emits a ``context`` event with service
    metadata, then streams the BYC-prompted answer.

GET  /projects/{pid}/chat/history
    Returns the last 20 query logs for the authenticated user in this project.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db
from app.models.query_log import QueryLog
from app.rag.pipeline import run_byc_pipeline, run_rag_pipeline
from app.services.project import get_project
from app.services.service import get_service

router = APIRouter(prefix="/projects/{project_id}", tags=["chat"])


# ---------------------------------------------------------------------------
# Request / response schemas
# ---------------------------------------------------------------------------

class ConversationMessage(BaseModel):
    role: str    # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4096)
    conversation_history: list[ConversationMessage] = Field(default_factory=list)


class BYCRequest(BaseModel):
    """Before You Change — question is optional; the prompt is auto-constructed."""
    question: str = Field(default="", max_length=4096)
    conversation_history: list[ConversationMessage] = Field(default_factory=list)


class QueryLogOut(BaseModel):
    id: uuid.UUID
    question: str
    answer: str | None
    latency_ms: int | None
    created_at: str | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Guards
# ---------------------------------------------------------------------------

async def _require_project(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Ensure the project exists and the user can access it."""
    project = await get_project(db, project_id)
    if project is None or project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    return project


async def _require_service(
    service_id: uuid.UUID,
    project_id: uuid.UUID,
    db: AsyncSession,
):
    svc = await get_service(db, service_id)
    if svc is None or svc.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found",
        )
    return svc


# ---------------------------------------------------------------------------
# SSE content type helper
# ---------------------------------------------------------------------------

def _sse_stream(generator):
    """
    Wrap an async generator of SSE event dicts into a StreamingResponse.

    Each dict has keys ``event`` and ``data``; we format them as
    the SSE wire format: ``event: <name>\\ndata: <payload>\\n\\n``
    """
    async def _gen():
        async for evt in generator:
            yield f"event: {evt['event']}\ndata: {evt['data']}\n\n"

    return StreamingResponse(
        _gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/chat")
async def chat(
    project_id: uuid.UUID,
    body: ChatRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Global project-scoped RAG chat.

    Returns an SSE stream of: token* → citations → done
    """
    await _require_project(project_id, current_user, db)

    history = [m.model_dump() for m in body.conversation_history[-20:]]

    gen = run_rag_pipeline(
        db=db,
        user=current_user,
        project_id=project_id,
        question=body.question,
        conversation_history=history or None,
    )
    return _sse_stream(gen)


@router.post("/chat/service/{service_id}")
async def chat_service_scoped(
    project_id: uuid.UUID,
    service_id: uuid.UUID,
    body: ChatRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Service-scoped RAG chat.

    Retrieval is narrowed to chunks that belong to this service's ADRs and
    documents.  Falls back to project-wide retrieval if no scoped chunks
    are found (handled inside the retriever).
    """
    await _require_project(project_id, current_user, db)
    await _require_service(service_id, project_id, db)

    history = [m.model_dump() for m in body.conversation_history[-20:]]

    gen = run_rag_pipeline(
        db=db,
        user=current_user,
        project_id=project_id,
        question=body.question,
        conversation_history=history or None,
        scope_type="service",
        scope_id=service_id,
    )
    return _sse_stream(gen)


@router.post("/before-you-change/{service_id}")
async def before_you_change(
    project_id: uuid.UUID,
    service_id: uuid.UUID,
    body: BYCRequest,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Before You Change analysis.

    Emits:
      - ``context`` event with service summary metadata
      - ``token`` events with the streaming BYC answer
      - ``citations`` event
      - ``done`` event
    """
    await _require_project(project_id, current_user, db)
    svc = await _require_service(service_id, project_id, db)

    # Build the service summary that is emitted in the ``context`` event
    # so the frontend can render the service header card immediately.
    service_summary = {
        "id": str(svc.id),
        "name": svc.name,
        "description": svc.description,
        "repo_url": svc.repo_url,
        "tags": svc.tags,
    }

    history = [m.model_dump() for m in body.conversation_history[-20:]]

    gen = run_byc_pipeline(
        db=db,
        user=current_user,
        project_id=project_id,
        service_id=service_id,
        service_name=svc.name,
        service_summary=service_summary,
        conversation_history=history or None,
    )
    return _sse_stream(gen)


@router.get("/chat/history", response_model=list[QueryLogOut])
async def chat_history(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 20,
):
    """
    Return the last *limit* (max 20) query logs for the current user in
    this project, most-recent first.
    """
    await _require_project(project_id, current_user, db)

    capped = min(limit, 20)
    result = await db.execute(
        select(QueryLog)
        .where(
            QueryLog.project_id == project_id,
            QueryLog.user_id == current_user.id,
        )
        .order_by(QueryLog.created_at.desc())
        .limit(capped)
    )
    logs = list(result.scalars().all())
    return [
        QueryLogOut(
            id=log.id,
            question=log.question,
            answer=log.answer,
            latency_ms=log.latency_ms,
            created_at=str(log.created_at) if log.created_at else None,
        )
        for log in logs
    ]

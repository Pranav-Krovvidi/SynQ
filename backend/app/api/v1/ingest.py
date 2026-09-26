"""
app.api.v1.ingest — document upload and ingestion endpoint.

POST /api/v1/projects/{project_id}/ingest
    Upload a file (PDF, Markdown, plain-text) to a project.
    The file is extracted, chunked, embedded, and persisted in one request.
    Returns the created Document record.

Requires contributor role.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ContributorUser, get_db
from app.ingestion.pipeline import ingest_document
from app.schemas.document import DocumentOut
from app.services.project import get_project

router = APIRouter(prefix="/projects/{project_id}/ingest", tags=["ingestion"])

# Allowed MIME types — extend as needed in future workstreams
_ALLOWED_MIME = {
    "application/pdf",
    "text/plain",
    "text/markdown",
    "text/x-markdown",
}

# 50 MB hard limit
_MAX_BYTES = 50 * 1024 * 1024


@router.post(
    "",
    response_model=DocumentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and ingest a document",
    description=(
        "Upload a PDF, Markdown, or plain-text file to the project. "
        "The file is extracted, chunked (~512 tokens/chunk), embedded via "
        "watsonx slate-125m, and stored in the vector store. "
        "Returns the created Document record."
    ),
)
async def ingest(
    project_id: uuid.UUID,
    file: UploadFile,
    current_user: ContributorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DocumentOut:
    # Ownership check
    project = await get_project(db, project_id)
    if project is None or project.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # MIME type validation
    mime_type = file.content_type or "text/plain"
    if mime_type not in _ALLOWED_MIME:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=(
                f"Unsupported file type '{mime_type}'. "
                f"Allowed: {sorted(_ALLOWED_MIME)}"
            ),
        )

    # Read and size-check
    data = await file.read()
    if len(data) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum size of {_MAX_BYTES // (1024 * 1024)} MB",
        )

    document = await ingest_document(
        db=db,
        project_id=project_id,
        filename=file.filename or "upload",
        mime_type=mime_type,
        data=data,
    )
    return document

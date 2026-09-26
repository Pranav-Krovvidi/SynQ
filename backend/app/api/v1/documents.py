"""
app.api.v1.documents — read/delete endpoints for Document.

Upload (POST) is handled by the ingestion pipeline (WS-5).
Routes are nested under a project: /projects/{project_id}/documents/...
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db, require_role
from app.schemas.document import DocumentOut
from app.services.document import delete_document, get_document, list_documents
from app.services.project import get_project

router = APIRouter(prefix="/projects/{project_id}/documents", tags=["documents"])


async def _get_project_or_404(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    project = await get_project(db, project_id)
    if project is None or project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("", response_model=list[DocumentOut])
async def list_documents_endpoint(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
):
    await _get_project_or_404(project_id, current_user, db)
    return await list_documents(db, project_id=project_id, limit=limit, offset=offset)


@router.get("/{document_id}", response_model=DocumentOut)
async def get_document_endpoint(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    doc = await get_document(db, document_id)
    if doc is None or doc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_role("contributor"))])
async def delete_document_endpoint(
    project_id: uuid.UUID,
    document_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    doc = await get_document(db, document_id)
    if doc is None or doc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    await delete_document(db, doc)

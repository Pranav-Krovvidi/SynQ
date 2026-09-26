"""
app.api.v1.adrs — CRUD endpoints for ADR.

Routes are nested under a project: /projects/{project_id}/adrs/...
Optional ?status= filter on list.
"""

from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ContributorUser, CurrentUser, get_db, require_role
from app.ingestion import ingest_adr_text
from app.models.adr import Adr
from app.schemas.adr import AdrCreate, AdrOut, AdrUpdate
from app.services.adr import create_adr, delete_adr, get_adr, list_adrs, update_adr
from app.services.project import get_project

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/projects/{project_id}/adrs", tags=["adrs"])


async def _reindex(db: AsyncSession, adr: Adr) -> Adr:
    """
    (Re-)chunk and embed the ADR body so it becomes retrievable, and return
    the ADR to serialise.

    Without this an ADR is never embedded, and since a service's chunks are
    reached only through its ADRs, service-scoped chat and Before You Change
    would have nothing to retrieve.

    Indexing failures (e.g. Gemini unavailable) are logged rather than
    raised: the ADR itself is already committed, and failing the request
    would wrongly suggest the write was lost.  The rollback that clears the
    failed chunk writes also expires *adr*, so it is re-loaded (with its
    services eagerly fetched) before being returned.
    """
    adr_id = adr.id
    try:
        await ingest_adr_text(db, adr)
        return adr
    except Exception:
        await db.rollback()
        logger.exception("Failed to index ADR %s; it will not be searchable", adr_id)
        reloaded = await get_adr(db, adr_id)
        return reloaded if reloaded is not None else adr


async def _get_project_or_404(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    project = await get_project(db, project_id)
    if project is None or project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("", response_model=list[AdrOut])
async def list_adrs_endpoint(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    status_filter: str | None = Query(None, alias="status"),
    limit: int = 50,
    offset: int = 0,
):
    await _get_project_or_404(project_id, current_user, db)
    return await list_adrs(db, project_id=project_id, status=status_filter, limit=limit, offset=offset)


@router.post("", response_model=AdrOut, status_code=status.HTTP_201_CREATED)
async def create_adr_endpoint(
    project_id: uuid.UUID,
    body: AdrCreate,
    current_user: ContributorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    adr = await create_adr(db, body=body, project_id=project_id)
    return await _reindex(db, adr)


@router.get("/{adr_id}", response_model=AdrOut)
async def get_adr_endpoint(
    project_id: uuid.UUID,
    adr_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    adr = await get_adr(db, adr_id)
    if adr is None or adr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ADR not found")
    return adr


@router.patch("/{adr_id}", response_model=AdrOut)
async def update_adr_endpoint(
    project_id: uuid.UUID,
    adr_id: uuid.UUID,
    body: AdrUpdate,
    current_user: ContributorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    adr = await get_adr(db, adr_id)
    if adr is None or adr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ADR not found")
    adr = await update_adr(db, adr=adr, body=body)
    return await _reindex(db, adr)


@router.delete("/{adr_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_role("contributor"))])
async def delete_adr_endpoint(
    project_id: uuid.UUID,
    adr_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    adr = await get_adr(db, adr_id)
    if adr is None or adr.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ADR not found")
    await delete_adr(db, adr)

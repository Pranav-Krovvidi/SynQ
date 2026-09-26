"""
app.api.v1.adrs — CRUD endpoints for ADR.

Routes are nested under a project: /projects/{project_id}/adrs/...
Optional ?status= filter on list.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ContributorUser, CurrentUser, get_db, require_role
from app.schemas.adr import AdrCreate, AdrOut, AdrUpdate
from app.services.adr import create_adr, delete_adr, get_adr, list_adrs, update_adr
from app.services.project import get_project

router = APIRouter(prefix="/projects/{project_id}/adrs", tags=["adrs"])


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
    return await create_adr(db, body=body, project_id=project_id)


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
    return await update_adr(db, adr=adr, body=body)


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

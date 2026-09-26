"""
app.api.v1.services — CRUD endpoints for Service.

Routes are nested under a project: /projects/{project_id}/services/...
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ContributorUser, CurrentUser, get_db, require_role
from app.schemas.service import ServiceCreate, ServiceOut, ServiceUpdate
from app.services.project import get_project
from app.services.service import (
    create_service, delete_service, get_service, list_services, update_service,
)

router = APIRouter(prefix="/projects/{project_id}/services", tags=["services"])


async def _get_project_or_404(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Shared guard — ensures the project exists and belongs to the caller."""
    project = await get_project(db, project_id)
    if project is None or project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.get("", response_model=list[ServiceOut])
async def list_services_endpoint(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
):
    await _get_project_or_404(project_id, current_user, db)
    return await list_services(db, project_id=project_id, limit=limit, offset=offset)


@router.post("", response_model=ServiceOut, status_code=status.HTTP_201_CREATED)
async def create_service_endpoint(
    project_id: uuid.UUID,
    body: ServiceCreate,
    current_user: ContributorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    return await create_service(db, body=body, project_id=project_id)


@router.get("/{service_id}", response_model=ServiceOut)
async def get_service_endpoint(
    project_id: uuid.UUID,
    service_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    svc = await get_service(db, service_id)
    if svc is None or svc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return svc


@router.patch("/{service_id}", response_model=ServiceOut)
async def update_service_endpoint(
    project_id: uuid.UUID,
    service_id: uuid.UUID,
    body: ServiceUpdate,
    current_user: ContributorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    svc = await get_service(db, service_id)
    if svc is None or svc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    return await update_service(db, service=svc, body=body)


@router.delete("/{service_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_role("contributor"))])
async def delete_service_endpoint(
    project_id: uuid.UUID,
    service_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    await _get_project_or_404(project_id, current_user, db)
    svc = await get_service(db, service_id)
    if svc is None or svc.project_id != project_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found")
    await delete_service(db, svc)

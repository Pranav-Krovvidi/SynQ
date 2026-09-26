"""
app.api.v1.projects — CRUD endpoints for Project.

All routes require authentication. Delete requires admin role.
"""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import ContributorUser, CurrentUser, get_db, require_role
from app.schemas.project import ProjectCreate, ProjectOut, ProjectUpdate
from app.services.project import (
    create_project, delete_project, get_project, list_projects, update_project,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _db() -> AsyncSession:  # pragma: no cover
    ...


@router.get("", response_model=list[ProjectOut])
async def list_projects_endpoint(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = 50,
    offset: int = 0,
) -> list:
    return await list_projects(db, owner_id=current_user.id, limit=limit, offset=offset)


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
async def create_project_endpoint(
    body: ProjectCreate,
    current_user: ContributorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    return await create_project(db, body=body, owner_id=current_user.id)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project_endpoint(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    project = await get_project(db, project_id)
    if project is None or project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project_endpoint(
    project_id: uuid.UUID,
    body: ProjectUpdate,
    current_user: ContributorUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    project = await get_project(db, project_id)
    if project is None or project.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return await update_project(db, project=project, body=body)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT,
               dependencies=[Depends(require_role("admin"))])
async def delete_project_endpoint(
    project_id: uuid.UUID,
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    project = await get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    await delete_project(db, project)

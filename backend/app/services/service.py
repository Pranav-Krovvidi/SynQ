"""
app.services.service — CRUD operations for Service.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.service import Service
from app.schemas.service import ServiceCreate, ServiceUpdate


async def get_service(db: AsyncSession, service_id: uuid.UUID) -> Service | None:
    result = await db.execute(select(Service).where(Service.id == service_id))
    return result.scalar_one_or_none()


async def list_services(
    db: AsyncSession,
    project_id: uuid.UUID,
    limit: int = 50,
    offset: int = 0,
) -> list[Service]:
    result = await db.execute(
        select(Service)
        .where(Service.project_id == project_id)
        .order_by(Service.name)
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def create_service(
    db: AsyncSession,
    body: ServiceCreate,
    project_id: uuid.UUID,
) -> Service:
    svc = Service(
        name=body.name,
        description=body.description,
        tech_stack=body.tech_stack,
        repo_url=body.repo_url,
        tags=body.tags,
        project_id=project_id,
    )
    db.add(svc)
    await db.commit()
    await db.refresh(svc)
    return svc


async def update_service(
    db: AsyncSession,
    service: Service,
    body: ServiceUpdate,
) -> Service:
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(service, field, value)
    await db.commit()
    await db.refresh(service)
    return service


async def delete_service(db: AsyncSession, service: Service) -> None:
    await db.delete(service)
    await db.commit()

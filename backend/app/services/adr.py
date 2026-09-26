"""
app.services.adr — CRUD operations for ADR.

Handles the service_ids many-to-many link via the adr_services join table.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.adr import Adr
from app.models.service import Service
from app.schemas.adr import AdrCreate, AdrUpdate


async def _load_services(db: AsyncSession, service_ids: list[uuid.UUID]) -> list[Service]:
    if not service_ids:
        return []
    result = await db.execute(select(Service).where(Service.id.in_(service_ids)))
    return list(result.scalars().all())


async def get_adr(db: AsyncSession, adr_id: uuid.UUID) -> Adr | None:
    result = await db.execute(
        select(Adr)
        .where(Adr.id == adr_id)
        .options(selectinload(Adr.services))
    )
    return result.scalar_one_or_none()


async def list_adrs(
    db: AsyncSession,
    project_id: uuid.UUID,
    status: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> list[Adr]:
    q = (
        select(Adr)
        .where(Adr.project_id == project_id)
        .options(selectinload(Adr.services))
        .order_by(Adr.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    if status is not None:
        q = q.where(Adr.status == status)
    result = await db.execute(q)
    return list(result.scalars().all())


async def create_adr(
    db: AsyncSession,
    body: AdrCreate,
    project_id: uuid.UUID,
) -> Adr:
    adr = Adr(
        title=body.title,
        context=body.context,
        decision=body.decision,
        consequences=body.consequences,
        status=body.status,
        decided_at=body.decided_at,
        project_id=project_id,
    )
    adr.services = await _load_services(db, body.service_ids)
    db.add(adr)
    await db.commit()
    await db.refresh(adr)
    return adr


async def update_adr(
    db: AsyncSession,
    adr: Adr,
    body: AdrUpdate,
) -> Adr:
    data = body.model_dump(exclude_unset=True)
    service_ids = data.pop("service_ids", None)
    for field, value in data.items():
        setattr(adr, field, value)
    if service_ids is not None:
        adr.services = await _load_services(db, service_ids)
    await db.commit()
    await db.refresh(adr)
    return adr


async def delete_adr(db: AsyncSession, adr: Adr) -> None:
    await db.delete(adr)
    await db.commit()

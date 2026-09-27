"""
app.rag.catalog_facts — structured project facts for the RAG context.

Vector retrieval finds passages that *read* like the question, which is the
wrong tool for "how many ADRs has X written?". Counting needs an aggregate, so
this module computes the counts in SQL and hands them to the LLM as a labeled
block alongside the retrieved prose.

Every number here is a live query result; nothing is precomputed or cached.
"""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Adr, Employee, Incident, Project, Service


async def build_catalog_facts(db: AsyncSession, project_id: uuid.UUID) -> str:
    """Render per-project totals and per-person attribution as plain text.

    Returns an empty string when the project has no records worth stating, so
    callers can treat it as an optional context section.
    """
    project = await db.scalar(select(Project).where(Project.id == project_id))
    if project is None:
        return ""

    adr_total = await db.scalar(
        select(func.count(Adr.id)).where(Adr.project_id == project_id)
    ) or 0
    service_total = await db.scalar(
        select(func.count(Service.id)).where(Service.project_id == project_id)
    ) or 0
    incident_total = await db.scalar(
        select(func.count(Incident.id)).where(Incident.project_id == project_id)
    ) or 0
    open_incidents = await db.scalar(
        select(func.count(Incident.id)).where(
            Incident.project_id == project_id, Incident.status != "resolved"
        )
    ) or 0

    lines = [
        f'PROJECT: "{project.name}"',
        f"Totals — architecture decision records (ADRs): {adr_total}; "
        f"services: {service_total}; incidents: {incident_total} "
        f"({open_incidents} unresolved).",
    ]

    adr_authors = (
        await db.execute(
            select(Employee.full_name, func.count(Adr.id))
            .join(Adr, Adr.author_employee_id == Employee.id)
            .where(Adr.project_id == project_id)
            .group_by(Employee.full_name)
            .order_by(func.count(Adr.id).desc(), Employee.full_name)
        )
    ).all()
    if adr_authors:
        lines.append("ADRs written per person:")
        lines += [f"  - {name}: {count}" for name, count in adr_authors]

    unattributed = await db.scalar(
        select(func.count(Adr.id)).where(
            Adr.project_id == project_id, Adr.author_employee_id.is_(None)
        )
    ) or 0
    if unattributed:
        lines.append(f"  - (no recorded author): {unattributed}")

    service_owners = (
        await db.execute(
            select(Employee.full_name, func.count(Service.id))
            .join(Service, Service.owner_employee_id == Employee.id)
            .where(Service.project_id == project_id)
            .group_by(Employee.full_name)
            .order_by(func.count(Service.id).desc(), Employee.full_name)
        )
    ).all()
    if service_owners:
        lines.append("Services owned per person:")
        lines += [f"  - {name}: {count}" for name, count in service_owners]

    incident_owners = (
        await db.execute(
            select(Employee.full_name, func.count(Incident.id))
            .join(Incident, Incident.owner_employee_id == Employee.id)
            .where(Incident.project_id == project_id)
            .group_by(Employee.full_name)
            .order_by(func.count(Incident.id).desc(), Employee.full_name)
        )
    ).all()
    if incident_owners:
        lines.append("Incidents owned per person:")
        lines += [f"  - {name}: {count}" for name, count in incident_owners]

    return "\n".join(lines)

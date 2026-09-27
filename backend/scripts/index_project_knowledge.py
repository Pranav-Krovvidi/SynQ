#!/usr/bin/env python3
"""Index existing project records for RAG chat.

Run from the backend container after migrations and demo seeding:
    python scripts/index_project_knowledge.py

Requires GOOGLE_API_KEY. One consolidated knowledge document is created per
project; documents already present for a project are left untouched.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.core.config import settings
from app.ingestion.pipeline import ingest_document
from app.models import Adr, Chunk, Company, Employee, Incident, Project, Service
from app.models.document import Document


async def _project_document(db, project: Project, company_name: str) -> str:
    sections = [
        f"# {company_name}: {project.name}",
        project.description or "",
    ]

    services = (
        await db.scalars(
            select(Service).where(Service.project_id == project.id).order_by(Service.name)
        )
    ).all()
    if services:
        service_names = {service.id: service.name for service in services}
        sections.append("## Services")
        for service in services:
            sections.append(
                f"### {service.name}\n"
                f"Description: {service.description or 'Not provided.'}\n"
                f"Technology stack: {service.tech_stack or 'Not specified.'}\n"
                f"Tags: {', '.join(service.tags or [])}"
            )

    adrs = (
        await db.scalars(
            select(Adr).where(Adr.project_id == project.id).order_by(Adr.title)
        )
    ).all()
    if adrs:
        sections.append("## Architecture Decision Records")
        for adr in adrs:
            sections.append(
                f"### {adr.title}\n"
                f"Status: {adr.status}\n"
                f"Context: {adr.context or 'Not provided.'}\n"
                f"Decision: {adr.decision or 'Not provided.'}\n"
                f"Consequences: {adr.consequences or 'Not provided.'}"
            )

    employees = (
        await db.scalars(select(Employee).where(Employee.company_id == project.company_id))
    ).all()
    employees_by_id = {employee.id: employee for employee in employees}
    incidents = (
        await db.scalars(
            select(Incident).where(Incident.project_id == project.id).order_by(Incident.started_at.desc())
        )
    ).all()
    if incidents:
        sections.append("## Incident Reports")
        for incident in incidents:
            owner = employees_by_id.get(incident.owner_employee_id)
            sections.append(
                f"### {incident.incident_key}: {incident.title}\n"
                f"Severity: {incident.severity}; status: {incident.status}\n"
                f"Service: {service_names.get(incident.service_id, 'Unassigned')}\n"
                f"Incident owner: {owner.full_name if owner else 'Unassigned'}\n"
                f"Summary: {incident.summary}\n"
                f"Root cause: {incident.root_cause}\n"
                f"Resolution or mitigation: {incident.resolution}"
            )

    return "\n\n".join(section for section in sections if section.strip())


async def index_projects() -> None:
    if not settings.google_api_key:
        raise RuntimeError("GOOGLE_API_KEY is not configured; cannot create embeddings.")

    engine = create_async_engine(settings.database_url, echo=False)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    indexed = 0
    skipped = 0

    async with sessions() as db:
        for company in (await db.scalars(select(Company).order_by(Company.name))).all():
            employees = (
                await db.scalars(
                    select(Employee)
                    .where(Employee.company_id == company.id)
                    .order_by(Employee.email)
                )
            ).all()
            if not employees:
                continue

            projects = (
                await db.scalars(
                    select(Project).where(Project.company_id == company.id).order_by(Project.name)
                )
            ).all()
            service_index = 0
            adr_index = 0
            for project in projects:
                services = (
                    await db.scalars(
                        select(Service).where(Service.project_id == project.id).order_by(Service.name)
                    )
                ).all()
                adrs = (
                    await db.scalars(
                        select(Adr).where(Adr.project_id == project.id).order_by(Adr.title)
                    )
                ).all()
                for service in services:
                    if service.owner_employee_id is None:
                        service.owner_employee_id = employees[service_index % len(employees)].id
                    service_index += 1
                for adr in adrs:
                    if adr.author_employee_id is None:
                        adr.author_employee_id = employees[adr_index % len(employees)].id
                    adr_index += 1
        await db.commit()

        projects = (
            await db.scalars(select(Project).order_by(Project.name))
        ).all()
        companies = {company.id: company.name for company in (await db.scalars(select(Company))).all()}

        for project in projects:
            filename = f"project-knowledge-{project.id}.md"
            existing = await db.scalar(
                select(Document.id).where(
                    Document.project_id == project.id,
                    Document.filename == filename,
                )
            )
            if existing is not None:
                skipped += 1
                continue

            content = await _project_document(
                db, project, companies.get(project.company_id, "Unassigned company")
            )
            if not content.strip():
                skipped += 1
                continue

            try:
                document = await ingest_document(
                    db=db,
                    project_id=project.id,
                    filename=filename,
                    mime_type="text/markdown",
                    data=content.encode("utf-8"),
                )
            except Exception:
                await db.rollback()
                raise

            chunk_count = await db.scalar(
                select(func.count()).select_from(Chunk).where(Chunk.document_id == document.id)
            )
            print(f"INDEXED {project.name}: {document.filename} ({chunk_count} chunks)")
            indexed += 1

    await engine.dispose()
    print(f"Done: indexed {indexed} projects; skipped {skipped} already-indexed/empty projects.")


if __name__ == "__main__":
    asyncio.run(index_projects())
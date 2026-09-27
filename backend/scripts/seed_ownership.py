#!/usr/bin/env python3
"""Attach ADRs and services to the employees responsible for them.

The 0003 migration added adrs.author_employee_id and services.owner_employee_id
but left them NULL. This backfills them so per-person questions ("how many ADRs
has X written?") resolve against real foreign keys instead of guesswork.

Assignment is derived, not hardcoded: each record is scored against every
candidate employee's declared expertise, and the best match wins. Ties break on
a stable ordering, so repeated runs produce identical results.

Usage:
    python seed_ownership.py
"""

from __future__ import annotations

import asyncio
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.models import Adr, Company, Employee, Project, Service  # noqa: E402

WORD = re.compile(r"[a-z0-9.+#]+")


def tokens(text: str | None) -> set[str]:
    return set(WORD.findall((text or "").lower()))


def score(candidate: Employee, subject: set[str]) -> int:
    """How strongly an employee's expertise and team overlap a record."""
    expertise = tokens(candidate.expertise) | tokens(candidate.team)
    return len(expertise & subject)


def pick(candidates: list[Employee], subject: set[str], seq: int) -> Employee:
    """Best expertise match; stable round-robin when nothing matches."""
    ranked = sorted(
        candidates,
        key=lambda e: (-score(e, subject), e.email),
    )
    best = ranked[0]
    if score(best, subject) > 0:
        return best
    return candidates[seq % len(candidates)]


async def seed() -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as db:
        companies = {c.id: c for c in (await db.scalars(select(Company))).all()}
        employees = (await db.scalars(select(Employee))).all()
        projects = (await db.scalars(select(Project))).all()

        if not employees:
            print("No employees found — run seed_company_data.py first.")
            await engine.dispose()
            return

        # Projects seeded through the API carry no company. Attach them to the
        # company whose name prefixes the project name, so their records have a
        # candidate pool to draw from.
        linked = 0
        by_name = {c.name: c for c in companies.values()}
        for project in projects:
            if project.company_id is not None:
                continue
            match = next(
                (c for name, c in by_name.items() if project.name.startswith(name)),
                None,
            )
            if match is not None:
                project.company_id = match.id
                linked += 1
        if linked:
            await db.flush()

        by_company: dict[object, list[Employee]] = {}
        for employee in employees:
            by_company.setdefault(employee.company_id, []).append(employee)
        for pool in by_company.values():
            pool.sort(key=lambda e: e.email)
        everyone = sorted(employees, key=lambda e: e.email)

        project_pool = {
            p.id: by_company.get(p.company_id) or everyone for p in projects
        }

        adrs = (await db.scalars(select(Adr).order_by(Adr.title))).all()
        for seq, adr in enumerate(adrs):
            pool = project_pool.get(adr.project_id, everyone)
            subject = tokens(f"{adr.title} {adr.context} {adr.decision}")
            adr.author_employee_id = pick(pool, subject, seq).id

        services = (await db.scalars(select(Service).order_by(Service.name))).all()
        for seq, service in enumerate(services):
            pool = project_pool.get(service.project_id, everyone)
            subject = tokens(f"{service.name} {service.description} {service.tech_stack}")
            service.owner_employee_id = pick(pool, subject, seq).id

        await db.commit()

        print(f"Linked {linked} project(s) to a company.")
        print(f"Assigned authors for {len(adrs)} ADRs and owners for {len(services)} services.")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())

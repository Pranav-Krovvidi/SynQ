#!/usr/bin/env python3
"""Index services and incidents into the searchable knowledge base.

Retrieval only sees Chunks, and until now the only chunks were ADR bodies. That
left the model with nothing to cite for questions about services or incidents,
so it correctly answered "I don't have enough evidence" for most of the domain.

Each record is embedded as a synthetic Document, so this needs no schema change
and is safe to re-run — existing chunks for a record are replaced, not appended.

Usage:
    python index_catalog.py               # services + incidents
    python index_catalog.py --only services
    python index_catalog.py --only incidents
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.config import settings  # noqa: E402
from app.ingestion import ingest_incident_text, ingest_service_text  # noqa: E402
from app.models import Incident, Service  # noqa: E402


async def run(only: str | None) -> None:
    engine = create_async_engine(settings.database_url, echo=False)
    factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with factory() as db:
        if only in (None, "services"):
            services = (await db.scalars(select(Service))).all()
            ok = chunks = failed = 0
            for service in services:
                try:
                    chunks += await ingest_service_text(db, service)
                    ok += 1
                except Exception as exc:  # noqa: BLE001 — report and continue
                    failed += 1
                    print(f"  ! {service.name}: {type(exc).__name__}: {str(exc)[:90]}")
            await db.commit()
            print(f"Services: indexed {ok}/{len(services)} ({chunks} chunks, {failed} failed)")

        if only in (None, "incidents"):
            incidents = (await db.scalars(select(Incident))).all()
            ok = chunks = failed = 0
            for incident in incidents:
                try:
                    chunks += await ingest_incident_text(db, incident)
                    ok += 1
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    print(f"  ! {incident.incident_key}: {type(exc).__name__}: {str(exc)[:90]}")
            await db.commit()
            print(f"Incidents: indexed {ok}/{len(incidents)} ({chunks} chunks, {failed} failed)")

    await engine.dispose()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=["services", "incidents"], default=None)
    args = parser.parse_args()
    asyncio.run(run(args.only))

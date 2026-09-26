"""Authenticated, read-only company catalog endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import CurrentUser, get_db
from app.models import Adr, Company, Employee, Incident, Project, Service, adr_services
from app.models.user import User
from app.schemas.catalog import (
    CompanyCatalogOut,
    EmployeeCatalogOut,
    IncidentCatalogOut,
    ProjectCatalogOut,
    ServiceCatalogOut,
)

router = APIRouter(prefix="/catalog", tags=["catalog"])


def _project_scope(user: User):
    if user.role == "admin":
        return None
    return select(Project.id).where(Project.owner_id == user.id)


def _visible_company_scope(user: User):
    if user.role == "admin":
        return None
    return select(Project.company_id).where(
        Project.owner_id == user.id,
        Project.company_id.is_not(None),
    )


@router.get("/companies", response_model=list[CompanyCatalogOut])
async def list_companies(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[CompanyCatalogOut]:
    project_count = (
        select(func.count(Project.id))
        .where(Project.company_id == Company.id)
        .scalar_subquery()
    )
    employee_count = (
        select(func.count(Employee.id))
        .where(Employee.company_id == Company.id)
        .scalar_subquery()
    )
    query = select(
        Company.id,
        Company.name,
        Company.industry,
        Company.description,
        project_count.label("project_count"),
        employee_count.label("employee_count"),
    )
    company_scope = _visible_company_scope(current_user)
    if company_scope is not None:
        query = query.where(Company.id.in_(company_scope))
    rows = (await db.execute(query.order_by(Company.name))).all()
    return [CompanyCatalogOut(**row._mapping) for row in rows]


@router.get("/projects", response_model=list[ProjectCatalogOut])
async def list_catalog_projects(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProjectCatalogOut]:
    service_count = (
        select(func.count(Service.id))
        .where(Service.project_id == Project.id)
        .scalar_subquery()
    )
    adr_count = (
        select(func.count(Adr.id))
        .where(Adr.project_id == Project.id)
        .scalar_subquery()
    )
    incident_count = (
        select(func.count(Incident.id))
        .where(Incident.project_id == Project.id)
        .scalar_subquery()
    )
    member_count = (
        select(func.count(Employee.id))
        .where(Employee.company_id == Project.company_id)
        .scalar_subquery()
    )
    query = select(
        Project.id,
        Project.name,
        Project.description,
        Project.company_id,
        func.coalesce(Company.name, "Unassigned").label("company_name"),
        Project.owner_id,
        service_count.label("service_count"),
        adr_count.label("adr_count"),
        incident_count.label("incident_count"),
        member_count.label("member_count"),
        Project.updated_at,
    ).outerjoin(Company, Company.id == Project.company_id)
    project_scope = _project_scope(current_user)
    if project_scope is not None:
        query = query.where(Project.id.in_(project_scope))
    rows = (await db.execute(query.order_by(Company.name, Project.name))).all()
    return [ProjectCatalogOut(**row._mapping) for row in rows]


@router.get("/employees", response_model=list[EmployeeCatalogOut])
async def list_catalog_employees(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[EmployeeCatalogOut]:
    query = select(
        Employee.id,
        Employee.company_id,
        Company.name.label("company_name"),
        Employee.full_name,
        Employee.email,
        Employee.job_title,
        Employee.team,
        Employee.expertise,
        Employee.is_on_call,
    ).join(Company, Company.id == Employee.company_id)
    company_scope = _visible_company_scope(current_user)
    if company_scope is not None:
        query = query.where(Employee.company_id.in_(company_scope))
    rows = (await db.execute(query.order_by(Company.name, Employee.full_name))).all()
    return [
        EmployeeCatalogOut(
            **{
                **row._mapping,
                "expertise": [item.strip() for item in row.expertise.split(",") if item.strip()],
            }
        )
        for row in rows
    ]


@router.get("/services", response_model=list[ServiceCatalogOut])
async def list_catalog_services(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ServiceCatalogOut]:
    adr_count = (
        select(func.count(adr_services.c.adr_id))
        .where(adr_services.c.service_id == Service.id)
        .scalar_subquery()
    )
    incident_count = (
        select(func.count(Incident.id))
        .where(Incident.service_id == Service.id)
        .scalar_subquery()
    )
    has_active_incident = (
        select(Incident.id)
        .where(Incident.service_id == Service.id, Incident.status != "resolved")
        .exists()
    )
    query = select(
        Service.id,
        Service.name,
        Service.description,
        Service.tech_stack,
        Service.tags,
        Service.project_id,
        Project.name.label("project_name"),
        func.coalesce(Company.name, "Unassigned").label("company_name"),
        adr_count.label("adr_count"),
        incident_count.label("incident_count"),
        case((has_active_incident, "incident"), else_="operational").label("status"),
    ).join(Project, Project.id == Service.project_id).outerjoin(
        Company, Company.id == Project.company_id
    )
    project_scope = _project_scope(current_user)
    if project_scope is not None:
        query = query.where(Service.project_id.in_(project_scope))
    rows = (await db.execute(query.order_by(Company.name, Project.name, Service.name))).all()
    return [ServiceCatalogOut(**row._mapping) for row in rows]


@router.get("/incidents", response_model=list[IncidentCatalogOut])
async def list_catalog_incidents(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[IncidentCatalogOut]:
    query = select(
        Incident.incident_key.label("id"),
        Incident.title,
        Incident.severity,
        Incident.status,
        Incident.project_id,
        Project.name.label("project_name"),
        Company.name.label("company_name"),
        func.coalesce(Service.name, "Unassigned").label("service_name"),
        func.coalesce(Employee.full_name, "Unassigned").label("owner_name"),
        func.coalesce(Employee.email, "").label("owner_email"),
        Incident.started_at,
        Incident.resolved_at,
        Incident.summary,
        Incident.root_cause,
        Incident.resolution,
    ).join(Project, Project.id == Incident.project_id).join(
        Company, Company.id == Project.company_id
    ).outerjoin(Service, Service.id == Incident.service_id).outerjoin(
        Employee, Employee.id == Incident.owner_employee_id
    )
    project_scope = _project_scope(current_user)
    if project_scope is not None:
        query = query.where(Incident.project_id.in_(project_scope))
    rows = (await db.execute(query.order_by(Incident.started_at.desc()))).all()
    return [IncidentCatalogOut(**row._mapping) for row in rows]
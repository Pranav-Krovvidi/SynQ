"""Read models for the company-wide catalog views."""

from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class CompanyCatalogOut(BaseModel):
    id: uuid.UUID
    name: str
    industry: str
    description: str
    project_count: int
    employee_count: int


class ProjectCatalogOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    company_id: uuid.UUID | None
    company_name: str
    owner_id: uuid.UUID
    service_count: int
    adr_count: int
    incident_count: int
    member_count: int
    updated_at: datetime


class AdrCatalogOut(BaseModel):
    id: uuid.UUID
    title: str
    status: str
    context: str | None
    decision: str | None
    consequences: str | None
    decided_at: datetime | None
    project_id: uuid.UUID
    project_name: str
    company_name: str
    author_name: str | None = None
    author_employee_id: uuid.UUID | None = None
    service_names: list[str]
    created_at: datetime
    updated_at: datetime


class EmployeeCatalogOut(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    company_name: str
    full_name: str
    email: str
    job_title: str
    team: str
    expertise: list[str]
    is_on_call: bool


class ServiceCatalogOut(BaseModel):
    id: uuid.UUID
    name: str
    description: str | None
    tech_stack: str | None
    tags: list[str]
    project_id: uuid.UUID
    project_name: str
    company_name: str
    owner_name: str | None = None
    owner_employee_id: uuid.UUID | None = None
    adr_count: int
    incident_count: int
    status: str
    updated_at: datetime


class IncidentCatalogOut(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    project_id: uuid.UUID
    project_name: str
    company_name: str
    service_name: str
    owner_name: str
    owner_email: str
    owner_employee_id: uuid.UUID | None
    started_at: datetime
    resolved_at: datetime | None
    summary: str
    root_cause: str
    resolution: str


class DocumentCatalogOut(BaseModel):
    id: uuid.UUID
    filename: str
    project_id: uuid.UUID
    project_name: str
    company_name: str
    updated_at: datetime
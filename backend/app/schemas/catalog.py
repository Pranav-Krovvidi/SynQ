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
    adr_count: int
    incident_count: int
    status: str


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
    started_at: datetime
    resolved_at: datetime | None
    summary: str
    root_cause: str
    resolution: str
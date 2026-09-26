"""Add company, employee, and incident domain tables.

Revision ID: 0002_company_incidents
Revises: 0001_initial_schema
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "0002_company_incidents"
down_revision: str | None = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False, unique=True),
        sa.Column("industry", sa.String(120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.add_column("projects", sa.Column("company_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_projects_company_id_companies",
        "projects",
        "companies",
        ["company_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_projects_company_id", "projects", ["company_id"])

    op.create_table(
        "employees",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("company_id", sa.UUID(), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(320), nullable=False, unique=True),
        sa.Column("job_title", sa.String(160), nullable=False),
        sa.Column("team", sa.String(160), nullable=False),
        sa.Column("expertise", sa.Text(), nullable=False),
        sa.Column("is_on_call", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["company_id"], ["companies.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_employees_company_id", "employees", ["company_id"])

    op.create_table(
        "incidents",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("incident_key", sa.String(64), nullable=False, unique=True),
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("service_id", sa.UUID(), nullable=True),
        sa.Column("owner_employee_id", sa.UUID(), nullable=True),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("severity", sa.String(32), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("root_cause", sa.Text(), nullable=False),
        sa.Column("resolution", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["service_id"], ["services.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["owner_employee_id"], ["employees.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_incidents_project_id", "incidents", ["project_id"])
    op.create_index("ix_incidents_service_id", "incidents", ["service_id"])
    op.create_index("ix_incidents_owner_employee_id", "incidents", ["owner_employee_id"])


def downgrade() -> None:
    op.drop_table("incidents")
    op.drop_table("employees")
    op.drop_index("ix_projects_company_id", table_name="projects")
    op.drop_constraint("fk_projects_company_id_companies", "projects", type_="foreignkey")
    op.drop_column("projects", "company_id")
    op.drop_table("companies")
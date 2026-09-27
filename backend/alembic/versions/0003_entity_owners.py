"""Link services and ADRs to employee owners/authors.

Revision ID: 0003_entity_owners
Revises: 0002_company_incidents
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision: str = "0003_entity_owners"
down_revision: str | None = "0002_company_incidents"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("services", sa.Column("owner_employee_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_services_owner_employee_id_employees",
        "services",
        "employees",
        ["owner_employee_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_services_owner_employee_id", "services", ["owner_employee_id"])

    op.add_column("adrs", sa.Column("author_employee_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_adrs_author_employee_id_employees",
        "adrs",
        "employees",
        ["author_employee_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index("ix_adrs_author_employee_id", "adrs", ["author_employee_id"])


def downgrade() -> None:
    op.drop_index("ix_adrs_author_employee_id", table_name="adrs")
    op.drop_constraint("fk_adrs_author_employee_id_employees", "adrs", type_="foreignkey")
    op.drop_column("adrs", "author_employee_id")
    op.drop_index("ix_services_owner_employee_id", table_name="services")
    op.drop_constraint("fk_services_owner_employee_id_employees", "services", type_="foreignkey")
    op.drop_column("services", "owner_employee_id")
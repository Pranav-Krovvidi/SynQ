"""
WS-2: initial schema

Revision ID: 0001_initial_schema
Revises: 
Create Date: 2025-01-01 00:00:00.000000

Creates:
  - pgvector extension
  - users
  - projects
  - services
  - adrs
  - adr_services  (join table)
  - documents
  - chunks        (embedding column width = settings.embedding_dimension)
  - query_logs
"""

from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

from app.core.config import settings

# revision identifiers
revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # pgvector extension — must exist before the chunks table can use Vector
    # ------------------------------------------------------------------
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # ------------------------------------------------------------------
    # users
    # ------------------------------------------------------------------
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("hashed_password", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(255), nullable=False, server_default=""),
        sa.Column("role", sa.String(32), nullable=False, server_default="viewer"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # ------------------------------------------------------------------
    # projects
    # ------------------------------------------------------------------
    op.create_table(
        "projects",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_projects_owner_id", "projects", ["owner_id"])

    # ------------------------------------------------------------------
    # services
    # ------------------------------------------------------------------
    op.create_table(
        "services",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("tech_stack", sa.Text(), nullable=True),
        sa.Column("repo_url", sa.String(2048), nullable=True),
        sa.Column("tags", sa.ARRAY(sa.String(64)), nullable=False, server_default="{}"),
        sa.Column("project_id", sa.UUID(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_services_project_id", "services", ["project_id"])

    # ------------------------------------------------------------------
    # adrs
    # ------------------------------------------------------------------
    op.create_table(
        "adrs",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(512), nullable=False),
        sa.Column("context", sa.Text(), nullable=True),
        sa.Column("decision", sa.Text(), nullable=True),
        sa.Column("consequences", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), nullable=False, server_default="proposed"),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("project_id", sa.UUID(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_adrs_project_id", "adrs", ["project_id"])
    op.create_index("ix_adrs_status", "adrs", ["status"])

    # ------------------------------------------------------------------
    # adr_services  (join table)
    # ------------------------------------------------------------------
    op.create_table(
        "adr_services",
        sa.Column("adr_id", sa.UUID(), sa.ForeignKey("adrs.id", ondelete="CASCADE"), primary_key=True, nullable=False),
        sa.Column("service_id", sa.UUID(), sa.ForeignKey("services.id", ondelete="CASCADE"), primary_key=True, nullable=False),
    )

    # ------------------------------------------------------------------
    # documents
    # ------------------------------------------------------------------
    op.create_table(
        "documents",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("filename", sa.String(512), nullable=False),
        sa.Column("mime_type", sa.String(128), nullable=False, server_default="text/plain"),
        sa.Column("storage_path", sa.String(2048), nullable=True),
        sa.Column("page_count", sa.Integer(), nullable=True),
        sa.Column("project_id", sa.UUID(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_documents_project_id", "documents", ["project_id"])

    # ------------------------------------------------------------------
    # chunks  (embedding column uses pgvector Vector type)
    # ------------------------------------------------------------------
    op.create_table(
        "chunks",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("chunk_index", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("embedding", Vector(settings.embedding_dimension), nullable=True),
        sa.Column("document_id", sa.UUID(), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=True),
        sa.Column("adr_id", sa.UUID(), sa.ForeignKey("adrs.id", ondelete="CASCADE"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_chunks_document_id", "chunks", ["document_id"])
    op.create_index("ix_chunks_adr_id", "chunks", ["adr_id"])
    # IVFFlat index for approximate nearest-neighbour search
    op.execute(
        "CREATE INDEX ix_chunks_embedding_ivfflat "
        "ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)"
    )

    # ------------------------------------------------------------------
    # query_logs
    # ------------------------------------------------------------------
    op.create_table(
        "query_logs",
        sa.Column("id", sa.UUID(), primary_key=True, nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("answer", sa.Text(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("retrieved_chunk_ids", sa.Text(), nullable=True),
        sa.Column("feedback_score", sa.Float(), nullable=True),
        sa.Column("user_id", sa.UUID(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", sa.UUID(), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
    )
    op.create_index("ix_query_logs_user_id", "query_logs", ["user_id"])
    op.create_index("ix_query_logs_project_id", "query_logs", ["project_id"])


def downgrade() -> None:
    op.drop_table("query_logs")
    op.execute("DROP INDEX IF EXISTS ix_chunks_embedding_ivfflat")
    op.drop_table("chunks")
    op.drop_table("documents")
    op.drop_table("adr_services")
    op.drop_table("adrs")
    op.drop_table("services")
    op.drop_table("projects")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS vector")

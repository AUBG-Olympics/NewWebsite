"""Rename teammates -> max_teammates, add min_teammates and whatsapp_link

Revision ID: d3e4f5a6b7c8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-25
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "d3e4f5a6b7c8"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    def column_exists(column_name: str) -> bool:
        # MySQL: check information_schema for the current database.
        result = bind.execute(
            text(
                """
                SELECT COUNT(*) AS cnt
                FROM information_schema.columns
                WHERE table_schema = :schema
                  AND table_name = 'events'
                  AND column_name = :col
                """
            ),
            {"schema": db_schema, "col": column_name},
        )
        return (result.scalar() or 0) > 0

    # 1) Add max_teammates first so UPDATE can reference it.
    if not column_exists("max_teammates"):
        op.add_column("events", sa.Column("max_teammates", sa.Integer(), nullable=True))

    # 2) If legacy `teammates` column still exists, copy the values over.
    #    (We avoid dropping legacy columns here to keep the migration resilient on MySQL variants.)
    if column_exists("teammates"):
        op.execute("UPDATE events SET max_teammates = teammates")

    # 3) Add the remaining optional configuration fields.
    if not column_exists("min_teammates"):
        op.add_column("events", sa.Column("min_teammates", sa.Integer(), nullable=True))

    if not column_exists("whatsapp_link"):
        op.add_column(
            "events",
            sa.Column("whatsapp_link", sa.String(length=1023), nullable=True),
        )


def downgrade() -> None:
    # Best-effort downgrade: remove newly introduced columns if they exist.
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    def column_exists(column_name: str) -> bool:
        result = bind.execute(
            text(
                """
                SELECT COUNT(*) AS cnt
                FROM information_schema.columns
                WHERE table_schema = :schema
                  AND table_name = 'events'
                  AND column_name = :col
                """
            ),
            {"schema": db_schema, "col": column_name},
        )
        return (result.scalar() or 0) > 0

    if column_exists("whatsapp_link"):
        op.drop_column("events", "whatsapp_link")
    if column_exists("min_teammates"):
        op.drop_column("events", "min_teammates")
    if column_exists("max_teammates"):
        op.drop_column("events", "max_teammates")


"""Add tier column to sponsors

Adds `sponsors.tier` for grouping sponsors in the UI (e.g. "financial").
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "f0e1d2c3b4a5"
down_revision: Union[str, Sequence[str], None] = "9c8b7a6d5e4f"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(bind, db_schema: str, column_name: str) -> bool:
    result = bind.execute(
        text(
            """
            SELECT COUNT(*) AS cnt
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = 'sponsors'
              AND column_name = :col
            """
        ),
        {"schema": db_schema, "col": column_name},
    )
    return (result.scalar() or 0) > 0


def upgrade() -> None:
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    if not _column_exists(bind, db_schema, "tier"):
        op.add_column(
            "sponsors",
            sa.Column("tier", sa.String(length=255), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    if _column_exists(bind, db_schema, "tier"):
        op.drop_column("sponsors", "tier")


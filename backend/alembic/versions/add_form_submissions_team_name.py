"""Add optional team_name to form_submissions

Some deployed databases predate this column, but the current SQLAlchemy
model and request/response schemas expect it.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "9c8b7a6d5e4f"
down_revision: Union[str, Sequence[str], None] = "d3e4f5a6b7c8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(bind, db_schema: str, column_name: str) -> bool:
    result = bind.execute(
        text(
            """
            SELECT COUNT(*) AS cnt
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = 'form_submissions'
              AND column_name = :col
            """
        ),
        {"schema": db_schema, "col": column_name},
    )
    return (result.scalar() or 0) > 0


def upgrade() -> None:
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    if not _column_exists(bind, db_schema, "team_name"):
        op.add_column(
            "form_submissions",
            sa.Column("team_name", sa.String(length=255), nullable=True),
        )


def downgrade() -> None:
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    if _column_exists(bind, db_schema, "team_name"):
        op.drop_column("form_submissions", "team_name")


"""Add waitlist config columns to events

Some deployments have an `events` table that is missing newer waitlist
configuration columns expected by the current SQLAlchemy model.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "f8c9d0e1a2b3"
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
              AND table_name = 'events'
              AND column_name = :col
            """
        ),
        {"schema": db_schema, "col": column_name},
    )
    return (result.scalar() or 0) > 0


def upgrade() -> None:
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    # `enable_waitlist` is expected by the SQLAlchemy model (and is referenced
    # during SELECT/INSERT). Some DBs predate this column.
    if not _column_exists(bind, db_schema, "enable_waitlist"):
        op.add_column(
            "events",
            sa.Column(
                "enable_waitlist",
                sa.Boolean(),
                nullable=True,
                server_default=sa.text("1"),
            ),
        )

    # These are also expected by the model; add them if they're missing.
    if not _column_exists(bind, db_schema, "waitlist"):
        op.add_column(
            "events",
            sa.Column(
                "waitlist",
                sa.Boolean(),
                nullable=True,
                server_default=sa.text("0"),
            ),
        )

    if not _column_exists(bind, db_schema, "waitlist_max_participants"):
        op.add_column(
            "events",
            sa.Column("waitlist_max_participants", sa.Integer(), nullable=True),
        )


def downgrade() -> None:
    # Best-effort downgrade (only drop if present).
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    if _column_exists(bind, db_schema, "waitlist_max_participants"):
        op.drop_column("events", "waitlist_max_participants")
    if _column_exists(bind, db_schema, "waitlist"):
        op.drop_column("events", "waitlist")
    if _column_exists(bind, db_schema, "enable_waitlist"):
        op.drop_column("events", "enable_waitlist")


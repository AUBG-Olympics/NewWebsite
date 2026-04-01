"""Add gender-specific max participants caps to events

Adds optional `events.max_participants_male` and `events.max_participants_female`.
These allow separate caps when `events.separated_genders = 1`.

We keep the existing `events.max_participants` as the legacy/default cap.
This migration backfills the new columns from `max_participants` for existing
rows where `separated_genders=1` and the new columns are null.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text

revision: str = "b7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "c6f7a8b9c0d1"
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

    if not _column_exists(bind, db_schema, "max_participants_male"):
        op.add_column(
            "events",
            sa.Column("max_participants_male", sa.Integer(), nullable=True),
        )
    if not _column_exists(bind, db_schema, "max_participants_female"):
        op.add_column(
            "events",
            sa.Column("max_participants_female", sa.Integer(), nullable=True),
        )

    # Backfill for separated gender events: use legacy cap if present.
    op.execute(
        text(
            """
            UPDATE events
            SET max_participants_male = max_participants
            WHERE separated_genders = 1
              AND max_participants IS NOT NULL
              AND (max_participants_male IS NULL)
            """
        )
    )
    op.execute(
        text(
            """
            UPDATE events
            SET max_participants_female = max_participants
            WHERE separated_genders = 1
              AND max_participants IS NOT NULL
              AND (max_participants_female IS NULL)
            """
        )
    )


def downgrade() -> None:
    bind = op.get_bind()
    db_schema = bind.engine.url.database

    if _column_exists(bind, db_schema, "max_participants_female"):
        op.drop_column("events", "max_participants_female")
    if _column_exists(bind, db_schema, "max_participants_male"):
        op.drop_column("events", "max_participants_male")


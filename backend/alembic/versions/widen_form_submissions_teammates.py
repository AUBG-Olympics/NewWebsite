"""Widen form_submissions.teammates to 500 chars

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table("form_submissions") as batch_op:
        batch_op.alter_column(
            "teammates",
            existing_type=sa.String(),
            type_=sa.String(500),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("form_submissions") as batch_op:
        batch_op.alter_column(
            "teammates",
            existing_type=sa.String(500),
            type_=sa.String(),
            existing_nullable=True,
        )

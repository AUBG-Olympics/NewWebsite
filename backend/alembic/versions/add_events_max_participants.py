"""Add max_participants to events

Revision ID: a1b2c3d4e5f6
Revises: 00a4b879c684
Create Date: 2026-02-06

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "00a4b879c684"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("events", sa.Column("max_participants", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("events", "max_participants")

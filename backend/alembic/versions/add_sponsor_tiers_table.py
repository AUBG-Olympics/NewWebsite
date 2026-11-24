"""Add sponsor_tiers table

Stores tier metadata (label, layout) separately from Sponsor rows so admins
can create empty tiers and control ordering.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "a1c2e3f4a5b6"
down_revision: Union[str, Sequence[str], None] = "f0e1d2c3b4a5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "sponsor_tiers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("blurb", sa.Text(), nullable=True),
        sa.Column("columns", sa.Integer(), nullable=True),
        sa.Column("logo_max_width", sa.Integer(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=True),
    )
    op.create_index("ix_sponsor_tiers_key", "sponsor_tiers", ["key"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_sponsor_tiers_key", table_name="sponsor_tiers")
    op.drop_table("sponsor_tiers")


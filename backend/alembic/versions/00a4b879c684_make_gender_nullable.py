"""Make gender nullable

Revision ID: 00a4b879c684
Revises: e2726560a13b
Create Date: 2026-01-26 16:22:03.127438

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "00a4b879c684"
down_revision: Union[str, Sequence[str], None] = "e2726560a13b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    with op.batch_alter_table("form_submissions") as batch_op:
        batch_op.alter_column("gender", existing_type=sa.VARCHAR(), nullable=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table("form_submissions") as batch_op:
        batch_op.alter_column("gender", existing_type=sa.VARCHAR(), nullable=False)

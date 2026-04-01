"""Init

Revision ID: cee881e5451e
Revises: 
Create Date: 2026-02-19 18:15:26.727688

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'cee881e5451e'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Baseline revision.

    This project was deployed before Alembic was used consistently, so the
    production database may already contain tables/columns. This revision must
    be a no-op so that Alembic can safely track versions without altering the
    database.
    """
    pass


def downgrade() -> None:
    # No-op baseline downgrade.
    pass

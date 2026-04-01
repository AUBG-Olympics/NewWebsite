"""Merge multiple heads into one.

Production has multiple Alembic heads due to historical init chains and
parallel migrations. This merge revision is a no-op that unifies heads so
`alembic upgrade head` works normally going forward.
"""

from typing import Sequence, Union

from alembic import op

revision: str = "c6f7a8b9c0d1"
down_revision: Union[str, Sequence[str], None] = (
    "f8c9d0e1a2b3",
    "a1c2e3f4a5b6",
    "cee881e5451e",
)
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Merge revision: no schema changes.
    op.execute("SELECT 1")


def downgrade() -> None:
    # No-op; splitting heads is not supported.
    op.execute("SELECT 1")


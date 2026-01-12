from pathlib import Path

from alembic import command
from alembic.config import Config


def run_migrations():
    """
    Apply all pending Alembic migrations.
    Does NOT create new migrations.
    """
    project_root = Path(__file__).resolve().parents[2]

    alembic_ini = project_root / "alembic.ini"
    alembic_dir = project_root / "alembic"

    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(alembic_dir))

    command.upgrade(alembic_cfg, "head")

from pathlib import Path

try:
    from alembic import command
    from alembic.config import Config
    ALEMBIC_AVAILABLE = True
except ImportError:
    ALEMBIC_AVAILABLE = False


def run_migrations():
    """
    Apply all pending Alembic migrations.
    Does NOT create new migrations.
    Falls back to creating tables directly if Alembic is not available.
    """
    if not ALEMBIC_AVAILABLE:
        # Fallback: create tables directly
        from src.db.database import Base, engine
        Base.metadata.create_all(bind=engine)
        return

    project_root = Path(__file__).resolve().parents[2]

    alembic_ini = project_root / "alembic.ini"
    alembic_dir = project_root / "alembic"

    if not alembic_ini.exists() or not alembic_dir.exists():
        # Fallback if alembic files don't exist
        from src.db.database import Base, engine
        Base.metadata.create_all(bind=engine)
        return

    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("script_location", str(alembic_dir))

    try:
        command.upgrade(alembic_cfg, "head")
    except Exception as e:
        # If migrations fail, fall back to creating tables
        print(f"Warning: Alembic migration failed: {e}. Falling back to direct table creation.")
        from src.db.database import Base, engine
        Base.metadata.create_all(bind=engine)

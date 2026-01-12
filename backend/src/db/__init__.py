from .database import Base, SessionLocal, engine

# Import migrations only if alembic is available
try:
    from .migrations import run_migrations
    __all__ = ["Base", "SessionLocal", "engine", "run_migrations"]
except ImportError:
    # Fallback if alembic is not installed
    def run_migrations():
        """Fallback: create tables directly if migrations are not available"""
        Base.metadata.create_all(bind=engine)
    __all__ = ["Base", "SessionLocal", "engine", "run_migrations"]

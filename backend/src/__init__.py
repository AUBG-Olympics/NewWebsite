"""Backend package. The ASGI application is exposed by ``src.main``.

Keep package imports free of application/OAuth initialization so Alembic can
load model metadata without loading API routes or Google integrations.
"""

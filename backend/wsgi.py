"""
WSGI entry point for cPanel / Passenger and other WSGI servers.
Exposes the FastAPI (ASGI) app as a WSGI callable.
"""
from a2wsgi import ASGIMiddleware
from src.main import app

application = ASGIMiddleware(app)

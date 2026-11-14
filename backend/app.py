from a2wsgi import ASGIMiddleware
from src.main import app

application = ASGIMiddleware(app)

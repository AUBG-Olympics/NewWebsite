import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from src.db.database import Base, engine
from src.db.models import user  # ensure models are imported before create_all
from src.routes import auth, sponsors

# Create DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Olympics API", version="1.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "change_this_secret_key"),
)

# Routers
app.include_router(auth.router)
app.include_router(sponsors.router)


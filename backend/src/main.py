import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from starlette.middleware.sessions import SessionMiddleware
from fastapi.responses import JSONResponse

from src.routes import auth, events, forms, sponsors, google_sheets_auth, settings
from src.routes import sponsor_tiers

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)

app = FastAPI(title="Olympics API", version="1.0")


@app.get("/")
def root():
    """If you see this, the app is running."""
    return {"message": "Olympics API", "events": "/api/events/", "health": "/api/health"}


@app.get("/api/health")
def health():
    return {"status": "ok"}


# Enable CORS – allow all origins, no credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    SessionMiddleware,
    secret_key=os.getenv("SESSION_SECRET", "change_this_secret_key"),
)


@app.exception_handler(Exception)
async def catch_all_exceptions(request, exc):
    import traceback

    traceback.print_exc()  # prints the real error
    # Always send CORS headers on errors so the browser doesn't report "CORS error" instead of 500
    return JSONResponse(
        {"error": str(exc)},
        status_code=500,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        },
    )


# Routers
app.include_router(auth.router)
app.include_router(sponsors.router)
app.include_router(sponsor_tiers.router)
app.include_router(settings.router)
app.include_router(events.router)
app.include_router(forms.router)
# Enable ONLY if the Refresh token in the .env file is revoked
# app.include_router(google_sheets_auth.router)

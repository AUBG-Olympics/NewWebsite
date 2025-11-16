from fastapi import FastAPI
from src.routes import auth, sponsors

app = FastAPI(title="Olympics API")

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(sponsors.router, prefix="/sponsors", tags=["Sponsors"])

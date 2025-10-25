from fastapi import APIRouter, Depends, Request
from starlette.responses import RedirectResponse
from src.util.auth import google
from src.util.permissions import ADMINS
from src.db.database import SessionLocal
from src.db.models.user import User
from fastapi.responses import JSONResponse
from src.util.jwt import create_access_token

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.get("/login")
async def login_via_google(request: Request):
    redirect_uri = request.url_for('auth_callback')
    print(f"DEBUG: Redirect URI: {redirect_uri}")
    return await google.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def auth_callback(request: Request):
    token_data = await google.authorize_access_token(request)
    user_info = token_data.get('userinfo')

    db = SessionLocal()
    user = db.query(User).filter(User.email == user_info['email']).first()
    if not user:
        user = User(
            email=user_info['email'],
            name=user_info['name'],
            picture=user_info.get('picture'),
            role="user"  # default role
        )
        if user.email in ADMINS:
            user.role="admin"
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create JWT
    access_token = create_access_token({"sub": user.email, "role": user.role})

    # Return token as JSON (or set it in cookie if you prefer)
    return JSONResponse({"access_token": access_token, "token_type": "bearer"})

from fastapi import APIRouter, Depends, Request
from starlette.responses import RedirectResponse
from src.util.auth import google
from src.util.permissions import ADMINS
from src.db.database import SessionLocal
from src.db.models.user import User
from fastapi.responses import JSONResponse
from src.util.jwt import create_access_token
import os

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Get frontend URL from environment or default to localhost
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.get("/login")
async def login_via_google(request: Request):
    redirect_uri = request.url_for('auth_callback')
    print(f"DEBUG: Redirect URI: {redirect_uri}")
    return await google.authorize_redirect(request, redirect_uri)

@router.get("/callback")
async def auth_callback(request: Request):
    try:
        token_data = await google.authorize_access_token(request)
        user_info = token_data.get('userinfo')

        if not user_info:
            return JSONResponse({"error": "Failed to get user info"}, status_code=400)

        db = SessionLocal()
        try:
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
            else:
                # Update user info and check admin status for existing users
                user.name = user_info['name']
                user.picture = user_info.get('picture')
                # Update role based on ADMINS list
                if user.email in ADMINS:
                    user.role = "admin"
                else:
                    user.role = "user"
                db.commit()
                db.refresh(user)

            # Create JWT
            access_token = create_access_token({"sub": user.email, "role": user.role})

            # Create redirect response to frontend with token in URL
            redirect_url = f"{FRONTEND_URL}/admin?token={access_token}"
            print(f"DEBUG: Redirecting to: {redirect_url}")
            
            response = RedirectResponse(url=redirect_url, status_code=302)
            
            # Also set token in HTTP-only cookie for additional security
            response.set_cookie(
                key="auth_token",
                value=access_token,
                max_age=7 * 24 * 60 * 60,  # 7 days
                httponly=True,
                samesite="lax",
                secure=False,  # Set to True in production with HTTPS
                path="/"
            )
            
            return response
        finally:
            db.close()
    except Exception as e:
        print(f"ERROR in auth_callback: {str(e)}")
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": f"Authentication failed: {str(e)}"}, status_code=500)

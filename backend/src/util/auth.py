from authlib.integrations.starlette_client import OAuth
from starlette.config import Config
from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from src.util.jwt import decode_access_token

config = Config(".env")

oauth = OAuth(config)
google = oauth.register(
    name='google',
    client_id=config('GOOGLE_CLIENT_ID'),
    client_secret=config('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

def get_current_user(token: str = None, request: Request = None):
    # Accept token from Authorization header or cookie
    if not token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
        else:
            raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload  # payload contains "sub" (email) and "role"


def admin_required(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return user

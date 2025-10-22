import os
import requests
from fastapi import HTTPException
from dotenv import load_dotenv

load_dotenv()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI")
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

def exchange_code_for_token(code: str):
    """Exchange Google OAuth2 authorization code for an access token"""
    data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }

    response = requests.post(GOOGLE_TOKEN_URL, data=data)
    if not response.ok:
        raise HTTPException(status_code=400, detail="Failed to get access token from Google")

    return response.json()

def get_google_user_info(access_token: str):
    """Fetch the user's Google profile"""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = requests.get(GOOGLE_USERINFO_URL, headers=headers)

    if not response.ok:
        raise HTTPException(status_code=400, detail="Failed to fetch user info from Google")

    return response.json()

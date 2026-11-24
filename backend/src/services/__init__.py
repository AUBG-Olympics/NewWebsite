from typing import Optional

from fastapi import HTTPException

from .google_sheets import GoogleSheetsService
from src.util.google_exceptions import GoogleAuthError

# Singleton instance for dependency injection
_sheets_service: Optional[GoogleSheetsService] = None


def get_google_sheets_service() -> GoogleSheetsService:
    """
    Returns a singleton GoogleSheetsService instance.
    FastAPI can use this in Depends().
    Raises HTTPException 503 if credentials are invalid or expired.
    """
    global _sheets_service
    if _sheets_service is None:
        try:
            _sheets_service = GoogleSheetsService()
        except GoogleAuthError:
            raise HTTPException(
                status_code=503,
                detail=(
                    "Google Sheets credentials are invalid or expired. "
                    "Update GOOGLE_REFRESH_TOKEN on the server (re-run the OAuth flow to get a new refresh token)."
                ),
            )
    return _sheets_service

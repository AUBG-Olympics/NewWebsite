from typing import Optional

from .google_sheets import GoogleSheetsService

# Singleton instance for dependency injection
_sheets_service: Optional[GoogleSheetsService] = None


def get_google_sheets_service() -> GoogleSheetsService:
    """
    Returns a singleton GoogleSheetsService instance.
    FastAPI can use this in Depends().
    """
    global _sheets_service
    if _sheets_service is None:
        _sheets_service = GoogleSheetsService()
    return _sheets_service

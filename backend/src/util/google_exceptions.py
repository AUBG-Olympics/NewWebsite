class GoogleSheetsError(Exception):
    """Base exception for Google Sheets / Drive errors"""


class GoogleAuthError(GoogleSheetsError):
    """Authentication / token errors"""


class GooglePermissionError(GoogleSheetsError):
    """Permission / access errors"""


class GoogleNotFoundError(GoogleSheetsError):
    """Missing file, folder, or sheet"""


class GoogleApiError(GoogleSheetsError):
    """Generic Google API error"""

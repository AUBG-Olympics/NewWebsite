from enum import Enum


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


class SheetsStatusCodes(Enum):
    SUCCESS = 0
    SHEET_NOT_FOUND = 1
    SHEET_ALREADY_EXISTS = 2
    NEW_NAME_SAME_AS_OLD = 3

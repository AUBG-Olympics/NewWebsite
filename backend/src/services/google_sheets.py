from typing import List, Optional
import logging

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from starlette.config import Config

from src.util.google_exceptions import (
    GoogleAuthError,
    GooglePermissionError,
    GoogleNotFoundError,
    GoogleApiError,
    SheetsStatusCodes,
)

logger = logging.getLogger(__name__)


class GoogleSheetsService:
    SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]

    def __init__(self):
        self.config = Config(".env")
        try:
            self._creds = Credentials(
                token=None,
                refresh_token=self.config("GOOGLE_REFRESH_TOKEN"),
                token_uri="https://oauth2.googleapis.com/token",
                client_id=self.config("GOOGLE_CLIENT_ID"),
                client_secret=self.config("GOOGLE_CLIENT_SECRET"),
                scopes=self.SCOPES,
            )

            print(self.config("GOOGLE_REFRESH_TOKEN"))
            if not self._creds.valid:
                self._creds.refresh(Request())

            self._sheets = build("sheets", "v4", credentials=self._creds)
            self._drive = build("drive", "v3", credentials=self._creds)

        except Exception as e:
            raise GoogleAuthError("Failed to initialize Google credentials") from e

    # ======================================================
    # Internal helpers
    # ======================================================
    def _handle_http_error(self, e: HttpError, context: str):
        status = e.resp.status
        error = e.error_details if hasattr(e, "error_details") else str(e)

        if status in (401, 403):
            raise GooglePermissionError(f"{context}: permission denied") from e
        elif status == 404:
            raise GoogleNotFoundError(f"{context}: resource not found") from e
        else:
            raise GoogleApiError(
                f"{context}: Google API error ({status}) → {error}"
            ) from e

    # ======================================================
    # Spreadsheet creation
    # ======================================================

    def create_spreadsheet(
        self,
        title: str,
        editors: Optional[List[str]] = None,
        public: bool = False,
    ) -> str:
        """
        Idempotent:
        - Reuses existing spreadsheet in export folder
        - Creates one only if it doesn't exist
        """

        folder_id = self.config("GOOGLE_EXPORT_FOLDER_ID")

        try:
            # Try to find existing spreadsheet
            query = (
                f"name = '{title}' "
                f"and mimeType = 'application/vnd.google-apps.spreadsheet' "
                f"and '{folder_id}' in parents "
                f"and trashed = false"
            )
            res = (
                self._drive.files()
                .list(
                    q=query,
                    fields="files(id, name)",
                    pageSize=1,
                )
                .execute()
            )

            files = res.get("files", [])
            if files:
                return files[0]["id"]

            # Create spreadsheet
            file = (
                self._drive.files()
                .create(
                    body={
                        "name": title,
                        "mimeType": "application/vnd.google-apps.spreadsheet",
                        "parents": [self.config("GOOGLE_EXPORT_FOLDER_ID")],
                    },
                    fields="id",
                )
                .execute()
            )

            spreadsheet_id = file["id"]

            self._apply_permissions(
                spreadsheet_id=spreadsheet_id,
                editors=editors,
                public=public,
            )

            return spreadsheet_id
        except HttpError as e:
            self._handle_http_error(e, "Create spreadsheet")

    # ======================================================
    # Sheet operations (Add, Write, Rename)
    # ======================================================

    def add_sheet(
        self,
        spreadsheet_id: str,
        sheet_name: str,
    ) -> SheetsStatusCodes:
        """
        Add a new tab to an existing spreadsheet.
        Does nothing if the tab already exists.
        """
        try:
            spreadsheet = (
                self._sheets.spreadsheets()
                .get(
                    spreadsheetId=spreadsheet_id,
                    fields="sheets(properties(title))",
                )
                .execute()
            )

            existing = {s["properties"]["title"] for s in spreadsheet.get("sheets", [])}

            if sheet_name in existing:
                logger.debug(f"Sheet '{sheet_name}' already exists, will write to it")
                return SheetsStatusCodes.SHEET_ALREADY_EXISTS

            self._sheets.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={
                    "requests": [{"addSheet": {"properties": {"title": sheet_name}}}]
                },
            ).execute()
        except HttpError as e:
            self._handle_http_error(e, "Add sheet")
        return SheetsStatusCodes.SUCCESS

    def get_sheet_names(self, spreadsheet_id: str) -> List[str]:
        """Get list of all sheet names in the spreadsheet."""
        try:
            spreadsheet = (
                self._sheets.spreadsheets()
                .get(
                    spreadsheetId=spreadsheet_id,
                    fields="sheets(properties(title))",
                )
                .execute()
            )
            return [s["properties"]["title"] for s in spreadsheet.get("sheets", [])]
        except HttpError as e:
            self._handle_http_error(e, "Get sheet names")

    def append_to_sheet(
        self, spreadsheet_id: str, sheet_name: str, values: List[List]
    ) -> SheetsStatusCodes:
        try:
            self.add_sheet(spreadsheet_id, sheet_name)

            self._sheets.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=sheet_name,
                insertDataOption="INSERT_ROWS",
                valueInputOption="RAW",
                body={"values": values},
            ).execute()
            return SheetsStatusCodes.SUCCESS

        except HttpError as e:
            self._handle_http_error(e, "Write sheet")

    def write_to_sheet(
        self,
        spreadsheet_id: str,
        sheet_name: str,
        values: List[List],
    ) -> SheetsStatusCodes:
        try:
            self.add_sheet(spreadsheet_id, sheet_name)

            self._sheets.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=f"{sheet_name}!A1",
                valueInputOption="RAW",
                body={"values": values},
            ).execute()
            return SheetsStatusCodes.SUCCESS

        except HttpError as e:
            self._handle_http_error(e, "Write sheet")

    def rename_sheet(
        self,
        spreadsheet_id: str,
        old_name: str,
        new_name: str,
    ) -> SheetsStatusCodes:
        """
        Renames a sheet tab.
        - Idempotent if old_name == new_name
        - Fails if old sheet does not exist
        - Fails if target name already exists
        """
        if old_name == new_name:
            return SheetsStatusCodes.NEW_NAME_SAME_AS_OLD

        try:
            spreadsheet = (
                self._sheets.spreadsheets()
                .get(
                    spreadsheetId=spreadsheet_id,
                    fields="sheets(properties(sheetId,title))",
                )
                .execute()
            )

            sheets = spreadsheet.get("sheets", [])

            sheet_id = None
            existing_titles = set()

            for sheet in sheets:
                title = sheet["properties"]["title"]
                existing_titles.add(title)

                if title == old_name:
                    sheet_id = sheet["properties"]["sheetId"]

            if new_name in existing_titles:
                return SheetsStatusCodes.SHEET_ALREADY_EXISTS

            if sheet_id is None:
                return SheetsStatusCodes.SHEET_NOT_FOUND

            self._sheets.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={
                    "requests": [
                        {
                            "updateSheetProperties": {
                                "properties": {
                                    "sheetId": sheet_id,
                                    "title": new_name,
                                },
                                "fields": "title",
                            }
                        }
                    ]
                },
            ).execute()
            return SheetsStatusCodes.SUCCESS

        except HttpError as e:
            self._handle_http_error(e, "Rename sheet")

    # ======================================================
    # Permissions (Drive API)
    # ======================================================

    def _apply_permissions(
        self,
        spreadsheet_id: str,
        editors: Optional[List[str]],
        public: bool,
    ):
        try:
            if editors:
                for email in editors:
                    self._drive.permissions().create(
                        fileId=spreadsheet_id,
                        body={
                            "type": "user",
                            "role": "writer",
                            "emailAddress": email,
                        },
                        sendNotificationEmail=False,
                    ).execute()

            if public:
                self._drive.permissions().create(
                    fileId=spreadsheet_id,
                    body={
                        "type": "anyone",
                        "role": "writer",
                    },
                ).execute()

        except HttpError as e:
            self._handle_http_error(e, "Apply permissions")

    # ======================================================
    # Delete a file by ID
    # ======================================================
    def delete_file(self, file_id: str):
        """Deletes a file owned by the service account."""
        try:
            self._drive.files().delete(fileId=file_id).execute()
        except HttpError as e:
            self._handle_http_error(e, "Delete file")

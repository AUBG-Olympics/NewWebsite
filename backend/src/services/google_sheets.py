from typing import List, Optional
import os
from pathlib import Path
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


def sheet_range(sheet_name: str, cell: Optional[str] = None) -> str:
    """Quote arbitrary tab names for A1 notation, including apostrophes and !."""
    quoted = "'" + sheet_name.replace("'", "''") + "'"
    return quoted + ("!" + cell if cell else "")


class GoogleSheetsService:
    SCOPES = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive.file",
    ]

    def __init__(self):
        # Always load from backend/.env (not server working directory).
        env_file_path = str(Path(__file__).resolve().parents[2] / ".env")
        self.config = Config(env_file_path)
        try:
            self._creds = Credentials(
                token=None,
                refresh_token=os.getenv("GOOGLE_REFRESH_TOKEN") or self.config("GOOGLE_REFRESH_TOKEN"),
                token_uri="https://oauth2.googleapis.com/token",
                client_id=os.getenv("GOOGLE_CLIENT_ID") or self.config("GOOGLE_CLIENT_ID"),
                client_secret=os.getenv("GOOGLE_CLIENT_SECRET")
                or self.config("GOOGLE_CLIENT_SECRET"),
                scopes=self.SCOPES,
            )

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
            escaped_title = title.replace("\\", "\\\\").replace("'", "\\'")
            query = (
                f"name = '{escaped_title}' "
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
                range=sheet_range(sheet_name),
                insertDataOption="INSERT_ROWS",
                valueInputOption="RAW",
                body={"values": values},
            ).execute()
            return SheetsStatusCodes.SUCCESS

        except HttpError as e:
            self._handle_http_error(e, "Write sheet")

    def merge_row_and_write(
        self, spreadsheet_id: str, sheet_name: str, text_to_write: str
    ):
        try:
            self.add_sheet(spreadsheet_id, sheet_name)

            # 1. Find first empty row
            result = self._sheets.spreadsheets().values().get(
                spreadsheetId=spreadsheet_id,
                range=sheet_range(sheet_name),
            ).execute()

            values = result.get("values", [])
            row_index = len(values)  # 0-based

            # 2. Get sheetId + column count
            metadata = self._sheets.spreadsheets().get(
                spreadsheetId=spreadsheet_id
            ).execute()

            sheet = next(
                s for s in metadata["sheets"]
                if s["properties"]["title"] == sheet_name
            )

            sheet_id = sheet["properties"]["sheetId"]
            column_count = sheet["properties"]["gridProperties"]["columnCount"]

            # 3. Merge row
            self._sheets.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id,
                body={
                    "requests": [
                        {
                            "mergeCells": {
                                "range": {
                                    "sheetId": sheet_id,
                                    "startRowIndex": row_index,
                                    "endRowIndex": row_index + 1,
                                    "startColumnIndex": 0,
                                    "endColumnIndex": column_count,
                                },
                                "mergeType": "MERGE_ALL",
                            }
                        }
                    ]
                },
            ).execute()

            # 4. Write text into merged cell
            self._sheets.spreadsheets().values().update(
                spreadsheetId=spreadsheet_id,
                range=sheet_range(sheet_name, f"A{row_index + 1}"),
                valueInputOption="RAW",
                body={"values": [[text_to_write]]},
            ).execute()

            return SheetsStatusCodes.SUCCESS

        except HttpError as e:
            self._handle_http_error(e, "Merge row and write")
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
                range=sheet_range(sheet_name, "A1"),
                valueInputOption="RAW",
                body={"values": values},
            ).execute()
            return SheetsStatusCodes.SUCCESS

        except HttpError as e:
            self._handle_http_error(e, "Write sheet")

    def write_registration_sheet(self, spreadsheet_id: str, sheet_name: str, values: List[List]):
        """Atomically replace the generated table and its formatting, clearing stale rows."""
        try:
            self.add_sheet(spreadsheet_id, sheet_name)
            metadata = self._sheets.spreadsheets().get(
                spreadsheetId=spreadsheet_id, fields="sheets(properties)",
            ).execute()
            properties = next(sheet["properties"] for sheet in metadata["sheets"]
                              if sheet["properties"]["title"] == sheet_name)
            sheet_id = properties["sheetId"]
            grid = properties["gridProperties"]
            columns = len(values[0])
            row_count = max(grid["rowCount"], len(values))
            area = {"sheetId": sheet_id, "startRowIndex": 0, "endRowIndex": row_count,
                    "startColumnIndex": 0, "endColumnIndex": max(columns, grid["columnCount"])}
            # Explicit stringValue preserves +phone prefixes, leading zeros and
            # literal =text without spreadsheet formula interpretation.
            rows = [{"values": [{"userEnteredValue": {"numberValue": value} if isinstance(value, (int, float))
                                 else {"stringValue": str(value or "")}} for value in row]} for row in values]
            requests = [
                {"updateSheetProperties": {"properties": {"sheetId": sheet_id,
                    "gridProperties": {"rowCount": row_count, "columnCount": area["endColumnIndex"],
                                       "frozenRowCount": 1}},
                    "fields": "gridProperties.rowCount,gridProperties.columnCount,gridProperties.frozenRowCount"}},
                {"updateCells": {"range": area, "rows": rows, "fields": "userEnteredValue"}},
                {"repeatCell": {"range": area, "cell": {"userEnteredFormat": {
                    "backgroundColor": {"red": 1, "green": 1, "blue": 1},
                    "textFormat": {"bold": False, "foregroundColor": {"red": 0.1, "green": 0.1, "blue": 0.1}},
                    "wrapStrategy": "WRAP", "verticalAlignment": "TOP"}}, "fields": "userEnteredFormat"}},
                {"repeatCell": {"range": {**area, "endRowIndex": 1, "endColumnIndex": columns},
                    "cell": {"userEnteredFormat": {"backgroundColor": {"red": 0.12, "green": 0.23, "blue": 0.55},
                        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}}}},
                    "fields": "userEnteredFormat.backgroundColor,userEnteredFormat.textFormat"}},
                {"setBasicFilter": {"filter": {"range": {**area, "endRowIndex": len(values), "endColumnIndex": columns}}}},
            ]
            first_waitlist = next((index for index, row in enumerate(values[1:], 1) if row[2] == "Waitlist"), None)
            if first_waitlist is not None:
                requests.append({"repeatCell": {"range": {**area, "startRowIndex": first_waitlist,
                    "endRowIndex": len(values), "endColumnIndex": columns}, "cell": {"userEnteredFormat": {
                        "backgroundColor": {"red": 1, "green": 0.95, "blue": 0.75}}},
                    "fields": "userEnteredFormat.backgroundColor"}})
            for index, width in enumerate([125, 80, 115, 200, 180, 180, 115, 180, 240, 155, 260]):
                requests.append({"updateDimensionProperties": {"range": {"sheetId": sheet_id,
                    "dimension": "COLUMNS", "startIndex": index, "endIndex": index + 1},
                    "properties": {"pixelSize": width}, "fields": "pixelSize"}})
            self._sheets.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id, body={"requests": requests},
            ).execute()
            return SheetsStatusCodes.SUCCESS
        except HttpError as e:
            self._handle_http_error(e, "Write registration table")

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

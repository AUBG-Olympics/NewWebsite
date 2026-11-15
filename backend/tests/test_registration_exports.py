"""Readable export content and Google requests, without live Google access."""
import unittest
from types import SimpleNamespace as Row
from unittest.mock import MagicMock
from src.services.division_exports import HEADERS, append_registration, write_registrations
from src.services.google_sheets import GoogleSheetsService

class MemorySheets:
    def __init__(self): self.tabs = {}
    def get_sheet_names(self, _): return list(self.tabs)
    def add_sheet(self, _, title): self.tabs[title] = []
    def rename_sheet(self, _, old_name, new_name): self.tabs[new_name] = self.tabs.pop(old_name)
    def write_registration_sheet(self, _, title, rows): self.tabs[title] = rows

def entry(id, division):
    return Row(id=id, division_id=division.id, division=division, name=f"Player {id}",
        sport="Table tennis", teammates="Alex, Sam", team_name="Team One",
        phone_number="+00123456789", email="person@example.com")

class RegistrationExportTests(unittest.TestCase):
    def test_status_order_and_retired_history(self):
        sheets = MemorySheets()
        solo = Row(id=1, name="Women's singles", max_participants=1, is_active=True)
        doubles = Row(id=2, name="Doubles", max_participants=None, is_active=False)
        write_registrations(sheets, "file", [entry(4, solo), entry(3, doubles), entry(1, solo)])
        rows = next(rows for title, rows in sheets.tabs.items() if title.startswith("Division 1 -"))
        self.assertEqual(rows[0], HEADERS)
        self.assertEqual([row[:3] for row in rows[1:]], [[1, 1, "Registered"], [4, 2, "Waitlist"]])
        self.assertEqual(rows[1][8:10], ["Alex\nSam", "+00123456789"])
        self.assertEqual(sheets.tabs["Division 2 - Doubles"][1][2], "Registered")
        self.assertEqual(sheets.tabs["Division 2 - Doubles"][1][6], "Retired")
        self.assertTrue(all(len(row) == len(HEADERS) for tab in sheets.tabs.values() for row in tab))

    def test_retry_rename_and_shorter_export(self):
        sheets = MemorySheets()
        division = Row(id=1, name="Old name", max_participants=0, is_active=True)
        rows = [entry(2, division), entry(1, division)]
        db = MagicMock()
        db.query.return_value.options.return_value.filter.return_value.populate_existing.return_value.with_for_update.return_value.all.return_value = rows
        for _ in range(2): append_registration(db, sheets, "file", rows[0])
        self.assertEqual(len(sheets.tabs["Division 1 - Old name"]), 3)
        division.name = "New name"
        write_registrations(sheets, "file", rows[:1])
        self.assertEqual(list(sheets.tabs), ["Division 1 - New name"])
        self.assertEqual(len(sheets.tabs["Division 1 - New name"]), 2)
        self.assertEqual(sheets.tabs["Division 1 - New name"][1][2], "Waitlist")

    def test_google_atomic_replace_formatting_and_literal_contacts(self):
        service = GoogleSheetsService.__new__(GoogleSheetsService)
        service._sheets = MagicMock(); service.add_sheet = MagicMock()
        api = service._sheets.spreadsheets()
        api.get.return_value.execute.return_value = {"sheets": [{"properties": {
            "title": "Division 1 - Test", "sheetId": 42,
            "gridProperties": {"rowCount": 1000, "columnCount": 26}}}]}
        row = [7, 1, "Waitlist", "=literal", "Tennis", "Test", "Active", "", "", "+00123", "a@example.com"]
        service.write_registration_sheet("file", "Division 1 - Test", [HEADERS, row])
        requests = api.batchUpdate.call_args.kwargs["body"]["requests"]
        update = next(item["updateCells"] for item in requests if "updateCells" in item)
        self.assertEqual(update["range"]["endRowIndex"], 1000)
        self.assertEqual(len(update["rows"]), 2)
        cells = update["rows"][1]["values"]
        self.assertEqual(cells[3]["userEnteredValue"], {"stringValue": "=literal"})
        self.assertEqual(cells[9]["userEnteredValue"], {"stringValue": "+00123"})
        self.assertEqual(requests[0]["updateSheetProperties"]["properties"]["gridProperties"]["frozenRowCount"], 1)
        self.assertTrue(any("setBasicFilter" in item for item in requests))
        self.assertTrue(any(item.get("repeatCell", {}).get("range", {}).get("startRowIndex") == 1 for item in requests))

    def test_drive_title_escaping(self):
        service = GoogleSheetsService.__new__(GoogleSheetsService)
        service.config = lambda _: "folder"; service._drive = MagicMock()
        service._drive.files().list.return_value.execute.return_value = {"files": [{"id": "existing"}]}
        self.assertEqual(service.create_spreadsheet("O'Brien \\ Cup"), "existing")
        self.assertIn("O\\'Brien \\\\ Cup", service._drive.files().list.call_args.kwargs["q"])

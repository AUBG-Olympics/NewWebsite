"""End-to-end division API tests on disposable MySQL schemas; no external exports."""

from concurrent.futures import ThreadPoolExecutor
from unittest.mock import patch, MagicMock
import unittest

from alembic import command
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
import sqlalchemy as sa

from test_local_migrations import MySQLTestDatabase


class FakeSheets:
    def __init__(self):
        self.tabs = {}
        self.titles = []

    def create_spreadsheet(self, **kwargs):
        self.titles.append(kwargs["title"])
        return "test-spreadsheet"

    def get_sheet_names(self, spreadsheet_id):
        return list(self.tabs)

    def add_sheet(self, spreadsheet_id, name):
        self.tabs.setdefault(name, [])

    def rename_sheet(self, spreadsheet_id, old_name, new_name):
        if old_name in self.tabs:
            self.tabs[new_name] = self.tabs.pop(old_name)

    def append_to_sheet(self, spreadsheet_id, name, rows):
        self.tabs.setdefault(name, []).extend(rows)

    def write_registration_sheet(self, spreadsheet_id, name, rows):
        self.tabs[name] = rows


class DivisionAPITests(MySQLTestDatabase):
    def setUp(self):
        super().setUp()
        command.upgrade(self.config, "head")
        from src.main import app
        from src.routes import events, forms
        from src.util.auth import admin_required
        from src.services import get_google_sheets_service

        self.app = app
        self.sheets = FakeSheets()
        def get_db():
            with Session(self.engine) as session:
                yield session
        app.dependency_overrides[events.get_db] = get_db
        app.dependency_overrides[forms.get_db] = get_db
        app.dependency_overrides[admin_required] = lambda: {"role": "admin"}
        app.dependency_overrides[get_google_sheets_service] = lambda: self.sheets
        self.addCleanup(app.dependency_overrides.clear)
        self.export_patch = patch.object(forms, "export_single_registration_bg", lambda *args, **kwargs: None)
        self.export_patch.start()
        self.addCleanup(self.export_patch.stop)
        self.client = TestClient(app)
        self.addCleanup(self.client.close)

    def create_event(self, **changes):
        payload = dict(name="Table tennis", is_current=True, divisions=[
            dict(name="Men's singles", min_teammates=0, max_teammates=0, max_participants=1),
            dict(name="Women's singles", min_teammates=0, max_teammates=0, max_participants=2),
            dict(name="Doubles / open", min_teammates=1, max_teammates=1,
                 max_participants=1, waitlist_max_participants=1),
        ])
        payload.update(changes)
        response = self.client.post("/api/events/", json=payload)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def register(self, event, index=0, **changes):
        payload = dict(event_id=event["id"], division_id=event["divisions"][index]["id"], sport=event["name"],
                       name="Test Entrant", email="test@example.com", phone_number="1234567890", teammates=None)
        payload.update(changes)
        return self.client.post("/api/forms/", json=payload)

    def test_create_validate_and_round_trip_arbitrary_divisions(self):
        event = self.create_event()
        self.assertEqual(event["number_of_divisions"], 3)
        self.assertNotIn("separated_genders", event)
        self.assertNotIn("max_teammates", event)
        self.assertEqual(event["divisions"][2]["min_teammates"], 1)
        listing = self.client.get("/api/events/").json()
        self.assertEqual(listing[0]["divisions"], event["divisions"])
        for divisions in ([], [dict(name=" ")], [dict(name="Same"), dict(name="same")],
                          [dict(name="Bad team", min_teammates=2, max_teammates=1)]):
            response = self.client.post("/api/events/", json=dict(name="Invalid event", divisions=divisions))
            self.assertEqual(response.status_code, 422, response.text)

    def test_division_team_rules_and_cross_event_ids_are_enforced(self):
        event = self.create_event()
        self.assertEqual(self.register(event, 2).status_code, 400)
        self.assertEqual(self.register(event, 2, teammates="Partner").status_code, 400)
        self.assertEqual(self.register(event, 2, teammates="One, Two", team_name="Team").status_code, 400)
        self.assertEqual(self.register(event, 0, teammates="Partner").status_code, 400)
        other = self.create_event(name="Other event")
        self.assertEqual(self.register(event, division_id=other["divisions"][0]["id"]).status_code, 400)
        response = self.register(event, 2, teammates="Partner", team_name="Pair")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["division_name"], "Doubles / open")

    def test_capacity_waitlists_and_uniqueness_are_independent(self):
        event = self.create_event()
        self.assertEqual(self.register(event).status_code, 200)
        self.assertEqual(self.register(event).status_code, 409)
        self.assertEqual(self.register(event, email="second@example.com").status_code, 400)
        self.assertEqual(self.register(event, 1).status_code, 200)  # Same person, different division.
        for email in ("pair1@example.com", "pair2@example.com"):
            self.assertEqual(self.register(event, 2, email=email, teammates="Partner", team_name="Pair").status_code, 200)
        self.assertEqual(self.register(event, 2, email="pair3@example.com", teammates="Partner", team_name="Pair").status_code, 400)
        self.assertEqual(self.register(event, 1, sport="Fake sport", email="bypass@example.com").status_code, 400)
        capacity = self.client.get(f"/api/forms/capacity/{event['id']}?sport=Fake%20sport").json()
        self.assertFalse(capacity["full"])
        self.assertTrue(capacity["divisions"][0]["closed"])
        self.assertFalse(capacity["divisions"][1]["full"])
        self.assertTrue(capacity["divisions"][2]["closed"])

    def test_edits_preserve_ids_and_retire_registered_divisions(self):
        event = self.create_event()
        registration = self.register(event).json()
        divisions = event["divisions"][1:]
        divisions[0]["name"] = "Open singles"
        response = self.client.put(f"/api/events/{event['id']}", json=dict(name=event["name"], divisions=divisions))
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["divisions"][0]["id"], divisions[0]["id"])
        self.assertEqual(self.register(event, email="retired@example.com").status_code, 400)
        from src.db.models.form import FormSubmission
        with Session(self.engine) as session:
            row = session.get(FormSubmission, registration["id"])
            self.assertFalse(row.division.is_active)
            self.assertEqual(row.division_name, "Men's singles")
        export = self.client.get(f"/api/forms/export/{event['id']}")
        self.assertEqual(export.status_code, 200, export.text)
        self.assertTrue(any("Men s singles" in name or "Men s singles" in name.replace("'", " ") for name in self.sheets.tabs))
        self.assertIn("Division", next(iter(self.sheets.tabs.values()))[0])

    def test_automatic_and_manual_exports_share_stable_destination(self):
        from src.routes.forms import export_single_registration
        from src.db.models.form import FormSubmission
        event = self.create_event()
        first_response = self.register(event, 1)
        second_response = self.register(event, 1, email="second@example.com")
        self.assertEqual(first_response.status_code, 200, first_response.text)
        self.assertEqual(second_response.status_code, 200, second_response.text)
        first, second = first_response.json(), second_response.json()
        with Session(self.engine) as db:
            # Reverse task order, then retry the first task.
            for registration in (second, first, first):
                export_single_registration(db.get(FormSubmission, registration["id"]), event["id"], db, self.sheets, event["name"])
        rows = next(iter(self.sheets.tabs.values()))
        self.assertEqual([row[0] for row in rows[1:]], [first["id"], second["id"]])
        renamed = self.client.put(f"/api/events/{event['id']}", json=dict(name="Renamed event", divisions=event["divisions"]))
        self.assertEqual(renamed.status_code, 200, renamed.text)
        response = self.client.get(f"/api/forms/export/{event['id']}?sport=Outdated%20name")
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["rows"], 2)
        self.assertEqual(len(set(self.sheets.titles)), 1)
        self.assertEqual(len(next(iter(self.sheets.tabs.values()))), 3)

    def test_rejects_foreign_division_updates_without_changing_event(self):
        event = self.create_event()
        other = self.create_event(name="Other event")
        response = self.client.put(f"/api/events/{event['id']}", json=dict(name="Changed", divisions=other["divisions"]))
        self.assertEqual(response.status_code, 400)
        saved = next(item for item in self.client.get("/api/events/").json() if item["id"] == event["id"])
        self.assertEqual(saved["name"], event["name"])

    def test_superseded_fields_are_rejected_instead_of_silently_ignored(self):
        response = self.client.post("/api/events/", json=dict(name="Legacy event", separated_genders=True,
            divisions=[dict(name="Open")]))
        self.assertEqual(response.status_code, 422)
        self.assertEqual(self.client.post("/api/events/", json=dict(name="Missing divisions")).status_code, 422)
        event = self.create_event()
        self.assertEqual(self.register(event, gender="male").status_code, 422)
        self.assertNotIn("gender", self.register(event).json())

    def test_registered_events_cannot_be_deleted(self):
        event = self.create_event()
        self.assertEqual(self.register(event).status_code, 200)
        self.assertEqual(self.client.delete(f"/api/events/{event['id']}").status_code, 409)

    def test_event_lock_prevents_simultaneous_overbooking(self):
        event = self.create_event()
        def attempt(number):
            return self.register(event, email=f"entrant{number}@example.com").status_code
        with ThreadPoolExecutor(max_workers=2) as executor:
            statuses = list(executor.map(attempt, (1, 2)))
        self.assertEqual(sorted(statuses), [200, 400])

    def test_admin_authorization_is_still_required(self):
        from src.util.auth import admin_required
        self.app.dependency_overrides.pop(admin_required)
        response = self.client.post("/api/events/", json=dict(name="Unauthorized", divisions=[dict(name="Open")]))
        self.assertEqual(response.status_code, 401)


class DivisionBackfillTests(MySQLTestDatabase):
    def test_cleanup_preserves_custom_settings_and_registration_assignments(self):
        command.upgrade(self.config, "f9a2b3c4d5e6")
        with self.engine.begin() as connection:
            connection.exec_driver_sql("INSERT INTO events (name, separated_genders, is_current, max_teammates) VALUES ('Custom event', 0, 1, 19)")
            connection.exec_driver_sql("INSERT INTO event_divisions (event_id, name, min_teammates, max_teammates, max_participants) VALUES (1, 'Doubles', 1, 1, 17)")
            connection.exec_driver_sql("INSERT INTO form_submissions (event_id, division_id, sport, gender, name, phone_number, email) VALUES (1, 1, 'Custom event', 'male', 'Keep Me', '1234567890', 'keep@example.com')")
        command.upgrade(self.config, "head")
        with self.engine.connect() as connection:
            event_columns = {column["name"] for column in sa.inspect(connection).get_columns("events")}
            self.assertFalse(event_columns & {"separated_genders", "max_teammates", "min_teammates", "max_participants", "max_participants_male", "max_participants_female", "enable_waitlist", "waitlist", "waitlist_max_participants", "uses_custom_divisions", "teammates"})
            self.assertNotIn("gender", {column["name"] for column in sa.inspect(connection).get_columns("form_submissions")})
            row = connection.execute(sa.text("SELECT min_teammates, max_teammates, max_participants FROM event_divisions WHERE id=1")).one()
            self.assertEqual(tuple(row), (1, 1, 17))
            self.assertEqual(tuple(connection.execute(sa.text("SELECT division_id, name, email FROM form_submissions")).one()), (1, "Keep Me", "keep@example.com"))
        command.check(self.config)

    def test_cleanup_refuses_incomplete_division_backfill_before_dropping_fields(self):
        command.upgrade(self.config, "f9a2b3c4d5e6")
        with self.engine.begin() as connection:
            connection.exec_driver_sql("INSERT INTO events (name, separated_genders, is_current) VALUES ('Unassigned event', 0, 0)")
        with self.assertRaisesRegex(RuntimeError, "backfill is incomplete"):
            command.upgrade(self.config, "head")
        self.assertEqual(self.current(), "f9a2b3c4d5e6")
        with self.engine.connect() as connection:
            self.assertIn("separated_genders", {column["name"] for column in sa.inspect(connection).get_columns("events")})

    def test_invalid_legacy_settings_stop_before_schema_changes(self):
        command.upgrade(self.config, "e8f1a2b3c4d5")
        with self.engine.begin() as connection:
            connection.exec_driver_sql("INSERT INTO events (name, separated_genders, is_current, min_teammates, max_teammates) VALUES ('Invalid legacy team', 0, 0, 2, 0)")
        with self.assertRaisesRegex(RuntimeError, "invalid teammate limits"):
            command.upgrade(self.config, "head")
        self.assertEqual(self.current(), "e8f1a2b3c4d5")
        with self.engine.connect() as connection:
            self.assertNotIn("event_divisions", sa.inspect(connection).get_table_names())

    def test_migration_assigns_historical_rows_without_losing_unknown_genders(self):
        command.upgrade(self.config, "e8f1a2b3c4d5")
        with self.engine.begin() as connection:
            connection.exec_driver_sql("INSERT INTO events (name, separated_genders, is_current, max_participants_male, max_participants_female) VALUES ('Existing tournament', 1, 1, 11, 17)")
            for index, gender in enumerate(("Man", "WOMAN", None)):
                connection.execute(sa.text("INSERT INTO form_submissions (event_id, sport, gender, name, phone_number, email) VALUES (1, 'Existing tournament', :gender, 'Old entrant', '1234567890', :email)"),
                                   dict(gender=gender, email=f"old{index}@example.com"))
        command.upgrade(self.config, "head")
        with self.engine.connect() as connection:
            rows = connection.execute(sa.text("SELECT f.email, d.name FROM form_submissions f JOIN event_divisions d ON d.id=f.division_id ORDER BY f.id")).all()
            self.assertEqual([tuple(row) for row in rows], [("old0@example.com", "Men"), ("old1@example.com", "Women"), ("old2@example.com", "Unspecified")])
            caps = connection.execute(sa.text("SELECT name, max_participants FROM event_divisions WHERE name IN ('Men', 'Women') ORDER BY id")).all()
            self.assertEqual([tuple(row) for row in caps], [("Men", 11), ("Women", 17)])
        command.check(self.config)


class DivisionExportTests(unittest.TestCase):
    def test_google_ranges_quote_arbitrary_division_titles(self):
        from src.services.google_sheets import GoogleSheetsService
        service = GoogleSheetsService.__new__(GoogleSheetsService)
        service._sheets = MagicMock()
        service.add_sheet = MagicMock()
        title = "Division 7 - O'Brien! Doubles"
        service.append_to_sheet("spreadsheet", title, [["Name"]])
        ranges = service._sheets.spreadsheets().values()
        self.assertEqual(ranges.append.call_args.kwargs["range"], "'Division 7 - O''Brien! Doubles'")
        service.write_to_sheet("spreadsheet", title, [["Name"]])
        self.assertEqual(ranges.update.call_args.kwargs["range"], "'Division 7 - O''Brien! Doubles'!A1")

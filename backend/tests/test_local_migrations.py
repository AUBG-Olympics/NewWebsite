"""MySQL integration tests; only create/drop uniquely named disposable databases.

Set MIGRATION_TEST_ADMIN_URL to a local MySQL account with CREATE DATABASE
permission. No existing application database is used by these tests.
"""

import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from uuid import uuid4

from alembic import command
from alembic.config import Config
import sqlalchemy as sa

from scripts.migrate_local import LEGACY_REVISION, reset_empty_legacy, validate_local_target


BACKEND = Path(__file__).resolve().parents[1]
HEAD = "e8f1a2b3c4d5"
ADMIN_URL = os.environ.get("MIGRATION_TEST_ADMIN_URL")


class LocalTargetTests(unittest.TestCase):
    def test_recovery_only_accepts_the_local_development_target(self):
        validate_local_target(sa.engine.make_url("mysql+pymysql://user@db/aubgolympics_db"))
        for url in (
            "mysql+pymysql://user@api.aubgolympics.com/aubgolympics_db",
            "mysql+pymysql://user@localhost/production",
            "sqlite:///app.db",
        ):
            with self.subTest(url=url), self.assertRaises(RuntimeError):
                validate_local_target(sa.engine.make_url(url))


@unittest.skipUnless(ADMIN_URL, "Set MIGRATION_TEST_ADMIN_URL to run disposable MySQL tests")
class MySQLMigrationTests(unittest.TestCase):
    def setUp(self):
        url = sa.engine.make_url(ADMIN_URL)
        if url.get_backend_name() != "mysql" or url.host not in {"localhost", "127.0.0.1", "::1", "db"}:
            self.fail("Tests require a local MySQL server")
        self.database = "aubg_migration_test_" + uuid4().hex
        self.admin = sa.create_engine(url.set(database=None), poolclass=sa.pool.NullPool)
        self.addCleanup(self.admin.dispose)
        with self.admin.connect() as connection:
            connection.exec_driver_sql(f"CREATE DATABASE `{self.database}` CHARACTER SET utf8mb4")
        self.addCleanup(self.drop_database)
        test_url = url.set(database=self.database).render_as_string(hide_password=False)
        self.environment = patch.dict(os.environ, {"DATABASE_URL": test_url})
        self.environment.start()
        self.addCleanup(self.environment.stop)
        self.engine = sa.create_engine(test_url, poolclass=sa.pool.NullPool)
        self.addCleanup(self.engine.dispose)
        self.config = Config(str(BACKEND / "alembic.ini"))
        self.config.set_main_option("script_location", str(BACKEND / "alembic"))
        self.backup_directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.backup_directory.cleanup)

    def drop_database(self):
        # This name is generated above, never taken from DATABASE_URL.
        with self.admin.connect() as connection:
            connection.exec_driver_sql(f"DROP DATABASE `{self.database}`")

    def load_legacy_fixture(self):
        sql = (BACKEND / "tests/fixtures/legacy_local.sql").read_text()
        with self.engine.begin() as connection:
            for statement in sql.split(";"):
                if statement.strip():
                    connection.exec_driver_sql(statement)

    def current(self):
        with self.engine.connect() as connection:
            return connection.scalar(sa.text("SELECT version_num FROM alembic_version"))

    def test_fresh_database_upgrades_and_matches_models(self):
        command.upgrade(self.config, "head")
        self.assertEqual(self.current(), HEAD)
        command.check(self.config)
        # A second run must be harmless.
        command.upgrade(self.config, "head")
        from src.db.models import Event, FormSubmission, Sponsor, User
        from sqlalchemy.orm import Session
        from datetime import datetime

        with Session(self.engine) as session:
            event = Event(name="Basketball", description="x" * 600, date=datetime(2026, 4, 18, 15, 30))
            session.add(event)
            session.flush()
            session.add(FormSubmission(
                event_id=event.id, sport="Basketball", name="Test Member", gender=None,
                teammates="x" * 511, phone_number="1234567890", email="test@example.com",
            ))
            session.add(Sponsor(name="Sponsor", website="x" * 600, logo="x" * 600))
            session.add(User(email="user@example.com", name="Test User", picture="x" * 600))
            session.commit()

    def test_production_shaped_database_upgrades_without_losing_values(self):
        command.upgrade(self.config, "d1e2f3a4b5c6")
        with self.engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE events ADD COLUMN location VARCHAR(511)")
            connection.execute(sa.text(
                "INSERT INTO events (name, description, date, separated_genders, is_current, "
                "max_participants_male, max_participants_female, enable_waitlist, waitlist) "
                "VALUES ('Existing Event', 'Existing description', '2026-04-18', 1, 1, 17, 23, NULL, NULL)"
            ))
            connection.execute(sa.text(
                "INSERT INTO form_submissions (event_id, sport, name, teammates, phone_number, email) "
                "VALUES (1, 'Basketball', 'Existing Member', :teammates, '1234567890', 'test@example.com')"
            ), {"teammates": "x" * 500})
            connection.execute(sa.text("UPDATE events SET location = 'Keep this venue'"))
        command.upgrade(self.config, "head")
        command.check(self.config)
        with self.engine.connect() as connection:
            row = connection.execute(sa.text(
                "SELECT name, description, max_participants_male, max_participants_female, "
                "enable_waitlist, waitlist FROM events"
            )).one()
            self.assertEqual(tuple(row), ("Existing Event", "Existing description", 17, 23, 1, 0))
            self.assertEqual(connection.scalar(sa.text("SELECT teammates FROM form_submissions")), "x" * 500)
            self.assertEqual(connection.scalar(sa.text("SELECT location FROM events")), "Keep this venue")

    def test_empty_orphaned_database_is_backed_up_then_migrates(self):
        self.load_legacy_fixture()
        with self.engine.connect() as connection:
            backup = reset_empty_legacy(connection, self.backup_directory.name)
        self.assertIn(LEGACY_REVISION, backup.read_text())
        self.assertIn("CREATE TABLE `events`", backup.read_text())
        self.assertEqual(backup.stat().st_mode & 0o777, 0o600)
        command.upgrade(self.config, "head")
        self.assertEqual(self.current(), HEAD)
        command.check(self.config)

    def test_recovery_refuses_application_rows_without_changing_anything(self):
        self.load_legacy_fixture()
        with self.engine.begin() as connection:
            connection.execute(sa.text(
                "INSERT INTO events (name, separated_genders, is_current, enable_waitlist, waitlist) "
                "VALUES ('Keep this event', 0, 0, 1, 0)"
            ))
        with self.engine.connect() as connection, self.assertRaisesRegex(RuntimeError, "application rows"):
            reset_empty_legacy(connection, self.backup_directory.name)
        self.assertEqual(self.current(), LEGACY_REVISION)
        with self.engine.connect() as connection:
            self.assertEqual(connection.scalar(sa.text("SELECT name FROM events")), "Keep this event")
        self.assertEqual(list(Path(self.backup_directory.name).iterdir()), [])

    def test_recovery_refuses_an_unexpected_schema(self):
        self.load_legacy_fixture()
        with self.engine.begin() as connection:
            connection.exec_driver_sql("ALTER TABLE users ADD COLUMN custom_data TEXT")
        with self.engine.connect() as connection, self.assertRaisesRegex(RuntimeError, "Unexpected columns"):
            reset_empty_legacy(connection, self.backup_directory.name)
        self.assertEqual(self.current(), LEGACY_REVISION)

    def test_long_values_block_alignment_before_ddl(self):
        command.upgrade(self.config, "d1e2f3a4b5c6")
        with self.engine.begin() as connection:
            connection.execute(sa.text(
                "INSERT INTO users (name, email, role) VALUES ('Keep User', 'keep@example.com', :role)"
            ), {"role": "x" * 40})
        with self.assertRaisesRegex(RuntimeError, "Cannot narrow users.role"):
            command.upgrade(self.config, "head")
        self.assertEqual(self.current(), "d1e2f3a4b5c6")
        with self.engine.connect() as connection:
            columns = {column["name"]: column for column in sa.inspect(connection).get_columns("events")}
            self.assertEqual(columns["description"]["type"].length, 255)
            self.assertIsInstance(columns["date"]["type"], sa.Date)
            self.assertEqual(connection.scalar(sa.text("SELECT role FROM users")), "x" * 40)


    def test_recovery_preserves_unexpected_trigger_definitions(self):
        self.load_legacy_fixture()
        with self.engine.begin() as connection:
            connection.exec_driver_sql(
                "CREATE TRIGGER keep_trigger BEFORE INSERT ON events "
                "FOR EACH ROW SET NEW.name = NEW.name"
            )
        with self.engine.connect() as connection, self.assertRaisesRegex(RuntimeError, "triggers"):
            reset_empty_legacy(connection, self.backup_directory.name)
        self.assertEqual(self.current(), LEGACY_REVISION)
        with self.engine.connect() as connection:
            self.assertIsNotNone(connection.exec_driver_sql("SHOW TRIGGERS").first())


if __name__ == "__main__":
    unittest.main()

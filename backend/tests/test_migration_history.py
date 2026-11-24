"""Validate recovered migration history without loading env.py or connecting to a DB."""

import io
from contextlib import chdir
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

from alembic.config import Config
from alembic.migration import MigrationContext
from alembic.operations import Operations
from alembic.script import ScriptDirectory


BACKEND = Path(__file__).resolve().parents[1]


class MigrationHistoryTests(unittest.TestCase):
    def setUp(self):
        # Fail explicitly if a later test accidentally tries to use a database.
        self.connection_guard = patch(
            "sqlalchemy.engine.Engine.connect",
            side_effect=AssertionError("Migration history tests must not connect to a database"),
        )
        self.connection_guard.start()
        self.addCleanup(self.connection_guard.stop)
        self.config = Config(str(BACKEND / "alembic.ini"))
        self.config.set_main_option("script_location", str(BACKEND / "alembic"))
        self.scripts = ScriptDirectory.from_config(self.config)

    def test_all_revisions_resolve_to_one_head(self):
        self.assertEqual(self.scripts.get_heads(), ["a0b3c4d5e6f7"])
        revisions = list(self.scripts.walk_revisions())
        files = list((BACKEND / "alembic" / "versions").glob("*.py"))
        self.assertEqual(len(revisions), len(files))
        self.assertEqual(len({revision.revision for revision in revisions}), len(files))
        self.assertEqual(
            set(self.scripts.get_bases()), {"e2726560a13b", "cee881e5451e"}
        )

    def test_restored_chain_connects_to_existing_migrations(self):
        expected = {
            "e2726560a13b": None,
            "00a4b879c684": "e2726560a13b",
            "a1b2c3d4e5f6": "00a4b879c684",
            "b2c3d4e5f6a7": "a1b2c3d4e5f6",
        }
        for revision, parent in expected.items():
            with self.subTest(revision=revision):
                self.assertEqual(self.scripts.get_revision(revision).down_revision, parent)

    def test_existing_merge_still_joins_both_historical_roots(self):
        merge = self.scripts.get_revision("c6f7a8b9c0d1")
        self.assertEqual(
            set(merge.down_revision),
            {"f8c9d0e1a2b3", "a1c2e3f4a5b6", "cee881e5451e"},
        )

    def test_restored_upgrades_compile_as_mysql_sql_without_a_database(self):
        output = io.StringIO()
        context = MigrationContext.configure(
            dialect_name="mysql", opts={"as_sql": True, "output_buffer": output}
        )
        with Operations.context(context):
            for revision in ("e2726560a13b", "00a4b879c684", "a1b2c3d4e5f6"):
                self.scripts.get_revision(revision).module.upgrade()
        sql = output.getvalue()
        for table in ("events", "sponsors", "users", "form_submissions"):
            self.assertIn(f"CREATE TABLE {table}", sql)
        self.assertIn("MODIFY gender VARCHAR(255) NULL", sql)
        self.assertIn("ADD COLUMN max_participants INTEGER", sql)

    def test_migration_location_does_not_depend_on_working_directory(self):
        with TemporaryDirectory() as directory, chdir(directory):
            config = Config(str(BACKEND / "alembic.ini"))
            scripts = ScriptDirectory.from_config(config)
            self.assertEqual(scripts.get_heads(), ["a0b3c4d5e6f7"])


if __name__ == "__main__":
    unittest.main()

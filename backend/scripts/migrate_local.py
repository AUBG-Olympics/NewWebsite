"""Run migrations, optionally recovering the verified empty legacy dev schema.

Never invent a revision for the unavailable 6e40cd2a0801 migration. Recovery is
limited to the local development database, the exact known legacy layout and
zero application rows. Save its DDL and version before rebuilding from base.
"""

import argparse
from datetime import datetime, timezone
import os
from pathlib import Path

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from dotenv import load_dotenv
import sqlalchemy as sa


BACKEND = Path(__file__).resolve().parents[1]
LEGACY_REVISION = "6e40cd2a0801"
LEGACY_COLUMNS = {
    "events": {
        "id", "name", "description", "date", "location", "separated_genders",
        "is_current", "teammates", "max_participants", "enable_waitlist",
        "waitlist", "waitlist_max_participants",
    },
    "form_submissions": {
        "id", "event_id", "sport", "gender", "name", "teammates", "team_name",
        "phone_number", "email",
    },
    "sponsors": {"id", "name", "website", "logo"},
    "users": {"id", "email", "name", "picture", "role"},
}


def validate_local_target(url):
    if (
        url.get_backend_name() != "mysql"
        or url.host not in {"db", "localhost", "127.0.0.1", "::1"}
        or url.database != "aubgolympics_db"
    ):
        raise RuntimeError("Empty legacy recovery is restricted to local MySQL aubgolympics_db.")


def reset_empty_legacy(connection, backup_dir):
    """Validate all guards before any schema change. Caller restricts the target."""
    versions = MigrationContext.configure(connection).get_current_heads()
    if versions != (LEGACY_REVISION,):
        raise RuntimeError("The database does not have the single expected legacy revision.")
    inspector = sa.inspect(connection)
    if set(inspector.get_table_names()) != set(LEGACY_COLUMNS) | {"alembic_version"}:
        raise RuntimeError("Unexpected legacy tables; refusing to reset the schema.")
    if inspector.get_view_names():
        raise RuntimeError("Unexpected database views; refusing to reset the schema.")
    if connection.exec_driver_sql("SHOW TRIGGERS").first() is not None:
        raise RuntimeError("Unexpected database triggers; refusing to reset the schema.")
    for table_name, expected in LEGACY_COLUMNS.items():
        actual = {column["name"] for column in inspector.get_columns(table_name)}
        if actual != expected:
            raise RuntimeError(f"Unexpected columns in {table_name}; refusing to reset.")
        table = sa.table(table_name)
        count = connection.scalar(sa.select(sa.func.count()).select_from(table))
        if count:
            raise RuntimeError(
                f"{table_name} contains application rows. Recovery does not delete data; "
                "this database needs a reviewed incremental recovery."
            )

    # Persist the old empty schema and its recorded version before any DROP.
    backup_dir = Path(backup_dir)
    backup_dir.mkdir(parents=True, exist_ok=True)
    filename = backup_dir / (
        "empty-legacy-" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ") + ".sql"
    )
    preparer = connection.dialect.identifier_preparer
    statements = ["-- Empty local schema before legacy recovery", "SET FOREIGN_KEY_CHECKS=0;"]
    for name in [*LEGACY_COLUMNS, "alembic_version"]:
        ddl = connection.exec_driver_sql("SHOW CREATE TABLE " + preparer.quote(name)).one()[1]
        statements.append(ddl + ";")
    statements.extend([
        f"INSERT INTO alembic_version (version_num) VALUES ('{LEGACY_REVISION}');",
        "SET FOREIGN_KEY_CHECKS=1;",
    ])
    fd = os.open(filename, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(fd, "w") as handle:
        handle.write("\n\n".join(statements) + "\n")
        handle.flush()
        os.fsync(handle.fileno())
    print(f"Saved empty legacy schema backup: {filename}")

    # The dependent submissions table goes first. Do not drop/recreate the DB
    # itself, its users or grants. The version table is deliberately last.
    for name in ["form_submissions", "events", "sponsors", "users", "alembic_version"]:
        connection.exec_driver_sql("DROP TABLE " + preparer.quote(name))
    connection.commit()
    return filename


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repair-empty-legacy", action="store_true")
    args = parser.parse_args(argv)
    load_dotenv(BACKEND / ".env", override=False)
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise RuntimeError("Set DATABASE_URL explicitly or in backend/.env.")
    url = sa.engine.make_url(database_url)
    if args.repair_empty_legacy:
        validate_local_target(url)
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    known = {revision.revision for revision in ScriptDirectory.from_config(config).walk_revisions()}
    engine = sa.create_engine(url, poolclass=sa.pool.NullPool)
    try:
        with engine.connect() as connection:
            versions = MigrationContext.configure(connection).get_current_heads()
            unknown = set(versions) - known
            if unknown:
                if not args.repair_empty_legacy or versions != (LEGACY_REVISION,):
                    raise RuntimeError(f"Unknown database revisions: {sorted(unknown)}. No changes made.")
                reset_empty_legacy(connection, BACKEND / ".cache" / "migration-backups")
    finally:
        engine.dispose()
    command.upgrade(config, "head")


if __name__ == "__main__":
    main()

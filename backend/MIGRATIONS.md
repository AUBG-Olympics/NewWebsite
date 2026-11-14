# Database migrations

The migration chain now ends at `e8f1a2b3c4d5`. Historical revision IDs and
parent links have been preserved, including the two historical roots and their
existing merge. The three recovered ancestors must stay in the repository.

## Local Docker startup

Run `scripts/gum-menu.sh` from the repository as before. Compose starts MySQL,
runs `python -m scripts.migrate_local --repair-empty-legacy`, and starts the API
only after that command succeeds. Keep `DATABASE_URL` in `backend/.env` pointed
at `mysql+pymysql://...@db:3306/aubgolympics_db` inside Docker. Host-side tools
instead connect through `127.0.0.1:3307`.

Ordinary startup applies pending Alembic revisions. The recovery option only
handles the specific orphaned local revision `6e40cd2a0801`, whose original
source file could not be found. It is not a fabricated migration or an alias
for the current head.

Recovery requires all of the following:

- A local MySQL target named `aubgolympics_db`.
- Exactly that single orphaned revision.
- The four known application tables, their known column layout, the version
  table, and no views, triggers or additional tables.
- Zero rows in every application table.

It saves the old empty schema and recorded revision to a private SQL file in
`backend/.cache/migration-backups/`, removes those empty tables, then runs the
real migration chain from base. It does not drop the database, its users, or
their grants. If any application rows exist, or the layout is unexpected, it
refuses recovery before changing tables. A populated legacy database needs a
separately reviewed incremental recovery; do not delete its version row or
stamp it to head.

This local database was inspected before repair and contained no application
rows. No production database was connected to or modified.

## Model alignment

The new revision follows the previous head `d1e2f3a4b5c6`. It reconciles the
historical schema with the current ORM:

- Event descriptions support 1023 characters; event dates store time as well as
  date; waitlist capacity is an integer count.
- Waitlist flags are non-null with database defaults matching ORM defaults.
  Existing null flags are filled with those defaults.
- Submission field lengths match the models, including 511-character teammate
  lists; user picture and sponsor URLs support 1023 characters.
- The missing `sponsor_tiers.id` index is created.

Before narrowing any string column, the revision checks existing character
lengths across all affected columns. An overlong value stops this revision
before any alignment DDL or flag backfill, with an actionable error. MySQL DDL
is not transactional, so production upgrades still require normal database
backup procedures. Automatic downgrade of this revision is deliberately
unsupported because it could truncate expanded strings or event times.

Historical `events.teammates` and optional `events.location` columns are kept
on existing databases. They are treated as intentionally unmanaged legacy
columns, so autogeneration does not propose dropping their data. Other schema
differences remain visible to `alembic check`.

Alembic now loads `.env` before reading `DATABASE_URL`, respects exported
environment variables, and handles percent-encoded URLs correctly. Metadata
imports do not initialize API routes or Google/OAuth integrations.

## Verification

After installing `backend/requirements.txt`, run from `backend/`:

```sh
python -m unittest discover -s tests -v
python -m alembic current
python -m alembic check
```

To include the MySQL integration tests, set `MIGRATION_TEST_ADMIN_URL` to a
local MySQL administrator URL with permission to create databases. These tests
create uniquely named `aubg_migration_test_*` databases and clean up only those
databases; they do not use an existing application database.

The 13 tests cover graph integrity, working-directory independence, fresh
upgrades, upgrades from the production-era schema with preserved sample data,
ORM inserts, repeat upgrades, empty legacy recovery and its SQL backup, refusal
to reset populated or unexpected schemas, rejection of production targets, and
refusal to truncate long existing strings. Fresh and upgraded schemas pass the
actual Alembic autogeneration check without new operations.

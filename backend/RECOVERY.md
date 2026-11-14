# Backend hosting reconciliation

This records the original source-only recovery. For the subsequent local
database repair and current migration head, see [MIGRATIONS.md](MIGRATIONS.md).

Compared the downloaded `api.aubgolympics.com` source with the local backend on
November 14, 2026. The API routes, services, models, schemas, and SQL helper
already match. Most file differences are line endings; `src/main.py` differs
only in a comment. The hosted permissions file contains redacted email
placeholders, so the existing checkout's permissions were retained.

## Restored files

- `alembic/versions/e2726560a13b_init.py`: original schema creation revision.
- `alembic/versions/00a4b879c684_make_gender_nullable.py`: nullable submission gender.
- `alembic/versions/add_events_max_participants.py`: event participant caps.
- `app.py`: the hosted ASGI-to-WSGI entry point, alongside the existing WSGI entry points.

The migrations match the hosting source, with line endings and trailing whitespace normalized. Their
revision IDs, parent links, upgrade operations, and downgrade operations were
preserved. Existing migration files were not rewritten. The checkout's Alembic
INI now explicitly uses `mysql+pymysql`, as hosting does and `requirements.txt`
supports; its existing connection parameters were retained, not copied from
hosting.

The checkout's environment-variable override, location-independent Alembic
script path, PyMySQL dependency, WSGI wrapper, and portable Apache configuration
were retained. Hosting-specific paths, logs, virtual environments, ZIP archives,
database files, and credentials were not copied.

## Migration history

The existing `b2c3d4e5f6a7` migration referenced the missing `a1b2c3d4e5f6`
revision. Restoring all three missing ancestors repairs that chain:

```text
e2726560a13b -> 00a4b879c684 -> a1b2c3d4e5f6 -> b2c3d4e5f6a7
```

The history intentionally retains two historical roots: `e2726560a13b` creates
the original tables, while `cee881e5451e` is an existing no-op baseline. The
existing merge `c6f7a8b9c0d1` joins the branches. The single final head remains
`d1e2f3a4b5c6`. No new schema revision was invented and no revision was stamped.

**Restoring migration files does not establish an existing database's migration
state.** Before applying upgrades to an existing database, compare its actual
schema and `alembic_version` rows with this history. In particular, the table
creation root must not be blindly replayed against tables that already exist.
The Docker `migrate` service automatically runs `alembic upgrade head`; starting
the stack can therefore apply migrations. No stack was started during recovery.

## Validation

With the backend's Alembic, SQLAlchemy, and PyMySQL dependencies installed:

```sh
cd backend
python -m unittest discover -s tests -v
python -m alembic heads
python -m alembic history
```

Five tests pass. They check graph completeness, original parent links, both
roots and the existing merge, the explicit MySQL driver, and offline MySQL SQL
generation for the three recovered upgrades. The tests do not load `env.py` or
the application and guard against SQLAlchemy database connections.

No database was connected to, upgraded, downgraded, or stamped. This validates
the recovered source and revision graph, not a live database's schema or data.

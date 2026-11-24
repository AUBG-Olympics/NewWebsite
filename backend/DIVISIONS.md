# Named event divisions

`/admin/challenging-wednesday` now edits a list of named divisions, with an
add/remove control and a derived division count. Each division has its own
minimum and maximum teammate count, registration limit and waitlist size.
`/challenge` selects a division and updates the team fields and capacity status
accordingly. The D-Day admin editor and shared signup form use the same division settings.

Teammate counts exclude the person registering. Singles therefore use 0/0;
doubles use 1/1. A registration limit counts entries (one solo entrant or one
team), as the previous application did. A null limit is unlimited, 0 closes
normal registration, and 0 waitlist entries disables overflow.

## Storage and API

The `event_divisions` table stores one row per division instead of parallel
arrays. `form_submissions.division_id` links a registration to its division.
`number_of_divisions` is computed from the active list, not independently stored.

Event create/update accepts a `divisions` array, for example:

```json
{
  "name": "Table tennis",
  "is_current": true,
  "divisions": [
    {"name": "Men's singles", "min_teammates": 0, "max_teammates": 0, "max_participants": 16},
    {"name": "Women's singles", "min_teammates": 0, "max_teammates": 0, "max_participants": 16},
    {"name": "Doubles", "min_teammates": 1, "max_teammates": 1, "max_participants": 8, "waitlist_max_participants": 2}
  ]
}
```

Use returned IDs when updating divisions. They stay stable when names or limits
change. Removing an ID from the list retires it; historical registrations and
their export remain available. At least one active division is required, names
must be unique, and minimum teammates cannot exceed the maximum.

New registrations submit `division_id`. The backend verifies that the division
is active and belongs to the event, validates team requirements, and enforces
capacity while holding the event row lock. Counts and duplicate detection use
event/division IDs, not the client-supplied sport string. The same email may
register once in each division, allowing singles and doubles participation.

Capacity responses contain a `divisions` array with `full`, `waitlist`, `closed`
and counts. Overall flags report whether all regular slots are full and whether
any division still accepts waitlist entries.

## Registration exports

Automatic registration exports and the authenticated manual export endpoint
write to the same spreadsheet, `Registrations – Event <id>`, in the configured
Google export folder. The stable event ID keeps the destination unchanged when
an event is renamed. Older spreadsheets from previous versions are left intact;
the new export creates its own stable destination on first use.

Each division has a separate tab with its stable ID and readable name. Renaming
a division renames its tab; retired divisions with registrations remain included.
Rows are ordered by registration ID, and include registration ID, entry number,
registration/waitlist status, name, sport, division, active/retired status, team
name, teammates, phone and email. Teammates appear on separate lines in one cell.
Phone numbers and all user text remain literal strings, preserving leading zeros
and preventing spreadsheet formula interpretation.

Tables have a frozen bold header, column filters, wrapped text, readable column
widths and highlighted waitlist entries. Status uses the division's current
registration limit and registration ID order; changing a limit changes the
computed status on the next export. No standalone waitlist separator rows are
inserted, so filtering and sorting keep each registration self-contained.

Automatic exports rebuild the affected division; manual exports rebuild all
registered divisions for the event. The old optional `sport` query parameter is
accepted for compatibility but no longer filters out registrations: event and
division IDs define export scope. Writes replace generated content and remove
stale trailing rows. Treat these tabs as generated output; keep manual notes in
a separate tab. Event locks serialize export snapshots and registration changes
so background tasks cannot overwrite a newer snapshot with an older one.

Tests mock Google and cover readable content, per-division waitlists, retired
history, renames, retries, task ordering, destination reuse and formatting API
requests. Live Google credentials, folder permissions and production delivery
still need an environment-specific smoke test. Background export failures are
logged; registrations remain in the database and an admin can rerun the manual
export after fixing Google access.

## Migration and compatibility

Revision `f9a2b3c4d5e6` follows `e8f1a2b3c4d5`. It creates the related table,
registration foreign key and indexes, and expands the sport column to support
event names. Invalid legacy team/capacity settings stop the migration before
schema changes.

Existing events become Men/Women divisions or a single Open division, retaining
their teammate and capacity settings. Historical gender aliases are mapped to
the appropriate division. Missing/unknown genders receive an Unspecified
division so their registrations are not lost or omitted from counts.

Revision `a0b3c4d5e6f7` then removes the replaced event-level gender,
teammate, capacity and waitlist fields, the registration gender field, and
internal compatibility flags. It requires every event to have an active division
and every registration to reference a division belonging to its event before
changing the schema. Division IDs, settings and registrations are preserved.
`division_id` is now required. Event create/update requires a nonempty divisions
array; obsolete fields are rejected rather than silently ignored.

Back up the database before upgrading: the legacy columns are dropped and this
cleanup cannot be automatically downgraded. Historical migrations remain intact
so fresh installs and older databases still follow the complete backfill chain.

Run `alembic upgrade head` on the intended database before starting the updated
API. Docker's existing migration service does this automatically. Downgrading
this revision is intentionally unsupported because it would discard division
assignments. Production has not been modified.

## Frontend API routing

All frontend clients use the same API configuration: `localhost:4000` during
Vite development and `https://api.aubgolympics.com` in production builds.
`VITE_API_BASE_URL` overrides the default for every client, including admin and
authentication. Restart the Vite server after changing that environment value.

Local Docker explicitly sets the OAuth return URL to `http://localhost:5173`
and the callback configuration to `http://localhost:4000/api/auth/callback`.
Use `LOCAL_FRONTEND_URL` / `LOCAL_GOOGLE_REDIRECT_URI` for alternate local ports.
Recreate the backend container after changing Compose environment settings.
The OAuth login route derives Google's callback from the actual backend request
origin; the registered route is `/api/auth/callback`, not `/auth/google/callback`.
Production continues to use its explicitly configured `FRONTEND_URL`.

An event response without `divisions` indicates an incompatible backend. The
admin page reports this before replacing its draft and blocks further saves
instead of guessing division settings or retrying a potentially completed
create request. Load the updated backend and reload the page before editing.

## Checks

- Backend: `python -m unittest discover -s tests -v` from `backend/`.
- Set `MIGRATION_TEST_ADMIN_URL` to a local MySQL admin URL to enable disposable
  MySQL migration/API tests, including backfill and concurrent capacity checks.
- Frontend: `npm run test:divisions` and `npm run build` from `frontend/`.
- Interactive DOM checks were also run with temporary tooling outside the
  repository. No application dependencies were added.

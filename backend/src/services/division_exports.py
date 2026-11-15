"""Readable, repeatable exports, including registrations in retired divisions."""

import re
from collections import defaultdict

from sqlalchemy.orm import joinedload

from src.db.models.form import FormSubmission


HEADERS = ["Registration ID", "Entry #", "Status", "Name", "Sport", "Division",
           "Division status", "Team Name", "Teammates", "Phone", "Email"]


def sheet_name(sheets, spreadsheet_id, division):
    prefix = f"Division {division.id} - "
    title = (prefix + re.sub(r"[\[\]:*?/\\']", " ", division.name)).strip()[:100]
    existing = sheets.get_sheet_names(spreadsheet_id)
    previous = next((name for name in existing if name.startswith(prefix)), None)
    if previous and previous != title:
        sheets.rename_sheet(spreadsheet_id, old_name=previous, new_name=title)
    elif title not in existing:
        sheets.add_sheet(spreadsheet_id, title)
    return title


def values(submission, position):
    division = submission.division
    waitlisted = division.max_participants is not None and position > division.max_participants
    teammates = "\n".join(name.strip() for name in (submission.teammates or "").split(",") if name.strip())
    return [submission.id, position, "Waitlist" if waitlisted else "Registered",
            submission.name, submission.sport, division.name,
            "Active" if division.is_active else "Retired", submission.team_name or "",
            teammates, submission.phone_number or "", submission.email or ""]


def append_registration(db, sheets, spreadsheet_id, submission):
    # Rebuild this division instead of appending: retries cannot duplicate a row,
    # and the database ID defines order even if background tasks run out of order.
    rows = db.query(FormSubmission).options(joinedload(FormSubmission.division, innerjoin=True)).filter(
        FormSubmission.division_id == submission.division_id,
    ).populate_existing().with_for_update().all()
    write_registrations(sheets, spreadsheet_id, rows)


def write_registrations(sheets, spreadsheet_id, submissions):
    groups = defaultdict(list)
    for submission in sorted(submissions, key=lambda row: row.id):
        groups[submission.division_id].append(submission)
    for rows in groups.values():
        title = sheet_name(sheets, spreadsheet_id, rows[0].division)
        output = [HEADERS] + [values(row, position) for position, row in enumerate(rows, 1)]
        sheets.write_registration_sheet(spreadsheet_id, title, output)

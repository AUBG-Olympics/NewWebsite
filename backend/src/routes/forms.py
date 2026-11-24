import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from src.db import SessionLocal
from src.db.models.event import Event
from src.db.models.form import FormSubmission
from src.db.schemas import FormCreate, FormResponse
from src.services import GoogleSheetsService, get_google_sheets_service
from src.services.divisions import division_capacity, select_division
from src.services.division_exports import append_registration, write_registrations
from src.util.auth import admin_required
from src.util.permissions import SHEETS_EDITORS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/forms", tags=["Forms"])


def get_db():
    with SessionLocal() as db:
        yield db


@router.get("/capacity/{event_id}")
def get_event_capacity(event_id: int, sport: Optional[str] = Query(None), db: Session = Depends(get_db)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")
    rows = division_capacity(db, event)
    full = all(row["full"] for row in rows)
    return dict(
        event_id=event_id, divisions=rows, full=full,
        waitlist=full and any(row["waitlist"] for row in rows),
        current_participants=db.query(FormSubmission).filter(FormSubmission.event_id == event_id).count(),
    )


def export_single_registration(entity, event_id, db, sheets, sport=None):
    event = db.query(Event).filter(Event.id == event_id).with_for_update().first()
    if not event:
        return None
    title = f"Registrations – Event {event.id}"
    spreadsheet_id = sheets.create_spreadsheet(title=title, editors=SHEETS_EDITORS)
    append_registration(db, sheets, spreadsheet_id, entity)
    db.commit()  # Release the event lock after writing the sheet snapshot.


def export_single_registration_bg(submission_id: int, event_id: int, sport: Optional[str] = None):
    try:
        with SessionLocal() as db:
            entity = db.get(FormSubmission, submission_id)
            if entity:
                export_single_registration(entity, event_id, db, GoogleSheetsService(), sport)
    except Exception:
        logger.exception("Background registration export failed")


def export_event_to_sheets(event_id, db, sheets, sport=None):
    event = db.query(Event).filter(Event.id == event_id).with_for_update().first()
    if not event:
        return None
    # The legacy sport parameter is accepted but event/division IDs define scope.
    query = db.query(FormSubmission).filter(FormSubmission.event_id == event_id)
    # Locking reads see current rows even if an earlier endpoint lookup opened
    # a repeatable-read snapshot before another registration committed.
    submissions = query.options(joinedload(FormSubmission.division, innerjoin=True)).populate_existing().with_for_update().all()
    title = f"Registrations – Event {event.id}"
    spreadsheet_id = sheets.create_spreadsheet(title=title, editors=SHEETS_EDITORS)
    write_registrations(sheets, spreadsheet_id, submissions)
    db.commit()
    return dict(status="exported", event=event.name, spreadsheet_id=spreadsheet_id, rows=len(submissions))


@router.post("/", response_model=FormResponse)
def submit_form(form: FormCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    # Serialize registration/capacity changes for the event to prevent overbooking.
    event = db.query(Event).filter(Event.id == form.event_id).with_for_update().first()
    if not event:
        raise HTTPException(404, "Event not found")
    division = select_division(event, form.division_id)
    if form.sport != event.name:
        raise HTTPException(400, "The event name changed. Refresh the registration form.")
    existing = db.query(FormSubmission).filter(
        FormSubmission.event_id == event.id, FormSubmission.division_id == division.id,
        func.lower(FormSubmission.email) == form.email.lower(),
    ).first()
    if existing:
        raise HTTPException(409, "This email is already registered in this division.")
    teammates = [name.strip() for name in (form.teammates or "").split(",") if name.strip()]
    if not division.min_teammates <= len(teammates) <= division.max_teammates:
        raise HTTPException(400, f"This division requires {division.min_teammates} to {division.max_teammates} teammates.")
    if division.max_teammates > 0 and not (form.team_name or "").strip():
        raise HTTPException(400, "Team name is required for this division.")
    capacity = next(row for row in division_capacity(db, event) if row["id"] == division.id)
    if capacity["closed"]:
        raise HTTPException(400, "Registration and the waitlist are full for this division.")
    entry = FormSubmission(
        event_id=event.id, division_id=division.id, sport=event.name, name=form.name,
        teammates=", ".join(teammates) if teammates else None,
        team_name=form.team_name.strip() if division.max_teammates > 0 else None,
        phone_number=form.phone_number, email=form.email,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    background_tasks.add_task(export_single_registration_bg, entry.id, event.id, form.sport)
    return entry


@router.get("/export/{event_id}")
def export_event_submissions(event_id: int, db: Session = Depends(get_db),
    sheets: GoogleSheetsService = Depends(get_google_sheets_service), user=Depends(admin_required),
    sport: Optional[str] = None):
    if not db.get(Event, event_id):
        raise HTTPException(404, "Event not found")
    query = db.query(FormSubmission).filter(FormSubmission.event_id == event_id)
    if not query.first():
        raise HTTPException(404, "No submissions found for this event")
    return export_event_to_sheets(event_id, db, sheets, sport)

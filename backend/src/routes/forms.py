import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.db import SessionLocal
from src.db.models.event import Event
from src.db.models.form import FormSubmission
from src.db.schemas import FormCreate, FormResponse
from src.services import GoogleSheetsService, get_google_sheets_service
from src.util.auth import admin_required
from src.util.permissions import SHEETS_EDITORS
from src.util.google_exceptions import GoogleApiError, GoogleNotFoundError

router = APIRouter(prefix="/api/forms", tags=["Forms"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=FormResponse)
def submit_form(form: FormCreate, db: Session = Depends(get_db)):
    """Public: Submit the registration form for a specific event"""
    # Verify the event exists
    event = db.query(Event).filter(Event.id == form.event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    new_entry = FormSubmission(
        event_id=form.event_id,
        sport=form.sport,
        gender=form.gender,
        name=form.name,
        teammates=form.teammates,
        phone_number=form.phone_number,
        email=form.email,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


@router.get("/export/{event_id}")
def export_event_submissions(
    event_id: int,
    db: Session = Depends(get_db),
    sheets: GoogleSheetsService = Depends(get_google_sheets_service),
    user=Depends(admin_required),
):
    """
    Export participants of a single event to a Google Sheet.
    - Single sheet if separated_genders=False
    - Two sheets if separated_genders=True (Male / Female)
    """

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Fetch all submissions
    submissions = db.query(FormSubmission).filter(FormSubmission.event_id == event_id).all()

    if not submissions:
        raise HTTPException(status_code=404, detail="No submissions found for this event")

    # Create / reuse spreadsheet for the event
    spreadsheet_id = sheets.create_spreadsheet(
        title=f"Registrations – {event.name}",
        editors=SHEETS_EDITORS,
    )

    if not bool(event.separated_genders):
        # Single sheet
        sheet_name = "Participants"
        try:
            sheets.rename_sheet(spreadsheet_id, old_name="Sheet1", new_name=sheet_name)
        except GoogleApiError:
            pass
        values = [
            ["Name", "Sport", "Gender", "Teammates", "Phone", "Email"],
            *[
                [s.name, s.sport, s.gender, s.teammates, s.phone_number, s.email]
                for s in submissions
            ],
        ]
        sheets.write_to_sheet(spreadsheet_id, sheet_name, values)

    else:
        # Split by gender using SQLAlchemy filtering (type-safe)
        male_submissions = db.query(FormSubmission).filter(
            FormSubmission.event_id == event_id,
            FormSubmission.gender == "male"
        ).all()
        female_submissions = db.query(FormSubmission).filter(
            FormSubmission.event_id == event_id,
            FormSubmission.gender == "female"
        ).all()

        # Write Male sheet
        male_sheet = "Male Participants"
        try:
            sheets.rename_sheet(spreadsheet_id, old_name="Sheet1", new_name=male_sheet)
        except GoogleNotFoundError:
            sheets.add_sheet(spreadsheet_id, male_sheet)

        male_values = [
            ["Name", "Sport", "Gender", "Teammates", "Phone", "Email"],
            *[[s.name, s.sport, s.gender, s.teammates, s.phone_number, s.email] for s in male_submissions],
        ]
        sheets.write_to_sheet(spreadsheet_id, male_sheet, male_values)

        # Write Female sheet
        female_sheet = "Female Participants"
        try:
            sheets.add_sheet(spreadsheet_id, female_sheet)
        except GoogleApiError:
            pass

        female_values = [
            ["Name", "Sport", "Gender", "Teammates", "Phone", "Email"],
            *[[s.name, s.sport, s.gender, s.teammates, s.phone_number, s.email] for s in female_submissions],
        ]
        sheets.write_to_sheet(spreadsheet_id, female_sheet, female_values)

    return {
        "status": "exported",
        "event": event.name,
        "spreadsheet_id": spreadsheet_id,
        "rows": len(submissions),
    }

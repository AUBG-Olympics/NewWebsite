import csv
from io import StringIO

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from src.db import SessionLocal
from src.db.models.event import Event
from src.db.models.form import FormSubmission
from src.db.schemas import FormCreate, FormResponse
from src.util.auth import admin_required

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
    event_id: int, db: Session = Depends(get_db), user=Depends(admin_required)
):
    """Exports entries for a specific event for Google Sheets import"""
    event = db.query(Event).filter(Event.id == event_id).first()

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    submissions = (
        db.query(FormSubmission).filter(FormSubmission.event_id == event_id).all()
    )

    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Name", "Sport", "Gender", "Teammates", "Phone", "Email"])

    for s in submissions:
        writer.writerow(
            [s.id, s.name, s.sport, s.gender, s.teammates, s.phone_number, s.email]
        )

    output.seek(0)
    filename = f"registrations_{event.name.replace(' ', '_')}.csv"
    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

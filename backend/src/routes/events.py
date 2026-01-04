from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from src.db import SessionLocal
from src.db.models.event import Event
from src.db.schemas import EventCreate, EventResponse
from src.util.auth import admin_required

router = APIRouter(prefix="/api/events", tags=["Events"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=EventResponse)
def create_event(
    event: EventCreate, db: Session = Depends(get_db), user=Depends(admin_required)
):
    if event.is_current:
        db.query(Event).update({Event.is_current: False})  # Ensure only one is current
    new_event = Event(**event.model_dump())
    db.add(new_event)
    db.commit()
    db.refresh(new_event)
    return new_event


@router.get("/", response_model=list[EventResponse])
def get_events(db: Session = Depends(get_db)):
    return db.query(Event).all()


@router.put("/{event_id}", response_model=EventResponse)
def update_event(
    event_id: int,
    event: EventCreate,
    db: Session = Depends(get_db),
    user=Depends(admin_required),
):
    db_event = db.query(Event).filter(Event.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Event not found")

    if event.is_current:
        db.query(Event).update({Event.is_current: False})

    for key, value in event.model_dump().items():
        setattr(db_event, key, value)

    db.commit()
    db.refresh(db_event)
    return db_event


@router.delete("/{event_id}")
def delete_event(
    event_id: int, db: Session = Depends(get_db), user=Depends(admin_required)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.delete(event)
    db.commit()
    return {"message": f"Event {event.name} deleted successfully"}


@router.put("/{event_id}/set-current")
def set_current_event(
    event_id: int, db: Session = Depends(get_db), user=Depends(admin_required)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    db.query(Event).update({Event.is_current: False})
    event.is_current = True
    db.commit()
    return {"message": f"Event {event.name} is now the active event"}

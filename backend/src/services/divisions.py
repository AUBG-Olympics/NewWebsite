"""Division persistence and registration capacity, shared by event/form APIs."""

from fastapi import HTTPException
from sqlalchemy import func

from src.db.models.division import EventDivision
from src.db.models.form import FormSubmission


def active_divisions(event):
    return [division for division in event.divisions if division.is_active]


def sync_divisions(event, specs):
    existing = {division.id: division for division in event.divisions}
    for spec in specs:
        if spec.id is not None and spec.id not in existing:
            raise HTTPException(400, "A division does not belong to this event.")
    values = [spec.model_dump() for spec in specs]
    keep = set()
    for order, value in enumerate(values):
        division_id = value.pop("id", None)
        division = existing.get(division_id)
        if division is None:
            division = EventDivision()
            event.divisions.append(division)
        else:
            keep.add(division_id)
        for key, item in value.items():
            setattr(division, key, item)
        division.sort_order = order
        division.is_active = True
    for division_id, division in existing.items():
        if division_id not in keep:
            division.is_active = False


def division_capacity(db, event):
    counts = dict(db.query(FormSubmission.division_id, func.count(FormSubmission.id)).filter(
        FormSubmission.event_id == event.id,
    ).group_by(FormSubmission.division_id).all())
    result = []
    for division in active_divisions(event):
        count = counts.get(division.id, 0)
        cap = division.max_participants
        full = cap is not None and count >= cap
        waitlist = bool(full and count < cap + division.waitlist_max_participants)
        result.append(dict(
            id=division.id, name=division.name, current_participants=count,
            max_participants=cap, min_teammates=division.min_teammates,
            max_teammates=division.max_teammates, waitlist_max_participants=division.waitlist_max_participants,
            full=full, waitlist=waitlist, closed=bool(full and not waitlist),
        ))
    return result


def select_division(event, division_id):
    selected = next((division for division in active_divisions(event) if division.id == division_id), None)
    if selected is None:
        raise HTTPException(400, "Select an active division belonging to this event.")
    return selected

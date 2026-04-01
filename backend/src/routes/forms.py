from json.encoder import encode_basestring
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, BackgroundTasks, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from src.db import SessionLocal
from src.db.models.event import Event
from src.db.models.form import FormSubmission
from src.db.schemas import FormCreate, FormResponse
from src.services import GoogleSheetsService, get_google_sheets_service
from src.util.auth import admin_required
from src.util.permissions import SHEETS_EDITORS
from src.util.google_exceptions import (
    SheetsStatusCodes as ssc,
    GoogleApiError,
    GoogleNotFoundError,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forms", tags=["Forms"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/capacity/{event_id}")
def get_event_capacity(
    event_id: int,
    sport: Optional[str] = Query(None, description="Sport name (e.g. event name)"),
    db: Session = Depends(get_db),
):
    """
    Return capacity info for an event (and optional sport).
    When separated_genders: cap is per gender (e.g. 16 men, 16 women).
    is_full is True when no slots remain (both genders full or total full).
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    sport_key = sport or event.name
    max_participants = event.max_participants
    waitlist_enabled = bool(event.enable_waitlist and (event.waitlist_max_participants or 0) > 0)
    waitlist_size = int(event.waitlist_max_participants or 0)

    base = db.query(FormSubmission).filter(
        FormSubmission.event_id == event_id,
        FormSubmission.sport == sport_key,
    )
    total_count = base.count()

    if event.separated_genders and (
        max_participants is not None
        or event.max_participants_male is not None
        or event.max_participants_female is not None
    ):
        male_cap = (
            event.max_participants_male
            if event.max_participants_male is not None
            else max_participants
        )
        female_cap = (
            event.max_participants_female
            if event.max_participants_female is not None
            else max_participants
        )
        male_count = base.filter(
            or_(
                func.lower(FormSubmission.gender) == "male",
                func.lower(FormSubmission.gender) == "man",
            )
        ).count()
        female_count = base.filter(
            or_(
                func.lower(FormSubmission.gender) == "female",
                func.lower(FormSubmission.gender) == "woman",
            )
        ).count()
        male_is_full = male_cap is not None and male_count >= male_cap
        female_is_full = female_cap is not None and female_count >= female_cap
        full = bool(male_is_full and female_is_full)
        male_waitlist = bool(
            waitlist_enabled
            and male_cap is not None
            and male_count >= male_cap
            and male_count < (male_cap + waitlist_size)
        )
        female_waitlist = bool(
            waitlist_enabled
            and female_cap is not None
            and female_count >= female_cap
            and female_count < (female_cap + waitlist_size)
        )
        waitlist = bool(male_waitlist or female_waitlist)

        return {
            "event_id": event_id,
            "sport": sport_key,
            "max_participants": max_participants,
            "max_participants_male": male_cap,
            "max_participants_female": female_cap,
            "current_participants": total_count,
            "male_count": male_count,
            "female_count": female_count,
            "male_is_full": male_is_full,
            "female_is_full": female_is_full,
            # New canonical flags (requested contract)
            "full": full,
            "waitlist": waitlist,
            "male_waitlist": male_waitlist,
            "female_waitlist": female_waitlist,
            # Old keys kept for backward compatibility
            "is_full": full,
            "waitlist_enabled": waitlist_enabled,
            "waitlist_max_participants": waitlist_size,
        }
    if max_participants is not None:
        full = total_count >= max_participants
    else:
        full = False

    waitlist = bool(
        waitlist_enabled
        and max_participants is not None
        and total_count >= max_participants
        and total_count < (max_participants + waitlist_size)
    )
    return {
        "event_id": event_id,
        "sport": sport_key,
        "max_participants": max_participants,
        "current_participants": total_count,
        "full": full,
        "waitlist": waitlist,
        "male_is_full": full,
        "female_is_full": full,
        "male_waitlist": waitlist,
        "female_waitlist": waitlist,
        # Back-compat keys
        "is_full": full,
        "waitlist_enabled": waitlist_enabled,
        "waitlist_max_participants": waitlist_size,
    }


def export_single_registration(
    entity: FormSubmission,
    event_id: int,
    db: Session,
    sheets: GoogleSheetsService,
    sport: Optional[str] = None,
):
    logger.info(
        f"Starting export for event {event_id} to Google Sheets"
        + (f" (sport: {sport})" if sport else "")
    )

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        logger.warning(f"Event {event_id} not found - cannot export")
        return None

    # Create / reuse spreadsheet for the event (and sport if specified)
    spreadsheet_title = f"Registrations – {event.name}"
    if sport:
        spreadsheet_title = spreadsheet_title + f" – {sport}"

    logger.info(f"Creating/finding spreadsheet: {spreadsheet_title}")
    try:
        spreadsheet_id = sheets.create_spreadsheet(
            title=spreadsheet_title,
            editors=SHEETS_EDITORS,
        )
        logger.info(f"Spreadsheet created/found with ID: {spreadsheet_id}")
    except Exception as e:
        logger.error(
            f"Failed to create/find spreadsheet for event {event_id}: {str(e)}",
            exc_info=True,
        )
        raise

    sheet_names = sheets.get_sheet_names(spreadsheet_id)

    # Add a single WAITLIST separator row at the exact transition point
    # (first overflow submission after the main cap is filled).
    def _append_waitlist_marker_if_transition(sheet_name: str) -> None:
        if not event.enable_waitlist:
            return
        waitlist_size = int(event.waitlist_max_participants or 0)
        if waitlist_size <= 0:
            return

        base_query = db.query(FormSubmission).filter(
            FormSubmission.event_id == event_id,
            FormSubmission.sport == (sport or event.name),
        )

        if event.separated_genders:
            gender_lower = (entity.gender or "").strip().lower()
            if gender_lower in ("male", "man"):
                cap = (
                    event.max_participants_male
                    if event.max_participants_male is not None
                    else event.max_participants
                )
                count_query = base_query.filter(
                    or_(
                        func.lower(FormSubmission.gender) == "male",
                        func.lower(FormSubmission.gender) == "man",
                    )
                )
            elif gender_lower in ("female", "woman"):
                cap = (
                    event.max_participants_female
                    if event.max_participants_female is not None
                    else event.max_participants
                )
                count_query = base_query.filter(
                    or_(
                        func.lower(FormSubmission.gender) == "female",
                        func.lower(FormSubmission.gender) == "woman",
                    )
                )
            else:
                cap = event.max_participants
                count_query = base_query.filter(FormSubmission.gender == entity.gender)

            if cap is None:
                return
            current_count = count_query.count()
            # Transition moment: first waitlist signup for that gender.
            if current_count == cap + 1:
                sheets.append_to_sheet(spreadsheet_id, sheet_name, [["WAITLIST"]])
        else:
            cap = event.max_participants
            if cap is None:
                return
            current_count = base_query.count()
            # Transition moment: first waitlist signup overall.
            if current_count == cap + 1:
                sheets.append_to_sheet(spreadsheet_id, sheet_name, [["WAITLIST"]])
    if event.separated_genders is True:
        sheet_name = ""
        for s in sheet_names:
            if s.lower().startswith(entity.gender.lower()):
                sheet_name = s
                break
        if sheet_name == "":
            sheet_name = f"{'Male' if entity.gender.lower() in ('male', 'man') else 'Female'} {sport if sport else 'Participants'}"

            try:
                res = sheets.rename_sheet(
                    spreadsheet_id, old_name="Sheet1", new_name=sheet_name
                )

                if res == ssc.SHEET_NOT_FOUND:
                    sheets.add_sheet(spreadsheet_id, sheet_name)
                headers = [
                    [
                        "Name",
                        "Sport",
                        "Gender",
                        "Teammates",
                        "Team Name",
                        "Phone",
                        "Email",
                    ]
                ]

                sheets.append_to_sheet(spreadsheet_id, sheet_name, headers)
            except Exception as e:
                logger.error(f"Error while trying to export: {str(e)}")
                return

        values = [
            [
                entity.name,
                entity.sport,
                entity.gender,
                entity.teammates,
            entity.team_name or "",
                entity.phone_number,
                entity.email,
            ]
        ]
        _append_waitlist_marker_if_transition(sheet_name)
        sheets.append_to_sheet(spreadsheet_id, sheet_name, values)
        logger.info("Export Successful")
        return

    try:
        sheet_name = sport if sport else "Participants"
        res = sheets.rename_sheet(
            spreadsheet_id, old_name="Sheet1", new_name=sheet_name
        )
        if res != ssc.SHEET_ALREADY_EXISTS and res != ssc.SUCCESS:
            res = sheets.add_sheet(spreadsheet_id, sheet_name)
        elif res == ssc.SUCCESS:
            headers = [["Name", "Sport", "Teammates", "Team Name", "Phone", "Email"]]

            sheets.append_to_sheet(spreadsheet_id, sheet_name, headers)
    except Exception as e:
        logger.error(f"Error while trying to export: {str(e)}")
        return

    values = [
        [
            entity.name,
            entity.sport,
            entity.teammates,
            entity.team_name or "",
            entity.phone_number,
            entity.email,
        ]
    ]
    _append_waitlist_marker_if_transition(sheet_name)
    sheets.append_to_sheet(spreadsheet_id, sheet_name, values)
    logger.info("Export Successful")


def export_single_registration_bg(
    submission_id: int,
    event_id: int,
    sport: Optional[str] = None,
):
    db = SessionLocal()
    try:
        sheets = GoogleSheetsService()

        entity = (
            db.query(FormSubmission).filter(FormSubmission.id == submission_id).first()
        )

        if not entity:
            logger.warning(f"Submission {submission_id} not found")
            return

        export_single_registration(
            entity=entity,
            event_id=event_id,
            db=db,
            sheets=sheets,
            sport=sport,
        )

    except Exception:
        logger.exception("Background export failed")
    finally:
        db.close()

def export_waitlist_header(
    event_id: int,
    sport: Optional[str] = None,
    gender: Optional[str] = None,
):
    db = SessionLocal()
    try:
        sheets = GoogleSheetsService()
        event = db.query(Event).filter(Event.id == event_id).first()
        if not event:
            logger.warning(f"Event {event_id} not found - cannot add waitlist headers")
            return None

        # Create / reuse spreadsheet for the event (and sport if specified)
        spreadsheet_title = f"Registrations – {event.name}"
        if sport:
            spreadsheet_title = spreadsheet_title + f" – {sport}"

        logger.info(f"Creating/finding spreadsheet: {spreadsheet_title}")
        try:
            spreadsheet_id = sheets.create_spreadsheet(
                title=spreadsheet_title,
                editors=SHEETS_EDITORS,
            )
            logger.info(f"Spreadsheet created/found with ID: {spreadsheet_id}")
        except Exception as e:
            logger.error(
                f"Failed to create/find spreadsheet for event {event_id}: {str(e)}",
                exc_info=True,
            )
            raise

        sheet_names = sheets.get_sheet_names(spreadsheet_id)
        if event.separated_genders is True:
            sheet_name = ""
            for s in sheet_names:
                if gender and s.lower().startswith(gender.lower()):
                    sheet_name = s
                    break
            if(sheet_name == ""):
                return False

            headers = [[
                "Name",
                "Sport",
                "Gender",
                "Teammates",
                "Team Name",
                "Phone",
                "Email",
            ]]
            sheets.merge_row_and_write(spreadsheet_id, sheet_name, "Waitlist")

            sheets.append_to_sheet(spreadsheet_id, sheet_name, headers)
        try:
            sheet_name = sport if sport else "Participants"
            res = sheets.rename_sheet(
                spreadsheet_id, old_name="Sheet1", new_name=sheet_name
            )
            if res != ssc.SHEET_ALREADY_EXISTS and res != ssc.SUCCESS:
                res = sheets.add_sheet(spreadsheet_id, sheet_name)
            elif res == ssc.SUCCESS:
                headers = [["Name", "Sport", "Teammates", "Team Name", "Phone", "Email"]]
                sheets.merge_row_and_write(spreadsheet_id, sheet_name, "Waitlist")
                sheets.append_to_sheet(spreadsheet_id, sheet_name, headers)
        except Exception as e:
            logger.error(f"Error while trying to export: {str(e)}")
            return False

    except Exception as e:
        logger.error(f"Error while trying to write Waitlist Headers: {str(e)}")




def export_event_to_sheets(
    event_id: int,
    db: Session,
    sheets: GoogleSheetsService,
    sport: Optional[str] = None,
):
    """
    Helper function to export an event's submissions to Google Sheets.
    Called automatically after form submission and manually via export endpoint.
    Uses the same logic as the export endpoint.

    Args:
        event_id: The event ID to export
        db: Database session
        sheets: Google Sheets service
        sport: Optional sport filter. If provided, only exports submissions for this sport.
    """
    logger.info(
        f"Starting export for event {event_id} to Google Sheets"
        + (f" (sport: {sport})" if sport else "")
    )

    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        logger.warning(f"Event {event_id} not found - cannot export")
        return None

    # Fetch submissions filtered by event and optionally by sport
    query = db.query(FormSubmission).filter(FormSubmission.event_id == event_id)
    if sport:
        query = query.filter(FormSubmission.sport == sport)
    submissions = query.all()

    filter_desc = f"event {event_id} ({event.name})" + (
        f" and sport '{sport}'" if sport else ""
    )
    logger.info(f"Found {len(submissions)} submissions for {filter_desc}")

    if not submissions:
        logger.warning(f"No submissions found for event {event_id} - skipping export")
        return None

    # Create / reuse spreadsheet for the event (and sport if specified)
    spreadsheet_title = f"Registrations – {event.name}"
    if sport:
        spreadsheet_title = f"Registrations – {event.name} – {sport}"

    logger.info(f"Creating/finding spreadsheet: {spreadsheet_title}")
    try:
        spreadsheet_id = sheets.create_spreadsheet(
            title=spreadsheet_title,
            editors=SHEETS_EDITORS,
        )
        logger.info(f"Spreadsheet created/found with ID: {spreadsheet_id}")
    except Exception as e:
        logger.error(
            f"Failed to create/find spreadsheet for event {event_id}: {str(e)}",
            exc_info=True,
        )
        raise

    # Check if we should separate by gender
    # Always separate if event.separated_genders is True
    separated_genders = (
        bool(event.separated_genders) if event.separated_genders is not None else False
    )
    logger.info(
        f"Event separated_genders setting: {separated_genders} (raw value: {event.separated_genders})"
    )

    if not separated_genders:
        # Single sheet - use sport name if filtering by sport
        sheet_name = sport if sport else "Participants"
        logger.info(f"Exporting to single sheet: {sheet_name}")

        logger.info(f"Trying to rename first sheet to '{sheet_name}'")
        try:
            sheets.rename_sheet(spreadsheet_id, old_name="Sheet1", new_name=sheet_name)
        except GoogleNotFoundError as e:
            logger.warning(
                f"Could not rename default sheet to {sheet_name}': {e}. Will create new sheet."
            )
            sheets.add_sheet(spreadsheet_id, sheet_name)
        except GoogleApiError as e:
            logger.info(f"Could not rename because: {str(e)}")
        except Exception as e:
            logger.error(f"Rename/add sheet error: {str(e)}")
            raise

        values = [
            ["Name", "Sport", "Gender", "Teammates", "Team Name", "Phone", "Email"],
            *[
                [
                    s.name,
                    s.sport,
                    s.gender,
                    s.teammates,
                    s.team_name or "",
                    s.phone_number,
                    s.email,
                ]
                for s in submissions
            ],
        ]
        logger.info(f"Writing {len(values)-1} rows to {sheet_name} sheet")
        try:
            sheets.write_to_sheet(spreadsheet_id, sheet_name, values)
        except Exception as e:
            logger.warning(f"Failed to write to sheet for {event.name}: {str(e)}")

        logger.info(f"Successfully wrote {len(values)-1} rows to {sheet_name} sheet")
        result = {
            "status": "exported",
            "event": event.name,
            "spreadsheet_id": spreadsheet_id,
            "rows": len(submissions),
        }
        logger.info(
            f"Export completed successfully for event {event_id} ({event.name}): {len(submissions)} rows exported to spreadsheet {spreadsheet_id}"
        )
        return result

    # Split by gender using SQLAlchemy filtering (type-safe)
    logger.info(
        "Event has separated_genders=True, splitting into Male and Female sheets"
    )
    unique_genders = set(s.gender for s in submissions)
    logger.info(f"Found unique gender values in submissions: {unique_genders}")

    # Filter by gender - handle both "male"/"female" and potentially "both" or other values
    male_submissions = [
        s for s in submissions if str(s.gender).lower() in ["male", "man"]
    ]
    female_submissions = [
        s for s in submissions if str(s.gender).lower() in ["female", "woman"]
    ]

    logger.info(
        f"Found {len(male_submissions)} male and {len(female_submissions)} female submissions"
        + (f" for sport '{sport}'" if sport else "")
    )

    # Write sheets - use sport name if filtering by sport
    male_sheet = f"Male {sport}" if sport else "Male Participants"
    female_sheet = f"Female {sport}" if sport else "Female Participants"
    logger.info(f"Setting up {male_sheet} sheet")
    try:
        sheets.rename_sheet(spreadsheet_id, old_name="Sheet1", new_name=male_sheet)
    except GoogleNotFoundError as e:
        logger.warning(
            f"Could not rename default sheet to {male_sheet}': {e}. Will create new sheet."
        )
        sheets.add_sheet(spreadsheet_id, male_sheet)
        logger.debug(f"Added {male_sheet} sheet")
        sheets.add_sheet(spreadsheet_id, female_sheet)
        logger.debug(f"Added {female_sheet} sheet")
    except GoogleApiError as e:
        logger.info(f"Could not rename because: {str(e)}")
    except Exception as e:
        logger.error(f"Rename/add sheet error: {str(e)}")
        raise

    male_values = [
        ["Name", "Sport", "Gender", "Teammates", "Team Name", "Phone", "Email"],
        *[
            [s.name, s.sport, s.gender, s.teammates, s.team_name or "", s.phone_number, s.email]
            for s in male_submissions
        ],
    ]
    logger.info(f"Writing {len(male_values)-1} rows to {male_sheet} sheet")
    try:
        sheets.write_to_sheet(spreadsheet_id, male_sheet, male_values)
    except Exception as e:
        logger.warning(f"Failed to write to sheet for {event.name}: {str(e)}")
    logger.info(f"Successfully wrote {len(male_values)-1} rows to {male_sheet} sheet")

    female_values = [
        ["Name", "Sport", "Gender", "Teammates", "Team Name", "Phone", "Email"],
        *[
            [s.name, s.sport, s.gender, s.teammates, s.team_name or "", s.phone_number, s.email]
            for s in female_submissions
        ],
    ]
    logger.info(f"Writing {len(female_values)-1} rows to {female_sheet} sheet")
    try:
        sheets.write_to_sheet(spreadsheet_id, female_sheet, female_values)
    except Exception as e:
        logger.warning(f"Failed to write to sheet for {event.name}: {str(e)}")
    logger.info(
        f"Successfully wrote {len(female_values)-1} rows to {female_sheet} sheet"
    )

    result = {
        "status": "exported",
        "event": event.name,
        "spreadsheet_id": spreadsheet_id,
        "rows": len(submissions),
    }
    logger.info(
        f"Export completed successfully for event {event_id} ({event.name}): {len(submissions)} rows exported to spreadsheet {spreadsheet_id}"
    )
    return result


@router.post("/", response_model=FormResponse)
def submit_form(
    form: FormCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Public: Submit the registration form for a specific event"""
    print(f"[FORMS] Form submission received for event {form.event_id}")
    logger.info(f"Form submission received for event {form.event_id}")

    # Verify the event exists
    event = db.query(Event).filter(Event.id == form.event_id).first()

    if not event:
        logger.warning(f"Event {form.event_id} not found")
        raise HTTPException(status_code=404, detail="Event not found")

    # ------------------------------------------------------------------
    # Uniqueness: the same email can only register once per sport
    # (sport is the event name as sent by the frontend).
    # ------------------------------------------------------------------
    existing = (
        db.query(FormSubmission)
        .filter(
            FormSubmission.event_id == form.event_id,
            FormSubmission.sport == form.sport,
            func.lower(FormSubmission.email) == form.email.lower(),
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="This email is already registered for this sport.",
        )

    # ------------------------------------------------------------------
    # Team requirements (team_name + teammate count)
    # ------------------------------------------------------------------
    max_slots = event.max_teammates or 0
    min_required = event.min_teammates

    filled_teammates_count = 0
    if form.teammates:
        filled_teammates_count = len(
            [n.strip() for n in form.teammates.split(",") if n.strip()]
        )

    # If this sport uses teams, a team name is required.
    if max_slots > 0:
        if not form.team_name or not form.team_name.strip():
            raise HTTPException(
                status_code=400,
                detail="Team name is required for this sport.",
            )

    # Enforce minimum teammate count when configured.
    if max_slots > 0 and min_required is not None:
        if filled_teammates_count < min_required:
            raise HTTPException(
                status_code=400,
                detail=f"Please enter at least {min_required} teammates.",
            )

    # Enforce max teammate count (server-side safety).
    if max_slots > 0 and filled_teammates_count > max_slots:
        raise HTTPException(
            status_code=400,
            detail="Too many teammates provided for this sport.",
        )

    # Enforce max participants cap per sport (per gender when separated_genders)
    if (
        event.max_participants is not None
        or event.max_participants_male is not None
        or event.max_participants_female is not None
    ):
        base_query = db.query(FormSubmission).filter(
            FormSubmission.event_id == form.event_id,
            FormSubmission.sport == form.sport,
        )
        if event.separated_genders and form.gender:
            gender_lower = (form.gender or "").strip().lower()
            cap_for_gender: Optional[int]
            if gender_lower in ("male", "man"):
                cap_for_gender = (
                    event.max_participants_male
                    if event.max_participants_male is not None
                    else event.max_participants
                )
                count_query = base_query.filter(
                    or_(
                        func.lower(FormSubmission.gender) == "male",
                        func.lower(FormSubmission.gender) == "man",
                    )
                )
            elif gender_lower in ("female", "woman"):
                cap_for_gender = (
                    event.max_participants_female
                    if event.max_participants_female is not None
                    else event.max_participants
                )
                count_query = base_query.filter(
                    or_(
                        func.lower(FormSubmission.gender) == "female",
                        func.lower(FormSubmission.gender) == "woman",
                    )
                )
            else:
                cap_for_gender = event.max_participants
                count_query = base_query.filter(FormSubmission.gender == form.gender)
            current_count = count_query.count()
        else:
            cap_for_gender = event.max_participants
            current_count = base_query.count()

        waitlist_enabled = bool(
            event.enable_waitlist and (event.waitlist_max_participants or 0) > 0
        )
        waitlist_size = int(event.waitlist_max_participants or 0)

        # If cap is unset, treat as unlimited.
        if cap_for_gender is not None:
            if current_count >= cap_for_gender:
                # Cap reached: either place on waitlist (if enabled and not full) or reject.
                if not waitlist_enabled:
                    logger.info(
                        f"Event {form.event_id} sport {form.sport} reached max participants ({cap_for_gender})."
                    )
                    raise HTTPException(
                        status_code=400,
                        detail="Registration for this sport is full. The participant cap has been reached.",
                    )

                if event.separated_genders:
                    # Separated mode: waitlist_max_participants is per gender cap overflow.
                    if current_count >= (cap_for_gender + waitlist_size):
                        logger.info(
                            f"Event {form.event_id} sport {form.sport} waitlist is full for this gender (max {waitlist_size})."
                        )
                        raise HTTPException(
                            status_code=400,
                            detail="Registration for this sport is full. The waitlist is full for this gender.",
                        )
                else:
                    # Non-separated: waitlist pool is total overflow above event cap.
                    if current_count >= (cap_for_gender + waitlist_size):
                        logger.info(
                            f"Event {form.event_id} sport {form.sport} waitlist is full (max {waitlist_size})."
                        )
                        raise HTTPException(
                            status_code=400,
                            detail="Registration for this sport is full. The waitlist is full.",
                        )

    logger.info(f"Creating form submission for event {form.event_id} ({event.name})")
    new_entry = FormSubmission(
        event_id=form.event_id,
        sport=form.sport,
        gender=form.gender,
        name=form.name,
        teammates=form.teammates,
        team_name=form.team_name,
        phone_number=form.phone_number,
        email=form.email,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    logger.info(f"Form submission saved successfully with ID {new_entry.id}")

    try:

        background_tasks.add_task(
            export_single_registration_bg,
            submission_id=new_entry.id,
            event_id=event.id,
            sport=form.sport,
        )

        logger.info("Successfully created entry and exported it to the Google Sheet")

    except Exception as e:
        # Don't fail the form submission if export fails
        # The export will be retried on the next submission or can be done manually
        logger.error(
            f"Auto-export failed for event {form.event_id}: {str(e)}", exc_info=True
        )
        print(f"[FORMS] Auto-export failed: {str(e)}")
        import traceback

        traceback.print_exc()

    return new_entry


@router.get("/export/{event_id}")
def export_event_submissions(
    event_id: int,
    db: Session = Depends(get_db),
    sheets: GoogleSheetsService = Depends(get_google_sheets_service),
    user=Depends(admin_required),
    sport: Optional[str] = None,
):
    """
    Export participants of a single event to a Google Sheet.
    - Single sheet if separated_genders=False
    - Two sheets if separated_genders=True (Male / Female)
    - If sport is provided, only exports submissions for that sport
    """
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Fetch submissions (filtered by sport if provided)
    query = db.query(FormSubmission).filter(FormSubmission.event_id == event_id)
    if sport:
        query = query.filter(FormSubmission.sport == sport)
    submissions = query.all()

    if not submissions:
        filter_msg = f" for sport '{sport}'" if sport else ""
        raise HTTPException(
            status_code=404, detail=f"No submissions found for this event{filter_msg}"
        )

    # Use the shared export function
    result = export_event_to_sheets(event_id, db, sheets, sport=sport)

    if result is None:
        raise HTTPException(status_code=500, detail="Failed to export to Google Sheets")

    return result

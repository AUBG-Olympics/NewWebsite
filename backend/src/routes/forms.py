import csv
import logging
from io import StringIO
from typing import Optional

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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/forms", tags=["Forms"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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
    logger.info(f"Starting export for event {event_id} to Google Sheets" + (f" (sport: {sport})" if sport else ""))
    
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        logger.warning(f"Event {event_id} not found - cannot export")
        return None

    # Fetch submissions filtered by event and optionally by sport
    query = db.query(FormSubmission).filter(FormSubmission.event_id == event_id)
    if sport:
        query = query.filter(FormSubmission.sport == sport)
    submissions = query.all()
    
    filter_desc = f"event {event_id} ({event.name})" + (f" and sport '{sport}'" if sport else "")
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
        logger.error(f"Failed to create/find spreadsheet for event {event_id}: {str(e)}", exc_info=True)
        raise

    # Check if we should separate by gender
    # Always separate if event.separated_genders is True, or if we have both male and female submissions
    separated_genders_setting = bool(event.separated_genders) if event.separated_genders is not None else False
    logger.info(f"Event separated_genders setting: {separated_genders_setting} (raw value: {event.separated_genders})")
    
    # Check if we have both male and female submissions
    unique_genders = set(s.gender.lower() for s in submissions)
    has_male = any(g in ["male"] for g in unique_genders)
    has_female = any(g in ["female"] for g in unique_genders)
    should_separate = separated_genders_setting or (has_male and has_female)
    
    logger.info(f"Unique gender values: {unique_genders}, has_male: {has_male}, has_female: {has_female}, should_separate: {should_separate}")
    
    if not should_separate:
        # Single sheet - use sport name if filtering by sport
        sheet_name = sport if sport else "Participants"
        logger.info(f"Exporting to single sheet: {sheet_name}")
        
        # Check existing sheets and ensure the target sheet exists
        try:
            existing_sheets = sheets.get_sheet_names(spreadsheet_id)
            logger.debug(f"Existing sheets in spreadsheet: {existing_sheets}")
            
            if sheet_name not in existing_sheets:
                # Target sheet doesn't exist, try to rename the first sheet or create new one
                if existing_sheets:
                    first_sheet = existing_sheets[0]
                    if first_sheet != sheet_name:
                        logger.info(f"Renaming first sheet '{first_sheet}' to '{sheet_name}'")
                        try:
                            sheets.rename_sheet(spreadsheet_id, old_name=first_sheet, new_name=sheet_name)
                        except (GoogleApiError, GoogleNotFoundError) as e:
                            logger.warning(f"Could not rename '{first_sheet}' to '{sheet_name}': {e}. Will create new sheet.")
                            sheets.add_sheet(spreadsheet_id, sheet_name)
                else:
                    # No sheets exist, create one
                    logger.info(f"No sheets exist, creating '{sheet_name}' sheet")
                    sheets.add_sheet(spreadsheet_id, sheet_name)
            else:
                logger.debug(f"Sheet '{sheet_name}' already exists, will write to it")
        except Exception as e:
            logger.warning(f"Error checking/renaming sheets: {e}. Will proceed with write_to_sheet which handles sheet creation.")
        
        values = [
            ["Name", "Sport", "Gender", "Teammates", "Phone", "Email"],
            *[
                [s.name, s.sport, s.gender, s.teammates, s.phone_number, s.email]
                for s in submissions
            ],
        ]
        logger.info(f"Writing {len(values)-1} rows to {sheet_name} sheet")
        sheets.write_to_sheet(spreadsheet_id, sheet_name, values)
        logger.info(f"Successfully wrote {len(values)-1} rows to {sheet_name} sheet")

    else:
        # Split by gender using SQLAlchemy filtering (type-safe)
        logger.info(f"Event has separated_genders=True, splitting into Male and Female sheets")
        
        # Get all submissions first to see what gender values we have
        all_submissions_query = db.query(FormSubmission).filter(FormSubmission.event_id == event_id)
        if sport:
            all_submissions_query = all_submissions_query.filter(FormSubmission.sport == sport)
        all_submissions = all_submissions_query.all()
        
        # Log all unique gender values for debugging
        unique_genders = set(s.gender for s in all_submissions)
        logger.info(f"Found unique gender values in submissions: {unique_genders}")
        
        # Filter by gender - handle both "male"/"female" and potentially "both" or other values
        male_query = db.query(FormSubmission).filter(
            FormSubmission.event_id == event_id,
            FormSubmission.gender.in_(["male", "Male", "MALE"])
        )
        female_query = db.query(FormSubmission).filter(
            FormSubmission.event_id == event_id,
            FormSubmission.gender.in_(["female", "Female", "FEMALE"])
        )
        
        # Filter by sport if provided
        if sport:
            male_query = male_query.filter(FormSubmission.sport == sport)
            female_query = female_query.filter(FormSubmission.sport == sport)
        
        male_submissions = male_query.all()
        female_submissions = female_query.all()
        logger.info(f"Found {len(male_submissions)} male and {len(female_submissions)} female submissions" + (f" for sport '{sport}'" if sport else ""))
        
        # Log if there are submissions that don't match male/female
        other_gender_count = len(all_submissions) - len(male_submissions) - len(female_submissions)
        if other_gender_count > 0:
            logger.warning(f"Found {other_gender_count} submissions with gender values that don't match 'male' or 'female'")

        # Write Male sheet - use sport name if filtering by sport
        male_sheet = f"Male {sport}" if sport else "Male Participants"
        logger.info(f"Setting up {male_sheet} sheet")
        try:
            existing_sheets = sheets.get_sheet_names(spreadsheet_id)
            logger.debug(f"Existing sheets in spreadsheet: {existing_sheets}")
            
            if male_sheet not in existing_sheets:
                # Target sheet doesn't exist, try to rename the first sheet or create new one
                if existing_sheets:
                    first_sheet = existing_sheets[0]
                    if first_sheet != male_sheet:
                        logger.info(f"Renaming first sheet '{first_sheet}' to '{male_sheet}'")
                        try:
                            sheets.rename_sheet(spreadsheet_id, old_name=first_sheet, new_name=male_sheet)
                        except (GoogleApiError, GoogleNotFoundError):
                            logger.debug(f"Could not rename '{first_sheet}', adding new sheet: {male_sheet}")
                            sheets.add_sheet(spreadsheet_id, male_sheet)
                else:
                    # No sheets exist, create one
                    logger.info(f"No sheets exist, creating '{male_sheet}' sheet")
                    sheets.add_sheet(spreadsheet_id, male_sheet)
            else:
                logger.debug(f"Sheet '{male_sheet}' already exists")
        except Exception as e:
            logger.warning(f"Error checking/renaming male sheet: {e}. Will proceed with add_sheet.")
            try:
                sheets.add_sheet(spreadsheet_id, male_sheet)
            except GoogleApiError:
                pass  # Sheet might already exist

        male_values = [
            ["Name", "Sport", "Gender", "Teammates", "Phone", "Email"],
            *[[s.name, s.sport, s.gender, s.teammates, s.phone_number, s.email] for s in male_submissions],
        ]
        logger.info(f"Writing {len(male_values)-1} rows to {male_sheet} sheet")
        sheets.write_to_sheet(spreadsheet_id, male_sheet, male_values)
        logger.info(f"Successfully wrote {len(male_values)-1} rows to {male_sheet} sheet")

        # Write Female sheet - use sport name if filtering by sport
        female_sheet = f"Female {sport}" if sport else "Female Participants"
        logger.info(f"Setting up {female_sheet} sheet")
        try:
            sheets.add_sheet(spreadsheet_id, female_sheet)
            logger.debug(f"Added {female_sheet} sheet")
        except GoogleApiError:
            logger.debug(f"{female_sheet} sheet may already exist")

        female_values = [
            ["Name", "Sport", "Gender", "Teammates", "Phone", "Email"],
            *[[s.name, s.sport, s.gender, s.teammates, s.phone_number, s.email] for s in female_submissions],
        ]
        logger.info(f"Writing {len(female_values)-1} rows to {female_sheet} sheet")
        sheets.write_to_sheet(spreadsheet_id, female_sheet, female_values)
        logger.info(f"Successfully wrote {len(female_values)-1} rows to {female_sheet} sheet")

    result = {
        "status": "exported",
        "event": event.name,
        "spreadsheet_id": spreadsheet_id,
        "rows": len(submissions),
    }
    logger.info(f"Export completed successfully for event {event_id} ({event.name}): {len(submissions)} rows exported to spreadsheet {spreadsheet_id}")
    return result


def get_google_sheets_service_optional() -> Optional[GoogleSheetsService]:
    """Safely get Google Sheets service, returning None if initialization fails."""
    try:
        return get_google_sheets_service()
    except Exception as e:
        logger.warning(f"Failed to initialize Google Sheets service: {str(e)}")
        return None


@router.post("/", response_model=FormResponse)
def submit_form(
    form: FormCreate,
    db: Session = Depends(get_db),
    sheets: Optional[GoogleSheetsService] = Depends(get_google_sheets_service_optional),
):
    """Public: Submit the registration form for a specific event"""
    print(f"[FORMS] Form submission received for event {form.event_id}")
    logger.info(f"Form submission received for event {form.event_id}")
    
    # Verify the event exists
    event = db.query(Event).filter(Event.id == form.event_id).first()

    if not event:
        logger.warning(f"Event {form.event_id} not found")
        raise HTTPException(status_code=404, detail="Event not found")

    logger.info(f"Creating form submission for event {form.event_id} ({event.name})")
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
    logger.info(f"Form submission saved successfully with ID {new_entry.id}")
    print(f"[FORMS] Form submission saved with ID {new_entry.id}")

    # Automatically export to Google Sheets after successful submission
    # This updates the spreadsheet with all current submissions for the event and sport
    if sheets is None:
        logger.warning("Google Sheets service is not available - skipping auto-export")
        print(f"[FORMS] Google Sheets service is None - skipping export")
    else:
        logger.info(f"Automatically exporting event {form.event_id}, sport {form.sport} to Google Sheets after form submission")
        print(f"[FORMS] Starting auto-export for event {form.event_id}, sport {form.sport}")
        
        try:
            print(f"[FORMS] Calling export_event_to_sheets for event {form.event_id}, sport {form.sport}")
            result = export_event_to_sheets(form.event_id, db, sheets, sport=form.sport)
            print(f"[FORMS] Export result: {result}")
            if result:
                logger.info(f"Auto-export successful for event {form.event_id}: {result.get('rows')} rows exported to spreadsheet {result.get('spreadsheet_id')}")
                print(f"[FORMS] Auto-export successful: {result.get('rows')} rows")
            else:
                logger.warning(f"Auto-export returned None for event {form.event_id} - no submissions or event not found")
                print(f"[FORMS] Auto-export returned None")
        except Exception as e:
            # Don't fail the form submission if export fails
            # The export will be retried on the next submission or can be done manually
            logger.error(f"Auto-export failed for event {form.event_id}: {str(e)}", exc_info=True)
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
        raise HTTPException(status_code=404, detail=f"No submissions found for this event{filter_msg}")

    # Use the shared export function
    result = export_event_to_sheets(event_id, db, sheets, sport=sport)
    
    if result is None:
        raise HTTPException(status_code=500, detail="Failed to export to Google Sheets")
    
    return result
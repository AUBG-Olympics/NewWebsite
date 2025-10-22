# src/routes/sponsors.py
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List

from src.db import SessionLocal
from src.db.models.sponsor import Sponsor
from src.db.schemas import SponsorCreate, SponsorResponse

router = APIRouter(prefix="/sponsors", tags=["Sponsors"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_authenticated(request: Request):
    """
    Dependency that ensures the user is authenticated via the cookie set by Google OAuth.
    Raises 401 if not authenticated.
    Returns the user_email for convenience.
    """
    user_email = request.cookies.get("user_email")
    if not user_email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in via Google.",
        )
    return user_email


@router.get("/", response_model=List[SponsorResponse])
def get_sponsors(db: Session = Depends(get_db)):
    """Public: list all sponsors"""
    return db.query(Sponsor).all()


@router.post("/", response_model=SponsorResponse)
def create_sponsor(
    sponsor: SponsorCreate,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_authenticated),
):
    """Protected: create a sponsor (requires Google login cookie)"""
    new_sponsor = Sponsor(**sponsor.dict())
    db.add(new_sponsor)
    db.commit()
    db.refresh(new_sponsor)
    return new_sponsor


@router.put("/{sponsor_id}", response_model=SponsorResponse)
def update_sponsor(
    sponsor_id: int,
    updated: SponsorCreate,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_authenticated),
):
    """Protected: update an existing sponsor"""
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    for key, value in updated.dict().items():
        setattr(sponsor, key, value)
    db.commit()
    db.refresh(sponsor)
    return sponsor


@router.delete("/{sponsor_id}")
def delete_sponsor(
    sponsor_id: int,
    db: Session = Depends(get_db),
    user_email: str = Depends(require_authenticated),
):
    """Protected: delete a sponsor"""
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    db.delete(sponsor)
    db.commit()
    return {"message": "Sponsor deleted"}

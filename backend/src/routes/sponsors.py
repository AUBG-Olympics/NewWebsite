# src/routes/sponsors.py
import os
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from typing import List

from src.db import SessionLocal
from src.db.models.sponsor import Sponsor
from src.db.schemas import SponsorCreate, SponsorResponse
from src.util.auth import admin_required
from src.services.cloudinary import delete_image, normalize_logo_public_id

router = APIRouter(prefix="/api/sponsors", tags=["Sponsors"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()



@router.get("/", response_model=List[SponsorResponse])
def get_sponsors(db: Session = Depends(get_db)):
    """Public: list all sponsors"""
    return db.query(Sponsor).all()


@router.post("/", response_model=SponsorResponse)
def create_sponsor(
    sponsor: SponsorCreate,
    db: Session = Depends(get_db),
    user: str = Depends(admin_required),
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
    user: str = Depends(admin_required),
):
    """Protected: update an existing sponsor"""
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    old_logo = sponsor.logo

    # Only update fields that were explicitly provided to avoid wiping
    # existing values with default `None`.
    for key, value in updated.dict(exclude_unset=True).items():
        setattr(sponsor, key, value)
    db.commit()
    db.refresh(sponsor)

    # Cloudinary cleanup: if logo changed, delete old asset.
    # We treat Sponsor.logo as Cloudinary public_id (recommended), but best-effort
    # normalization is used to handle historical values.
    if "logo" in updated.dict(exclude_unset=True) and old_logo and old_logo != sponsor.logo:
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        api_key = os.getenv("CLOUDINARY_API_KEY")
        api_secret = os.getenv("CLOUDINARY_API_SECRET")
        public_id = normalize_logo_public_id(old_logo)

        if cloud_name and api_key and api_secret and public_id:
            try:
                delete_image(
                    cloud_name=cloud_name,
                    api_key=api_key,
                    api_secret=api_secret,
                    public_id=public_id,
                )
            except Exception:
                # Don't fail sponsor edits if Cloudinary cleanup fails.
                pass

    return sponsor


@router.delete("/{sponsor_id}")
def delete_sponsor(
    sponsor_id: int,
    db: Session = Depends(get_db),
    user: str = Depends(admin_required),
):
    """Protected: delete a sponsor"""
    sponsor = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not sponsor:
        raise HTTPException(status_code=404, detail="Sponsor not found")

    old_logo = sponsor.logo
    db.delete(sponsor)
    db.commit()

    # Cloudinary cleanup
    if old_logo:
        cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME")
        api_key = os.getenv("CLOUDINARY_API_KEY")
        api_secret = os.getenv("CLOUDINARY_API_SECRET")
        public_id = normalize_logo_public_id(old_logo)
        if cloud_name and api_key and api_secret and public_id:
            try:
                delete_image(
                    cloud_name=cloud_name,
                    api_key=api_key,
                    api_secret=api_secret,
                    public_id=public_id,
                )
            except Exception:
                pass
    return {"message": "Sponsor deleted"}

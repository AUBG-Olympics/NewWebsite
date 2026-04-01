from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case
from sqlalchemy.orm import Session

from src.db import SessionLocal
from src.db.models.sponsor import Sponsor
from src.db.models.sponsor_tier import SponsorTier
from src.db.schemas import SponsorResponse, SponsorTierCreate, SponsorTierResponse
from src.util.auth import admin_required

router = APIRouter(prefix="/api/sponsor-tiers", tags=["Sponsor Tiers"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[SponsorTierResponse])
def list_tiers(db: Session = Depends(get_db)):
    # MariaDB doesn't support "NULLS LAST" syntax; emulate it.
    nulls_last = case((SponsorTier.sort_order.is_(None), 1), else_=0)
    return (
        db.query(SponsorTier)
        .order_by(nulls_last.asc(), SponsorTier.sort_order.asc(), SponsorTier.id.asc())
        .all()
    )


@router.get("/with-sponsors")
def list_tiers_with_sponsors(db: Session = Depends(get_db)):
    """
    Public: returns tiers + their sponsors grouped by tier key.
    Shape matches frontend Sponsors page needs.
    """
    tiers: List[SponsorTier] = (
        db.query(SponsorTier)
        .order_by(
            case((SponsorTier.sort_order.is_(None), 1), else_=0).asc(),
            SponsorTier.sort_order.asc(),
            SponsorTier.id.asc(),
        )
        .all()
    )
    sponsors: List[Sponsor] = db.query(Sponsor).all()

    sponsors_by_tier: dict[str, list[dict]] = {}
    for s in sponsors:
        tier_key = (s.tier or "").strip()
        if not tier_key:
            continue
        sponsors_by_tier.setdefault(tier_key, []).append(
            {
                "id": s.id,
                "name": s.name,
                "url": s.website,
                "logo": s.logo,
                "tier": s.tier,
            }
        )

    # Return tiers in configured order; include empty sponsors arrays.
    return [
        {
            "id": t.key,
            "label": t.label,
            "blurb": t.blurb,
            "columns": t.columns,
            "logoMaxWidth": t.logo_max_width,
            "sort_order": t.sort_order,
            "sponsors": sponsors_by_tier.get(t.key, []),
        }
        for t in tiers
    ]


@router.post("/", response_model=SponsorTierResponse)
def create_tier(
    tier: SponsorTierCreate,
    db: Session = Depends(get_db),
    user=Depends(admin_required),
):
    existing = db.query(SponsorTier).filter(SponsorTier.key == tier.key).first()
    if existing:
        raise HTTPException(status_code=409, detail="Tier key already exists")
    new_tier = SponsorTier(**tier.model_dump())
    db.add(new_tier)
    db.commit()
    db.refresh(new_tier)
    return new_tier


@router.put("/{tier_id}", response_model=SponsorTierResponse)
def update_tier(
    tier_id: int,
    tier: SponsorTierCreate,
    db: Session = Depends(get_db),
    user=Depends(admin_required),
):
    db_tier = db.query(SponsorTier).filter(SponsorTier.id == tier_id).first()
    if not db_tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    # Enforce unique key
    other = (
        db.query(SponsorTier)
        .filter(SponsorTier.key == tier.key, SponsorTier.id != tier_id)
        .first()
    )
    if other:
        raise HTTPException(status_code=409, detail="Tier key already exists")

    for k, v in tier.model_dump().items():
        setattr(db_tier, k, v)
    db.commit()
    db.refresh(db_tier)
    return db_tier


@router.delete("/{tier_id}")
def delete_tier(
    tier_id: int,
    db: Session = Depends(get_db),
    user=Depends(admin_required),
    delete_sponsors: Optional[bool] = True,
):
    db_tier = db.query(SponsorTier).filter(SponsorTier.id == tier_id).first()
    if not db_tier:
        raise HTTPException(status_code=404, detail="Tier not found")

    if delete_sponsors:
        db.query(Sponsor).filter(Sponsor.tier == db_tier.key).delete(synchronize_session=False)
    else:
        used = db.query(Sponsor).filter(Sponsor.tier == db_tier.key).first()
        if used:
            raise HTTPException(status_code=400, detail="Tier has sponsors; delete them first")

    db.delete(db_tier)
    db.commit()
    return {"message": "Tier deleted"}


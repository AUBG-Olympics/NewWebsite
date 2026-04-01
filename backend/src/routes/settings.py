from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.db import SessionLocal
from src.db.models.site_setting import SiteSetting
from src.util.auth import admin_required

router = APIRouter(prefix="/api/settings", tags=["Settings"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _get_bool(db: Session, key: str, default: bool = False) -> bool:
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if not row or row.value is None:
        return default
    return str(row.value).strip().lower() in ("1", "true", "yes", "on")


def _set_bool(db: Session, key: str, value: bool) -> None:
    row = db.query(SiteSetting).filter(SiteSetting.key == key).first()
    if not row:
        row = SiteSetting(key=key, value="1" if value else "0")
        db.add(row)
    else:
        row.value = "1" if value else "0"
    db.commit()


@router.get("/public")
def get_public_settings(db: Session = Depends(get_db)):
    return {"dday_enabled": _get_bool(db, "dday_enabled", False)}


@router.get("/dday-enabled")
def get_dday_enabled(db: Session = Depends(get_db), user=Depends(admin_required)):
    return {"dday_enabled": _get_bool(db, "dday_enabled", False)}


@router.put("/dday-enabled")
def set_dday_enabled(
    enabled: bool,
    db: Session = Depends(get_db),
    user=Depends(admin_required),
):
    _set_bool(db, "dday_enabled", enabled)
    return {"dday_enabled": enabled}


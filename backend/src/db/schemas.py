from datetime import date as datetype
from typing import Optional

from pydantic import BaseModel, Field


class UserBase(BaseModel):
    email: str
    name: str
    picture: str | None = None

    class Config:
        from_attributes = True


# ----- Sponsor Schemas -----
class SponsorBase(BaseModel):
    name: str
    website: str | None = None
    logo: str | None = None


class SponsorCreate(SponsorBase):
    pass


class SponsorResponse(SponsorBase):
    id: int

    class Config:
        from_attributes = True


# ----- Event Schemas -----
class EventBase(BaseModel):
    name: str
    description: Optional[str] = None
    date: Optional[datetype] = None
    separated_genders: bool = False
    is_current: bool = False


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: int

    class Config:
        from_attributes = True


# ----- Form Schemas -----
class FormCreate(BaseModel):
    event_id: int
    sport: str
    gender: str
    name: str
    teammates: Optional[str] = None
    phone_number: str
    email: str

    class Config:
        from_attributes = True


class FormResponse(FormCreate):
    id: int

    class Config:
        from_attributes = True

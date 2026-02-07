from datetime import date as datetype
from typing import Optional, Annotated

from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator


# ---------------------------
# ----- User Schemas --------
# ---------------------------
class UserBase(BaseModel):
    email: str
    name: str
    picture: Optional[str] = None

    class Config:
        from_attributes = True


class UserCreate(UserBase):
    email: EmailStr
    name: Annotated[str, Field(min_length=2, max_length=50)]


class UserResponse(UserBase):
    id: int

    class Config:
        from_attributes = True


# ---------------------------
# ----- Sponsor Schemas -----
# ---------------------------
class SponsorBase(BaseModel):
    name: str
    website: Optional[str] = None
    logo: Optional[str] = None


class SponsorCreate(SponsorBase):
    name: Annotated[str, Field(min_length=2, max_length=100)]


class SponsorResponse(SponsorBase):
    id: int

    class Config:
        from_attributes = True


# ---------------------------
# ----- Event Schemas -------
# ---------------------------
class EventBase(BaseModel):
    name: str
    description: Optional[str] = None
    date: Optional[datetype] = None
    separated_genders: bool = False
    is_current: bool = False
    teammates: Optional[int] = None
    max_participants: Optional[int] = None

    @field_validator("separated_genders", mode="before")
    @classmethod
    def handle_none_separated_genders(cls, v):
        if v is None:
            return False
        return v


class EventCreate(EventBase):
    name: Annotated[str, Field(min_length=2, max_length=100)]
    description: Optional[Annotated[str, Field(max_length=500)]] = None
    teammates: Optional[Annotated[int, Field(ge=0)]] = None
    max_participants: Optional[Annotated[int, Field(ge=0)]] = None

    @model_validator(mode="before")
    @classmethod
    def check_teammates_if_separated(cls, values):
        if values.get("separated_genders") and not values.get("teammates"):
            raise ValueError("teammates must be provided if separated_genders=True")
        return values


class EventResponse(EventBase):
    id: int

    class Config:
        from_attributes = True


# ---------------------------
# ----- Form Schemas --------
# ---------------------------
PhoneNumber = Annotated[str, Field(min_length=10, max_length=15)]
TeammatesStr = Annotated[str, Field(min_length=1, max_length=50)]
SportStr = Annotated[str, Field(min_length=2, max_length=50)]
GenderStr = Annotated[str, Field(min_length=1, max_length=20)]
NameStr = Annotated[str, Field(min_length=2, max_length=50)]
PositiveInt = Annotated[int, Field(gt=0)]


class FormBase(BaseModel):
    event_id: int
    sport: str
    gender: Optional[str] = None
    name: str
    teammates: Optional[str] = None
    phone_number: str
    email: str


class FormCreate(FormBase):
    event_id: PositiveInt
    sport: SportStr
    gender: Optional[GenderStr] = None
    name: NameStr
    teammates: Optional[TeammatesStr] = None
    phone_number: PhoneNumber
    email: EmailStr

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, v):
        digits = "".join(filter(str.isdigit, v))
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError("Phone number must be 10-15 digits")
        return v

    class Config:
        from_attributes = True


class FormResponse(FormBase):
    id: int

    class Config:
        from_attributes = True

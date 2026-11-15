from datetime import datetime as datetype
from typing import Optional, Annotated

from pydantic import BaseModel, Field, EmailStr, field_validator, model_validator, computed_field, ConfigDict


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
    tier: Optional[str] = None
    website: Optional[str] = None
    logo: Optional[str] = None


class SponsorCreate(SponsorBase):
    name: Annotated[str, Field(min_length=2, max_length=100)]


class SponsorResponse(SponsorBase):
    id: int

    class Config:
        from_attributes = True


class SponsorTierBase(BaseModel):
    key: str
    label: str
    blurb: Optional[str] = None
    columns: Optional[Annotated[int, Field(ge=1)]] = None
    logo_max_width: Optional[Annotated[int, Field(ge=1)]] = None
    sort_order: Optional[int] = None


class SponsorTierCreate(SponsorTierBase):
    key: Annotated[str, Field(min_length=1, max_length=255)]
    label: Annotated[str, Field(min_length=1, max_length=255)]


class SponsorTierResponse(SponsorTierBase):
    id: int

    class Config:
        from_attributes = True


# ---------------------------
# ----- Event Schemas -------
# ---------------------------
class DivisionCreate(BaseModel):
    id: Optional[Annotated[int, Field(gt=0)]] = None
    name: Annotated[str, Field(min_length=1, max_length=100)]
    min_teammates: Annotated[int, Field(ge=0)] = 0
    max_teammates: Annotated[int, Field(ge=0)] = 0
    max_participants: Optional[Annotated[int, Field(ge=0)]] = None
    waitlist_max_participants: Annotated[int, Field(ge=0)] = 0

    @field_validator("name", mode="before")
    @classmethod
    def trim_name(cls, value):
        return value.strip() if isinstance(value, str) else value

    @model_validator(mode="after")
    def validate_team_limits(self):
        if self.min_teammates > self.max_teammates:
            raise ValueError("Minimum teammates cannot exceed maximum teammates")
        return self


class DivisionResponse(DivisionCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int


class EventBase(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str
    description: Optional[str] = None
    date: Optional[datetype] = None
    is_current: bool = False
    whatsapp_link: Optional[Annotated[str, Field(max_length=1023)]] = None


class EventCreate(EventBase):
    divisions: list[DivisionCreate]
    name: Annotated[str, Field(min_length=2, max_length=100)]
    description: Optional[Annotated[str, Field(max_length=500)]] = None

    @field_validator("divisions")
    @classmethod
    def validate_divisions(cls, value):
        if not value:
            raise ValueError("An event must have at least one division")
        names = [division.name.casefold() for division in value]
        ids = [division.id for division in value if division.id is not None]
        if len(names) != len(set(names)):
            raise ValueError("Division names must be unique")
        if len(ids) != len(set(ids)):
            raise ValueError("Division IDs must be unique")
        return value


class EventResponse(EventBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    divisions: list[DivisionResponse] = Field(default_factory=list)

    @field_validator("divisions", mode="before")
    @classmethod
    def active_divisions(cls, value):
        return [division for division in value if getattr(division, "is_active", True)]

    @computed_field
    @property
    def number_of_divisions(self) -> int:
        return len(self.divisions)



# ---------------------------
# ----- Form Schemas --------
# ---------------------------
PhoneNumber = Annotated[str, Field(min_length=10, max_length=15)]
TeammatesStr = Annotated[str, Field(min_length=1, max_length=500)]
SportStr = Annotated[str, Field(min_length=2, max_length=100)]
NameStr = Annotated[str, Field(min_length=2, max_length=50)]
PositiveInt = Annotated[int, Field(gt=0)]


class FormBase(BaseModel):
    model_config = ConfigDict(extra="forbid", from_attributes=True)
    division_id: Annotated[int, Field(gt=0)]
    event_id: int
    sport: str
    name: str
    # Team name is relevant for divisions that allow teammates.
    team_name: Optional[Annotated[str, Field(min_length=1, max_length=255)]] = None
    teammates: Optional[str] = None
    phone_number: str
    email: str


class FormCreate(FormBase):
    event_id: PositiveInt
    sport: SportStr
    name: NameStr
    team_name: Optional[Annotated[str, Field(min_length=1, max_length=255)]] = None
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



class FormResponse(FormBase):
    id: int
    division_name: Optional[str] = None

from pydantic import BaseModel

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
